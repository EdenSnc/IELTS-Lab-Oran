import {
  AttemptState,
  GradingRunStatus,
  Prisma,
} from '@prisma/client';
import prisma from '@/lib/prisma';

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
  minimumSourceYear?: number;
  archiveIncluded?: boolean;
  expiresAt?: Date;
};

/**
 * Reserves one permitted attempt and creates it in the same serializable
 * transaction. Never replace this with read-then-increment.
 */
export async function reserveEntitlementAndCreateAttempt(input: StartAttemptInput) {
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const reserved = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
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
          RETURNING id
        `);

        if (reserved.length !== 1) {
          throw new EntitlementUnavailableError();
        }

        const attempt = await transaction.assessmentAttempt.create({
          data: {
            userId: input.userId,
            entitlementId: input.entitlementId,
            blueprintId: input.blueprintId,
            randomSeed: input.randomSeed,
            minimumSourceYear: input.minimumSourceYear,
            archiveIncluded: input.archiveIncluded ?? false,
            expiresAt: input.expiresAt,
            state: AttemptState.DRAFT,
          },
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
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
        && retry < 2
      );
      if (!canRetry) throw error;
    }
  }

  throw new Error('Unreachable entitlement reservation state');
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
