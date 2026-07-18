import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter, Cairo } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import LocalSchema from '@/components/LocalSchema';
import CourseSchema from '@/components/CourseSchema';
import FloatingWidgetClient from '@/components/FloatingWidgetClient';
import { SITE_URL, buildAlternates } from '@/lib/seo';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Navbar' });
  return {
    metadataBase: new URL(SITE_URL),
    title: `${t('title')} | IELTS Preparation Oran`,
    description:
      "Algeria's most rigorous computer-based IELTS preparation course. An 8-seat physical PC lab in Oran - diagnostic targeting, certified instruction, and criteria-focused training.",
    alternates: buildAlternates(),
    openGraph: {
      type: 'website',
      locale,
      siteName: t('title'),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = locale === 'ar';
  const fontClass = isRtl ? cairo.className : inter.className;

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`scroll-smooth ${fontClass}`} data-scroll-behavior="smooth">
      <head>
        <LocalSchema />
        <CourseSchema />
      </head>
      <body className="bg-surface text-charcoal selection:bg-crimson selection:text-white antialiased">
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
