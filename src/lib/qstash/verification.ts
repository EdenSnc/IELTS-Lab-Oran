import { Receiver } from '@upstash/qstash';
import { z } from 'zod';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const writingGradingJobSchema = z.object({
  version: z.literal(1),
  type: z.literal('WRITING_GRADING'),
  gradingRunId: z.string().uuid(),
}).strict();

export const writingRecoveryJobSchema = z.object({
  version: z.literal(1),
  type: z.literal('RECOVER_WRITING_GRADING'),
}).strict();

function callbackBaseUrl() {
  const url = new URL(process.env.QSTASH_CALLBACK_BASE_URL ?? CANONICAL_ORIGIN);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('QSTASH_CALLBACK_BASE_URL_NOT_SECURE');
  }
  return url.origin;
}

function qstashReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) throw new Error('QSTASH_SIGNING_KEYS_NOT_CONFIGURED');
  return new Receiver({ currentSigningKey, nextSigningKey });
}

export function qstashEndpoint(path: '/api/internal/grading/writing' | '/api/internal/grading/recover') {
  return `${callbackBaseUrl()}${path}` as const;
}

export async function verifyQStashRequest(input: {
  rawBody: string;
  signature: string | null;
  endpoint: ReturnType<typeof qstashEndpoint>;
  upstashRegion?: string | null;
}) {
  if (!input.signature) return false;
  try {
    return await qstashReceiver().verify({
      body: input.rawBody,
      signature: input.signature,
      url: input.endpoint,
      upstashRegion: input.upstashRegion ?? undefined,
      clockTolerance: 5,
    });
  } catch {
    return false;
  }
}
