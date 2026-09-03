import 'server-only';

import { randomBytes } from 'node:crypto';
import { AttemptMode, Prisma } from '@prisma/client';
import { assertAccountReady } from '@/lib/auth/account-readiness';
import prisma from '@/lib/prisma';
import { reserveEntitlementAndCreateAttempt } from '@/lib/db/concurrency';
import {
  compileAttemptManifest,
  parseFrozenManifestPayload,
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

async function materializeAttemptQuestions(attemptId: string, payload: ReturnType<typeof parseFrozenManifestPayload>) {
  await prisma.$transaction(async (transaction) => {
    await transaction.attemptQuestion.createMany({
      data: payload.questions.map((question) => ({
        attemptId,
        questionId: question.questionId,
        skill: question.skill as 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING',
        partOrder: question.partOrder,
        groupOrder: question.groupOrder,
        questionOrder: question.questionOrder,
        questionNumber: question.questionNumber,
        maxMarksSnapshot: question.maxMarks,
        presentedOptions: question.presentedOptions as Prisma.InputJsonValue ?? Prisma.JsonNull,
      })),
      skipDuplicates: true,
    });
    const questions = await transaction.attemptQuestion.findMany({
      where: { attemptId },
      select: { id: true, questionId: true },
    });
    if (
      questions.length !== payload.questions.length
      || questions.some((question) => !payload.questions.some((frozen) => frozen.questionId === question.questionId))
    ) throw new Error('ATTEMPT_QUESTION_MATERIALIZATION_MISMATCH');
    await transaction.response.createMany({
      data: questions.map((question) => ({
        attemptQuestionId: question.id,
        answer: Prisma.JsonNull,
      })),
      skipDuplicates: true,
    });
    const responseCount = await transaction.response.count({
      where: { attemptQuestion: { attemptId } },
    });
    if (responseCount !== payload.questions.length) {
      throw new Error('ATTEMPT_RESPONSE_MATERIALIZATION_MISMATCH');
    }
  });
  return prisma.assessmentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      manifest: true,
      questions: { include: { response: true } },
    },
  });
}

export async function createAuthenticatedAttempt(input: {
  userId: string;
  entitlementId: string;
  blueprintId: string;
  mode: AttemptMode;
  minimumSourceYear?: number;
  archiveIncluded?: boolean;
}, hooks?: { beforeQuestionMaterialization?: (attemptId: string) => void | Promise<void> }) {
  await assertAccountReady(input.userId);
  const randomSeed = randomBytes(32).toString('base64url');
  const assembly = await loadAssemblyInput(input.blueprintId);
  const compiled = compileAttemptManifest({
    ...assembly,
    seed: randomSeed,
    minimumSourceYear: input.minimumSourceYear,
    archiveIncluded: input.archiveIncluded,
  });

  const attempt = await reserveEntitlementAndCreateAttempt({
    ...input,
    randomSeed,
    manifestContentHash: compiled.contentHash,
    manifestPayload: compiled.payload,
  });
  if (!attempt.manifest) throw new Error('ATTEMPT_MANIFEST_MISSING');
  await hooks?.beforeQuestionMaterialization?.(attempt.id);
  return materializeAttemptQuestions(attempt.id, parseFrozenManifestPayload(attempt.manifest.payload));
}
