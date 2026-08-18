// =============================================================================
// TEST-ONLY HISTORICAL REFERENCE SCORER
// Reconstructed exact scoring behavior from commit 72d17015c3da4d2ad60bce82e35f9a6e4cfa959b.
// Used strictly as a regression comparator, not an ultimate IELTS authority.
// =============================================================================

export type HistoricalNormalization = {
  trimOuterWhitespace?: boolean;
  collapseInternalWhitespace?: boolean;
  caseSensitive?: boolean;
  unicodeForm?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  punctuationSensitive?: boolean;
};

export function historicalNormalizeAnswer(value: string, rules: HistoricalNormalization = {}): string {
  let normalized = value;
  if (rules.trimOuterWhitespace !== false) normalized = normalized.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) {
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');
  }
  if (rules.caseSensitive !== true) normalized = normalized.toLocaleLowerCase('en');
  return normalized;
}

export type HistoricalQuestion = {
  stableKey: string;
  sourceNumber: number | null;
  maxMarks: number;
};

export type HistoricalGroup = {
  scoringStrategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET';
  maxMarks: number;
  questions: HistoricalQuestion[];
  answerKey: {
    strategy: 'PER_ITEM_EXACT' | 'UNORDERED_EXACT_SET';
    answersByStableKey?: Record<string, string[]>;
    acceptedSets?: string[][];
  };
  normalization?: HistoricalNormalization;
};

export type HistoricalSection = {
  skill: 'LISTENING' | 'READING';
  groups: HistoricalGroup[];
};

export function scoreHistoricalContent(
  section: HistoricalSection,
  submittedAnswers: Record<string, string>,
): {
  rawScore: number;
  maximumRawScore: number;
  answered: number;
} {
  let rawScore = 0;
  let maximumRawScore = 0;
  let answered = 0;

  for (const group of section.groups) {
    const rules = group.normalization ?? {};
    maximumRawScore += group.questions.reduce((sum, q) => sum + q.maxMarks, 0);

    if (group.scoringStrategy === 'PER_ITEM_EXACT') {
      const answersMap = group.answerKey.answersByStableKey ?? {};
      for (const question of group.questions) {
        if (question.sourceNumber === null || question.sourceNumber === undefined) continue;
        const response = submittedAnswers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;

        const normalizedResponse = historicalNormalizeAnswer(response, rules);
        const accepted = answersMap[question.stableKey] ?? [];
        if (
          normalizedResponse
          && accepted.some(
            (candidate) => historicalNormalizeAnswer(candidate, rules) === normalizedResponse,
          )
        ) {
          rawScore += question.maxMarks;
        }
      }
    } else if (group.scoringStrategy === 'UNORDERED_EXACT_SET') {
      const acceptedSets = group.answerKey.acceptedSets ?? [];
      const responses: string[] = [];

      for (const question of group.questions) {
        if (question.sourceNumber === null || question.sourceNumber === undefined) continue;
        const response = submittedAnswers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;
        if (response.trim()) {
          responses.push(historicalNormalizeAnswer(response, rules));
        }
      }

      const uniqueResponses = new Set<string>(responses);
      const bestSetScore = acceptedSets.reduce((best, candidate) => {
        const accepted = new Set<string>(
          candidate.map((value) => historicalNormalizeAnswer(value, rules)),
        );
        const score = new Set<string>(
          [...uniqueResponses].filter((response) => accepted.has(response)),
        ).size;
        return Math.max(best, score);
      }, 0);
      rawScore += Math.min(group.maxMarks, bestSetScore);
    }
  }

  return {
    rawScore,
    maximumRawScore,
    answered,
  };
}
