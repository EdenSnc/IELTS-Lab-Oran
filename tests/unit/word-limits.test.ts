import test from 'node:test';
import assert from 'node:assert/strict';
import { countWords, isWithinWordLimit } from '../../src/lib/grading/objective-grading.ts';

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
