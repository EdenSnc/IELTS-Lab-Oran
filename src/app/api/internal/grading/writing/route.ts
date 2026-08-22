import { noStoreJson } from '@/lib/http/api';
import { processWritingGradingRun, WritingGradingTerminalError } from '@/lib/grading/writing-worker';
import { qstashEndpoint, verifyQStashRequest, writingGradingJobSchema } from '@/lib/qstash/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 4_096) {
    return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  }
  const verified = await verifyQStashRequest({
    rawBody,
    signature: request.headers.get('upstash-signature'),
    endpoint: qstashEndpoint('/api/internal/grading/writing'),
    upstashRegion: request.headers.get('upstash-region'),
  });
  if (!verified) return noStoreJson({ error: 'INVALID_QSTASH_SIGNATURE' }, 403);

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return noStoreJson({ error: 'INVALID_JOB' }, 400); }
  const parsed = writingGradingJobSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: 'INVALID_JOB' }, 400);
  try {
    const result = await processWritingGradingRun(parsed.data.gradingRunId);
    return noStoreJson(result);
  } catch (error) {
    if (error instanceof WritingGradingTerminalError) {
      // Permanent invalid data/configuration is recorded on the GradingRun;
      // acknowledging it prevents a futile provider retry storm.
      return noStoreJson({ status: 'failed' });
    }
    return noStoreJson({ error: 'WRITING_GRADING_RETRYABLE' }, 503);
  }
}
