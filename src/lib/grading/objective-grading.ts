import 'server-only';

import { z } from 'zod';
import prisma from '../prisma.ts';
import { decrypt } from '../crypto.ts';

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

export type AnswerKeyPayload = z.infer<typeof answerKeySchema>;

export type Normalization = {
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
  band: number | null;
  bandScaleId?: string;
  bandIsEstimate: boolean;
};

export type ObjectiveGradeResult = {
  testVersionId: string;
  skills: ObjectiveSkillResult[];
  objectiveAverageBand: number | null;
  detailAccess: false;
};

export function normalizeAnswer(value: string, rules: Normalization = {}): string {
  let normalized = value;
  if (rules.trimOuterWhitespace !== false) normalized = normalized.trim();
  // Whitespace collapsing is an engine invariant for objective scoring.
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) {
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');
  }
  if (rules.caseSensitive !== true) {
    normalized = normalized.toLocaleLowerCase('en');
  }
  return normalized;
}

export function countWordsAndNumbers(value: string): { words: number; numbers: number; total: number } {
  const trimmed = value.trim();
  if (!trimmed) return { words: 0, numbers: 0, total: 0 };
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let words = 0;
  let numbers = 0;
  for (const token of tokens) {
    if (/^[\$£€¥]?\d+(?:[.,]\d+)*[%]?$/.test(token)) {
      numbers += 1;
    } else {
      words += 1;
    }
  }
  return { words, numbers, total: tokens.length };
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function isWithinWordLimit(
  value: string,
  limits: { maxWords?: number | null; allowNumbers?: boolean | null },
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const { words, numbers, total } = countWordsAndNumbers(trimmed);

  if (limits.allowNumbers === false) {
    if (numbers > 0 || /\d/.test(trimmed)) return false;
    if (limits.maxWords !== undefined && limits.maxWords !== null && limits.maxWords > 0) {
      if (words > limits.maxWords) return false;
    }
  } else if (limits.allowNumbers === true) {
    // Content-level word limit helper: "AND/OR A NUMBER" permits up to maxWords non-numeric words alongside numbers
    if (limits.maxWords !== undefined && limits.maxWords !== null && limits.maxWords > 0) {
      if (words > limits.maxWords) return false;
    }
  } else {
    if (limits.maxWords !== undefined && limits.maxWords !== null && limits.maxWords > 0) {
      if (total > limits.maxWords) return false;
    }
  }
  return true;
}

function normalizationRules(value: unknown): Normalization {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Normalization;
}

export const LISTENING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5],
  [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5],
  [6, 3], [4, 2.5], [2, 2], [1, 1],
];

export const ACADEMIC_READING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
  [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5],
  [6, 3], [4, 2.5], [2, 2], [1, 1],
];

export const GENERAL_READING_BANDS: Array<[number, number]> = [
  [40, 9], [39, 8.5], [37, 8], [36, 7.5], [34, 7], [32, 6.5],
  [30, 6], [27, 5.5], [23, 5], [19, 4.5], [15, 4], [12, 3.5],
  [9, 3], [6, 2.5], [3, 2], [1, 1],
];

const SUPPORTED_ANSWER_KEY_FORMAT_VERSIONS = new Set([1]);

export function parseAnswerKeyPayload(encryptedPayload: string, formatVersion: number = 1) {
  if (!SUPPORTED_ANSWER_KEY_FORMAT_VERSIONS.has(formatVersion)) {
    throw new Error(`UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION: ${formatVersion}`);
  }
  const decrypted = decrypt(encryptedPayload);
  const parsedJson = JSON.parse(decrypted);
  return answerKeySchema.parse(parsedJson);
}

