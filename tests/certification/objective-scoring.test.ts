import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rawScoreToBand,
  scoreObjectiveGroups,
  validateBandThresholds,
  type ObjectiveGroup,
} from '../../src/lib/grading/objective-scoring-core';

function fortyQuestionFixture(): ObjectiveGroup[] {
  return Array.from({ length: 4 }, (_, part) => {
    const questions = Array.from({ length: 10 }, (_, offset) => {
      const number = part * 10 + offset + 1;
      return { stableKey: `q${number}`, sourceNumber: number, maxMarks: 1 };
    });
    return {
      maxMarks: 10,
      questions,
      normalization: { caseSensitive: false, collapseInternalWhitespace: true },
      answerKey: {
        strategy: 'PER_ITEM_EXACT' as const,
        answersByStableKey: Object.fromEntries(questions.map((question) => [
          question.stableKey,
          [`answer ${question.sourceNumber}`, `alternative ${question.sourceNumber}`],
        ])),
      },
    };
  });
}

const fixture = fortyQuestionFixture();
const correct = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [
  String(index + 1),
  `answer ${index + 1}`,
]));

test('certified 40-mark fixture protects perfect and zero scores', () => {
  assert.deepEqual(scoreObjectiveGroups({ groups: fixture, answers: correct }), {
    rawScore: 40,
    maximumRawScore: 40,
    answered: 40,
  });
  assert.deepEqual(scoreObjectiveGroups({
    groups: fixture,
    answers: Object.fromEntries(Object.keys(correct).map((number) => [number, 'wrong'])),
  }), { rawScore: 0, maximumRawScore: 40, answered: 40 });
});

test('every individual fixture item changes the result by exactly one mark', () => {
  for (let question = 1; question <= 40; question += 1) {
    const onlyCorrect = { [String(question)]: `alternative ${question}` };
    assert.equal(scoreObjectiveGroups({ groups: fixture, answers: onlyCorrect }).rawScore, 1);
    const onlyWrong = { ...correct, [String(question)]: 'wrong' };
    assert.equal(scoreObjectiveGroups({ groups: fixture, answers: onlyWrong }).rawScore, 39);
  }
});

test('legacy whitespace and case normalisation remains stable', () => {
  assert.equal(scoreObjectiveGroups({
    groups: fixture,
    answers: { 1: '  ANSWER   1  ' },
  }).rawScore, 1);
});

test('unordered groups accept permutations without awarding duplicate answers twice', () => {
  const group: ObjectiveGroup = {
    maxMarks: 3,
    questions: [
      { stableKey: 'a', sourceNumber: 1, maxMarks: 1 },
      { stableKey: 'b', sourceNumber: 2, maxMarks: 1 },
      { stableKey: 'c', sourceNumber: 3, maxMarks: 1 },
    ],
    normalization: { caseSensitive: false },
    answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['red', 'blue', 'green']] },
  };
  assert.equal(scoreObjectiveGroups({
    groups: [group], answers: { 1: 'GREEN', 2: 'red', 3: 'blue' },
  }).rawScore, 3);
  assert.equal(scoreObjectiveGroups({
    groups: [group], answers: { 1: 'red', 2: 'red', 3: 'wrong' },
  }).rawScore, 1);
});

test('band thresholds fail closed when malformed', () => {
  const thresholds = validateBandThresholds([[39, 9], [37, 8.5], [1, 1]]);
  assert.equal(rawScoreToBand(40, thresholds), 9);
  assert.equal(rawScoreToBand(38, thresholds), 8.5);
  assert.equal(rawScoreToBand(0, thresholds), 0);
  assert.throws(() => validateBandThresholds([[37, 8], [39, 9]]), /INVALID_BAND_THRESHOLDS/);
});
