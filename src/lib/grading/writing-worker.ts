import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { load } from 'cheerio';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { claimGradingRun } from '@/lib/db/concurrency';
import { downloadPrivateAsset } from '@/lib/content/private-asset-storage';
import { hashFrozenManifestPayload, parseFrozenManifestPayload } from '@/lib/attempts/manifest-core';
import { gradeWritingTasks, type WritingTaskInput } from './writing-grading';
import { roundOverallBand, writingRunInputHash, type FrozenWritingResponse } from './writing-run-core';

export class WritingGradingTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WritingGradingTerminalError';
  }
}

function plainText(html: string) {
  return load(`<body>${html}</body>`)('body').text().replace(/\s+/gu, ' ').trim();
}

function answerText(value: unknown) {
  if (value === null) return '';
  if (typeof value !== 'string') throw new WritingGradingTerminalError('INVALID_WRITING_RESPONSE');
  return value;
}

async function taskImage(storageKey: string | null, mimeType: string | null) {
  if (!storageKey || !mimeType?.startsWith('image/')) return undefined;
  const source = await downloadPrivateAsset(storageKey);
  const png = mimeType === 'image/png' ? source : await sharp(source).png().toBuffer();
  return { data: png.toString('base64'), mimeType: 'image/png' as const };
}

