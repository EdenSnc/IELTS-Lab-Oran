import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth/request-user';

export function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

const SAFE_CLIENT_ERROR_CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

export function apiError(error: unknown, fallback = 'REQUEST_FAILED') {
  if (error instanceof AuthError) return noStoreJson({ error: error.code }, error.status);
  if (
    error instanceof Error
    && error.name === 'PaymentServiceError'
    && 'code' in error
    && 'status' in error
    && typeof error.code === 'string'
    && typeof error.status === 'number'
  ) return noStoreJson({ error: error.code }, error.status);
  if (error instanceof ZodError) return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
  if (error instanceof Error && error.name === 'EntitlementUnavailableError') {
    return noStoreJson({ error: 'ENTITLEMENT_UNAVAILABLE' }, 409);
  }
  if (error instanceof Error && error.name === 'OptimisticConcurrencyError') {
    return noStoreJson({ error: 'STALE_RESPONSE_VERSION' }, 409);
  }
  const rawMessage = error instanceof Error ? error.message : fallback;
  const code = SAFE_CLIENT_ERROR_CODE.test(rawMessage) ? rawMessage : fallback;
  const status = code === 'FORBIDDEN' ? 403
    : code === 'JOIN_WINDOW_CLOSED' ? 403
      : code === 'RECORDING_CONSENT_REQUIRED' || code === 'IN_PERSON_APPOINTMENT' ? 409
        : code.includes('NOT_FOUND') ? 404
          : code.includes('CONFLICT') || code.includes('INVALID_SESSION_TRANSITION') || code === 'CANCELLATION_WINDOW_CLOSED' || code === 'APPOINTMENT_ALREADY_STARTED' ? 409
            : code.includes('NOT_CONFIGURED') || code.endsWith('_MAINTENANCE') ? 503
              : code.startsWith('INVALID_') ? 400 : 500;
  if (status >= 500) console.error(fallback, { code: rawMessage });
  return noStoreJson({ error: status >= 500 ? fallback : code }, status);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || !host) {
    throw new AuthError('CROSS_SITE_REQUEST_REJECTED', 403);
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthError('CROSS_SITE_REQUEST_REJECTED', 403);
  }
  if (originHost !== host || (fetchSite && fetchSite !== 'same-origin')) {
    throw new AuthError('CROSS_SITE_REQUEST_REJECTED', 403);
  }
}
