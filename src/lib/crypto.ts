import 'server-only';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function validateHexKey(key: string | undefined, envName: string): Buffer {
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(`${envName} must be a 64-character hex string (32 bytes).`);
  }
  return Buffer.from(key, 'hex');
}

export function resolveEncryptionKey(keyId?: string): { keyBuffer: Buffer; keyId: string } {
  const activeKeyId = process.env.ENCRYPTION_ACTIVE_KEY_ID || 'primary';
  const targetKeyId = keyId ?? activeKeyId;

  // Check specific environment variable for this key ID: ENCRYPTION_KEY_<KEY_ID>
  const envVarName = `ENCRYPTION_KEY_${targetKeyId.toUpperCase()}`;
  const specificKey = process.env[envVarName];

  if (specificKey) {
    return { keyBuffer: validateHexKey(specificKey, envVarName), keyId: targetKeyId };
  }

  // Fallback to ENCRYPTION_KEY if targetKeyId matches default/primary or is unset
  if (targetKeyId === 'primary' || targetKeyId === 'default' || targetKeyId === activeKeyId) {
    const defaultKey = process.env.ENCRYPTION_KEY;
    if (defaultKey) {
      return { keyBuffer: validateHexKey(defaultKey, 'ENCRYPTION_KEY'), keyId: targetKeyId };
    }
  }

  throw new Error(`UNKNOWN_ENCRYPTION_KEY_ID: ${targetKeyId}`);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: v2:keyId:ivHex:authTagHex:encryptedTextHex
 */
export function encrypt(text: string, options?: { keyId?: string }): string {
  const { keyBuffer, keyId } = resolveEncryptionKey(options?.keyId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `v2:${keyId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string created by encrypt().
 * Supports:
 * - v2 format: v2:keyId:ivHex:authTagHex:encryptedTextHex
 * - Legacy format: ivHex:authTagHex:encryptedTextHex (using legacy ENCRYPTION_KEY)
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');

  let keyBuffer: Buffer;
  let ivHex: string;
  let authTagHex: string;
  let encryptedTextHex: string;

  if (parts.length === 5 && parts[0] === 'v2') {
    // v2 envelope: v2:keyId:iv:authTag:ciphertext
    const [, keyId, iv, authTag, ciphertext] = parts;
    const resolved = resolveEncryptionKey(keyId);
    keyBuffer = resolved.keyBuffer;
    ivHex = iv;
    authTagHex = authTag;
    encryptedTextHex = ciphertext;
  } else if (parts.length === 3) {
    // Legacy format: iv:authTag:ciphertext using ENCRYPTION_KEY
    const [iv, authTag, ciphertext] = parts;
    keyBuffer = validateHexKey(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY');
    ivHex = iv;
    authTagHex = authTag;
    encryptedTextHex = ciphertext;
  } else {
    throw new Error('Invalid encrypted text format.');
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

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
