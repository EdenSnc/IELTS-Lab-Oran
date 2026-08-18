import SpeakingPreflight from '@/components/speaking/SpeakingPreflight';

export default async function SpeakingSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <SpeakingPreflight sessionId={sessionId} />;
}
