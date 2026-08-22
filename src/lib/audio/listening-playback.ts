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
        const listeningParts = manifest.parts.filter((part) => part.skill === 'LISTENING');
        const partOrder = new Map(listeningParts.map((part, index) => [part.partId, index]));
        const tracks = await transaction.stimulus.findMany({
          where: {
            testPartId: { in: listeningParts.map((part) => part.partId) },
            type: 'AUDIO_TRACK',
            isVisibleToLearner: true,
            assetId: { not: null },
          },
          select: {
            id: true,
            assetId: true,
            displayOrder: true,
            testPartId: true,
            asset: { select: { durationMs: true, reviewStatus: true } },
          },
        });
        tracks.sort((left, right) => (
          (partOrder.get(left.testPartId) ?? Number.MAX_SAFE_INTEGER)
          - (partOrder.get(right.testPartId) ?? Number.MAX_SAFE_INTEGER)
          || left.displayOrder - right.displayOrder
        ));
        if (!tracks.some((track) => track.id === input.stimulusId)) {
          throw new AuthError('LISTENING_AUDIO_NOT_FOUND', 404);
        }
        if (tracks.length === 0 || tracks.some((track) => (
          !track.assetId || !track.asset || track.asset.reviewStatus !== 'VERIFIED'
          || !Number.isInteger(track.asset.durationMs) || Number(track.asset.durationMs) <= 0
        ))) throw new AuthError('LISTENING_AUDIO_DURATION_NOT_VERIFIED', 409);

        if (attempt.mode === AttemptMode.PRACTICE) {
          const requested = tracks.find((track) => track.id === input.stimulusId)!;
          return {
            assetId: requested.assetId as string,
            stimulusId: requested.id,
            strict: false as const,
            resumeAtSeconds: 0,
          };
        }
        if (!attempt.expiresAt) throw new AuthError('ATTEMPT_TIME_LIMIT_MISSING', 409);

        const firstPlayback = await transaction.attemptMediaPlayback.findFirst({
          where: { attemptId: attempt.id },
          orderBy: { startedAt: 'asc' },
        });
        const timelineStartedAt = firstPlayback?.startedAt ?? now;
        const elapsedMs = Math.max(0, now.getTime() - timelineStartedAt.getTime());
        let offsetMs = 0;
        const current = tracks.find((track) => {
          const end = offsetMs + Number(track.asset!.durationMs);
          if (elapsedMs < end) return true;
          offsetMs = end;
          return false;
        });
        if (!current) throw new AuthError('LISTENING_AUDIO_COMPLETE', 409);
        const scheduledStartAt = new Date(timelineStartedAt.getTime() + offsetMs);
        const resumeAtSeconds = Math.max(0, (now.getTime() - scheduledStartAt.getTime()) / 1_000);
        const existing = await transaction.attemptMediaPlayback.findUnique({
          where: { attemptId_stimulusId: { attemptId: attempt.id, stimulusId: current.id } },
        });
        if (existing && existing.deviceSlotId !== input.deviceSlotId) {
          throw new AuthError('LISTENING_AUDIO_DEVICE_MISMATCH', 409);
        }
        await transaction.attemptMediaPlayback.upsert({
          where: { attemptId_stimulusId: { attemptId: attempt.id, stimulusId: current.id } },
          create: {
            attemptId: attempt.id,
            stimulusId: current.id,
            deviceSlotId: input.deviceSlotId,
            playbackHash: playbackHash(input.playbackToken),
            startedAt: scheduledStartAt,
            expiresAt: attempt.expiresAt,
          },
          update: {
            playbackHash: playbackHash(input.playbackToken),
            expiresAt: attempt.expiresAt,
          },
        });
        return {
          assetId: current.assetId as string,
          stimulusId: current.id,
          strict: true as const,
          resumeAtSeconds,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2034' || error.code === 'P2002') && retry < 2;
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
