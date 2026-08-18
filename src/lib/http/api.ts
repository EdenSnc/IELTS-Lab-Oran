import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth/request-user';

export function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export function apiError(error: unknown, fallback = 'REQUEST_FAILED') {
  if (error instanceof AuthError) return noStoreJson({ error: error.code }, error.status);
  if (error instanceof ZodError) return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
  const code = error instanceof Error ? error.message : fallback;
  const status = code === 'FORBIDDEN' ? 403
    : code === 'JOIN_WINDOW_CLOSED' ? 403
      : code === 'RECORDING_CONSENT_REQUIRED' || code === 'IN_PERSON_APPOINTMENT' ? 409
        : code.includes('NOT_FOUND') ? 404
          : code.includes('CONFLICT') || code.includes('INVALID_SESSION_TRANSITION') || code === 'CANCELLATION_WINDOW_CLOSED' || code === 'APPOINTMENT_ALREADY_STARTED' ? 409
            : code.includes('NOT_CONFIGURED') ? 503
              : code.startsWith('INVALID_') ? 400 : 500;
  if (status >= 500) console.error(fallback, { code });
  return noStoreJson({ error: status >= 500 ? fallback : code }, status);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const fetchSite = request.headers.get('sec-fetch-site');
  if ((origin && host && new URL(origin).host !== host) || (fetchSite && fetchSite !== 'same-origin')) {
    throw new AuthError('CROSS_SITE_REQUEST_REJECTED', 403);
  }
}
