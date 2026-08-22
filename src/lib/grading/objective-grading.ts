import 'server-only';

import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import {
  normalizationSchema,
  objectiveAnswerKeySchema,
  rawScoreToBand,
  roundToHalf,
  scoreObjectiveGroups,
  validateBandThresholds,
  type NormalizationRules,
  type ObjectiveGroup,
} from './objective-scoring-core';

export type ObjectiveSkillResult = {
  skill: 'LISTENING' | 'READING';
  rawScore: number;
  maximumRawScore: number;
  answered: number;
  band: number;
  bandIsEstimate: true;
};

export type ObjectiveGradeResult = {
  testVersionId: string;
  skills: ObjectiveSkillResult[];
  objectiveAverageBand: number;
  detailAccess: false;
};

function normalizationRules(value: unknown): NormalizationRules {
  return normalizationSchema.parse(value ?? {});
}

export async function gradeVerifiedObjectiveAnswers(input: {
  testVersionId: string;
  answers: {
    listening: Record<string, string>;
    reading: Record<string, string>;
  };
}): Promise<ObjectiveGradeResult> {
  const version = await prisma.testVersion.findFirst({
    where: {
      id: input.testVersionId,
      ...(process.env.NODE_ENV === 'production' ? { status: 'PUBLISHED' as const } : {}),
    },
    select: {
      id: true,
      test: { select: { variant: true } },
      sections: {
        where: { skill: { in: ['LISTENING', 'READING'] } },
        select: {
          skill: true,
          parts: {
            select: {
              questionGroups: {
                select: {
                  maxMarks: true,
                  reviewStatus: true,
                  scoringStrategy: true,
                  questions: {
                    orderBy: { displayOrder: 'asc' },
                    select: {
                      stableKey: true,
                      sourceNumber: true,
                      maxMarks: true,
                    },
                  },
                  answerKey: {
                    select: {
                      encryptedPayload: true,
                      normalization: true,
                      reviewStatus: true,
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

  if (!version) throw new Error('TEST_NOT_FOUND');

  const results: ObjectiveSkillResult[] = [];
  for (const section of version.sections) {
    if (section.skill !== 'LISTENING' && section.skill !== 'READING') continue;
    const submitted = input.answers[section.skill.toLowerCase() as 'listening' | 'reading'];
    const groups: ObjectiveGroup[] = [];

    for (const part of section.parts) {
      for (const group of part.questionGroups) {
        const keyRecord = group.answerKey;
        if (
          group.reviewStatus !== 'VERIFIED'
          || keyRecord?.reviewStatus !== 'VERIFIED'
        ) {
          throw new Error('UNVERIFIED_ANSWER_KEY');
        }
        const key = objectiveAnswerKeySchema.parse(
          JSON.parse(decrypt(keyRecord.encryptedPayload)),
        );
        if (group.questions.some((question) => question.sourceNumber === null)) {
          throw new Error('OBJECTIVE_QUESTION_NUMBER_MISSING');
        }
        groups.push({
          maxMarks: group.maxMarks,
          normalization: normalizationRules(keyRecord.normalization),
          answerKey: key,
          questions: group.questions.map((question) => ({
            stableKey: question.stableKey,
            sourceNumber: question.sourceNumber as number,
            maxMarks: question.maxMarks,
          })),
        });
      }
    }

    const scored = scoreObjectiveGroups({ groups, answers: submitted });
    const scaleVariant = section.skill === 'LISTENING'
      ? 'UNIVERSAL' as const
      : version.test.variant;
    const scale = await prisma.bandScale.findFirst({
      where: {
        skill: section.skill,
        variant: scaleVariant,
        status: 'PUBLISHED',
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: new Date() } }],
      },
      orderBy: { version: 'desc' },
      select: { thresholds: true },
    });
    if (!scale) throw new Error(`BAND_SCALE_NOT_FOUND_${section.skill}_${scaleVariant}`);
    const thresholds = validateBandThresholds(scale.thresholds);

    if (scored.maximumRawScore !== 40) {
      throw new Error(`INVALID_MAXIMUM_${section.skill}_${scored.maximumRawScore}`);
    }
    results.push({
      skill: section.skill,
      ...scored,
      band: rawScoreToBand(scored.rawScore, thresholds),
      bandIsEstimate: true,
    });
  }

  if (results.length !== 2) throw new Error('OBJECTIVE_SECTIONS_MISSING');
  results.sort((left, right) => left.skill.localeCompare(right.skill));
  return {
    testVersionId: version.id,
    skills: results,
    objectiveAverageBand: roundToHalf(
      results.reduce((total, result) => total + result.band, 0) / results.length,
    ),
    detailAccess: false,
  };
}
