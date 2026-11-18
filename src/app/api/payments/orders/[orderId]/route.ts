import { AuthError, requireRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import prisma from '@/lib/prisma';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await requireRequestUser(request);
    const { orderId } = await params;
    if (!UUID_PATTERN.test(orderId)) {
      throw new AuthError('ORDER_NOT_FOUND', 404);
    }
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
    if (!order) throw new AuthError('ORDER_NOT_FOUND', 404);
    return noStoreJson(order);
  } catch (error) {
    return apiError(error, 'ORDER_STATUS_FAILED');
  }
}
