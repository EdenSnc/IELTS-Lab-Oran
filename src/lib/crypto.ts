import 'server-only';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedTextHex
 */
export function encrypt(text: string): string {
  const KEY = process.env.ENCRYPTION_KEY;
  if (!KEY || !/^[0-9a-f]{64}$/i.test(KEY)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  const keyBuffer = Buffer.from(KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string created by encrypt().
 * Input format: ivHex:authTagHex:encryptedTextHex
 */
export function decrypt(encryptedData: string): string {
  const KEY = process.env.ENCRYPTION_KEY;
  if (!KEY || !/^[0-9a-f]{64}$/i.test(KEY)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedTextHex] = parts;
  if (
    !/^[0-9a-f]{32}$/i.test(ivHex)
    || !/^[0-9a-f]{32}$/i.test(authTagHex)
    || !/^(?:[0-9a-f]{2})+$/i.test(encryptedTextHex)
  ) {
    throw new Error('Invalid encrypted text format.');
  }
  const keyBuffer = Buffer.from(KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
