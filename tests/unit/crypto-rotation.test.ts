import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { encrypt, decrypt } from '../../src/lib/crypto.ts';

test('Crypto: legacy ciphertext decrypt works (Invariant 12)', () => {
  // Set legacy encryption key
  const legacyKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.ENCRYPTION_KEY = legacyKey;

  // Encrypt with legacy format (iv:authTag:ciphertext)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(legacyKey, 'hex'), iv);
  let encrypted = cipher.update('Hello IELTS Lab', 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  const legacyCiphertext = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

  const decrypted = decrypt(legacyCiphertext);
  assert.equal(decrypted, 'Hello IELTS Lab');
});

test('Crypto: new v2 ciphertext roundtrip with active key ID (Invariant 13)', () => {
  const primaryKey = '1111111111111111111111111111111111111111111111111111111111111111';
  const secondaryKey = '2222222222222222222222222222222222222222222222222222222222222222';
  process.env.ENCRYPTION_KEY_PRIMARY = primaryKey;
  process.env.ENCRYPTION_KEY_K2 = secondaryKey;
  process.env.ENCRYPTION_ACTIVE_KEY_ID = 'primary';

  const plaintext = JSON.stringify({ strategy: 'PER_ITEM_EXACT', answers: ['test'] });
  const encrypted = encrypt(plaintext);
  assert.ok(encrypted.startsWith('v2:primary:'));

  const decrypted = decrypt(encrypted);
  assert.equal(decrypted, plaintext);

  // Encrypt with secondary key explicitly
  const encryptedK2 = encrypt(plaintext, { keyId: 'k2' });
  assert.ok(encryptedK2.startsWith('v2:k2:'));
  const decryptedK2 = decrypt(encryptedK2);
  assert.equal(decryptedK2, plaintext);
});

test('Crypto: unknown encryption key fails closed (Invariant 14)', () => {
  // Ciphertext requesting an unknown key ID
  const fakeIv = '00'.repeat(16);
  const fakeAuthTag = '00'.repeat(16);
  const fakeCipher = '00'.repeat(8);
  const unknownKeyCiphertext = `v2:unknown_key_99:${fakeIv}:${fakeAuthTag}:${fakeCipher}`;

  assert.throws(() => {
    decrypt(unknownKeyCiphertext);
  }, /UNKNOWN_ENCRYPTION_KEY_ID: unknown_key_99/);
});

test('Crypto: v2 decryption must FAIL when specific ENCRYPTION_KEY_<KEYID> is missing even if legacy ENCRYPTION_KEY is present', () => {
  const origKey = process.env.ENCRYPTION_KEY;
  const origActive = process.env.ENCRYPTION_ACTIVE_KEY_ID;

  try {
    process.env.ENCRYPTION_KEY = '9999999999999999999999999999999999999999999999999999999999999999';
    process.env.ENCRYPTION_ACTIVE_KEY_ID = 'missing_v2_key';
    delete process.env.ENCRYPTION_KEY_MISSING_V2_KEY;

    const fakeIv = '00'.repeat(16);
    const fakeAuthTag = '00'.repeat(16);
    const fakeCipher = '00'.repeat(8);
    const v2Ciphertext = `v2:missing_v2_key:${fakeIv}:${fakeAuthTag}:${fakeCipher}`;

    // Decryption must fail closed with UNKNOWN_ENCRYPTION_KEY_ID and not fall back to legacy key
    assert.throws(() => {
      decrypt(v2Ciphertext);
    }, /UNKNOWN_ENCRYPTION_KEY_ID: missing_v2_key/);

    // Encryption must also fail closed
    assert.throws(() => {
      encrypt('test payload', { keyId: 'missing_v2_key' });
    }, /UNKNOWN_ENCRYPTION_KEY_ID: missing_v2_key/);
  } finally {
    process.env.ENCRYPTION_KEY = origKey;
    process.env.ENCRYPTION_ACTIVE_KEY_ID = origActive;
  }
});
