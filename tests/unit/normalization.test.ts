import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer } from '../../src/lib/grading/objective-grading.ts';

test('Normalization: deterministic rules (Invariant 8)', () => {
  // 1. Whitespace trimming and collapsing
  assert.equal(
    normalizeAnswer('   high   quality   education   ', {}),
    'high quality education',
  );

  // 2. Case insensitivity by default
  assert.equal(
    normalizeAnswer('Oxford University', { caseSensitive: false }),
    'oxford university',
  );

  // 3. Case sensitivity when enabled
  assert.equal(
    normalizeAnswer('DNA', { caseSensitive: true }),
    'DNA',
  );

  // 4. Unicode normalization (NFC)
  const decomposed = 'e\u0301cole'; // e + combining acute
  const composed = '\u00e9cole';   // é
  assert.equal(
    normalizeAnswer(decomposed, { unicodeForm: 'NFC' }),
    composed,
  );

  // 5. Punctuation insensitivity when disabled
  assert.equal(
    normalizeAnswer('state-of-the-art!', { punctuationSensitive: false }),
    'stateoftheart',
  );

  // 6. Punctuation sensitivity when enabled
  assert.equal(
    normalizeAnswer('state-of-the-art', { punctuationSensitive: true }),
    'state-of-the-art',
  );
});
