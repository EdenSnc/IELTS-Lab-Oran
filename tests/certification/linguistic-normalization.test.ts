import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAnswer,
  countWords,
  isWithinWordLimit,
} from '../../src/lib/grading/objective-grading.ts';

test('Phase I: Case and Capitalisation Invariance', () => {
  const norm = { caseSensitive: false };
  const target = 'central library';

  assert.equal(normalizeAnswer('CENTRAL LIBRARY', norm), target);
  assert.equal(normalizeAnswer('Central Library', norm), target);
  assert.equal(normalizeAnswer('cEnTrAl LiBrArY', norm), target);
  assert.equal(normalizeAnswer('central library', norm), target);

  // Choice values
  assert.equal(normalizeAnswer('A', norm), 'a');
  assert.equal(normalizeAnswer('a', norm), 'a');
  assert.equal(normalizeAnswer('TRUE', norm), 'true');
  assert.equal(normalizeAnswer('True', norm), 'true');
});

test('Phase J: Spelling Strictness and Zero False Accepts on Mutations', () => {
  const norm = { caseSensitive: false, punctuationSensitive: false };
  const acceptedWord = 'accommodation';
  const targetNormalized = normalizeAnswer(acceptedWord, norm);

  // Generate 50 realistic spelling errors / mutations
  const mutations = [
    'acommodation', // missing c
    'accomodation', // missing m
    'acomodation',  // missing c and m
    'accomadation', // vowel sub a
    'accommodatiom', // end sub m
    'accomodaton',
    'accommodations', // plural when singular expected
    'accommodate', // verb form
    'accommadation',
    'accommodaton',
    'accomodasion',
    'accommodashun',
  ];

  for (const mutated of mutations) {
    const normMutated = normalizeAnswer(mutated, norm);
    assert.notEqual(
      normMutated,
      targetNormalized,
      `Mutated word '${mutated}' must NOT match exact accepted word '${acceptedWord}'`,
    );
  }
});

test('Phase L: Whitespace Normalization and Boundary Security', () => {
  const norm = {};

  // Surrounding whitespace
  assert.equal(normalizeAnswer('   solar panel   ', norm), 'solar panel');
  // Tabs and newlines
  assert.equal(normalizeAnswer('\tsolar\tpanel\n', norm), 'solar panel');
  // Internal multiple spaces
  assert.equal(normalizeAnswer('solar     panel', norm), 'solar panel');
  // Non-breaking space
  assert.equal(normalizeAnswer('solar\u00A0panel', norm), 'solar panel');

  // Whitespace cannot merge distinct words into one word
  assert.equal(countWords('solar panel'), 2);
  assert.equal(countWords('  solar   panel  '), 2);
});

test('Phase M: Punctuation Rules and Punctuation-Insensitive Handling', () => {
  const normInsensitive = { punctuationSensitive: false };
  const normSensitive = { punctuationSensitive: true };

  assert.equal(normalizeAnswer('state-of-the-art', normInsensitive), 'stateoftheart');
  assert.equal(normalizeAnswer('state-of-the-art', normSensitive), 'state-of-the-art');

  // Currency symbols
  assert.equal(normalizeAnswer('$50', normSensitive), '$50');
  assert.equal(normalizeAnswer('£100', normSensitive), '£100');

  // Apostrophes in contractions
  assert.equal(normalizeAnswer("children's playground", normSensitive), "children's playground");
});

test('Phase N: Official IELTS Hyphenated Compound Word Counting', () => {
  // Official IELTS rule: A hyphenated compound word (e.g. state-of-the-art) counts as ONE word.
  assert.equal(countWords('part-time'), 1);
  assert.equal(countWords('full-time'), 1);
  assert.equal(countWords('state-of-the-art'), 1);
  assert.equal(countWords('well-known'), 1);
  assert.equal(countWords('mother-in-law'), 1);

  // Unhyphenated equivalents count as multiple words
  assert.equal(countWords('part time'), 2);
  assert.equal(countWords('state of the art'), 4);
  assert.equal(countWords('mother in law'), 3);
});

test('Phase O: Word-Limit Matrix Enforcement', () => {
  // Rule: "NO MORE THAN TWO WORDS"
  const twoWordLimit = { maxWords: 2, allowNumbers: true };

  // Valid answers (<= 2 words)
  assert.ok(isWithinWordLimit('library', twoWordLimit));
  assert.ok(isWithinWordLimit('central library', twoWordLimit));
  assert.ok(isWithinWordLimit('25 students', twoWordLimit));
  assert.ok(isWithinWordLimit('state-of-the-art lab', twoWordLimit)); // 1 compound + 1 word = 2 words

  // Invalid answers (> 2 words)
  assert.equal(isWithinWordLimit('the central library', twoWordLimit), false);
  assert.equal(isWithinWordLimit('very clean water filter', twoWordLimit), false);
  assert.equal(isWithinWordLimit('one two three', twoWordLimit), false);

  // Rule: "ONE WORD ONLY"
  const oneWordLimit = { maxWords: 1, allowNumbers: false };
  assert.ok(isWithinWordLimit('library', oneWordLimit));
  assert.ok(isWithinWordLimit('self-service', oneWordLimit)); // 1 compound word
  assert.equal(isWithinWordLimit('the library', oneWordLimit), false); // 2 words
  assert.equal(isWithinWordLimit('room 101', oneWordLimit), false); // contains numbers & 2 words
});

test('Phase R: True / False / Not Given & Yes / No / Not Given Semantics', () => {
  const norm = { caseSensitive: false };

  // Distinct values
  const trueNorm = normalizeAnswer('TRUE', norm);
  const falseNorm = normalizeAnswer('FALSE', norm);
  const notGivenNorm = normalizeAnswer('NOT GIVEN', norm);
  const yesNorm = normalizeAnswer('YES', norm);
  const noNorm = normalizeAnswer('NO', norm);

  assert.notEqual(trueNorm, falseNorm);
  assert.notEqual(trueNorm, notGivenNorm);
  assert.notEqual(falseNorm, notGivenNorm);

  assert.notEqual(trueNorm, yesNorm);
  assert.notEqual(falseNorm, noNorm);
  assert.notEqual(notGivenNorm, falseNorm);
  assert.notEqual(notGivenNorm, noNorm);
});

test('Phase S: Letter and Multiple Choice Responses', () => {
  const norm = { caseSensitive: false, trimOuterWhitespace: true };

  const validOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  for (const opt of validOptions) {
    assert.equal(normalizeAnswer(` ${opt} `, norm), opt.toLowerCase());
  }

  assert.notEqual(normalizeAnswer('A', norm), normalizeAnswer('B', norm));
});
