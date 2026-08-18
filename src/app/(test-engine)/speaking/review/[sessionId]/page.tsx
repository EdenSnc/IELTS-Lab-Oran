import SpeakingReview from '@/components/speaking/SpeakingReview';
export default async function SpeakingReviewPage({ params }: { params: Promise<{ sessionId: string }> }) { const { sessionId } = await params; return <SpeakingReview sessionId={sessionId} />; }
