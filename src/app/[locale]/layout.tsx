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
    en: 'In-person small-group IELTS preparation (8 seats) in Bir El Djir, Oran, plus online mock practice. Practise Listening, Reading, Writing, and Speaking with individual feedback.',
    fr: 'Préparation IELTS en présentiel en petit groupe (8 places) à Bir El Djir, Oran, et tests blancs en ligne. Entraînez-vous aux 4 épreuves avec correction individuelle.',
    ar: 'تحضير حضوري لاختبار IELTS ضمن مجموعة صغيرة من 8 مقاعد في بئر الجير، وهران، مع اختبارات تجريبية عبر الإنترنت وتصحيح فردي للمهارات الأربع.',
  };
  const titles: Record<Locale, string> = {
    en: 'IELTS Preparation in Oran | Small-Group Course & Mock Practice | IELTS Lab Oran',
    fr: 'Préparation IELTS à Oran | Cours en Petit Groupe & Tests Blancs | IELTS Lab Oran',
    ar: 'التحضير لاختبار IELTS في وهران | دورة حضورية واختبارات تجريبية | IELTS Lab Oran',
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
