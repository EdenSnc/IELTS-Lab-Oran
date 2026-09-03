import StaffOperationsDashboard from '@/components/account/StaffOperationsDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { loadStaffPaymentOperations } from '@/lib/payments/staff-operations';

export default async function StaffOperationsPage() {
  await requireStaffPageAal2();
  const operations = await loadStaffPaymentOperations();
  return <StaffOperationsDashboard operations={JSON.parse(JSON.stringify(operations))} />;
}
