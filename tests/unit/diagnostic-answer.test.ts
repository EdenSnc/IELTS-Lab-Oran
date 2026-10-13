import assert from 'node:assert/strict';
import test from 'node:test';
import type { DeliveryQuestionGroup } from '../../src/lib/content/delivery-types';
import { countDiagnosticWords, diagnosticControlKind, mapDiagnosticSelection, toggleDiagnosticSelection, boundDiagnosticEssay } from '../../src/lib/diagnostic/answer-core';

const group: DeliveryQuestionGroup = {
  id: 'g', displayOrder: 0, questionType: 'MULTIPLE_CHOICE', responseKind: 'MULTIPLE_CHOICE',
  scoringStrategy: 'UNORDERED_EXACT_SET', sourceNumberStart: 21, sourceNumberEnd: 22,
  instructionsHtml: '<p>Choose two letters.</p>', promptHtml: '<p>Which features?</p>',
  options: [{ label: 'C', text: 'Third' }, { label: 'A', text: 'First' }, { label: 'B', text: 'Second' }],
  maxMarks: 2, minWordCount: null, maxWords: null, allowNumbers: null, rawAnswerInstruction: null,
  questions: [21, 22].map((n) => ({ id: `q${n}`, stableKey: `q${n}`, sourceNumber: n, displayOrder: n, promptHtml: null, maxMarks: 1 })),
};

test('selected labels map to scoring slots in source option order, not click order', () => {
  assert.deepEqual(mapDiagnosticSelection(group, ['A', 'C']), { q21: 'C', q22: 'A' });
  assert.deepEqual(mapDiagnosticSelection(group, ['B']), { q21: 'B', q22: '' });
});

test('deselect, clear and reselect update every scoring slot without stale labels', () => {
  const answers = { q21: 'C', q22: 'A' };
  assert.deepEqual(toggleDiagnosticSelection(group, answers, 'C'), { q21: 'A', q22: '' });
  assert.deepEqual(mapDiagnosticSelection(group, []), { q21: '', q22: '' });
  assert.deepEqual(toggleDiagnosticSelection(group, { q21: 'A', q22: '' }, 'B'), { q21: 'A', q22: 'B' });
  assert.deepEqual(answers, { q21: 'C', q22: 'A' });
});

test('maximum count is enforced and unknown labels cannot be submitted', () => {
  assert.deepEqual(toggleDiagnosticSelection(group, { q21: 'C', q22: 'A' }, 'B'), { q21: 'C', q22: 'A' });
  assert.throws(() => mapDiagnosticSelection(group, ['C', 'A', 'B']));
  assert.throws(() => mapDiagnosticSelection(group, ['X']));
  assert.throws(() => mapDiagnosticSelection(group, ['A', 'A']));
});

test('essential malformed options and unsupported response kinds fail closed', () => {
  assert.equal(diagnosticControlKind(group), 'multi');
  for (const malformed of [
    { ...group, options: [] }, { ...group, options: [{ label: 'A', text: 'One' }, { label: 'A', text: 'Two' }] },
    { ...group, options: [{ label: '', text: 'One' }] }, { ...group, questions: [] },
    { ...group, questions: [group.questions[0], group.questions[0]] },
    { ...group, responseKind: 'AUDIO_RECORDING' }, { ...group, responseKind: 'NONE' },
    { ...group, responseKind: 'LONG_TEXT', questionType: 'WRITING_TASK_1_ACADEMIC' },
  ]) assert.equal(diagnosticControlKind(malformed), 'unsupported');
  assert.equal(diagnosticControlKind({ ...group, responseKind: 'DRAG_DROP', scoringStrategy: 'PER_ITEM_EXACT' }), 'select');
  assert.equal(diagnosticControlKind({ ...group, responseKind: 'SHORT_TEXT', scoringStrategy: 'PER_ITEM_EXACT' }), 'short');
  assert.equal(diagnosticControlKind({ ...group, responseKind: 'SINGLE_CHOICE', scoringStrategy: 'PER_ITEM_EXACT' }), 'single');
});

test('word count handles blank, punctuation, Unicode and contractions without counting emoji', () => {
  for (const [text, count] of [['', 0], [' \n\t ', 0], ['... 🙂', 0], ["It's well-written. 42", 3], ['Bonjour élève مرحبا بالعالم', 4], ['hello\nworld', 2]] as const) {
    assert.equal(countDiagnosticWords(text), count);
  }
});

test('essay bounding enforces 20000 characters without leaving a broken surrogate', () => {
  assert.equal(boundDiagnosticEssay('a'.repeat(20_001)).length, 20_000);
  assert.equal(boundDiagnosticEssay('a'.repeat(19_999) + '🙂'), 'a'.repeat(19_999));
  assert.equal(boundDiagnosticEssay('a'.repeat(19_998) + '🙂').length, 20_000);
});

test('numeric words keep decimal and thousands separators together', () => {
  assert.equal(countDiagnosticWords('3.5 1,000 ١٫٥'), 3);
});
