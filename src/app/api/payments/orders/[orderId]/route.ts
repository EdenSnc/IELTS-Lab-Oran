import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireRequestUser(request, ['STUDENT']);
    const { orderId } = await params;
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: {
        id: true,
        status: true,
        amountMinor: true,
        currency: true,
        createdAt: true,
        paidAt: true,
        product: { select: { code: true, name: true } },
        entitlements: {
          select: { id: true, status: true, startsAt: true, endsAt: true, maximumAttempts: true, attemptsUsed: true },
        },
      },
    });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    return noStoreJson(order);
  } catch (error) {
    return apiError(error, 'ORDER_STATUS_FAILED');
  }
}
