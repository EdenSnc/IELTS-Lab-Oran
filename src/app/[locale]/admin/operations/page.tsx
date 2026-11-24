import StaffOperationsDashboard from '@/components/account/StaffOperationsDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { loadStaffPaymentOperations } from '@/lib/payments/staff-operations';
import { listAccessCodes } from '@/lib/access-codes/access-code-service';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Payments and access | IELTS Lab Oran' };

export default async function AdminOperationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin/operations`);
  const [operations, accessCodes, products] = await Promise.all([
    loadStaffPaymentOperations(),
    listAccessCodes(),
    prisma.product.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return (
    <StaffOperationsDashboard
      operations={operations}
      accessCodes={accessCodes.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt?.toISOString() ?? null,
        redeemedAt: item.redeemedAt?.toISOString() ?? null,
      }))}
      products={products}
    />
  );
}
