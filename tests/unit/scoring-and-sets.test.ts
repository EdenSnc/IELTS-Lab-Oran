import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer } from '../../src/lib/grading/objective-grading.ts';

test('Scoring: multiple accepted alternatives match correctly (Invariant 4)', () => {
  const acceptedAlternatives = ['50%', '50 percent', 'fifty percent', 'half'];
  const rules = { caseSensitive: false, punctuationSensitive: false };

  const candidateInputs = [
    '50%',
    '50 percent',
    'FIFTY PERCENT',
    'Half',
  ];

  for (const input of candidateInputs) {
    const normalizedInput = normalizeAnswer(input, rules);
    const matches = acceptedAlternatives.some(
      (alt) => normalizeAnswer(alt, rules) === normalizedInput,
    );
    assert.ok(matches, `Expected input '${input}' to match accepted alternatives`);
  }

  const incorrectInput = '60 percent';
  const normalizedIncorrect = normalizeAnswer(incorrectInput, rules);
  const incorrectMatches = acceptedAlternatives.some(
    (alt) => normalizeAnswer(alt, rules) === normalizedIncorrect,
  );
  assert.equal(incorrectMatches, false);
});

test('Scoring: unordered accepted set matching (Invariant 5)', () => {
  // IELTS questions: "Choose TWO letters A-E"
  const acceptedSets = [
    ['B', 'D'], // Candidate can provide B and D in any order
  ];
  const rules = { caseSensitive: false };

  // Candidate provides D in question 1 and B in question 2
  const candidateResponses = ['D', 'B'].map((r) => normalizeAnswer(r, rules));
  const uniqueResponses = new Set(candidateResponses);

  const bestSetScore = acceptedSets.reduce((best, candidate) => {
    const accepted = new Set(candidate.map((v) => normalizeAnswer(v, rules)));
    const score = [...uniqueResponses].filter((r) => accepted.has(r)).length;
    return Math.max(best, score);
  }, 0);

  assert.equal(bestSetScore, 2);

  // Candidate provides one correct (B) and one incorrect (A)
  const partialResponses = ['B', 'A'].map((r) => normalizeAnswer(r, rules));
  const uniquePartial = new Set(partialResponses);
  const partialScore = acceptedSets.reduce((best, candidate) => {
    const accepted = new Set(candidate.map((v) => normalizeAnswer(v, rules)));
    const score = [...uniquePartial].filter((r) => accepted.has(r)).length;
    return Math.max(best, score);
  }, 0);

  assert.equal(partialScore, 1);
});
