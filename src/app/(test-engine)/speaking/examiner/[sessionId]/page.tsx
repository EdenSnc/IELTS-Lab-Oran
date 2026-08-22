import ExaminerWorkstation from '@/components/speaking/ExaminerWorkstation';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
export default async function ExaminerSessionPage({ params }: { params: Promise<{ sessionId: string }> }) { await requireStaffPageAal2(); const { sessionId } = await params; return <ExaminerWorkstation sessionId={sessionId} />; }
