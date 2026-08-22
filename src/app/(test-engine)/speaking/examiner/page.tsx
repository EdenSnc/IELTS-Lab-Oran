import ExaminerDashboard from '@/components/speaking/ExaminerDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
export default async function SpeakingExaminerPage() { await requireStaffPageAal2(); return <ExaminerDashboard />; }
