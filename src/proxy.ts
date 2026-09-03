import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {routing} from './i18n/routing';
import { parsePublicEnvironment } from './lib/env';
import { buildContentSecurityPolicy } from './lib/security/content-security-policy';
import { refreshSupabaseSession } from './lib/supabase/proxy-session';
import { shouldRefreshSupabaseSession, type ProxyResponseKind } from './lib/supabase/proxy-policy';

const handleI18nRouting = createMiddleware(routing);
const environment = parsePublicEnvironment(process.env);

function rtcConnectSources() {
  if (!process.env.LIVEKIT_URL) return [];
  const url = new URL(process.env.LIVEKIT_URL);
  if (!['https:', 'wss:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('LIVEKIT_URL_INVALID');
  }
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return [`https://${host}`, `wss://${host}`];
}

function responseKind(response: NextResponse): ProxyResponseKind {
  if (response.headers.has('location')) return 'redirect';
  if (response.headers.has('x-middleware-rewrite')) return 'rewrite';
  return 'next';
}

function applyRequestSecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  kind: ProxyResponseKind,
) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV !== 'production',
    supabaseOrigin: new URL(environment.NEXT_PUBLIC_SUPABASE_URL).origin,
    rtcSources: rtcConnectSources(),
  });
  const headerName = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  if (kind !== 'redirect') {
    const requestOverride = NextResponse.next({ request: { headers: requestHeaders } });
    requestOverride.headers.forEach((value, key) => {
      if (key === 'x-middleware-override-headers' || key.startsWith('x-middleware-request-')) {
        response.headers.set(key, value);
      }
    });
  }
  response.headers.set(headerName, csp);
  return response;
}

function alignXDefaultWithEnglish(response: NextResponse) {
  const linkHeader = response.headers.get('Link');
  if (!linkHeader) return response;

  const englishAlternate = linkHeader.match(
    /<([^>]+)>;\s*rel="alternate";\s*hreflang="en"/i,
  );
  if (!englishAlternate) return response;

  response.headers.set(
    'Link',
    linkHeader.replace(
      /<[^>]+>(;\s*rel="alternate";\s*hreflang="x-default")/i,
      `<${englishAlternate[1]}>$1`,
    ),
  );
  return response;
}

export default async function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/')[1];
  const isLocalizedRoute = routing.locales.some(
    (locale) => locale === firstSegment,
  );
  let response: NextResponse;

  if (!firstSegment) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/en';
    response = NextResponse.redirect(destination, 308);
  } else if (isLocalizedRoute) {
    response = alignXDefaultWithEnglish(handleI18nRouting(request));
  } else if (['api', 'sim', 'speaking'].includes(firstSegment)) {
    response = NextResponse.next();
  } else {
    response = NextResponse.rewrite(new URL('/_not-found', request.url));
  }

  const kind = responseKind(response);
  if (shouldRefreshSupabaseSession(request.nextUrl.pathname, kind)) {
    response = await refreshSupabaseSession(request, response);
  }
  return applyRequestSecurityHeaders(request, response, kind);
}
 
export const config = {
  matcher: [
    '/((?!_next|_not-found|_vercel|.*\\..*).*)',
  ],
};
