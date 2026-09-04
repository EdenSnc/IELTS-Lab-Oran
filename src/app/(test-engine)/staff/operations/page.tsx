import StaffOperationsDashboard from '@/components/account/StaffOperationsDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { loadStaffPaymentOperations } from '@/lib/payments/staff-operations';
import { listAccessCodes } from '@/lib/access-codes/access-code-service';
import prisma from '@/lib/prisma';

export default async function StaffOperationsPage() {
  await requireStaffPageAal2();
  const [operations, accessCodes, products] = await Promise.all([
    loadStaffPaymentOperations(),
    listAccessCodes(),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return <StaffOperationsDashboard operations={JSON.parse(JSON.stringify(operations))} accessCodes={JSON.parse(JSON.stringify(accessCodes))} products={products} />;
}