async function loadRunInput(gradingRunId: string) {
  const run = await prisma.gradingRun.findUnique({
    where: { id: gradingRunId },
    include: {
      rubricVersion: { include: { criteria: { orderBy: { displayOrder: 'asc' } } } },
      attempt: {
        include: {
          manifest: true,
          skillScores: true,
          speakingAppointment: true,
          questions: {
            where: { skill: 'WRITING' },
            orderBy: [{ partOrder: 'asc' }, { questionOrder: 'asc' }],
            include: {
              response: true,
              question: {
                include: {
                  questionGroup: {
                    include: {
                      testPart: {
                        include: {
                          stimuli: {
                            where: { type: 'WRITING_PROMPT' },
                            orderBy: { displayOrder: 'asc' },
                            include: { asset: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!run || run.skill !== 'WRITING' || run.graderKind !== 'AI') {
    throw new WritingGradingTerminalError('WRITING_GRADING_RUN_NOT_FOUND');
  }
  if (!run.attempt.manifest) throw new WritingGradingTerminalError('ATTEMPT_MANIFEST_MISSING');
  if (!run.rubricVersion || run.rubricVersion.status !== 'PUBLISHED') {
    throw new WritingGradingTerminalError('WRITING_RUBRIC_NOT_PUBLISHED');
  }
  const manifest = parseFrozenManifestPayload(run.attempt.manifest.payload);
  if (hashFrozenManifestPayload(manifest) !== run.attempt.manifest.contentHash) {
    throw new WritingGradingTerminalError('ATTEMPT_MANIFEST_HASH_MISMATCH');
  }
  const manifestWritingIds = new Set(manifest.questions
    .filter((question) => question.skill === 'WRITING')
    .map((question) => question.questionId));
  if (
    run.attempt.questions.length !== 2
    || manifestWritingIds.size !== 2
    || run.attempt.questions.some((question) => !manifestWritingIds.has(question.questionId))
  ) throw new WritingGradingTerminalError('WRITING_ATTEMPT_QUESTIONS_INVALID');

  const responses: FrozenWritingResponse[] = run.attempt.questions.map((question, index) => ({
    attemptQuestionId: question.id,
    questionId: question.questionId,
    taskNumber: (index + 1) as 1 | 2,
    answer: answerText(question.response?.answer),
  }));
  if (writingRunInputHash(run.attemptId, responses) !== run.inputHash) {
    throw new WritingGradingTerminalError('WRITING_INPUT_HASH_MISMATCH');
  }

  const tasks: WritingTaskInput[] = await Promise.all(run.attempt.questions.map(async (question, index) => {
    const group = question.question.questionGroup;
    const stimulus = group.testPart.stimuli.at(0);
    const promptHtml = stimulus?.bodyHtml ?? group.promptHtml ?? stimulus?.plainText ?? '';
    if (!promptHtml.trim()) throw new WritingGradingTerminalError('WRITING_PROMPT_MISSING');
    return {
      taskNumber: (index + 1) as 1 | 2,
      prompt: plainText(promptHtml),
      answer: responses[index].answer,
      minimumWordCount: group.minWordCount ?? (index === 0 ? 150 : 250),
      image: await taskImage(stimulus?.asset?.storageKey ?? null, stimulus?.asset?.mimeType ?? null),
    };
  }));
  return { run, manifest, responses, tasks };
}

function plainJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function processWritingGradingRun(
  gradingRunId: string,
  grader: typeof gradeWritingTasks = gradeWritingTasks,
) {
  const workerId = randomUUID();
  const claimed = await claimGradingRun(gradingRunId, workerId, 120_000);
  if (!claimed) {
    const existing = await prisma.gradingRun.findUnique({
      where: { id: gradingRunId },
      select: { status: true },
    });
    if (existing?.status === 'SUCCEEDED' || existing?.status === 'SUPERSEDED') {
      return { status: 'already_completed' as const };
    }
    return { status: 'already_claimed' as const };
  }

  try {
    const input = await loadRunInput(gradingRunId);
    const existingWritingScore = input.run.attempt.skillScores.find((score) => score.skill === 'WRITING');
    if (existingWritingScore) {
      await prisma.gradingRun.updateMany({
        where: { id: gradingRunId, status: 'RUNNING', leaseOwner: workerId },
        data: {
          status: 'SUPERSEDED',
          isFinal: false,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
          errorCode: 'CANONICAL_WRITING_SCORE_EXISTS',
        },
      });
      return { status: 'already_completed' as const };
    }

    // Gemini is deliberately called outside any PostgreSQL transaction.
    const graded = await grader(input.tasks);
    return await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT id FROM app_private."GradingRun"
        WHERE id = ${gradingRunId}::uuid
        FOR UPDATE
      `);
      const current = await transaction.gradingRun.findUnique({ where: { id: gradingRunId } });
      if (current?.status === 'SUCCEEDED') return { status: 'already_completed' as const };
      if (current?.status !== 'RUNNING' || current.leaseOwner !== workerId) {
        throw new Error('GRADING_RUN_LEASE_LOST');
      }
      const canonical = await transaction.attemptSkillScore.findUnique({
        where: { attemptId_skill: { attemptId: input.run.attemptId, skill: 'WRITING' } },
      });
      if (canonical) {
        await transaction.gradingRun.update({
          where: { id: gradingRunId },
          data: {
            status: 'SUPERSEDED',
            isFinal: false,
            leaseOwner: null,
            leaseExpiresAt: null,
            completedAt: new Date(),
            errorCode: 'CANONICAL_WRITING_SCORE_EXISTS',
          },
        });
        return { status: 'already_completed' as const };
      }

      const criterionByCode = new Map(input.run.rubricVersion!.criteria.map((criterion) => [criterion.code, criterion]));
      const requiredCodes = [
        'TASK_ACHIEVEMENT_OR_RESPONSE',
        'COHERENCE_AND_COHESION',
        'LEXICAL_RESOURCE',
        'GRAMMATICAL_RANGE_AND_ACCURACY',
      ] as const;
      if (requiredCodes.some((code) => !criterionByCode.has(code))) {
        throw new WritingGradingTerminalError('WRITING_RUBRIC_CRITERIA_MISSING');
      }
      const criterionValues = (task: (typeof graded.taskResults)[number]) => ({
        TASK_ACHIEVEMENT_OR_RESPONSE: task.taskAchievementOrResponse,
        COHERENCE_AND_COHESION: task.coherenceAndCohesion,
        LEXICAL_RESOURCE: task.lexicalResource,
        GRAMMATICAL_RANGE_AND_ACCURACY: task.grammaticalRangeAndAccuracy,
      });
      await transaction.criterionScore.createMany({
        data: graded.taskResults.flatMap((task) => {
          const attemptQuestionId = input.responses[task.taskNumber - 1].attemptQuestionId;
          const values = criterionValues(task);
          return requiredCodes.map((code) => ({
            gradingRunId,
            rubricCriterionId: criterionByCode.get(code)!.id,
            attemptQuestionId,
            band: values[code].band,
            feedback: values[code].rationale,
            evidence: plainJson(values[code].evidence),
          }));
        }),
      });
      const now = new Date();
      await transaction.attemptSkillScore.create({
        data: {
          attemptId: input.run.attemptId,
          gradingRunId,
          skill: 'WRITING',
          band: graded.writingBand,
          finalizedAt: now,
        },
      });
      await transaction.gradingRun.update({
        where: { id: gradingRunId },
        data: {
          status: 'SUCCEEDED',
          provider: graded.provider,
          model: graded.models.join(','),
          promptVersion: graded.promptVersion,
          output: plainJson({ version: 1, writingBand: graded.writingBand, tasks: graded.taskResults }),
          rawOutput: JSON.stringify(graded.rawResponses),
          usageMetadata: plainJson(graded.usageMetadata),
          errorCode: null,
          errorMessage: null,
          isFinal: true,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: now,
          finalizedAt: now,
        },
      });

      const existingScores = input.run.attempt.skillScores
        .filter((score) => score.skill !== 'WRITING')
        .map((score) => ({ skill: score.skill, band: score.band?.toNumber() ?? null }));
      const allScores = [...existingScores, { skill: 'WRITING' as const, band: graded.writingBand }];
      const requiredSkills = new Set(input.manifest.questions.map((question) => question.skill));
      if (input.run.attempt.speakingAppointment) requiredSkills.add('SPEAKING');
      const finalizedSkills = new Set<string>(allScores.map((score) => score.skill));
      const complete = [...requiredSkills].every((skill) => finalizedSkills.has(skill));
      let overallBand: number | null = null;
      const fourSkills = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const;
      if (fourSkills.every((skill) => requiredSkills.has(skill))) {
        const bands = fourSkills.map((skill) => allScores.find((score) => score.skill === skill)?.band ?? null);
        if (bands.every((band): band is number => band !== null)) overallBand = roundOverallBand(bands);
      }
      if (complete) {
        await transaction.assessmentAttempt.update({
          where: { id: input.run.attemptId },
          data: { state: 'COMPLETED', completedAt: now, overallBand, version: { increment: 1 } },
        });
      }
      return { status: 'succeeded' as const, writingBand: graded.writingBand };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const current = await prisma.gradingRun.findUnique({
      where: { id: gradingRunId },
      select: { runAttempt: true },
    });
    const terminal = error instanceof WritingGradingTerminalError || (current?.runAttempt ?? 0) >= 5;
    await prisma.gradingRun.updateMany({
      where: { id: gradingRunId, status: 'RUNNING', leaseOwner: workerId },
      data: {
        status: terminal ? 'FAILED' : 'QUEUED',
        leaseOwner: null,
        leaseExpiresAt: null,
        errorCode: terminal ? 'WRITING_GRADING_TERMINAL' : 'WRITING_GRADING_RETRYABLE',
        errorMessage: error instanceof Error ? error.message.slice(0, 1_500) : 'WRITING_GRADING_FAILED',
        completedAt: terminal ? new Date() : null,
      },
    });
    if (terminal) throw new WritingGradingTerminalError('WRITING_GRADING_TERMINAL');
    throw error;
  }
}
