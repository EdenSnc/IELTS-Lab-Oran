import { notFound } from 'next/navigation';
import MockTestClientBoundary from '@/components/mock-test/MockTestClientBoundary';
import { loadDeliveryTest } from '@/lib/content/load-delivery-test';
import { buildPublicReadingSample } from '@/lib/content/public-sample';

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
