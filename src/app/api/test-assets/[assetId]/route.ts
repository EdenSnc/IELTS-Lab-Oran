import path from 'node:path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { isAssetLinkedToAttemptContent, isAssetLinkedToPublicDemo } from '@/lib/content/asset-authorization';
import { fetchPrivateAsset } from '@/lib/content/private-asset-storage';
import { parseFrozenManifestPayload } from '@/lib/attempts/manifest-core';
import { requireActiveAttemptDevice } from '@/lib/attempts/execution-lease';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { authorizeStrictListeningAsset } from '@/lib/audio/listening-playback';
import { listeningAssetCacheHeaders } from '@/lib/audio/listening-cache';
import { logSafeError } from '@/lib/observability/safe-log';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SVG_BYTES = 2_000_000;
const SAFE_ASSET_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function isSvgAsset(storageKey: string, storedMimeType: string) {
  return storedMimeType.toLowerCase().split(';')[0].trim() === 'image/svg+xml'
    || path.extname(storageKey).toLowerCase() === '.svg';
}

function inferMimeType(storageKey: string, storedMimeType: string) {
  const normalized = storedMimeType.toLowerCase().split(';')[0].trim();
  if (normalized !== 'application/octet-stream') return normalized;

  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return mimeTypes[path.extname(storageKey).toLowerCase()] ?? normalized;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  if (!UUID_PATTERN.test(assetId)) {
    return NextResponse.json({ error: 'Invalid asset identifier.' }, { status: 400 });
  }

  const attemptId = new URL(request.url).searchParams.get('attemptId');
  let allowedPartIds: string[] | undefined;
  let allowedGroupIds: string[] | undefined;
  let strictDeviceSlotId: string | null = null;
  let strictAudioAuthorized = false;
  if (attemptId) {
    if (!UUID_PATTERN.test(attemptId)) {
      return NextResponse.json({ error: 'Invalid attempt identifier.' }, { status: 400 });
    }
    try {
      const user = await requireRequestUser(request, ['STUDENT']);
      const device = await requireRequestDeviceSlot(request, user.id);
      const attempt = await requireActiveAttemptDevice({ attemptId, userId: user.id, deviceSlotId: device.id });
      if (attempt.mode === 'STRICT') strictDeviceSlotId = device.id;
      const manifest = await prisma.attemptManifest.findFirst({
        where: { attemptId, attempt: { userId: user.id } },
        select: { payload: true },
      });
      if (!manifest) return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
      const payload = parseFrozenManifestPayload(manifest.payload);
      allowedPartIds = payload.parts.map((part) => part.partId);
      allowedGroupIds = payload.parts.flatMap((part) => part.groupIds);
    } catch (error) {
      logSafeError('TEST_ASSET_AUTHORIZATION_FAILED', error, { assetId, attemptId });
      return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
    }
  }

  const asset = await prisma.contentAsset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      stimuli: { select: { id: true, type: true, testPartId: true } },
    },
  });
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }
  const svgAsset = isSvgAsset(asset.storageKey, asset.mimeType);
  const resolvedMimeType = svgAsset ? 'image/png' : inferMimeType(asset.storageKey, asset.mimeType);
  if (!SAFE_ASSET_MIME_TYPES.has(resolvedMimeType)) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }
  const linkedToAllowedContent = attemptId
    ? await isAssetLinkedToAttemptContent(assetId, {
      allowedPartIds: allowedPartIds ?? [],
      allowedGroupIds: allowedGroupIds ?? [],
    })
    : await isAssetLinkedToPublicDemo(assetId);
  if (!linkedToAllowedContent) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }
  if (attemptId && strictDeviceSlotId) {
    const audioStimuli = asset.stimuli.filter((stimulus) => (
      stimulus.type === 'AUDIO_TRACK' && allowedPartIds?.includes(stimulus.testPartId)
    ));
    if (audioStimuli.length > 0) {
      const url = new URL(request.url);
      const stimulusId = url.searchParams.get('stimulusId');
      const matched = audioStimuli.some((stimulus) => stimulus.id === stimulusId);
      const authorized = matched && stimulusId
        ? await authorizeStrictListeningAsset({
          attemptId,
          stimulusId,
          assetId: asset.id,
          deviceSlotId: strictDeviceSlotId,
          playbackToken: url.searchParams.get('playbackToken'),
        })
        : false;
      if (!authorized) {
        return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
      }
      strictAudioAuthorized = true;
    }
  }

  try {
    if (svgAsset) {
      const upstream = await fetchPrivateAsset(asset.storageKey, null);
      const rawSvg = Buffer.from(await upstream.arrayBuffer());
      if (rawSvg.byteLength === 0 || rawSvg.byteLength > MAX_SVG_BYTES) {
        return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
      }
      const pngBuffer = await sharp(rawSvg, { density: 144, limitInputPixels: 16_777_216 })
        .png()
        .toBuffer();
      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          ...listeningAssetCacheHeaders(false),
          'Content-Type': 'image/png',
          'Content-Length': String(pngBuffer.byteLength),
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const upstream = await fetchPrivateAsset(asset.storageKey, request.headers.get('range'));
    const commonHeaders = {
      'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
      ...listeningAssetCacheHeaders(strictAudioAuthorized),
      'Content-Type': resolvedMimeType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    };
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        ...commonHeaders,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        ...(contentRange ? { 'Content-Range': contentRange } : {}),
      },
    });
  } catch (error) {
    logSafeError('TEST_ASSET_FETCH_FAILED', error, { assetId, attemptId: attemptId ?? null });
    return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
  }
}
