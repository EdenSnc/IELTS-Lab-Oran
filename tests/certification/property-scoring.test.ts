import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreObjectiveGroups, type NormalizationRules, type ObjectiveGroup } from '../../src/lib/grading/objective-scoring-core';

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function oracleNormalize(value: string, rules: NormalizationRules) {
  let result = rules.trimOuterWhitespace === false ? value : value.trim();
  result = result.replace(/\s+/gu, ' ').normalize(rules.unicodeForm ?? 'NFC');
  if (rules.punctuationSensitive === false) result = result.replace(/[^\p{L}\p{N}\s]/gu, '');
  if (rules.caseSensitive === false) result = result.toLowerCase();
  return result;
}

function oracle(groups: ObjectiveGroup[], answers: Record<string, string>) {
  let rawScore = 0;
  let maximumRawScore = 0;
  let answered = 0;
  for (const group of groups) {
    maximumRawScore += group.maxMarks;
    if (group.answerKey.strategy === 'PER_ITEM_EXACT') {
      for (const question of group.questions) {
        const response = answers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;
        const normalized = oracleNormalize(response, group.normalization ?? {});
        if (normalized && group.answerKey.answersByStableKey[question.stableKey].some((candidate) => (
          oracleNormalize(candidate, group.normalization ?? {}) === normalized
        ))) rawScore += question.maxMarks;
      }
    } else {
      const responses = group.questions.map((question) => {
        const response = answers[String(question.sourceNumber)] ?? '';
        if (response.trim()) answered += 1;
        return oracleNormalize(response, group.normalization ?? {});
      });
      const unique = [...new Set(responses.filter(Boolean))];
      const best = Math.max(...group.answerKey.acceptedSets.map((set) => {
        const accepted = new Set(set.map((value) => oracleNormalize(value, group.normalization ?? {})));
        return unique.filter((value) => accepted.has(value)).length;
      }));
      rawScore += Math.min(group.maxMarks, best);
    }
  }
  return { rawScore, maximumRawScore, answered };
}

test('seed 20260818: 10,000 generated scoring structures agree with an independent oracle', () => {
  const random = seededRandom(20260818);
  for (let run = 0; run < 10_000; run += 1) {
    const groups: ObjectiveGroup[] = [];
    const answers: Record<string, string> = { [String(900_000 + run)]: 'unknown response field' };
    let number = run * 50 + 1;
    const groupCount = 1 + Math.floor(random() * 4);
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const unordered = random() < 0.42;
      const count = unordered ? 2 + Math.floor(random() * 4) : 1 + Math.floor(random() * 5);
      const normalization: NormalizationRules = {
        caseSensitive: random() < 0.5,
        punctuationSensitive: random() < 0.5,
        trimOuterWhitespace: random() < 0.8,
        collapseInternalWhitespace: random() < 0.5,
        unicodeForm: random() < 0.5 ? 'NFC' : 'NFKC',
      };
      const questions = Array.from({ length: count }, (_, questionIndex) => ({
        stableKey: `run-${run}-group-${groupIndex}-q-${questionIndex}`,
        sourceNumber: number++,
        maxMarks: 1,
      }));
      if (unordered) {
        const acceptedSets = Array.from({ length: 1 + Math.floor(random() * 3) }, (_, setIndex) => (
          questions.map((_, questionIndex) => `Set${setIndex} Value${questionIndex}!`)
        ));
        const group: ObjectiveGroup = {
          scoringStrategy: 'UNORDERED_EXACT_SET', maxMarks: count, questions, normalization,
          answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets },
        };
        groups.push(group);
        questions.forEach((question, questionIndex) => {
          const roll = random();
          answers[String(question.sourceNumber)] = roll < 0.15 ? ''
            : roll < 0.35 && questionIndex > 0 ? answers[String(questions[0].sourceNumber)]
              : roll < 0.78 ? acceptedSets[Math.floor(random() * acceptedSets.length)][questionIndex]
                : `wrong-${run}-${groupIndex}-${questionIndex}`;
        });
      } else {
        const answersByStableKey = Object.fromEntries(questions.map((question, questionIndex) => [
          question.stableKey,
          Array.from({ length: 1 + Math.floor(random() * 3) }, (_, alternative) => (
            `Value ${run}-${groupIndex}-${questionIndex}-${alternative}!`
          )),
        ]));
        const group: ObjectiveGroup = {
          scoringStrategy: 'PER_ITEM_EXACT', maxMarks: count, questions, normalization,
          answerKey: { strategy: 'PER_ITEM_EXACT', answersByStableKey },
        };
        groups.push(group);
        questions.forEach((question) => {
          const accepted = answersByStableKey[question.stableKey];
          const roll = random();
          const candidate = accepted[Math.floor(random() * accepted.length)];
          answers[String(question.sourceNumber)] = roll < 0.12 ? ''
            : roll < 0.58 ? candidate
              : roll < 0.76 ? candidate.toUpperCase().replace(/!/gu, '')
                : `wrong-${run}-${question.sourceNumber}`;
        });
      }
    }
    assert.deepEqual(scoreObjectiveGroups({ groups, answers }), oracle(groups, answers), `structure ${run}`);
  }
});

test('malformed generated structures fail closed', () => {
  const base: ObjectiveGroup = {
    scoringStrategy: 'UNORDERED_EXACT_SET', maxMarks: 2,
    questions: [
      { stableKey: 'a', sourceNumber: 1, maxMarks: 1 },
      { stableKey: 'b', sourceNumber: 2, maxMarks: 1 },
    ],
    normalization: { caseSensitive: false },
    answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['same', 'SAME']] },
  };
  assert.throws(() => scoreObjectiveGroups({ groups: [base], answers: {} }), /UNORDERED_SET_DUPLICATE_VALUE/u);
  assert.throws(() => scoreObjectiveGroups({ groups: [{ ...base, maxMarks: 3, answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['a', 'b']] } }], answers: {} }), /INVALID_GROUP_MARKS/u);
  assert.throws(() => scoreObjectiveGroups({ groups: [{ ...base, answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['one']] } }], answers: {} }), /UNORDERED_SET_SIZE_MISMATCH/u);
});
