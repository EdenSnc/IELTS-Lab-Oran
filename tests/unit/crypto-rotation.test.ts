import assert from 'node:assert/strict';
import test from 'node:test';
import { decrypt, encrypt } from '../../src/lib/crypto';

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

test.after(() => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.ANSWER_KEY_ENCRYPTION_KEYS;
  delete process.env.ANSWER_KEY_ACTIVE_KEY_ID;
});
