import { noStoreJson } from '@/lib/http/api';
import {
  qstashEndpoint,
  recoverWritingGradingRuns,
  verifyQStashRequest,
  writingRecoveryJobSchema,
} from '@/lib/qstash/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 1_024) {
    return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  }
  const verified = await verifyQStashRequest({
    rawBody,
    signature: request.headers.get('upstash-signature'),
    endpoint: qstashEndpoint('/api/internal/grading/recover'),
    upstashRegion: request.headers.get('upstash-region'),
  });
  if (!verified) return noStoreJson({ error: 'INVALID_QSTASH_SIGNATURE' }, 403);
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return noStoreJson({ error: 'INVALID_JOB' }, 400); }
  const parsed = writingRecoveryJobSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: 'INVALID_JOB' }, 400);
  const results = await recoverWritingGradingRuns();
  return noStoreJson({ recovered: results.filter((result) => result.published).length });
}
