import { notFound } from 'next/navigation';
import MockTestClientBoundary from '@/components/mock-test/MockTestClientBoundary';
import { loadDeliveryTest } from '@/lib/content/load-delivery-test';

export default async function MockTestEnginePage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = await loadDeliveryTest(testId);
  if (!test) notFound();

  return <MockTestClientBoundary test={test} />;
}
