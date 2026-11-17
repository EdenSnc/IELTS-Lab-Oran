import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeDiagnosticRaw, type DiagnosticObjectiveGroup } from '../../src/lib/diagnostic/grading-core';
import type { DiagnosticManifestPayload } from '../../src/lib/diagnostic/manifest';

function fixture(readingCount = 13) {
  const parts: DiagnosticManifestPayload['parts'] = [];
  const questions: DiagnosticManifestPayload['questions'] = [];
  const groups: DiagnosticObjectiveGroup[] = [];
  const responses: Array<{ questionId: string; answer: string }> = [];
  let number = 0;
  for (const [index, skill] of (['LISTENING', 'LISTENING', 'READING', 'WRITING'] as const).entries()) {
    const count = skill === 'READING' ? readingCount : skill === 'WRITING' ? 1 : 10;
    const id = `group-${index}`;
    parts.push({ partId: `part-${index}`, testVersionId: `version-${index}`, testVersionContentHash: 'a'.repeat(64),
      slot: `slot-${index}`, skill, displayOrder: index + 1, sectionTimeLimitSeconds: 1200, groupIds: [id] });
    const sourceQuestions = Array.from({ length: count }, (_, i) => {
      const questionId = `question-${index}-${i}`;
      questions.push({ questionId, skill, partOrder: index + 1, groupOrder: 1, questionOrder: i + 1,
        questionNumber: ++number, maxMarks: skill === 'WRITING' ? 0 : 1, presentedOptions: null });
      responses.push({ questionId, answer: 'A' });
      return { id: questionId, stableKey: `q${i}`, maxMarks: skill === 'WRITING' ? 0 : 1 };
    });
    if (skill !== 'WRITING') groups.push({ id, maxMarks: count, scoringStrategy: 'PER_ITEM_EXACT', questions: sourceQuestions,
      answerKey: { strategy: 'PER_ITEM_EXACT', answersByStableKey: Object.fromEntries(sourceQuestions.map(q => [q.stableKey, ['A', 'B']])) }, normalization: {} });
  }
  return { manifest: { parts, questions }, groups, responses };
}

test('short diagnostic grades only selected raw marks, safely namespacing repeated provider stable keys', () => {
  const result = gradeDiagnosticRaw(fixture());
  assert.deepEqual(result, [{ skill: 'LISTENING', rawScore: 20, maximumRawScore: 20, answered: 20 },
    { skill: 'READING', rawScore: 13, maximumRawScore: 13, answered: 13 }]);
  assert.ok(!JSON.stringify(result).includes('band'));
});
test('accepted alternatives remain arrays and blank responses remain zero, not a fabricated band', () => {
  const input = fixture(); input.responses.forEach(response => { response.answer = 'B'; });
  assert.equal(gradeDiagnosticRaw(input)[0].rawScore, 20);
  input.responses.forEach(response => { response.answer = ''; });
  assert.deepEqual(gradeDiagnosticRaw(input).map(result => [result.rawScore, result.answered]), [[0, 0], [0, 0]]);
});
test('an intact fourteen-mark Reading passage retains its real denominator', () => {
  assert.equal(gradeDiagnosticRaw(fixture(14))[1].maximumRawScore, 14);
});
test('unordered multiple-choice answers are mapped to the intact group and duplicates do not earn two marks', () => {
  const input = fixture(); const original = input.groups[0];
  const remaining = original.questions.slice(2);
  const restId = `${original.id}-rest`;
  input.manifest.parts[0].groupIds.push(restId);
  for (const question of input.manifest.questions.filter(item => item.partOrder === 1 && item.questionOrder > 2)) {
    question.groupOrder = 2; question.questionOrder -= 2;
  }
  input.groups[0] = { ...original, maxMarks: 2, questions: original.questions.slice(0, 2), scoringStrategy: 'UNORDERED_EXACT_SET',
    answerKey: { strategy: 'UNORDERED_EXACT_SET', acceptedSets: [['A', 'B']] } };
  input.groups.push({ ...original, id: restId, maxMarks: 8, questions: remaining,
    answerKey: { strategy: 'PER_ITEM_EXACT', answersByStableKey: Object.fromEntries(remaining.map(question => [question.stableKey, ['A', 'B']])) } });
  assert.equal(gradeDiagnosticRaw(input)[0].rawScore, 19);
  input.responses[1].answer = 'B';
  assert.equal(gradeDiagnosticRaw(input)[0].rawScore, 20);
});
test('missing, additional or altered source scoring slots fail instead of producing a plausible score', () => {
  const missing = fixture(); missing.groups.pop(); assert.throws(() => gradeDiagnosticRaw(missing));
  const partial = fixture(); partial.groups[0].questions.pop(); assert.throws(() => gradeDiagnosticRaw(partial));
  const altered = fixture(); altered.groups[0].questions[0].maxMarks = 2; assert.throws(() => gradeDiagnosticRaw(altered));
  const extra = fixture(); extra.responses.push({ questionId: 'outside-manifest', answer: 'A' }); assert.throws(() => gradeDiagnosticRaw(extra));
});
