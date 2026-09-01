import {
  AttemptMode,
  AttemptState,
  GradingRunStatus,
  Prisma,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import type { FrozenManifestPayload } from '@/lib/attempts/manifest-core';

export class EntitlementUnavailableError extends Error {
  constructor() {
    super('The entitlement cannot start this test or has no attempts remaining.');
    this.name = 'EntitlementUnavailableError';
  }
}

export class OptimisticConcurrencyError extends Error {
  constructor(entity: string) {
    super(`${entity} changed after it was loaded. Reload it before retrying.`);
    this.name = 'OptimisticConcurrencyError';
  }
}

type StartAttemptInput = {
  userId: string;
  entitlementId: string;
  blueprintId: string;
  randomSeed: string;
  mode: AttemptMode;
  manifestContentHash: string;
  manifestPayload: FrozenManifestPayload;
  minimumSourceYear?: number;
  archiveIncluded?: boolean;
};

function retryableSerializableError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2034' || error.code === 'P2002');
}

function retryDelay(retry: number) {
  const base = 25 * (2 ** retry);
  return new Promise((resolve) => setTimeout(resolve, base + Math.floor(Math.random() * 26)));
}

function earliestExpiry(reservedAt: Date, durationSeconds: number | null, entitlementEndsAt: Date | null) {
  const durationEndsAt = durationSeconds === null
    ? null
    : new Date(reservedAt.getTime() + durationSeconds * 1_000);
  if (!durationEndsAt) return entitlementEndsAt;
  if (!entitlementEndsAt) return durationEndsAt;
  return durationEndsAt < entitlementEndsAt ? durationEndsAt : entitlementEndsAt;
}

/**
 * Reserves one permitted attempt and creates it in the same serializable
 * transaction. Never replace this with read-then-increment.
 */
export async function reserveEntitlementAndCreateAttempt(input: StartAttemptInput) {
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const resumable = await transaction.assessmentAttempt.findFirst({
          where: {
            userId: input.userId,
            entitlementId: input.entitlementId,
            blueprintId: input.blueprintId,
            state: AttemptState.DRAFT,
          },
          include: { manifest: true },
          orderBy: { createdAt: 'asc' },
        });
        if (resumable?.manifest) return resumable;

        const reserved = await transaction.$queryRaw<Array<{
          id: string;
          endsAt: Date | null;
          reservedAt: Date;
        }>>(Prisma.sql`
          UPDATE app_private."Entitlement" AS entitlement
          SET
            "attemptsUsed" = "attemptsUsed" + 1,
            "version" = "version" + 1,
            "updatedAt" = NOW()
          WHERE entitlement.id = ${input.entitlementId}::uuid
            AND entitlement."userId" = ${input.userId}::uuid
            AND entitlement.status = 'ACTIVE'
            AND (entitlement."startsAt" IS NULL OR entitlement."startsAt" <= NOW())
            AND (entitlement."endsAt" IS NULL OR entitlement."endsAt" > NOW())
            AND (
              entitlement."maximumAttempts" IS NULL
              OR entitlement."attemptsUsed" < entitlement."maximumAttempts"
            )
            AND EXISTS (
              SELECT 1
              FROM app_private."ProductBlueprint" AS allowed
              JOIN app_private."TestBlueprint" AS blueprint
                ON blueprint.id = allowed."blueprintId"
              WHERE allowed."productId" = entitlement."productId"
                AND allowed."blueprintId" = ${input.blueprintId}::uuid
                AND blueprint.status = 'PUBLISHED'
            )
          RETURNING id, "endsAt", NOW() AS "reservedAt"
        `);

        if (reserved.length !== 1) {
          throw new EntitlementUnavailableError();
        }

        const expiresAt = earliestExpiry(
          reserved[0].reservedAt,
          input.manifestPayload.totalTimeLimitSeconds,
          reserved[0].endsAt,
        );
        const attempt = await transaction.assessmentAttempt.create({
          data: {
            userId: input.userId,
            entitlementId: input.entitlementId,
            blueprintId: input.blueprintId,
            randomSeed: input.randomSeed,
            mode: input.mode,
            minimumSourceYear: input.minimumSourceYear,
            archiveIncluded: input.archiveIncluded ?? false,
            expiresAt,
            state: AttemptState.DRAFT,
            manifest: {
              create: {
                schemaVersion: input.manifestPayload.schemaVersion,
                contentHash: input.manifestContentHash,
                payload: input.manifestPayload as unknown as Prisma.InputJsonValue,
              },
            },
          },
          include: { manifest: true },
        });
        await transaction.entitlementConsumption.create({
          data: {
            entitlementId: input.entitlementId,
            attemptId: attempt.id,
            kind: 'RESERVATION',
            units: 1,
            idempotencyKey: `attempt:${attempt.id}:reservation`,
          },
        });
        return attempt;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      const canRetry = (
        retryableSerializableError(error)
        || error instanceof EntitlementUnavailableError
      ) && retry < 2;
      if (!canRetry) throw error;
      await retryDelay(retry);
    }
  }

  throw new Error('Unreachable entitlement reservation state');
}

