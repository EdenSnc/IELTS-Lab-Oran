import assert from 'node:assert/strict';
import test from 'node:test';
import { decrypt, encrypt } from '../../src/lib/crypto';
import { assertSupportedAnswerKeyFormatVersion, objectiveAnswerKeySchema } from '../../src/lib/grading/objective-scoring-core';

const legacy = '11'.repeat(32);
const current = '22'.repeat(32);

test('v2 answer-key envelopes identify the active key and survive rotation', () => {
  process.env.ENCRYPTION_KEY = legacy;
  process.env.ANSWER_KEY_ENCRYPTION_KEYS = JSON.stringify({ old: legacy, current });
  process.env.ANSWER_KEY_ACTIVE_KEY_ID = 'current';
  const ciphertext = encrypt('verified answer payload');
  assert.match(ciphertext, /^v2:current:/u);
  process.env.ANSWER_KEY_ACTIVE_KEY_ID = 'old';
  assert.equal(decrypt(ciphertext), 'verified answer payload');
});

test('legacy v1 ciphertext remains readable during migration', () => {
  process.env.ENCRYPTION_KEY = legacy;
  delete process.env.ANSWER_KEY_ENCRYPTION_KEYS;
  delete process.env.ANSWER_KEY_ACTIVE_KEY_ID;
  const ciphertext = encrypt('legacy payload');
  assert.doesNotMatch(ciphertext, /^v2:/u);
  process.env.ANSWER_KEY_ENCRYPTION_KEYS = JSON.stringify({ current });
  process.env.ANSWER_KEY_ACTIVE_KEY_ID = 'current';
  assert.equal(decrypt(ciphertext), 'legacy payload');
});

test('payload format 1 is independent from legacy and v2 encryption envelopes', () => {
  const payload = JSON.stringify({ strategy: 'PER_ITEM_EXACT', answersByStableKey: { q1: ['answer'] } });
  process.env.ENCRYPTION_KEY = legacy;
  delete process.env.ANSWER_KEY_ENCRYPTION_KEYS;
  delete process.env.ANSWER_KEY_ACTIVE_KEY_ID;
  const legacyCiphertext = encrypt(payload);
  assertSupportedAnswerKeyFormatVersion(1);
  assert.equal(objectiveAnswerKeySchema.parse(JSON.parse(decrypt(legacyCiphertext))).strategy, 'PER_ITEM_EXACT');

  process.env.ANSWER_KEY_ENCRYPTION_KEYS = JSON.stringify({ current });
  process.env.ANSWER_KEY_ACTIVE_KEY_ID = 'current';
  const v2Ciphertext = encrypt(payload);
  assert.match(v2Ciphertext, /^v2:current:/u);
  assertSupportedAnswerKeyFormatVersion(1);
  assert.equal(objectiveAnswerKeySchema.parse(JSON.parse(decrypt(v2Ciphertext))).strategy, 'PER_ITEM_EXACT');
  assert.throws(() => assertSupportedAnswerKeyFormatVersion(2), /UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION/u);
  assert.throws(() => assertSupportedAnswerKeyFormatVersion(99), /UNSUPPORTED_ANSWER_KEY_FORMAT_VERSION/u);
});

test.after(() => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.ANSWER_KEY_ENCRYPTION_KEYS;
  delete process.env.ANSWER_KEY_ACTIVE_KEY_ID;
});
