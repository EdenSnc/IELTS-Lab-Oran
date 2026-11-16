import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { Inter, Cairo } from 'next/font/google';
import LocalSchema from '@/components/LocalSchema';
import FloatingWidgetClient from '@/components/FloatingWidgetClient';
import { Locale, CANONICAL_ORIGIN, buildAlternates } from '@/lib/seo';
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
  const t = await getTranslations({ locale, namespace: 'Navbar' });
  const descriptions = {
    en: 'Prepare for IELTS in Oran with computer-based practice in all four skills and individual Writing and Speaking feedback in a small group.',
    fr: 'Préparez l’IELTS à Oran en petit groupe, avec des exercices sur ordinateur et des retours personnalisés en Writing et Speaking.',
    ar: 'حضّر لاختبار IELTS في وهران ضمن مجموعة صغيرة مع تمارين على الكمبيوتر وملاحظات فردية في الكتابة والمحادثة.',
  } as const;
  const titles = {
    en: 'IELTS Preparation in Oran',
    fr: 'Préparation IELTS à Oran',
    ar: 'التحضير لاختبار IELTS في وهران',
  } as const;
  const description = descriptions[locale as Locale] ?? descriptions.en;
  const title = `${titles[locale as Locale] ?? titles.en} | ${t('title')}`;
  return {
    metadataBase: new URL(CANONICAL_ORIGIN),
    title,
    description,
    alternates: buildAlternates(locale as Locale),
    openGraph: {
      type: 'website',
      locale,
      siteName: t('title'),
      url: `${CANONICAL_ORIGIN}/${locale}`,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
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
      <head>

        <LocalSchema />
      </head>
      <body suppressHydrationWarning className="bg-surface text-charcoal selection:bg-crimson selection:text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <FloatingWidgetClient />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
