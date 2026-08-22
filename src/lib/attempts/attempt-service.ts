import 'server-only';

import { randomBytes } from 'node:crypto';
import { AttemptMode, AttemptState, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { EntitlementUnavailableError } from '@/lib/db/concurrency';
import {
  compileAttemptManifest,
  type AssemblyBlueprint,
  type AssemblyPart,
} from './manifest-core';

async function loadAssemblyInput(blueprintId: string) {
  const blueprint = await prisma.testBlueprint.findUnique({
    where: { id: blueprintId },
    include: { slots: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!blueprint) throw new Error('BLUEPRINT_NOT_FOUND');

  const parts = await prisma.testPart.findMany({
    where: {
      slot: { in: blueprint.slots.map((slot) => slot.partSlot) },
      testSection: { testVersion: { status: 'PUBLISHED' } },
    },
    include: {
      testSection: {
        include: {
          testVersion: {
            include: { test: { select: { variant: true, sourceYear: true } } },
          },
        },
      },
      stimuli: {
        select: {
          reviewStatus: true,
          isVisibleToLearner: true,
          asset: { select: { reviewStatus: true } },
        },
      },
      questionGroups: {
        include: {
          answerKey: { select: { reviewStatus: true, formatVersion: true } },
          assetLinks: { select: { asset: { select: { reviewStatus: true } } } },
          questions: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  const assemblyBlueprint: AssemblyBlueprint = {
    id: blueprint.id,
    version: blueprint.version,
    variant: blueprint.variant,
    status: blueprint.status,
    fixedTestVersionId: blueprint.fixedTestVersionId,
    defaultMinimumSourceYear: blueprint.defaultMinimumSourceYear,
    allowArchiveByDefault: blueprint.allowArchiveByDefault,
    slots: blueprint.slots.map((slot) => ({
      id: slot.id,
      partSlot: slot.partSlot,
      displayOrder: slot.displayOrder,
      requiredCount: slot.requiredCount,
      selectionMode: slot.selectionMode,
      targetMarks: slot.targetMarks,
    })),
  };
  const candidates: AssemblyPart[] = parts.map((part) => ({
    id: part.id,
    testVersionId: part.testSection.testVersion.id,
    testVersionContentHash: part.testSection.testVersion.contentHash,
    testVariant: part.testSection.testVersion.test.variant,
    sourceYear: part.testSection.testVersion.test.sourceYear,
    skill: part.testSection.skill,
    sectionId: part.testSection.id,
    sectionTimeLimitSeconds: part.testSection.timeLimitSeconds,
    slot: part.slot,
    reviewStatus: part.reviewStatus,
    stimuliReady: part.stimuli.some((stimulus) => stimulus.isVisibleToLearner)
      && part.stimuli.every((stimulus) => (
        stimulus.reviewStatus === 'VERIFIED'
        && (!stimulus.asset || stimulus.asset.reviewStatus === 'VERIFIED')
      )),
    assetsReady: part.questionGroups.every((group) => (
      group.assetLinks.every((link) => link.asset.reviewStatus === 'VERIFIED')
    )),
    shuffleQuestionGroups: part.shuffleQuestionGroups,
    groups: part.questionGroups.map((group) => ({
      id: group.id,
      displayOrder: group.displayOrder,
      reviewStatus: group.reviewStatus,
      scoringStrategy: group.scoringStrategy,
      maxMarks: group.maxMarks,
      independent: group.independent,
      shuffleQuestions: group.shuffleQuestions,
      shuffleOptions: group.shuffleOptions,
      options: group.options,
      answerKey: group.answerKey,
      questions: group.questions.map((question) => ({
        id: question.id,
        stableKey: question.stableKey,
        displayOrder: question.displayOrder,
        maxMarks: question.maxMarks,
      })),
    })),
  }));
  return { blueprint: assemblyBlueprint, candidates };
}

export async function createAuthenticatedAttempt(input: {
  userId: string;
  entitlementId: string;
  blueprintId: string;
  mode: AttemptMode;
  minimumSourceYear?: number;
  archiveIncluded?: boolean;
}) {
  const randomSeed = randomBytes(32).toString('base64url');
  const assembly = await loadAssemblyInput(input.blueprintId);
  const compiled = compileAttemptManifest({
    ...assembly,
    seed: randomSeed,
    minimumSourceYear: input.minimumSourceYear,
    archiveIncluded: input.archiveIncluded,
  });

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
        if (reserved.length !== 1) throw new EntitlementUnavailableError();

        const attempt = await transaction.assessmentAttempt.create({
          data: {
            userId: input.userId,
            entitlementId: input.entitlementId,
            blueprintId: input.blueprintId,
            state: AttemptState.DRAFT,
            mode: input.mode,
            randomSeed,
            minimumSourceYear: input.minimumSourceYear,
            archiveIncluded: input.archiveIncluded ?? false,
            manifest: {
              create: {
                schemaVersion: compiled.payload.schemaVersion,
                contentHash: compiled.contentHash,
                payload: compiled.payload as unknown as Prisma.InputJsonValue,
              },
            },
            questions: {
              create: compiled.payload.questions.map((question) => ({
                questionId: question.questionId,
                skill: question.skill as 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING',
                partOrder: question.partOrder,
                groupOrder: question.groupOrder,
                questionOrder: question.questionOrder,
                questionNumber: question.questionNumber,
                maxMarksSnapshot: question.maxMarks,
                presentedOptions: question.presentedOptions as Prisma.InputJsonValue ?? Prisma.JsonNull,
                response: { create: { answer: Prisma.JsonNull } },
              })),
            },
          },
          include: {
            manifest: true,
            questions: { include: { response: true } },
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
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
        && retry < 2;
      if (!retryable) throw error;
    }
  }
  throw new Error('UNREACHABLE_ATTEMPT_CREATION_STATE');
}
