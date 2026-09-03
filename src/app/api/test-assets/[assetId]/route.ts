import path from 'node:path';
import { NextResponse } from 'next/server';
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
function inferMimeType(storageKey: string, storedMimeType: string) {
  if (storedMimeType !== 'application/octet-stream') return storedMimeType;

  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return mimeTypes[path.extname(storageKey).toLowerCase()] ?? storedMimeType;
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
  if (asset.mimeType === 'image/svg+xml' || path.extname(asset.storageKey).toLowerCase() === '.svg') {
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
    const upstream = await fetchPrivateAsset(asset.storageKey, request.headers.get('range'));
    const commonHeaders = {
      'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
      ...listeningAssetCacheHeaders(strictAudioAuthorized),
      'Content-Type': inferMimeType(asset.storageKey, asset.mimeType),
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
