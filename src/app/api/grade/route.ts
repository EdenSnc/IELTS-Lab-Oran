import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { z } from 'zod';
import { gradeVerifiedObjectiveAnswers } from '@/lib/grading/objective-grading';
import { checkSlidingWindowRateLimit, extractClientIp } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const answerMapSchema = z.record(
  z.string().regex(/^\d{1,2}$/),
  z.string().max(500),
).refine((answers) => Object.keys(answers).length <= 40);

const requestSchema = z.object({
  testVersionId: z.uuid(),
  answers: z.object({
    listening: answerMapSchema,
    reading: answerMapSchema,
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
  const fetchSite = request.headers.get('sec-fetch-site');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestHost = forwardedHost || request.headers.get('host');
  if (!origin || !requestHost) {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
  }
  if (
    originHost !== requestHost
    || (fetchSite && fetchSite !== 'same-origin')
  ) {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
  }

  const rate = checkSlidingWindowRateLimit({
    namespace: 'public-objective-grade',
    key: extractClientIp(request),
    limit: 20,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Cache-Control': 'no-store, max-age=0', 'Retry-After': String(rate.retryAfterSeconds) } },
    );
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > 50_000) return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);

  let unknownBody: unknown;
  try {
    const text = await request.text();
    if (text.length > 50_000) return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
    unknownBody = JSON.parse(text);
  } catch {
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const parsed = requestSchema.safeParse(unknownBody);
  if (!parsed.success) return noStoreJson({ error: 'INVALID_GRADE_REQUEST' }, 400);

  try {
    return noStoreJson(await gradeVerifiedObjectiveAnswers(parsed.data));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'GRADING_FAILED';
    if (code === 'TEST_NOT_FOUND') return noStoreJson({ error: code }, 404);
    if (code === 'UNVERIFIED_ANSWER_KEY') {
      return noStoreJson({ error: code }, 409);
    }
    console.error('Objective grading failed', { code });
    return noStoreJson({ error: 'GRADING_FAILED' }, 500);
  }
}