export type AttemptReleaseActor =
  | { kind: 'SYSTEM' }
  | { kind: 'STAFF'; userId: string };

export async function releaseAttempt(input: {
  attemptId: string;
  reason: string;
  actor: AttemptReleaseActor;
  force?: boolean;
}) {
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw(Prisma.sql`
          SELECT id FROM app_private."AssessmentAttempt"
          WHERE id = ${input.attemptId}::uuid
          FOR UPDATE
        `);
        const attempt = await transaction.assessmentAttempt.findUnique({
          where: { id: input.attemptId },
        });
        if (!attempt?.entitlementId) throw new Error('ATTEMPT_ENTITLEMENT_NOT_FOUND');

        const existingRelease = await transaction.entitlementConsumption.findUnique({
          where: { idempotencyKey: `attempt:${attempt.id}:release` },
        });
        if (existingRelease) return { attempt, released: false as const };

        if (attempt.startedAt && (!input.force || input.actor.kind !== 'STAFF')) {
          throw new Error('ACTIVE_ATTEMPT_RELEASE_FORBIDDEN');
        }
        const reservation = await transaction.entitlementConsumption.findFirst({
          where: { attemptId: attempt.id, kind: 'RESERVATION' },
        });
        if (!reservation) throw new Error('ATTEMPT_RESERVATION_NOT_FOUND');

        const decremented = await transaction.entitlement.updateMany({
          where: {
            id: attempt.entitlementId,
            attemptsUsed: { gte: reservation.units },
          },
          data: {
            attemptsUsed: { decrement: reservation.units },
            version: { increment: 1 },
          },
        });
        if (decremented.count !== 1) throw new Error('ENTITLEMENT_RELEASE_UNDERFLOW');

        const releasedAttempt = await transaction.assessmentAttempt.update({
          where: { id: attempt.id },
          data: { state: AttemptState.ABANDONED, version: { increment: 1 } },
        });
        await transaction.entitlementConsumption.create({
          data: {
            entitlementId: attempt.entitlementId,
            attemptId: attempt.id,
            kind: 'RELEASE',
            units: reservation.units,
            reversalOfId: reservation.id,
            idempotencyKey: `attempt:${attempt.id}:release`,
            reason: `${input.reason} [actor:${input.actor.kind}${input.actor.kind === 'STAFF' ? `:${input.actor.userId}` : ''}]`,
          },
        });
        return { attempt: releasedAttempt, released: true as const };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!retryableSerializableError(error) || retry >= 2) throw error;
      await retryDelay(retry);
    }
  }
  throw new Error('UNREACHABLE_ATTEMPT_RELEASE_STATE');
}

type SaveResponseInput = {
  responseId: string;
  attemptId: string;
  expectedVersion: number;
  answer: Prisma.InputJsonValue;
  markedForReview: boolean;
};

/**
 * Rejects stale autosaves instead of allowing an older browser request to
 * overwrite a newer answer.
 */
export async function saveResponseOptimistically(input: SaveResponseInput) {
  const update = await prisma.response.updateMany({
    where: {
      id: input.responseId,
      attemptQuestion: {
        attemptId: input.attemptId,
      },
      version: input.expectedVersion,
      finalizedAt: null,
    },
    data: {
      answer: input.answer,
      markedForReview: input.markedForReview,
      savedAt: new Date(),
      version: { increment: 1 },
    },
  });

  if (update.count !== 1) {
    throw new OptimisticConcurrencyError('Response');
  }

  return { version: input.expectedVersion + 1 };
}

/**
 * Acquires a renewable worker lease. Expired leases may be reclaimed after a
 * worker crash; an active lease cannot be stolen by another worker.
 */
export async function claimGradingRun(
  gradingRunId: string,
  workerId: string,
  leaseMilliseconds = 60_000,
) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);

  const update = await prisma.gradingRun.updateMany({
    where: {
      id: gradingRunId,
      OR: [
        { status: GradingRunStatus.QUEUED },
        {
          status: GradingRunStatus.RUNNING,
          leaseExpiresAt: { lt: now },
        },
      ],
    },
    data: {
      status: GradingRunStatus.RUNNING,
      leaseOwner: workerId,
      leaseExpiresAt,
      startedAt: now,
      runAttempt: { increment: 1 },
    },
  });

  return update.count === 1;
}
