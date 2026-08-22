import { z } from 'zod';

export const normalizationSchema = z.object({
  trimOuterWhitespace: z.boolean().optional(),
  collapseInternalWhitespace: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  unicodeForm: z.enum(['NFC', 'NFD', 'NFKC', 'NFKD']).optional(),
  punctuationSensitive: z.boolean().optional(),
}).strict();

export type NormalizationRules = z.infer<typeof normalizationSchema>;

export const perItemKeySchema = z.object({
  strategy: z.literal('PER_ITEM_EXACT'),
  answersByStableKey: z.record(z.string(), z.array(z.string()).min(1)),
}).strict();

export const unorderedSetKeySchema = z.object({
  strategy: z.literal('UNORDERED_EXACT_SET'),
  acceptedSets: z.array(z.array(z.string()).min(1)).min(1),
}).strict();

export const objectiveAnswerKeySchema = z.discriminatedUnion('strategy', [
  perItemKeySchema,
  unorderedSetKeySchema,
]);

export type ObjectiveAnswerKey = z.infer<typeof objectiveAnswerKeySchema>;

export type ObjectiveQuestion = {
  stableKey: string;
  sourceNumber: number;
  maxMarks: number;
};

export type ObjectiveGroup = {
  scoringStrategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET' | 'RUBRIC' | 'NOT_SCORED';
  maxMarks: number;
  questions: readonly ObjectiveQuestion[];
  answerKey: ObjectiveAnswerKey;
  normalization?: NormalizationRules;
};

export const SUPPORTED_ANSWER_KEY_FORMAT_VERSIONS = [1] as const;

export function assertSupportedAnswerKeyFormatVersion(formatVersion: number) {
  if (!(SUPPORTED_ANSWER_KEY_FORMAT_VERSIONS as readonly number[]).includes(formatVersion)) {
    throw new Error('UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION');
  }
}

export type BandThreshold = readonly [minimumRawScore: number, band: number];

export function normalizeObjectiveAnswer(
  value: string,
  rules: NormalizationRules = {},
) {
  let normalized = rules.trimOuterWhitespace === false ? value : value.trim();
  // Whitespace is presentation rather than answer content. Historical
  // certified scoring always collapsed it, including legacy rows whose
  // now-obsolete flag was false.
  normalized = normalized.replace(/\s+/gu, ' ');
  normalized = normalized.normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) {
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');
  }
  if (rules.caseSensitive === false) normalized = normalized.toLowerCase();
  return normalized;
}

function assertGroupIntegrity(group: ObjectiveGroup) {
  if (group.scoringStrategy === 'RUBRIC' || group.scoringStrategy === 'NOT_SCORED') {
    throw new Error('UNSUPPORTED_OBJECTIVE_SCORING_STRATEGY');
  }
  if (group.scoringStrategy !== group.answerKey.strategy) {
    throw new Error('SCORING_STRATEGY_MISMATCH');
  }
  const stableKeys = group.questions.map((question) => question.stableKey);
  if (new Set(stableKeys).size !== stableKeys.length) {
    throw new Error('DUPLICATE_STABLE_KEY');
  }
  if (group.questions.some((question) => question.maxMarks <= 0)) {
    throw new Error('INVALID_QUESTION_MARKS');
  }
  const marks = group.questions.reduce((sum, question) => sum + question.maxMarks, 0);
  if (marks !== group.maxMarks) throw new Error('INVALID_GROUP_MARKS');

  if (group.answerKey.strategy === 'PER_ITEM_EXACT') {
    const keyed = Object.keys(group.answerKey.answersByStableKey).sort();
    const expected = [...stableKeys].sort();
    if (JSON.stringify(keyed) !== JSON.stringify(expected)) {
      throw new Error('ANSWER_KEY_QUESTION_MISMATCH');
    }
    for (const stableKey of stableKeys) {
      const normalized = group.answerKey.answersByStableKey[stableKey].map((value) => (
        normalizeObjectiveAnswer(value, group.normalization)
      ));
      if (normalized.some((value) => !value)) throw new Error('EMPTY_ACCEPTED_VALUE');
      if (new Set(normalized).size !== normalized.length) {
        throw new Error('DUPLICATE_NORMALIZED_ACCEPTED_VALUE');
      }
    }
    return;
  }

  for (const acceptedSet of group.answerKey.acceptedSets) {
    const normalized = acceptedSet.map((value) => (
      normalizeObjectiveAnswer(value, group.normalization)
    ));
    if (normalized.length !== group.questions.length) {
      throw new Error('UNORDERED_SET_SIZE_MISMATCH');
    }
    if (normalized.some((value) => !value)) throw new Error('EMPTY_ACCEPTED_VALUE');
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('UNORDERED_SET_DUPLICATE_VALUE');
    }
  }
}

