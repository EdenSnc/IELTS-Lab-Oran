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
  // Recognized families with variations and wrapper text
  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'ONE WORD ONLY', maxWords: 1, allowNumbers: false }),
    { valid: true, maxWords: 1, allowNumbers: false },
  );

  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'WRITE NO MORE THAN TWO WORDS FOR EACH ANSWER', maxWords: 2, allowNumbers: false }),
    { valid: true, maxWords: 2, allowNumbers: false },
  );

  assert.deepEqual(
    validateAnswerInstructionContract({ rawInstruction: 'WRITE ONE WORD AND/OR A NUMBER FOR EACH ANSWER', maxWords: 1, allowNumbers: true }),
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

test('Content Validation: validateFullIeltsMockSection enforces full 40-question structure and defenses', () => {
  const createValidListeningMock = () => ({
    skill: 'LISTENING' as const,
    parts: [1, 2, 3, 4].map((partNum) => ({
      slot: `LISTENING_PART_${partNum}`,
      stimuli: [{ type: 'AUDIO_TRACK', reviewStatus: 'VERIFIED' }],
      questionGroups: [
        {
          scoringStrategy: 'PER_ITEM_EXACT',
          maxMarks: 10,
          reviewStatus: 'VERIFIED',
          answerKey: { reviewStatus: 'VERIFIED', formatVersion: 1 },
          questions: Array.from({ length: 10 }, (_, i) => ({
            sourceNumber: (partNum - 1) * 10 + (i + 1),
            maxMarks: 1,
          })),
        },
      ],
    })),
  });

  // 1. Fully valid 40-question mock passes
  const validMock = createValidListeningMock();
  const validRes = validateFullIeltsMockSection(validMock);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.totalQuestions, 40);
  assert.equal(validRes.maxMarks, 40);
  assert.equal(validRes.errors.length, 0);

  // 2. Extra / unexpected slot fails
  const extraSlotMock = createValidListeningMock();
  extraSlotMock.parts.push({
    slot: 'LISTENING_PART_5',
    stimuli: [],
    questionGroups: [],
  });
  const extraRes = validateFullIeltsMockSection(extraSlotMock);
  assert.equal(extraRes.valid, false);
  assert.ok(extraRes.errors.some((e) => e.includes('Unexpected part/section slot')));

  // 3. Missing stimulus fails
  const missingStimulusMock = createValidListeningMock();
  missingStimulusMock.parts[0].stimuli = [{ type: 'IMAGE', reviewStatus: 'VERIFIED' }];
  const stimulusRes = validateFullIeltsMockSection(missingStimulusMock);
  assert.equal(stimulusRes.valid, false);
  assert.ok(stimulusRes.errors.some((e) => e.includes('missing required AUDIO_TRACK stimulus')));

  // 4. Unverified AnswerKey fails
  const unverifiedKeyMock = createValidListeningMock();
  unverifiedKeyMock.parts[0].questionGroups[0].answerKey!.reviewStatus = 'PENDING_REVIEW';
  const unverifiedKeyRes = validateFullIeltsMockSection(unverifiedKeyMock);
  assert.equal(unverifiedKeyRes.valid, false);
  assert.ok(unverifiedKeyRes.errors.some((e) => e.includes('missing or not VERIFIED')));

  // 5. Duplicate question number fails
  const duplicateQMock = createValidListeningMock();
  duplicateQMock.parts[0].questionGroups[0].questions[1].sourceNumber = 1; // Q2 changed to duplicate Q1
  const dupRes = validateFullIeltsMockSection(duplicateQMock);
  assert.equal(dupRes.valid, false);
  assert.ok(dupRes.errors.some((e) => e.includes('Expected 40 unique question numbers')));

  // 6. 39 questions (incomplete) fails
  const shortMock = createValidListeningMock();
  shortMock.parts[3].questionGroups[0].questions.pop(); // remove Q40
  shortMock.parts[3].questionGroups[0].maxMarks = 9;
  const shortRes = validateFullIeltsMockSection(shortMock);
  assert.equal(shortRes.valid, false);
  assert.ok(shortRes.errors.some((e) => e.includes('Expected exactly 40 questions, got 39')));

  // 7. 41 questions (excess) fails
  const longMock = createValidListeningMock();
  longMock.parts[3].questionGroups[0].questions.push({ sourceNumber: 41, maxMarks: 1 });
  longMock.parts[3].questionGroups[0].maxMarks = 11;
  const longRes = validateFullIeltsMockSection(longMock);
  assert.equal(longRes.valid, false);
  assert.ok(longRes.errors.some((e) => e.includes('Expected exactly 40 questions, got 41')));
});
