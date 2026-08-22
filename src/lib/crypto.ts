import 'server-only';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function keyFromHex(value: string | undefined, label: string) {
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${label} must be a 64-character hex string (32 bytes).`);
  }
  return Buffer.from(value, 'hex');
}

function answerKeyRing() {
  const raw = process.env.ANSWER_KEY_ENCRYPTION_KEYS;
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ANSWER_KEY_ENCRYPTION_KEYS must be a JSON object.');
  }
  const keys = parsed as Record<string, unknown>;
  for (const [id, value] of Object.entries(keys)) {
    if (!/^[A-Za-z0-9_-]{1,32}$/u.test(id) || typeof value !== 'string') {
      throw new Error('ANSWER_KEY_ENCRYPTION_KEYS contains an invalid key entry.');
    }
    keyFromHex(value, `Answer-key encryption key ${id}`);
  }
  return keys as Record<string, string>;
}

function encryptWithKey(text: string, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return { iv, authTag: cipher.getAuthTag(), encrypted };
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedTextHex
 */
export function encrypt(text: string): string {
  const ring = answerKeyRing();
  if (ring) {
    const keyId = process.env.ANSWER_KEY_ACTIVE_KEY_ID;
    if (!keyId || !ring[keyId]) {
      throw new Error('ANSWER_KEY_ACTIVE_KEY_ID must identify a configured key.');
    }
    const result = encryptWithKey(text, keyFromHex(ring[keyId], `Answer-key encryption key ${keyId}`));
    return `v2:${keyId}:${result.iv.toString('hex')}:${result.authTag.toString('hex')}:${result.encrypted.toString('hex')}`;
  }
  const result = encryptWithKey(text, keyFromHex(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY'));
  return `${result.iv.toString('hex')}:${result.authTag.toString('hex')}:${result.encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted string created by encrypt().
 * Input format: ivHex:authTagHex:encryptedTextHex
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  let key: Buffer;
  let ivHex: string;
  let authTagHex: string;
  let encryptedTextHex: string;
  if (parts[0] === 'v2') {
    if (parts.length !== 5) throw new Error('Invalid v2 encrypted text format.');
    const ring = answerKeyRing();
    const keyId = parts[1];
    if (!ring?.[keyId]) throw new Error('Unknown answer-key encryption key identifier.');
    key = keyFromHex(ring[keyId], `Answer-key encryption key ${keyId}`);
    [, , ivHex, authTagHex, encryptedTextHex] = parts;
  } else {
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format. Expected iv:authTag:ciphertext');
    }
    key = keyFromHex(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY');
    [ivHex, authTagHex, encryptedTextHex] = parts;
  }
  if (
    !/^[0-9a-f]{32}$/i.test(ivHex)
    || !/^[0-9a-f]{32}$/i.test(authTagHex)
    || !/^(?:[0-9a-f]{2})+$/i.test(encryptedTextHex)
  ) {
    throw new Error('Invalid encrypted text format.');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