export function scoreObjectiveGroups(input: {
  groups: readonly ObjectiveGroup[];
  answers: Readonly<Record<string, string>>;
}) {
  const questions = input.groups.flatMap((group) => [...group.questions]);
  const numbers = questions.map((question) => question.sourceNumber);
  if (numbers.some((number) => !Number.isInteger(number) || number <= 0)) {
    throw new Error('INVALID_OBJECTIVE_QUESTION_NUMBER');
  }
  if (new Set(numbers).size !== numbers.length) throw new Error('DUPLICATE_OBJECTIVE_QUESTION_NUMBER');
  const stableKeys = questions.map((question) => question.stableKey);
  if (new Set(stableKeys).size !== stableKeys.length) throw new Error('DUPLICATE_STABLE_KEY');

  let rawScore = 0;
  let maximumRawScore = 0;
  let answered = 0;

  for (const group of input.groups) {
    assertGroupIntegrity(group);
    maximumRawScore += group.maxMarks;

    if (group.answerKey.strategy === 'PER_ITEM_EXACT') {
      for (const question of group.questions) {
        const response = input.answers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;
        const normalized = normalizeObjectiveAnswer(response, group.normalization);
        const accepted = group.answerKey.answersByStableKey[question.stableKey];
        if (
          normalized
          && accepted.some((candidate) => (
            normalizeObjectiveAnswer(candidate, group.normalization) === normalized
          ))
        ) {
          rawScore += question.maxMarks;
        }
      }
      continue;
    }

    const responses = group.questions.map((question) => {
      const response = input.answers[String(question.sourceNumber)] ?? '';
      if (response.trim()) answered += 1;
      return normalizeObjectiveAnswer(response, group.normalization);
    });
    const uniqueResponses = [...new Set(responses.filter(Boolean))];

    const best = group.answerKey.acceptedSets.reduce((highest, candidate) => {
      const accepted = new Set(candidate.map((value) => (
        normalizeObjectiveAnswer(value, group.normalization)
      )));
      const matches = uniqueResponses.filter((response) => accepted.has(response)).length;
      return Math.max(highest, matches);
    }, 0);
    rawScore += Math.min(group.maxMarks, best);
  }

  return { rawScore, maximumRawScore, answered };
}

export function validateBandThresholds(value: unknown): BandThreshold[] {
  const thresholds = z.array(z.tuple([
    z.number().int().nonnegative(),
    z.number().min(0).max(9).multipleOf(0.5),
  ])).min(1).parse(value) as BandThreshold[];
  for (let index = 1; index < thresholds.length; index += 1) {
    if (
      thresholds[index - 1][0] <= thresholds[index][0]
      || thresholds[index - 1][1] <= thresholds[index][1]
    ) {
      throw new Error('INVALID_BAND_THRESHOLDS');
    }
  }
  return thresholds;
}

export function rawScoreToBand(rawScore: number, thresholds: readonly BandThreshold[]) {
  if (!Number.isInteger(rawScore) || rawScore < 0) throw new Error('INVALID_RAW_SCORE');
  return thresholds.find(([minimum]) => rawScore >= minimum)?.[1] ?? 0;
}

export function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}
