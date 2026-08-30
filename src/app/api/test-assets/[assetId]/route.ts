import path from 'node:path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fetchPrivateAsset } from '@/lib/content/private-asset-storage';
import { parseFrozenManifestPayload } from '@/lib/attempts/manifest-core';
import { requireActiveAttemptDevice } from '@/lib/attempts/execution-lease';
import { requireRequestDeviceSlot } from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { authorizeStrictListeningAsset } from '@/lib/audio/listening-playback';
import { listeningAssetCacheHeaders } from '@/lib/audio/listening-cache';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function inferMimeType(storageKey: string, storedMimeType: string) {
  if (storedMimeType !== 'application/octet-stream') return storedMimeType;

  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return mimeTypes[path.extname(storageKey).toLowerCase()] ?? storedMimeType;
}

async function isReferencedInline(
  storageKey: string,
  allowedPartIds?: string[],
  allowedGroupIds?: string[],
) {
  const reference = `content-asset://${storageKey}`;
  const publicVersion = {
    testVersion: { status: 'PUBLISHED' as const, test: { isPublicDemo: true } },
  };
  const partWhere = allowedPartIds
    ? { id: { in: allowedPartIds } }
    : { testSection: publicVersion };
  const groupWhere = allowedGroupIds
    ? { id: { in: allowedGroupIds } }
    : { testPart: { testSection: publicVersion } };

  const [part, stimulus, group, question] = await Promise.all([
    prisma.testPart.findFirst({
      where: { ...partWhere, instructionsHtml: { contains: reference } },
      select: { id: true },
    }),
    prisma.stimulus.findFirst({
      where: {
        testPart: partWhere,
        bodyHtml: { contains: reference },
        isVisibleToLearner: true,
      },
      select: { id: true },
    }),
    prisma.questionGroup.findFirst({
      where: {
        ...groupWhere,
        OR: [
          { instructionsHtml: { contains: reference } },
          { promptHtml: { contains: reference } },
        ],
      },
      select: { id: true },
    }),
    prisma.question.findFirst({
      where: {
        questionGroup: groupWhere,
        promptHtml: { contains: reference },
      },
      select: { id: true },
    }),
  ]);
  return Boolean(part || stimulus || group || question);
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
    } catch {
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
  const linkedToAllowedContent = attemptId
    ? asset.stimuli.some((stimulus) => allowedPartIds?.includes(stimulus.testPartId))
      || await prisma.questionAsset.findFirst({
        where: { assetId, questionGroupId: { in: allowedGroupIds } },
        select: { assetId: true },
      }) !== null
    : await prisma.contentAsset.findFirst({
      where: {
        id: assetId,
        OR: [
          { stimuli: { some: { testPart: { testSection: { testVersion: { status: 'PUBLISHED', test: { isPublicDemo: true } } } } } } },
          { questionLinks: { some: { questionGroup: { testPart: { testSection: { testVersion: { status: 'PUBLISHED', test: { isPublicDemo: true } } } } } } } },
        ],
      },
      select: { id: true },
    }) !== null;
  const inlineAllowed = linkedToAllowedContent
    ? false
    : await isReferencedInline(asset.storageKey, allowedPartIds, allowedGroupIds);
  if (!linkedToAllowedContent && !inlineAllowed) {
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
  } catch {
    return NextResponse.json({ error: 'Asset is unavailable.' }, { status: 404 });
  }
}
