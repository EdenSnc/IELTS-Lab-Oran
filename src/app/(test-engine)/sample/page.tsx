import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MockTestClientBoundary from '@/components/mock-test/MockTestClientBoundary';
import { loadDeliveryTest } from '@/lib/content/load-delivery-test';
import { buildPublicReadingSample } from '@/lib/content/public-sample';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'Free IELTS Reading Computer Sample | IELTS Lab Oran',
  description: 'Try a 5-question computer-delivered IELTS Academic Reading sample on the IELTS Lab Oran simulation interface.',
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  twitter: null,
};

export default async function FreeSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const requestedLocale = (await searchParams).locale;
  const locale = requestedLocale === 'ar' || requestedLocale === 'fr' ? requestedLocale : 'en';
  const test = await loadDeliveryTest('test-1');
  if (!test) notFound();
  return <MockTestClientBoundary test={buildPublicReadingSample(test)} sampleMode locale={locale} />;
}
