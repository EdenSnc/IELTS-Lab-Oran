import ExaminerDashboard from '@/components/speaking/ExaminerDashboard';
import { redirect } from 'next/navigation';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
export default async function SpeakingExaminerPage() {
  const actor = await requireStaffPageAal2();
  if (actor.role === 'ADMIN') redirect('/en/admin/speaking');
  return <ExaminerDashboard />;
}
