import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { AttemptMode, AttemptState, Prisma, type DeviceSlot } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError } from '@/lib/auth/request-user';
import type { FrozenManifestPayload } from './manifest-core';

export const ATTEMPT_LEASE_HEADER = 'x-attempt-lease';
export const SUBMISSION_GRACE_SECONDS = 120;

function hashLeaseToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function leaseSeconds() {
  const configured = Number(process.env.ATTEMPT_LEASE_SECONDS ?? 45);
  return Number.isInteger(configured) && configured >= 15 && configured <= 120
    ? configured
    : 45;
}

function issueLeaseToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashLeaseToken(token) };
}

function manifestDuration(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const seconds = (payload as Partial<FrozenManifestPayload>).totalTimeLimitSeconds;
  return Number.isInteger(seconds) && Number(seconds) > 0 && Number(seconds) <= 14_400
    ? Number(seconds)
    : null;
}

function boundedLeaseExpiry(now: Date, attemptExpiresAt: Date) {
  return new Date(Math.min(
    now.getTime() + leaseSeconds() * 1_000,
    attemptExpiresAt.getTime(),
  ));
}

export async function acquireAttemptExecution(input: {
  attemptId: string;
  userId: string;
  deviceSlot: DeviceSlot;
}) {
  const issued = issueLeaseToken();
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."User" WHERE id = ${input.userId}::uuid FOR UPDATE
    `);
    const attempt = await transaction.assessmentAttempt.findFirst({
      where: { id: input.attemptId, userId: input.userId },
      include: { manifest: true, executionLease: true },
    });
    if (!attempt) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
    if (attempt.state !== AttemptState.DRAFT && attempt.state !== AttemptState.ACTIVE) {
      throw new AuthError('ATTEMPT_NOT_EXECUTABLE', 409);
    }
    if (input.deviceSlot.userId !== input.userId || input.deviceSlot.revokedAt) {
      throw new AuthError('TRUSTED_DEVICE_REQUIRED', 403);
    }

    const now = new Date();
    const duration = manifestDuration(attempt.manifest?.payload);
    if (attempt.mode === AttemptMode.STRICT && duration === null) {
      throw new AuthError('ATTEMPT_TIME_LIMIT_MISSING', 409);
    }
    const attemptExpiresAt = attempt.expiresAt
      ?? (duration === null ? new Date(now.getTime() + 24 * 3_600_000) : new Date(now.getTime() + duration * 1_000));
    if (attemptExpiresAt <= now) {
      await transaction.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { state: AttemptState.EXPIRED },
      });
      return { expired: true as const };
    }

    if (attempt.mode === AttemptMode.PRACTICE) {
      const activeAttempt = await transaction.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          state: AttemptState.ACTIVE,
          startedAt: attempt.startedAt ?? now,
          expiresAt: attempt.expiresAt,
        },
      });
      return { mode: attempt.mode, leaseToken: null, attempt: activeAttempt };
    }

    const otherLiveLease = await transaction.attemptExecutionLease.findFirst({
      where: {
        userId: input.userId,
        attemptId: { not: attempt.id },
        expiresAt: { gt: now },
        attempt: { state: AttemptState.ACTIVE, mode: AttemptMode.STRICT },
      },
      select: { attemptId: true },
    });
    if (otherLiveLease) throw new AuthError('STRICT_EXECUTION_ALREADY_ACTIVE', 409);

    if (
      attempt.executionLease
      && attempt.executionLease.expiresAt > now
      && attempt.executionLease.deviceSlotId !== input.deviceSlot.id
    ) {
      throw new AuthError('ATTEMPT_LEASE_CONFLICT', 409);
    }

    const expiresAt = boundedLeaseExpiry(now, attemptExpiresAt);
    if (expiresAt <= now) throw new AuthError('ATTEMPT_EXPIRED', 409);
    if (attempt.executionLease) {
      await transaction.attemptExecutionLease.update({
        where: { id: attempt.executionLease.id },
        data: {
          userId: input.userId,
          deviceSlotId: input.deviceSlot.id,
          leaseTokenHash: issued.tokenHash,
          expiresAt,
          heartbeatAt: now,
          version: { increment: 1 },
        },
      });
    } else {
      await transaction.attemptExecutionLease.create({
        data: {
          attemptId: attempt.id,
          userId: input.userId,
          deviceSlotId: input.deviceSlot.id,
          leaseTokenHash: issued.tokenHash,
          expiresAt,
          heartbeatAt: now,
        },
      });
    }
    const activeAttempt = await transaction.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        state: AttemptState.ACTIVE,
        startedAt: attempt.startedAt ?? now,
        expiresAt: attemptExpiresAt,
      },
    });
    return { mode: attempt.mode, leaseToken: issued.token, attempt: activeAttempt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if ('expired' in result) throw new AuthError('ATTEMPT_EXPIRED', 409);
  return result;
}

export async function requireLiveAttemptExecution(input: {
  request: Request;
  attemptId: string;
  userId: string;
  deviceSlotId: string;
}) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    include: { executionLease: true },
  });
  if (!attempt) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
  if (attempt.state !== AttemptState.ACTIVE) throw new AuthError('ATTEMPT_NOT_ACTIVE', 409);
  if (attempt.expiresAt && attempt.expiresAt <= new Date()) throw new AuthError('ATTEMPT_EXPIRED', 409);
  if (attempt.mode === AttemptMode.PRACTICE) return attempt;

  const token = input.request.headers.get(ATTEMPT_LEASE_HEADER);
  const lease = attempt.executionLease;
  if (
    !token
    || !lease
    || lease.deviceSlotId !== input.deviceSlotId
    || lease.expiresAt <= new Date()
    || lease.leaseTokenHash !== hashLeaseToken(token)
  ) {
    throw new AuthError('ATTEMPT_LEASE_REQUIRED', 409);
  }
  return attempt;
}

export async function requireActiveAttemptDevice(input: {
  attemptId: string;
  userId: string;
  deviceSlotId: string;
}) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    include: { executionLease: true },
  });
  const now = new Date();
  if (!attempt || attempt.state !== AttemptState.ACTIVE) {
    throw new AuthError('ATTEMPT_NOT_ACTIVE', 409);
  }
  if (attempt.expiresAt && attempt.expiresAt <= now) throw new AuthError('ATTEMPT_EXPIRED', 409);
  if (attempt.mode === AttemptMode.STRICT && (
    !attempt.executionLease
    || attempt.executionLease.deviceSlotId !== input.deviceSlotId
    || attempt.executionLease.expiresAt <= now
  )) {
    throw new AuthError('ATTEMPT_LEASE_REQUIRED', 409);
  }
  return attempt;
}

export async function authorizeAttemptSubmission(input: {
  request: Request;
  attemptId: string;
  userId: string;
  deviceSlotId: string;
}) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    include: { executionLease: true },
  });
  if (!attempt) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
  if (attempt.state === AttemptState.GRADING || attempt.state === AttemptState.COMPLETED) return attempt;
  if (attempt.state !== AttemptState.ACTIVE) throw new AuthError('ATTEMPT_NOT_ACTIVE', 409);
  if (attempt.mode === AttemptMode.PRACTICE) return attempt;
  const now = new Date();
  if (
    attempt.expiresAt
    && now.getTime() > attempt.expiresAt.getTime() + SUBMISSION_GRACE_SECONDS * 1_000
  ) throw new AuthError('ATTEMPT_SUBMISSION_WINDOW_EXPIRED', 409);
  const token = input.request.headers.get(ATTEMPT_LEASE_HEADER);
  if (
    !token
    || !attempt.executionLease
    || attempt.executionLease.deviceSlotId !== input.deviceSlotId
    || attempt.executionLease.leaseTokenHash !== hashLeaseToken(token)
  ) {
    throw new AuthError('ATTEMPT_LEASE_REQUIRED', 409);
  }
  return attempt;
}

export async function heartbeatAttemptExecution(input: {
  request: Request;
  attemptId: string;
  userId: string;
  deviceSlotId: string;
}) {
  const attempt = await requireLiveAttemptExecution(input);
  if (attempt.mode === AttemptMode.PRACTICE) return { expiresAt: attempt.expiresAt };
  const token = input.request.headers.get(ATTEMPT_LEASE_HEADER) as string;
  const now = new Date();
  const leaseExpiry = boundedLeaseExpiry(now, attempt.expiresAt as Date);
  const update = await prisma.attemptExecutionLease.updateMany({
    where: {
      attemptId: attempt.id,
      deviceSlotId: input.deviceSlotId,
      leaseTokenHash: hashLeaseToken(token),
      expiresAt: { gt: now },
    },
    data: {
      heartbeatAt: now,
      expiresAt: leaseExpiry,
      version: { increment: 1 },
    },
  });
  if (update.count !== 1) throw new AuthError('ATTEMPT_LEASE_REQUIRED', 409);
  return { expiresAt: leaseExpiry };
}
