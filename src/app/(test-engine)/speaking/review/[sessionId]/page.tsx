import SpeakingReview from '@/components/speaking/SpeakingReview';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
export default async function SpeakingReviewPage({ params }: { params: Promise<{ sessionId: string }> }) { await requireStaffPageAal2(); const { sessionId } = await params; return <SpeakingReview sessionId={sessionId} />; }
