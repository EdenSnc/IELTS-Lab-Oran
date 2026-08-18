import test from 'node:test';
import assert from 'node:assert/strict';
import { countWords, isWithinWordLimit } from '../../src/lib/grading/objective-grading.ts';
import {
  validateAnswerInstructionContract,
  validateFullIeltsMockSection,
} from '../../src/lib/content/staging-schema.ts';

test('Word Limits: countWords accurately counts words and compounds', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords('solar panel'), 2);
  assert.equal(countWords('   renewable   energy   sources   '), 3);
  // Hyphenated compound word counts as one word in IELTS
  assert.equal(countWords('state-of-the-art'), 1);
  assert.equal(countWords('twenty-five students'), 2);
});

test('Word Limits: valid cases within limit are accepted (Invariant 6)', () => {
  // NO MORE THAN TWO WORDS
  const limit = { maxWords: 2, allowNumbers: true };
  assert.ok(isWithinWordLimit('water filter', limit));
  assert.ok(isWithinWordLimit('filter', limit));
  assert.ok(isWithinWordLimit('25 kilograms', limit));
  assert.ok(isWithinWordLimit('', limit));
});

test('Word Limits: excess words are rejected (Invariant 7)', () => {
  // NO MORE THAN TWO WORDS
  const limit = { maxWords: 2, allowNumbers: true };
  assert.equal(isWithinWordLimit('clean water filter', limit), false);
  assert.equal(isWithinWordLimit('one two three four', limit), false);

  // Disallowed numbers
  const noNumbersLimit = { maxWords: 3, allowNumbers: false };
  assert.equal(isWithinWordLimit('room 42', noNumbersLimit), false);
  assert.ok(isWithinWordLimit('room forty two', noNumbersLimit));
});

test('Content Validation: validateAnswerInstructionContract recognizes supported families', () => {
  // Recognized families
  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'ONE WORD ONLY', maxWords: 1, allowNumbers: false }),
    { valid: true, maxWords: 1, allowNumbers: false },
  );

  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'NO MORE THAN TWO WORDS', maxWords: 2, allowNumbers: false }),
    { valid: true, maxWords: 2, allowNumbers: false },
  );

  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'ONE WORD AND/OR A NUMBER', maxWords: 1, allowNumbers: true }),
    { valid: true, maxWords: 1, allowNumbers: true },
  );

  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'NO MORE THAN THREE WORDS AND/OR A NUMBER', maxWords: 3, allowNumbers: true }),
    { valid: true, maxWords: 3, allowNumbers: true },
  );

  // Mismatch
  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'ONE WORD ONLY', maxWords: 2, allowNumbers: false }),
    { valid: false, reason: 'INSTRUCTION_METADATA_MISMATCH' },
  );

  // Unrecognized
  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'WRITE A SHORT ESSAY ABOUT YOUR SUMMER' }),
    { valid: false, reason: 'UNRECOGNIZED_INSTRUCTION_FORM' },
  );
});

test('Content Validation: validateFullIeltsMockSection enforces full 40-question structure', () => {
  // Incomplete mock (only 1 part, 10 questions)
  const partialMock = {
    skill: 'LISTENING' as const,
    parts: [
      {
        slot: 'LISTENING_PART_1',
        questionGroups: [
          {
            maxMarks: 10,
            reviewStatus: 'VERIFIED',
            answerKey: { reviewStatus: 'VERIFIED', formatVersion: 1 },
            questions: Array.from({ length: 10 }, (_, i) => ({ sourceNumber: i + 1, maxMarks: 1 })),
          },
        ],
      },
    ],
  };

  const validation = validateFullIeltsMockSection(partialMock);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes('Expected exactly 40 questions')));
  assert.ok(validation.errors.some((e) => e.includes('Missing expected part/section slot: LISTENING_PART_2')));
});
