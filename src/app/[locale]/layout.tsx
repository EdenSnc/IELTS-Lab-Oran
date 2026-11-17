import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { Inter, Cairo } from 'next/font/google';
import FloatingWidgetClient from '@/components/FloatingWidgetClient';
import AcquisitionUtmCapture from '@/components/AcquisitionUtmCapture';
import { Locale, buildWebsitePageMetadata } from '@/lib/seo';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const descriptions: Record<Locale, string> = {
    en: 'In-person computer-based IELTS preparation in Bir El Djir, Oran. Practise Listening, Reading, Writing, and Speaking in an 8-seat PC lab with individual feedback.',
    fr: 'Préparation IELTS sur ordinateur en petit groupe (8 places) à Bir El Djir, Oran. Entraînez-vous aux 4 épreuves sur PC avec correction individuelle.',
    ar: 'تحضير حضوري لاختبار IELTS على الكمبيوتر في بئر الجير، وهران. تدرّب على المهارات الأربع في قاعة من 8 مقاعد مع تصحيح وملاحظات فردية.',
  };
  const titles: Record<Locale, string> = {
    en: 'IELTS Preparation in Oran (Computer-Based) | IELTS Lab Oran',
    fr: 'Préparation IELTS sur ordinateur à Oran | IELTS Lab Oran',
    ar: 'التحضير لاختبار IELTS على الكمبيوتر في وهران | IELTS Lab Oran',
  };
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: '',
    title: titles[safeLocale],
    description: descriptions[safeLocale],
  });
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.some((supportedLocale) => supportedLocale === locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = locale === 'ar';
  const fontClass = isRtl ? 'font-cairo' : 'font-sans';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`scroll-smooth ${inter.variable} ${cairo.variable} ${fontClass}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="bg-surface text-charcoal selection:bg-crimson selection:text-white antialiased">
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
