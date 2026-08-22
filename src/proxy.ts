import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {routing} from './i18n/routing';
import { refreshSupabaseSession } from './lib/supabase/proxy-session';

const handleI18nRouting = createMiddleware(routing);

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

  return refreshSupabaseSession(request, response);
}
 
export const config = {
  matcher: [
    '/((?!_next|_not-found|_vercel|.*\\..*).*)',
  ],
};
