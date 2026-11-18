import { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { CANONICAL_ORIGIN } from '@/lib/seo';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-face',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo-face',
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'IELTS Mock Test',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: [`${CANONICAL_ORIGIN}/opengraph-image.png`],
  },
  twitter: {
    images: [`${CANONICAL_ORIGIN}/twitter-image.png`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default async function TestEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bind to per-request headers so Next.js injects the middleware CSP nonce
  // onto inline RSC and chunk scripts under enforced 'strict-dynamic' CSP,
  // and read x-sample-locale when /sample?locale=ar|fr|en is requested.
  const reqHeaders = await headers();
  const rawLocale = reqHeaders.get('x-sample-locale');
  const locale = rawLocale === 'ar' || rawLocale === 'fr' ? rawLocale : 'en';
  const isRtl = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${cairo.variable} ${isRtl ? 'font-cairo' : ''}`}
      suppressHydrationWarning
    >
      <head />
      <body
        suppressHydrationWarning
        className={`min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#ffffff] text-[#1a1a1a] antialiased flex flex-col ${isRtl ? 'font-cairo' : ''}`}
        style={
          isRtl
            ? { fontFamily: 'var(--font-cairo-face), "Cairo", sans-serif' }
            : { fontFamily: '"Helvetica Neue Regular", "Helvetica Neue", Helvetica, Roboto, Arial, sans-serif' }
        }
      >
        {children}
      </body>
    </html>
  );
}
