import 'server-only';

import { AttemptState, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import {
  normalizationSchema,
  objectiveAnswerKeySchema,
  rawScoreToBand,
  scoreObjectiveGroups,
  validateBandThresholds,
  type NormalizationRules,
  type ObjectiveGroup,
} from '@/lib/grading/objective-scoring-core';
import { AuthError } from '@/lib/auth/request-user';
import { hashFrozenManifestPayload, parseFrozenManifestPayload } from './manifest-core';

function normalizationRules(value: unknown): NormalizationRules {
  return normalizationSchema.parse(value ?? {});
}

function responseText(value: unknown) {
  if (value === null) return '';
  if (typeof value !== 'string') throw new Error('INVALID_OBJECTIVE_RESPONSE');
  return value;
}

export async function submitAndGradeObjectiveAttempt(attemptId: string, userId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."AssessmentAttempt"
      WHERE id = ${attemptId}::uuid AND "userId" = ${userId}::uuid
      FOR UPDATE
    `);
    const attempt = await transaction.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        manifest: true,
        blueprint: { select: { variant: true } },
        skillScores: true,
        questions: {
          where: { skill: { in: ['LISTENING', 'READING'] } },
          include: {
            response: true,
            question: {
              include: {
                questionGroup: {
                  include: { answerKey: true },
                },
              },
            },
          },
        },
      },
    });
    if (!attempt?.manifest) throw new AuthError('ATTEMPT_NOT_FOUND', 404);

    if (attempt.state === AttemptState.COMPLETED || attempt.state === AttemptState.GRADING) {
      return {
        attemptId: attempt.id,
        state: attempt.state,
        scores: attempt.skillScores.map((score) => ({
          skill: score.skill,
          rawScore: score.rawScore,
          maximumRawScore: score.maximumRawScore,
          band: score.band?.toNumber() ?? null,
        })),
      };
    }
    if (attempt.state !== AttemptState.ACTIVE) throw new AuthError('ATTEMPT_NOT_ACTIVE', 409);
    const manifest = parseFrozenManifestPayload(attempt.manifest.payload);
    if (hashFrozenManifestPayload(manifest) !== attempt.manifest.contentHash) {
      throw new Error('ATTEMPT_MANIFEST_HASH_MISMATCH');
    }
    const frozenObjectiveIds = new Set(manifest.questions
      .filter((question) => question.skill === 'LISTENING' || question.skill === 'READING')
      .map((question) => question.questionId));
    if (
      frozenObjectiveIds.size !== attempt.questions.length
      || attempt.questions.some((question) => !frozenObjectiveIds.has(question.questionId))
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
    const now = new Date();
    const results: Array<{
      skill: 'LISTENING' | 'READING';
      rawScore: number;
      maximumRawScore: number;
      answered: number;
      band: number | null;
      bandScaleId: string | null;
    }> = [];

    for (const skill of ['LISTENING', 'READING'] as const) {
      const skillQuestions = attempt.questions.filter((question) => question.skill === skill);
      if (skillQuestions.length === 0) continue;
      const grouped = new Map<string, typeof skillQuestions>();
      for (const question of skillQuestions) {
        const groupId = question.question.questionGroupId;
        grouped.set(groupId, [...(grouped.get(groupId) ?? []), question]);
      }

      const answers: Record<string, string> = {};
      const groups: ObjectiveGroup[] = [];
      for (const groupQuestions of grouped.values()) {
        const sourceGroup = groupQuestions[0].question.questionGroup;
        const keyRecord = sourceGroup.answerKey;
        if (sourceGroup.reviewStatus !== 'VERIFIED' || keyRecord?.reviewStatus !== 'VERIFIED') {
          throw new Error('UNVERIFIED_ANSWER_KEY');
        }
        const key = objectiveAnswerKeySchema.parse(JSON.parse(decrypt(keyRecord.encryptedPayload)));
        const ordered = [...groupQuestions].sort((left, right) => left.questionOrder - right.questionOrder);
        for (const question of ordered) {
          if (question.questionNumber === null || !question.response) throw new Error('ATTEMPT_RESPONSE_MISSING');
          if (question.maxMarksSnapshot !== question.question.maxMarks) {
            throw new Error('ATTEMPT_QUESTION_MARKS_MISMATCH');
          }
          answers[String(question.questionNumber)] = responseText(question.response.answer);
        }
        groups.push({
          maxMarks: sourceGroup.maxMarks,
          normalization: normalizationRules(keyRecord.normalization),
          answerKey: key,
          questions: ordered.map((question) => ({
            stableKey: question.question.stableKey,
            sourceNumber: question.questionNumber as number,
            maxMarks: question.maxMarksSnapshot,
          })),
        });
      }

      const scored = scoreObjectiveGroups({ groups, answers });
      let band: number | null = null;
      let bandScaleId: string | null = null;
      if (scored.maximumRawScore === 40) {
        const scale = await transaction.bandScale.findFirst({
          where: {
            skill,
            variant: skill === 'LISTENING' ? 'UNIVERSAL' : attempt.blueprint.variant,
            status: 'PUBLISHED',
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          orderBy: { version: 'desc' },
        });
        if (!scale) throw new Error(`BAND_SCALE_NOT_FOUND_${skill}`);
        band = rawScoreToBand(scored.rawScore, validateBandThresholds(scale.thresholds));
        bandScaleId = scale.id;
      }
      results.push({ skill, ...scored, band, bandScaleId });
    }

    if (results.length === 0) throw new Error('OBJECTIVE_ATTEMPT_CONTENT_MISSING');
    await transaction.response.updateMany({
      where: { attemptQuestion: { attemptId }, finalizedAt: null },
      data: { finalizedAt: now },
    });
    for (const result of results) {
      await transaction.attemptSkillScore.create({
        data: {
          attemptId,
          skill: result.skill,
          rawScore: result.rawScore,
          maximumRawScore: result.maximumRawScore,
          band: result.band,
          bandScaleId: result.bandScaleId,
          finalizedAt: now,
        },
      });
    }
    const objectiveOnly = manifest.questions.every((question) => (
      question.skill === 'LISTENING' || question.skill === 'READING'
    ));
    const state = objectiveOnly ? AttemptState.COMPLETED : AttemptState.GRADING;
    await transaction.attemptExecutionLease.deleteMany({ where: { attemptId } });
    await transaction.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        state,
        submittedAt: now,
        completedAt: objectiveOnly ? now : null,
        version: { increment: 1 },
      },
    });
    return {
      attemptId,
      state,
      scores: results.map(({ skill, rawScore, maximumRawScore, band }) => ({
        skill,
        rawScore,
        maximumRawScore,
        band,
      })),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
