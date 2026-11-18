import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { Inter, Cairo } from 'next/font/google';
import FloatingWidgetClient from '@/components/FloatingWidgetClient';
import AcquisitionUtmCapture from '@/components/AcquisitionUtmCapture';
import { Locale, buildLocaleRootMetadata } from '@/lib/seo';
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

const SKIP_LABELS: Record<Locale, string> = {
  en: 'Skip to main content',
  fr: 'Aller au contenu principal',
  ar: 'انتقل إلى المحتوى الرئيسي',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocaleRootMetadata(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.some((supportedLocale) => supportedLocale === locale)) {
    notFound();
  }

  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const messages = await getMessages();
  const isRtl = safeLocale === 'ar';
  const fontClass = isRtl ? 'font-cairo' : 'font-sans';

  return (
    <html
      lang={safeLocale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`scroll-smooth ${inter.variable} ${cairo.variable} ${fontClass}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="bg-surface text-charcoal selection:bg-crimson selection:text-white antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-crimson"
        >
          {SKIP_LABELS[safeLocale]}
        </a>
        <NextIntlClientProvider messages={messages}>
          <AcquisitionUtmCapture />
          {children}
          <FloatingWidgetClient />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
