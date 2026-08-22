import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {routing} from './i18n/routing';

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

export default function proxy(request: NextRequest) {
  const firstSegment = request.nextUrl.pathname.split('/')[1];
  const isLocalizedRoute = routing.locales.some(
    (locale) => locale === firstSegment,
  );

  if (!firstSegment) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/en';
    return NextResponse.redirect(destination, 308);
  }

  if (isLocalizedRoute) {
    return alignXDefaultWithEnglish(handleI18nRouting(request));
  }

  return NextResponse.rewrite(new URL('/_not-found', request.url));
}
 
export const config = {
  matcher: [
    '/((?!api|sim|speaking|_next|_not-found|_vercel|.*\\..*).*)',
  ],
};
