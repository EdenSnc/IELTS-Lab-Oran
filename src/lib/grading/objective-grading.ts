import 'server-only';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

const perItemKeySchema = z.object({
  strategy: z.literal('PER_ITEM_EXACT'),
  answersByStableKey: z.record(z.string(), z.array(z.string()).min(1)),
});

const setKeySchema = z.object({
  strategy: z.literal('UNORDERED_EXACT_SET'),
  acceptedSets: z.array(z.array(z.string()).min(1)).min(1),
});

const answerKeySchema = z.discriminatedUnion('strategy', [
  perItemKeySchema,
  setKeySchema,
]);

type Normalization = {
  trimOuterWhitespace?: boolean;
  collapseInternalWhitespace?: boolean;
  caseSensitive?: boolean;
  unicodeForm?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  punctuationSensitive?: boolean;
};

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

function normalizeAnswer(value: string, rules: Normalization) {
  let normalized = value;
  if (rules.trimOuterWhitespace !== false) normalized = normalized.trim();
  // Whitespace is presentation, not part of an IELTS answer. A learner must
  // not lose a mark for an accidental double space around an otherwise exact
  // multi-word response.
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) {
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');
  }
  if (rules.caseSensitive === false) normalized = normalized.toLocaleLowerCase('en');
  return normalized;
}

function normalizationRules(value: unknown): Normalization {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Normalization;
}

const LISTENING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5],
  [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5],
  [6, 3], [4, 2.5], [2, 2], [1, 1],
];

const ACADEMIC_READING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
  [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5],
  [6, 3], [4, 2.5], [2, 2], [1, 1],
];

const GENERAL_READING_BANDS: Array<[number, number]> = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5],
  [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5],
  [9, 3], [6, 2.5], [3, 2], [1, 1],
];

export function rawScoreToEstimatedBand(
  skill: 'LISTENING' | 'READING',
  rawScore: number,
  variant: 'ACADEMIC' | 'GENERAL_TRAINING' | 'UNIVERSAL' = 'ACADEMIC',
) {
  const thresholds = skill === 'LISTENING'
    ? LISTENING_BANDS
    : variant === 'GENERAL_TRAINING'
      ? GENERAL_READING_BANDS
      : ACADEMIC_READING_BANDS;
  return thresholds.find(([minimum]) => rawScore >= minimum)?.[1] ?? 0;
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
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
    let rawScore = 0;
    let maximumRawScore = 0;
    let answered = 0;

    for (const part of section.parts) {
      for (const group of part.questionGroups) {
        const keyRecord = group.answerKey;
        if (
          group.reviewStatus !== 'VERIFIED'
          || keyRecord?.reviewStatus !== 'VERIFIED'
        ) {
          throw new Error('UNVERIFIED_ANSWER_KEY');
        }
        const key = answerKeySchema.parse(
          JSON.parse(decrypt(keyRecord.encryptedPayload)),
        );
        const rules = normalizationRules(keyRecord.normalization);
        maximumRawScore += group.questions.reduce(
          (total, question) => total + question.maxMarks,
          0,
        );

        if (key.strategy === 'PER_ITEM_EXACT') {
          for (const question of group.questions) {
            if (question.sourceNumber === null) continue;
            const response = submitted[String(question.sourceNumber)] ?? '';
            if (response.trim()) answered += 1;
            const normalizedResponse = normalizeAnswer(response, rules);
            const accepted = key.answersByStableKey[question.stableKey] ?? [];
            if (
              normalizedResponse
              && accepted.some(
                (candidate) => normalizeAnswer(candidate, rules) === normalizedResponse,
              )
            ) {
              rawScore += question.maxMarks;
            }
          }
          continue;
        }

        const responses = group.questions.flatMap((question) => {
          if (question.sourceNumber === null) return [];
          const response = submitted[String(question.sourceNumber)] ?? '';
          if (response.trim()) answered += 1;
          return response.trim() ? [normalizeAnswer(response, rules)] : [];
        });
        const uniqueResponses = new Set(responses);
        const bestSetScore = key.acceptedSets.reduce((best, candidate) => {
          const accepted = new Set(
            candidate.map((value) => normalizeAnswer(value, rules)),
          );
          const score = new Set(
            [...uniqueResponses].filter((response) => accepted.has(response)),
          ).size;
          return Math.max(best, score);
        }, 0);
        rawScore += Math.min(group.maxMarks, bestSetScore);
      }
    }

    if (maximumRawScore !== 40) {
      throw new Error(`INVALID_MAXIMUM_${section.skill}_${maximumRawScore}`);
    }
    results.push({
      skill: section.skill,
      rawScore,
      maximumRawScore,
      answered,
      band: rawScoreToEstimatedBand(section.skill, rawScore, version.test.variant),
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
