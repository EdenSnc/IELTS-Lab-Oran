import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { parsePublicEnvironment } from './lib/env';
import { isIndexableLocalizedPath } from './lib/seo';
import { buildContentSecurityPolicy } from './lib/security/content-security-policy';
import { refreshSupabaseSession } from './lib/supabase/proxy-session';
import { shouldRefreshSupabaseSession, type ProxyResponseKind } from './lib/supabase/proxy-policy';

const handleI18nRouting = createMiddleware(routing);
const environment = parsePublicEnvironment(process.env);

const BOTID_PROXY_SEGMENT = '149e9513-01fa-4fb0-aad4-566afd725d1b';

function rtcConnectSources() {
  if (!process.env.LIVEKIT_URL) return [];
  const url = new URL(process.env.LIVEKIT_URL);
  if (!['https:', 'wss:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('LIVEKIT_URL_INVALID');
  }
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  const sources = [`https://${host}`, `wss://${host}`];
  if (url.hostname.endsWith('.livekit.cloud') && !url.port) {
    sources.push(
      'https://*.livekit.cloud',
      'wss://*.livekit.cloud',
      'https://*.turn.livekit.cloud',
      'wss://*.turn.livekit.cloud',
    );
  }
  return sources;
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
  extraRequestHeaders?: Record<string, string>,
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
  // Preserve next-intl's locale and any earlier request header overrides.
  const overriddenNames = response.headers.get('x-middleware-override-headers');
  const requestHeaders = overriddenNames === null ? new Headers(request.headers) : new Headers();
  if (overriddenNames !== null) {
    for (const name of overriddenNames.split(',').map((value) => value.trim()).filter(Boolean)) {
      const value = response.headers.get(`x-middleware-request-${name}`);
      if (value !== null) requestHeaders.set(name, value);
    }
    const refreshedCookie = request.headers.get('cookie');
    if (refreshedCookie !== null) requestHeaders.set('cookie', refreshedCookie);
  }
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  if (extraRequestHeaders) {
    for (const [key, value] of Object.entries(extraRequestHeaders)) {
      requestHeaders.set(key, value);
    }
  }

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
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  if (firstSegment?.startsWith(BOTID_PROXY_SEGMENT)) {
    return NextResponse.next();
  }
  const isLocalizedRoute = routing.locales.some(
    (locale) => locale === firstSegment,
  );
  let response: NextResponse;
  const extraRequestHeaders: Record<string, string> = {};

  if (!firstSegment) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/en';
    response = NextResponse.redirect(destination, 308);
  } else if (isLocalizedRoute) {
    const subPath = segments.slice(2).join('/');
    const i18nResponse = handleI18nRouting(request);
    if (isIndexableLocalizedPath(subPath)) {
      response = alignXDefaultWithEnglish(i18nResponse);
    } else {
      // Never emit Link hreflang headers on private, noindex, or 404 localized URLs.
      i18nResponse.headers.delete('Link');
      if (subPath === 'articles/simulation-platform') {
        i18nResponse.headers.set('X-Robots-Tag', 'noindex, follow');
      } else {
        i18nResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
      }
      response = i18nResponse;
    }
  } else if (firstSegment === 'staff') {
    if (pathname === '/staff/operations' || pathname.startsWith('/staff/operations/')) {
      response = NextResponse.next();
    } else {
      // Bare /staff or unknown /staff/* must 404 via /_not-found without matching /[locale].
      response = NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
    }
    response.headers.delete('Link');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (firstSegment === 'sample') {
    const requestedLocale = request.nextUrl.searchParams.get('locale');
    if (requestedLocale === 'ar' || requestedLocale === 'fr' || requestedLocale === 'en') {
      extraRequestHeaders['x-sample-locale'] = requestedLocale;
    }
    response = NextResponse.next();
    response.headers.delete('Link');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (['api', 'sim', 'speaking', 'r'].includes(firstSegment)) {
    response = NextResponse.next();
    if (firstSegment === 'sim' || firstSegment === 'speaking') {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
  } else {
    response = NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
    response.headers.delete('Link');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  const kind = responseKind(response);
  if (shouldRefreshSupabaseSession(pathname, kind)) {
    response = await refreshSupabaseSession(request, response);
  }
  return applyRequestSecurityHeaders(
    request,
    response,
    kind,
    Object.keys(extraRequestHeaders).length > 0 ? extraRequestHeaders : undefined,
  );
}

export const config = {
  matcher: [
    '/((?!_next|_not-found|_vercel|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\.[a-zA-Z0-9]{1,8}$).*)',
  ],
};
