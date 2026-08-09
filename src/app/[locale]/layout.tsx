import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import LocalSchema from '@/components/LocalSchema';
import FloatingWidgetClient from '@/components/FloatingWidgetClient';
import { Locale, SITE_URL, buildAlternates } from '@/lib/seo';
import '../globals.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Navbar' });
  const descriptions = {
    en: 'Computer-based IELTS preparation in Bir El Djir, Oran: 32 hours, eight seats, diagnostic testing, Academic and General Training, and criteria-based feedback.',
    fr: 'Préparation IELTS sur ordinateur à Bir El Djir, Oran : 32 heures, huit places, diagnostic, Academic et General Training, et retour fondé sur les critères.',
    ar: 'تحضير IELTS على الكمبيوتر في بئر الجير، وهران: 32 ساعة وثمانية مقاعد وتشخيص وAcademic وGeneral Training وملاحظات مبنية على المعايير.',
  } as const;
  const description = descriptions[locale as Locale] ?? descriptions.en;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${t('title')} | IELTS Preparation Oran`,
    description,
    alternates: buildAlternates(locale as Locale),
    openGraph: {
      type: 'website',
      locale,
      siteName: t('title'),
      url: `${SITE_URL}/${locale}`,
      title: `${t('title')} | IELTS Preparation Oran`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t('title')} | IELTS Preparation Oran`,
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
  // Use the font class name as a plain string to avoid a next/font Turbopack bug.
  const fontClass = isRtl ? 'font-cairo' : 'font-inter';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`scroll-smooth ${fontClass}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* App Router layouts replace pages/_document; keep the established site fonts unchanged. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Cairo:wght@200..900&display=swap"
          rel="stylesheet"
        />
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
