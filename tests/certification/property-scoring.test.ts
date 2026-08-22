import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreObjectiveGroups, type ObjectiveGroup } from '../../src/lib/grading/objective-scoring-core';

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const questions = Array.from({ length: 40 }, (_, index) => ({
  stableKey: `q${index + 1}`,
  sourceNumber: index + 1,
  maxMarks: 1,
}));
const group: ObjectiveGroup = {
  maxMarks: 40,
  questions,
  normalization: { caseSensitive: false },
  answerKey: {
    strategy: 'PER_ITEM_EXACT',
    answersByStableKey: Object.fromEntries(questions.map((question) => [
      question.stableKey,
      [`value-${question.sourceNumber}`],
    ])),
  },
};

test('seed 20260818: 10,000 scorer cases agree with an independent boolean oracle', () => {
  const random = seededRandom(20260818);
  for (let run = 0; run < 10_000; run += 1) {
    let oracle = 0;
    const answers: Record<string, string> = {};
    for (let number = 1; number <= 40; number += 1) {
      if (random() < 0.5) {
        answers[String(number)] = `value-${number}`;
        oracle += 1;
      } else {
        answers[String(number)] = `wrong-${run}-${number}`;
      }
    }
    const result = scoreObjectiveGroups({ groups: [group], answers });
    assert.equal(result.rawScore, oracle, `run ${run}`);
    assert.equal(result.maximumRawScore, 40);
  }
});