export async function resolveBandScale(input: {
  skill: 'LISTENING' | 'READING';
  variant?: 'ACADEMIC' | 'GENERAL_TRAINING' | 'UNIVERSAL';
  rawScore: number;
  maximumRawScore: number;
  bandScaleId?: string;
  isProduction?: boolean;
}): Promise<{ band: number | null; bandScaleId?: string }> {
  if (input.maximumRawScore !== 40) {
    return { band: null };
  }

  const variant = input.variant ?? 'ACADEMIC';
  const targetCode = input.skill === 'LISTENING'
    ? 'IELTS_LISTENING_ESTIMATE'
    : variant === 'GENERAL_TRAINING'
      ? 'IELTS_GENERAL_READING_ESTIMATE'
      : 'IELTS_ACADEMIC_READING_ESTIMATE';

  let bandScaleRecord = null;
  try {
    if (input.bandScaleId) {
      bandScaleRecord = await prisma.bandScale.findUnique({
        where: { id: input.bandScaleId },
      });
    }
    if (!bandScaleRecord) {
      bandScaleRecord = await prisma.bandScale.findFirst({
        where: {
          code: targetCode,
          status: 'PUBLISHED',
        },
        orderBy: { version: 'desc' },
      });
    }
  } catch {
    if (process.env.NODE_ENV === 'production' || input.isProduction) {
      throw new Error('BAND_SCALE_UNAVAILABLE');
    }
  }

  if (bandScaleRecord && Array.isArray(bandScaleRecord.thresholds)) {
    const thresholds = bandScaleRecord.thresholds as Array<[number, number]>;
    const match = thresholds.find(([minScore]) => input.rawScore >= minScore);
    return {
      band: match ? match[1] : 0,
      bandScaleId: bandScaleRecord.id,
    };
  }

  if (process.env.NODE_ENV === 'production' || input.isProduction) {
    throw new Error('BAND_SCALE_UNAVAILABLE');
  }

  const fallbackThresholds = input.skill === 'LISTENING'
    ? LISTENING_BANDS
    : variant === 'GENERAL_TRAINING'
      ? GENERAL_READING_BANDS
      : ACADEMIC_READING_BANDS;
  const match = fallbackThresholds.find(([minScore]) => input.rawScore >= minScore);
  return {
    band: match ? match[1] : 0,
  };
}

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

// =============================================================================
// PURE DETERMINISTIC LOADED-CONTENT SCORING BOUNDARY
// =============================================================================

export type LoadedObjectiveQuestion = {
  stableKey: string;
  sourceNumber: number | null;
  maxMarks: number;
};

export type LoadedObjectiveGroup = {
  id?: string;
  questionType?: string;
  scoringStrategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET';
  maxMarks: number;
  maxWords?: number | null;
  allowNumbers?: boolean | null;
  rawAnswerInstruction?: string | null;
  questions: LoadedObjectiveQuestion[];
  answerKey: {
    payload: AnswerKeyPayload;
    normalization?: Normalization;
  };
};

export type LoadedObjectivePart = {
  questionGroups: LoadedObjectiveGroup[];
};

export type LoadedObjectiveSection = {
  skill: 'LISTENING' | 'READING';
  parts: LoadedObjectivePart[];
};

export type ScoredSectionResult = {
  skill: 'LISTENING' | 'READING';
  rawScore: number;
  maximumRawScore: number;
  answered: number;
};

