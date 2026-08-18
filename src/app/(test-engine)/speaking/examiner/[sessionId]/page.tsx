import ExaminerWorkstation from '@/components/speaking/ExaminerWorkstation';
export default async function ExaminerSessionPage({ params }: { params: Promise<{ sessionId: string }> }) { const { sessionId } = await params; return <ExaminerWorkstation sessionId={sessionId} />; }
