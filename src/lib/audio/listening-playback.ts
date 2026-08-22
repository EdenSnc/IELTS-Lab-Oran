import 'server-only';

import { createHash } from 'node:crypto';
import { AttemptMode, AttemptState, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError } from '@/lib/auth/request-user';
import { parseFrozenManifestPayload } from '@/lib/attempts/manifest-core';

export const PLAYBACK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

function playbackHash(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export async function beginListeningPlayback(input: {
  attemptId: string;
  userId: string;
  deviceSlotId: string;
  stimulusId: string;
  playbackToken: string;
}) {
  if (!PLAYBACK_TOKEN_PATTERN.test(input.playbackToken)) {
    throw new AuthError('INVALID_PLAYBACK_TOKEN', 400);
  }
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."AssessmentAttempt"
      WHERE id = ${input.attemptId}::uuid
      FOR UPDATE
    `);
    const attempt = await transaction.assessmentAttempt.findFirst({
      where: { id: input.attemptId, userId: input.userId },
      include: { manifest: true },
    });
    const now = new Date();
    if (!attempt?.manifest) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
    if (attempt.state !== AttemptState.ACTIVE) throw new AuthError('ATTEMPT_NOT_ACTIVE', 409);
    if (attempt.expiresAt && attempt.expiresAt <= now) throw new AuthError('ATTEMPT_EXPIRED', 409);
    const device = await transaction.deviceSlot.findFirst({
      where: { id: input.deviceSlotId, userId: input.userId, revokedAt: null },
      select: { id: true },
    });
    if (!device) throw new AuthError('TRUSTED_DEVICE_REQUIRED', 403);

    const manifest = parseFrozenManifestPayload(attempt.manifest.payload);
    const allowedPartIds = manifest.parts
      .filter((part) => part.skill === 'LISTENING')
      .map((part) => part.partId);
    const stimulus = await transaction.stimulus.findFirst({
      where: {
        id: input.stimulusId,
        testPartId: { in: allowedPartIds },
        type: 'AUDIO_TRACK',
        isVisibleToLearner: true,
        assetId: { not: null },
      },
      select: { id: true, assetId: true },
    });
    if (!stimulus?.assetId) throw new AuthError('LISTENING_AUDIO_NOT_FOUND', 404);

    if (attempt.mode === AttemptMode.PRACTICE) {
      return { assetId: stimulus.assetId, strict: false as const };
    }
    if (!attempt.expiresAt) throw new AuthError('ATTEMPT_TIME_LIMIT_MISSING', 409);
    const hash = playbackHash(input.playbackToken);
    const existing = await transaction.attemptMediaPlayback.findUnique({
      where: { attemptId_stimulusId: { attemptId: attempt.id, stimulusId: stimulus.id } },
    });
    if (existing) {
      if (
        existing.deviceSlotId !== input.deviceSlotId
        || existing.playbackHash !== hash
        || existing.expiresAt <= now
      ) throw new AuthError('LISTENING_AUDIO_ALREADY_STARTED', 409);
      return { assetId: stimulus.assetId, strict: true as const };
    }
    await transaction.attemptMediaPlayback.create({
      data: {
        attemptId: attempt.id,
        stimulusId: stimulus.id,
        deviceSlotId: input.deviceSlotId,
        playbackHash: hash,
        startedAt: now,
        expiresAt: attempt.expiresAt,
      },
    });
    return { assetId: stimulus.assetId, strict: true as const };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2034' || error.code === 'P2002')
        && retry < 2;
      if (!retryable) throw error;
    }
  }
  throw new Error('UNREACHABLE_LISTENING_PLAYBACK_STATE');
}

export async function authorizeStrictListeningAsset(input: {
  attemptId: string;
  stimulusId: string;
  assetId: string;
  deviceSlotId: string;
  playbackToken: string | null;
}) {
  if (!input.playbackToken || !PLAYBACK_TOKEN_PATTERN.test(input.playbackToken)) return false;
  const playback = await prisma.attemptMediaPlayback.findFirst({
    where: {
      attemptId: input.attemptId,
      stimulusId: input.stimulusId,
      deviceSlotId: input.deviceSlotId,
      playbackHash: playbackHash(input.playbackToken),
      expiresAt: { gt: new Date() },
      stimulus: { assetId: input.assetId, type: 'AUDIO_TRACK' },
    },
    select: { id: true },
  });
  return Boolean(playback);
}
