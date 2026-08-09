import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { decrypt } from '../src/lib/crypto';

dotenv.config();

const fileToVerify = process.argv[2];

if (!fileToVerify) {
  console.error("Usage: npx tsx scripts/decrypt-check.ts <path-to-json>");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileToVerify);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

interface EncryptedQuestion {
  questionNumber: number;
  targetAnswer: string;
}

function isEncryptedQuestion(value: unknown): value is EncryptedQuestion {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'questionNumber' in value &&
    typeof value.questionNumber === 'number' &&
    'targetAnswer' in value &&
    typeof value.targetAnswer === 'string'
  );
}

const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`\n--- Decrypting ${path.basename(fileToVerify)} ---`);

if (
  typeof data === 'object' &&
  data !== null &&
  'questions' in data &&
  Array.isArray(data.questions)
) {
  data.questions.filter(isEncryptedQuestion).forEach((q) => {
    try {
      const decrypted = decrypt(q.targetAnswer);
      const parsed = JSON.parse(decrypted);
      console.log(`Q${q.questionNumber}:`, parsed);
    } catch (err) {
      console.log(`Q${q.questionNumber}: [Failed to decrypt or parse: ${err}]`);
    }
  });
} else {
  console.log("No 'questions' array found in this file.");
}