export function scoreLoadedObjectiveContent(input: {
  sections: LoadedObjectiveSection[];
  submittedAnswers: {
    listening?: Record<string, string>;
    reading?: Record<string, string>;
  };
}): ScoredSectionResult[] {
  const results: ScoredSectionResult[] = [];

  for (const section of input.sections) {
    const skillKey = section.skill.toLowerCase() as 'listening' | 'reading';
    const submitted = input.submittedAnswers[skillKey] ?? {};
    let rawScore = 0;
    let maximumRawScore = 0;
    let answered = 0;

    for (const part of section.parts) {
      for (const group of part.questionGroups) {
        // Runtime defense: any scored question must have a valid sourceNumber
        for (const question of group.questions) {
          if (question.maxMarks > 0 && (question.sourceNumber === null || question.sourceNumber === undefined)) {
            throw new Error('INVALID_QUESTION_SOURCE_NUMBER');
          }
        }

        const key = group.answerKey.payload;
        const rules = normalizationRules(group.answerKey.normalization);

        maximumRawScore += group.questions.reduce(
          (total, question) => total + question.maxMarks,
          0,
        );

        if (key.strategy === 'PER_ITEM_EXACT') {
          for (const question of group.questions) {
            if (question.sourceNumber === null || question.sourceNumber === undefined) continue;
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
        } else if (key.strategy === 'UNORDERED_EXACT_SET') {
          const responses = group.questions.flatMap((question) => {
            if (question.sourceNumber === null || question.sourceNumber === undefined) return [];
            const response = submitted[String(question.sourceNumber)] ?? '';
            if (response.trim()) answered += 1;
            return response.trim() ? [normalizeAnswer(response, rules)] : [];
          });

          const uniqueResponses = new Set<string>(responses);
          const bestSetScore = key.acceptedSets.reduce((best, candidate) => {
            const accepted = new Set<string>(
              candidate.map((value) => normalizeAnswer(value, rules)),
            );
            const score = new Set<string>(
              [...uniqueResponses].filter((response) => accepted.has(response)),
            ).size;
            return Math.max(best, score);
          }, 0);
          rawScore += Math.min(group.maxMarks, bestSetScore);
        }
      }
    }

    results.push({
      skill: section.skill,
      rawScore,
      maximumRawScore,
      answered,
    });
  }

  return results;
}

// =============================================================================
// DATABASE-BACKED VERIFIED OBJECTIVE TEST GRADER
// =============================================================================

type CachedTestVersion = NonNullable<Awaited<ReturnType<typeof prisma.testVersion.findFirst<{
  select: {
    id: true;
    test: { select: { variant: true } };
    sections: {
      where: { skill: { in: ['LISTENING', 'READING'] } };
      select: {
        skill: true;
        parts: {
          select: {
            questionGroups: {
              select: {
                maxMarks: true;
                maxWords: true;
                allowNumbers: true;
                reviewStatus: true;
                scoringStrategy: true;
                questions: {
                  orderBy: { displayOrder: 'asc' };
                  select: {
                    stableKey: true;
                    sourceNumber: true;
                    maxMarks: true;
                  };
                };
                answerKey: {
                  select: {
                    encryptedPayload: true;
                    formatVersion: true;
                    normalization: true;
                    reviewStatus: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>>>>;

const testVersionCache = new Map<string, CachedTestVersion>();

export async function gradeVerifiedObjectiveAnswers(input: {
  testVersionId: string;
  answers: {
    listening: Record<string, string>;
    reading: Record<string, string>;
  };
}): Promise<ObjectiveGradeResult> {
  let version: CachedTestVersion | null = testVersionCache.get(input.testVersionId) ?? null;
  if (!version) {
    version = await prisma.testVersion.findFirst({
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
                    maxWords: true,
                    allowNumbers: true,
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
                        formatVersion: true,
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
    if (version) {
      testVersionCache.set(input.testVersionId, version);
    }
  }

  if (!version) throw new Error('TEST_NOT_FOUND');

  // Verify and load content structure
  const loadedSections: LoadedObjectiveSection[] = [];
  for (const section of version.sections) {
    if (section.skill !== 'LISTENING' && section.skill !== 'READING') continue;
    const parts: LoadedObjectivePart[] = [];

    for (const part of section.parts) {
      const questionGroups: LoadedObjectiveGroup[] = [];
      for (const group of part.questionGroups) {
        const keyRecord = group.answerKey;
        if (
          group.reviewStatus !== 'VERIFIED'
          || keyRecord?.reviewStatus !== 'VERIFIED'
        ) {
          throw new Error('UNVERIFIED_ANSWER_KEY');
        }

        const parsedKey = parseAnswerKeyPayload(keyRecord.encryptedPayload, keyRecord.formatVersion);
        questionGroups.push({
          scoringStrategy: group.scoringStrategy as 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET',
          maxMarks: group.maxMarks,
          maxWords: group.maxWords,
          allowNumbers: group.allowNumbers,
          rawAnswerInstruction: null,
          questions: group.questions.map((q) => ({
            stableKey: q.stableKey,
            sourceNumber: q.sourceNumber,
            maxMarks: q.maxMarks,
          })),
          answerKey: {
            payload: parsedKey,
            normalization: normalizationRules(keyRecord.normalization),
          },
        });
      }
      parts.push({ questionGroups });
    }

    loadedSections.push({
      skill: section.skill as 'LISTENING' | 'READING',
      parts,
    });
  }

  // Calculate deterministic raw scores via pure scoring boundary
  const scoredSectionResults = scoreLoadedObjectiveContent({
    sections: loadedSections,
    submittedAnswers: input.answers,
  });

  const results: ObjectiveSkillResult[] = [];
  for (const scored of scoredSectionResults) {
    const { band, bandScaleId } = await resolveBandScale({
      skill: scored.skill,
      variant: version.test.variant,
      rawScore: scored.rawScore,
      maximumRawScore: scored.maximumRawScore,
    });

    results.push({
      skill: scored.skill,
      rawScore: scored.rawScore,
      maximumRawScore: scored.maximumRawScore,
      answered: scored.answered,
      band,
      bandScaleId,
      bandIsEstimate: band !== null,
    });
  }

  if (results.length === 0) throw new Error('OBJECTIVE_SECTIONS_MISSING');
  results.sort((left, right) => left.skill.localeCompare(right.skill));

  const bands = results.map((r) => r.band).filter((b): b is number => b !== null);
  const objectiveAverageBand = bands.length === results.length && bands.length > 0
    ? roundToHalf(bands.reduce((sum, b) => sum + b, 0) / bands.length)
    : null;

  return {
    testVersionId: version.id,
    skills: results,
    objectiveAverageBand,
    detailAccess: false,
  };
}
