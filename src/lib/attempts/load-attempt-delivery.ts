import 'server-only';

import prisma from '@/lib/prisma';
import { optionsFromJson, rewriteContentAssetUrls } from '@/lib/content/load-delivery-test-core';
import type { DeliveryPart, DeliverySection, DeliveryTest } from '@/lib/content/delivery-types';
import { AuthError } from '@/lib/auth/request-user';
import { hashFrozenManifestPayload, parseFrozenManifestPayload } from './manifest-core';

export type AttemptDelivery = {
  attempt: {
    id: string;
    state: string;
    mode: string;
    startedAt: Date | null;
    expiresAt: Date | null;
    version: number;
  };
  test: DeliveryTest;
  responses: Array<{
    responseId: string;
    questionNumber: number;
    skill: string;
    answer: unknown;
    markedForReview: boolean;
    version: number;
    finalizedAt: Date | null;
  }>;
};

export async function loadAttemptDelivery(attemptId: string, userId: string): Promise<AttemptDelivery> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      blueprint: { select: { name: true, version: true, variant: true } },
      manifest: true,
      questions: {
        include: { response: true },
        orderBy: [
          { partOrder: 'asc' },
          { groupOrder: 'asc' },
          { questionOrder: 'asc' },
        ],
      },
    },
  });
  if (!attempt?.manifest) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
  const manifest = parseFrozenManifestPayload(attempt.manifest.payload);
  if (manifest.blueprintId !== attempt.blueprintId) throw new Error('ATTEMPT_MANIFEST_BLUEPRINT_MISMATCH');
  if (hashFrozenManifestPayload(manifest) !== attempt.manifest.contentHash) {
    throw new Error('ATTEMPT_MANIFEST_HASH_MISMATCH');
  }

  const allowedQuestionIds = new Set(attempt.questions.map((question) => question.questionId));
  const manifestQuestionIds = new Set(manifest.questions.map((question) => question.questionId));
  if (
    allowedQuestionIds.size !== manifestQuestionIds.size
    || [...allowedQuestionIds].some((id) => !manifestQuestionIds.has(id))
  ) {
    throw new Error('ATTEMPT_MANIFEST_QUESTION_MISMATCH');
  }
  for (const question of attempt.questions) {
    const frozen = manifest.questions.find((candidate) => candidate.questionId === question.questionId);
    if (
      !frozen
      || frozen.skill !== question.skill
      || frozen.partOrder !== question.partOrder
      || frozen.groupOrder !== question.groupOrder
      || frozen.questionOrder !== question.questionOrder
      || frozen.questionNumber !== question.questionNumber
      || frozen.maxMarks !== question.maxMarksSnapshot
    ) {
      throw new Error('ATTEMPT_QUESTION_SNAPSHOT_MISMATCH');
    }
  }

  const parts = await prisma.testPart.findMany({
    where: { id: { in: manifest.parts.map((part) => part.partId) } },
    include: {
      stimuli: {
        where: { isVisibleToLearner: true },
        orderBy: { displayOrder: 'asc' },
        include: { asset: { select: { id: true } } },
      },
      questionGroups: {
        include: { questions: { orderBy: { displayOrder: 'asc' } } },
      },
    },
  });
  if (parts.length !== manifest.parts.length) throw new Error('ATTEMPT_MANIFEST_PART_MISSING');

  const assets = await prisma.contentAsset.findMany({ select: { id: true, storageKey: true } });
  const assetIdByStorageKey = new Map(assets.map((asset) => [asset.storageKey, asset.id]));
  const rewrite = (html: string | null) => rewriteContentAssetUrls(
    html,
    assetIdByStorageKey,
    `?attemptId=${attempt.id}`,
  );
  const partById = new Map(parts.map((part) => [part.id, part]));
  const manifestQuestionById = new Map(manifest.questions.map((question) => [question.questionId, question]));

  const deliveryParts: DeliveryPart[] = manifest.parts
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((manifestPart) => {
      const part = partById.get(manifestPart.partId);
      if (!part) throw new Error('ATTEMPT_MANIFEST_PART_MISSING');
      const allowedGroups = new Set(manifestPart.groupIds);
      const groups = part.questionGroups
        .filter((group) => allowedGroups.has(group.id))
        .map((group) => {
          const questions = group.questions
            .filter((question) => allowedQuestionIds.has(question.id))
            .sort((left, right) => (
              (manifestQuestionById.get(left.id)?.questionOrder ?? 0)
              - (manifestQuestionById.get(right.id)?.questionOrder ?? 0)
            ));
          const first = manifestQuestionById.get(questions[0]?.id);
          return {
            id: group.id,
            displayOrder: first?.groupOrder ?? group.displayOrder,
            questionType: group.questionType,
            responseKind: group.responseKind,
            scoringStrategy: group.scoringStrategy,
            sourceNumberStart: questions.length ? Math.min(...questions.map((question) => manifestQuestionById.get(question.id)?.questionNumber ?? 0)) : null,
            sourceNumberEnd: questions.length ? Math.max(...questions.map((question) => manifestQuestionById.get(question.id)?.questionNumber ?? 0)) : null,
            instructionsHtml: rewrite(group.instructionsHtml),
            promptHtml: rewrite(group.promptHtml),
            options: optionsFromJson(first?.presentedOptions ?? group.options),
            maxMarks: group.maxMarks,
            minWordCount: group.minWordCount,
            maxWords: group.maxWords,
            allowNumbers: group.allowNumbers,
            rawAnswerInstruction: group.rawAnswerInstruction,
            questions: questions.map((question) => ({
              id: question.id,
              stableKey: question.stableKey,
              sourceNumber: manifestQuestionById.get(question.id)?.questionNumber ?? null,
              displayOrder: manifestQuestionById.get(question.id)?.questionOrder ?? question.displayOrder,
              promptHtml: rewrite(question.promptHtml),
              maxMarks: manifestQuestionById.get(question.id)?.maxMarks ?? question.maxMarks,
            })),
          };
        })
        .sort((left, right) => left.displayOrder - right.displayOrder);
      if (groups.length !== manifestPart.groupIds.length) throw new Error('ATTEMPT_MANIFEST_GROUP_MISSING');
      return {
        id: part.id,
        slot: part.slot,
        title: part.title,
        instructionsHtml: rewrite(part.instructionsHtml),
        recommendedTimeSeconds: part.recommendedTimeSeconds,
        stimuli: part.stimuli.map((stimulus) => ({
          id: stimulus.id,
          type: stimulus.type,
          displayOrder: stimulus.displayOrder,
          title: stimulus.title,
          bodyHtml: rewrite(stimulus.bodyHtml),
          plainText: stimulus.plainText,
          assetUrl: stimulus.asset ? `/api/test-assets/${stimulus.asset.id}?attemptId=${attempt.id}` : null,
        })),
        questionGroups: groups,
      };
    });

  const sections = new Map<string, DeliverySection>();
  for (const part of deliveryParts) {
    const frozenPart = manifest.parts.find((candidate) => candidate.partId === part.id) as typeof manifest.parts[number];
    const skill = frozenPart.skill as DeliverySection['skill'];
    const section = sections.get(skill) ?? {
      id: `${attempt.id}:${skill}`,
      skill,
      displayOrder: sections.size + 1,
      timeLimitSeconds: frozenPart.sectionTimeLimitSeconds,
      parts: [],
    };
    section.parts.push(part);
    sections.set(skill, section);
  }

  return {
    attempt: {
      id: attempt.id,
      state: attempt.state,
      mode: attempt.mode,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      version: attempt.version,
    },
    test: {
      id: attempt.id,
      title: attempt.blueprint.name,
      variant: attempt.blueprint.variant,
      version: attempt.blueprint.version,
      sections: [...sections.values()],
    },
    responses: attempt.questions.map((question) => {
      if (!question.response || question.questionNumber === null) throw new Error('ATTEMPT_RESPONSE_MISSING');
      return {
        responseId: question.response.id,
        questionNumber: question.questionNumber,
        skill: question.skill,
        answer: question.response.answer,
        markedForReview: question.response.markedForReview,
        version: question.response.version,
        finalizedAt: question.response.finalizedAt,
      };
    }),
  };
}
