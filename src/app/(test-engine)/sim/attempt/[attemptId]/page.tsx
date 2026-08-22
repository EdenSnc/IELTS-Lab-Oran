import CommercialAttemptClient from '@/components/mock-test/CommercialAttemptClient';

export default async function CommercialAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <CommercialAttemptClient attemptId={attemptId} />;
}
