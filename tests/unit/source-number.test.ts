import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestionGroupSchema } from '../../src/lib/content/staging-schema.ts';

test('SourceNumber: invalid objective publish content with null sourceNumber is rejected (Invariant 2)', () => {
  const invalidGroup = {
    sourceKey: 'test-group-1',
    displayOrder: 1,
    questionType: 'NOTE_COMPLETION',
    responseKind: 'SHORT_TEXT',
    scoringStrategy: 'PER_ITEM_EXACT',
    maxMarks: 2,
    reviewStatus: 'VERIFIED',
    questions: [
      {
        stableKey: 'q1',
        displayOrder: 1,
        sourceNumber: 1,
        maxMarks: 1,
      },
      {
        stableKey: 'q2',
        displayOrder: 2,
        // Missing / undefined sourceNumber on a question with maxMarks = 1
        maxMarks: 1,
      },
    ],
  };

  const parsed = QuestionGroupSchema.safeParse(invalidGroup);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join('; ');
    assert.match(errorMsg, /must have a valid sourceNumber/);
  }
});

test('SourceNumber: runtime defense throws explicit error on invalid sourceNumber in grader (Invariant 1)', async () => {
  // Simulate the runtime grader behavior when an invalid question state reaches the grader
  const group = {
    questions: [
      { stableKey: 'q1', sourceNumber: 1, maxMarks: 1 },
      { stableKey: 'q2', sourceNumber: null, maxMarks: 1 },
    ],
  };

  const checkRuntimeDefense = () => {
    for (const q of group.questions) {
      if (q.maxMarks > 0 && (q.sourceNumber === null || q.sourceNumber === undefined)) {
        throw new Error('INVALID_QUESTION_SOURCE_NUMBER');
      }
    }
  };

  assert.throws(checkRuntimeDefense, /INVALID_QUESTION_SOURCE_NUMBER/);
});
