// =============================================================================
// TEST-ONLY INDEPENDENT SCORING ORACLE
// Pure reference implementation built from official IELTS specifications.
// Does NOT import or reuse any production grading or normalization helpers.
// =============================================================================

export type OracleNormalization = {
  trimOuterWhitespace?: boolean;
  collapseInternalWhitespace?: boolean;
  caseSensitive?: boolean;
  unicodeForm?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  punctuationSensitive?: boolean;
};

export type OracleQuestion = {
  stableKey: string;
  sourceNumber: number | null;
  maxMarks: number;
};

export type OracleQuestionGroup = {
  questionType: string;
  scoringStrategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET' | 'RUBRIC' | 'NOT_SCORED';
  maxMarks: number;
  maxWords?: number | null;
  allowNumbers?: boolean | null;
  rawAnswerInstruction?: string | null;
  questions: OracleQuestion[];
  answerKeyPayload: {
    strategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET';
    answersByStableKey?: Record<string, string[]>;
    acceptedSets?: string[][];
  };
  normalization?: OracleNormalization;
};

export type OracleSection = {
  skill: 'LISTENING' | 'READING';
  variant: 'ACADEMIC' | 'GENERAL_TRAINING' | 'UNIVERSAL';
  groups: OracleQuestionGroup[];
};

export function oracleNormalize(value: string, rules: OracleNormalization = {}): string {
  let res = value;
  if (rules.trimOuterWhitespace !== false) {
    res = res.trim();
  }
  // Independent internal whitespace collapse
  res = res.replace(/\s+/g, ' ');
  res = res.normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) {
    res = res.replace(/[^\p{L}\p{N}\s]/gu, '');
  }
  if (rules.caseSensitive !== true) {
    res = res.toLocaleLowerCase('en');
  }
  return res;
}

export const ORACLE_LISTENING_BANDS: Array<[number, number]> = [
  [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5],
  [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5], [11, 4.0], [8, 3.5],
  [6, 3.0], [4, 2.5], [2, 2.0], [1, 1.0], [0, 0.0],
];

export const ORACLE_ACADEMIC_READING_BANDS: Array<[number, number]> = [
  [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5],
  [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5],
  [6, 3.0], [4, 2.5], [2, 2.0], [1, 1.0], [0, 0.0],
];

export const ORACLE_GENERAL_READING_BANDS: Array<[number, number]> = [
  [40, 9.0], [39, 8.5], [37, 8.0], [36, 7.5], [34, 7.0], [32, 6.5],
  [30, 6.0], [27, 5.5], [23, 5.0], [19, 4.5], [15, 4.0], [12, 3.5],
  [9, 3.0], [6, 2.5], [3, 2.0], [1, 1.0], [0, 0.0],
];

export function oracleRawToBand(
  skill: 'LISTENING' | 'READING',
  rawScore: number,
  variant: 'ACADEMIC' | 'GENERAL_TRAINING' | 'UNIVERSAL' = 'ACADEMIC',
): number {
  const table = skill === 'LISTENING'
    ? ORACLE_LISTENING_BANDS
    : variant === 'GENERAL_TRAINING'
      ? ORACLE_GENERAL_READING_BANDS
      : ORACLE_ACADEMIC_READING_BANDS;
  const match = table.find(([minScore]) => rawScore >= minScore);
  return match ? match[1] : 0;
}

export function oracleGradeSection(
  section: OracleSection,
  submittedAnswers: Record<string, string>,
): {
  rawScore: number;
  maximumRawScore: number;
  answered: number;
  band: number | null;
} {
  let rawScore = 0;
  let maximumRawScore = 0;
  let answered = 0;

  for (const group of section.groups) {
    const normRules = group.normalization ?? {};
    maximumRawScore += group.questions.reduce((sum, q) => sum + q.maxMarks, 0);

    if (group.scoringStrategy === 'PER_ITEM_EXACT') {
      const answersMap = group.answerKeyPayload.answersByStableKey ?? {};
      for (const question of group.questions) {
        if (question.sourceNumber === null) continue;
        const response = submittedAnswers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;

        const normalizedResponse = oracleNormalize(response, normRules);
        const acceptedVariants = answersMap[question.stableKey] ?? [];

        const isAccepted = normalizedResponse && acceptedVariants.some(
          (cand) => oracleNormalize(cand, normRules) === normalizedResponse,
        );

        if (isAccepted) {
          rawScore += question.maxMarks;
        }
      }
    } else if (group.scoringStrategy === 'UNORDERED_EXACT_SET') {
      const acceptedSets = group.answerKeyPayload.acceptedSets ?? [];
      const responses: string[] = [];

      for (const question of group.questions) {
        if (question.sourceNumber === null) continue;
        const response = submittedAnswers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;

        if (response.trim()) {
          responses.push(oracleNormalize(response, normRules));
        }
      }

      const uniqueResponses = new Set(responses);
      let bestSetScore = 0;

      for (const set of acceptedSets) {
        const normalizedSet = new Set(set.map((val) => oracleNormalize(val, normRules)));
        const matchCount = [...uniqueResponses].filter((r) => normalizedSet.has(r)).length;
        if (matchCount > bestSetScore) {
          bestSetScore = matchCount;
        }
      }

      rawScore += Math.min(group.maxMarks, bestSetScore);
    }
  }

  const band = maximumRawScore === 40
    ? oracleRawToBand(section.skill, rawScore, section.variant)
    : null;

  return {
    rawScore,
    maximumRawScore,
    answered,
    band,
  };
}

export function oracleRoundOverall(average: number): number {
  // Official IELTS overall band rounding:
  // - Fractional part >= .75 -> rounds up to next whole band (e.g. 6.75 -> 7.0)
  // - Fractional part >= .25 and < .75 -> rounds to half band (e.g. 6.25 -> 6.5, 6.5 -> 6.5)
  // - Fractional part < .25 -> rounds down to whole band (e.g. 6.125 -> 6.0)
  const floor = Math.floor(average);
  const frac = average - floor;
  const eps = 1e-9;

  if (frac >= 0.75 - eps) return floor + 1.0;
  if (frac >= 0.25 - eps) return floor + 0.5;
  return floor + 0.0;
}
