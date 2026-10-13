import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth/request-user';

export function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

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
  const code = error instanceof Error ? error.message : fallback;
  const status = code === 'FORBIDDEN' ? 403
    : code === 'JOIN_WINDOW_CLOSED' ? 403
      : code === 'RECORDING_CONSENT_REQUIRED' || code === 'IN_PERSON_APPOINTMENT' ? 409
        : code.includes('NOT_FOUND') ? 404
          : code.includes('CONFLICT') || code.includes('INVALID_SESSION_TRANSITION') || code === 'CANCELLATION_WINDOW_CLOSED' || code === 'APPOINTMENT_ALREADY_STARTED' ? 409
            : code.includes('NOT_CONFIGURED') || code.endsWith('_MAINTENANCE') ? 503
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

export function verifiedRequestOrigin(request: Request) {
  assertSameOrigin(request);
  const browserOrigin = request.headers.get('origin');
  if (browserOrigin) return new URL(browserOrigin).origin;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host');
  if (!host) return new URL(request.url).origin;

  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || new URL(request.url).protocol.slice(0, -1);
  if (protocol !== 'http' && protocol !== 'https') {
    throw new AuthError('INVALID_REQUEST_ORIGIN', 400);
  }
  return new URL(`${protocol}://${host}`).origin;
}
