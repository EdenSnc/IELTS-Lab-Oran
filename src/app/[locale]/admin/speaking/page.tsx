import ExaminerDashboard from '@/components/speaking/ExaminerDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';

export const metadata = { title: 'Speaking | IELTS Lab Oran' };

export default async function AdminSpeakingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin/speaking`);
  return <ExaminerDashboard embedded />;
}
