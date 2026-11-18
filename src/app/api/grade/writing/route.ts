import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { z } from 'zod';
import { gradeWritingAnswers } from '@/lib/grading/writing-grading';
import { checkSlidingWindowRateLimit, extractClientIp } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const requestSchema = z.object({
  testVersionId: z.uuid(),
  answers: z.object({
    task1: z.string().max(20_000),
    task2: z.string().max(30_000),
  }),
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const verification = await checkBotId();
    if (verification.isBot) return noStoreJson({ error: 'ACCESS_DENIED' }, 403);
  } catch {
    return noStoreJson({ error: 'ACCESS_DENIED' }, 403);
  }

  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return noStoreJson({ error: 'JSON_REQUIRED' }, 415);
  }
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestHost = forwardedHost || request.headers.get('host');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !requestHost) {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
  }
  try {
    if (
      new URL(origin).host !== requestHost
      || (fetchSite && fetchSite !== 'same-origin')
    ) {
      return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
    }
  } catch {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
  }

  const rate = checkSlidingWindowRateLimit({
    namespace: 'public-writing-grade',
    key: extractClientIp(request),
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Cache-Control': 'no-store, max-age=0', 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 55_000) return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    body = JSON.parse(text);
  } catch {
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: 'INVALID_WRITING_GRADE_REQUEST' }, 400);

  try {
    return noStoreJson(await gradeWritingAnswers(parsed.data));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'WRITING_GRADING_FAILED';
    if (code === 'TEST_NOT_FOUND') return noStoreJson({ error: code }, 404);
    if (code === 'WRITING_TASKS_MISSING') return noStoreJson({ error: code }, 409);
    if (code === 'WRITING_GRADING_NOT_CONFIGURED') return noStoreJson({ error: code }, 503);
    console.error('Writing grading failed', { code });
    return noStoreJson({ error: 'WRITING_GRADING_FAILED' }, 502);
  }
}
