import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { z } from 'zod';
import { gradeWritingAnswers } from '@/lib/grading/writing-grading';

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
  const verification = await checkBotId();
  if (verification.isBot) return noStoreJson({ error: 'ACCESS_DENIED' }, 403);

  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return noStoreJson({ error: 'JSON_REQUIRED' }, 415);
  }
  const origin = request.headers.get('origin');
  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const fetchSite = request.headers.get('sec-fetch-site');
  try {
    if (
      (origin && requestHost && new URL(origin).host !== requestHost)
      || (fetchSite && fetchSite !== 'same-origin')
    ) {
      return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
    }
  } catch {
    return noStoreJson({ error: 'CROSS_SITE_REQUEST_REJECTED' }, 403);
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
