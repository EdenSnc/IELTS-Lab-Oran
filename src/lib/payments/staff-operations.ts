import 'server-only';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError } from '@/lib/auth/request-user';

export async function extendEntitlementAccess(input: {
  entitlementId: string;
  days: number;
  reason: string;
  actorUserId: string;
}) {
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
    throw new AuthError('INVALID_EXTENSION_DAYS', 400);
  }
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."Entitlement" WHERE id = ${input.entitlementId}::uuid FOR UPDATE
    `);
    const entitlement = await transaction.entitlement.findUnique({ where: { id: input.entitlementId } });
    if (!entitlement) throw new AuthError('ENTITLEMENT_NOT_FOUND', 404);
    if (!entitlement.endsAt) throw new AuthError('ENTITLEMENT_NO_EXPIRY', 409);
    const base = entitlement.endsAt > new Date() ? entitlement.endsAt : new Date();
    const endsAt = new Date(base.getTime() + input.days * 86_400_000);
    const updated = await transaction.entitlement.update({
      where: { id: entitlement.id },
      data: { endsAt, status: 'ACTIVE', version: { increment: 1 } },
    });
    await transaction.staffActionAudit.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'EXTEND_ACCESS',
        targetType: 'Entitlement',
        targetId: entitlement.id,
        reason: input.reason,
        metadata: { days: input.days, previousEndsAt: entitlement.endsAt.toISOString(), endsAt: endsAt.toISOString() },
      },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function loadStaffPaymentOperations(now = new Date()) {
  const stuckBefore = new Date(now.getTime() - 15 * 60_000);
  const cooldownStart = new Date(now.getTime() - 7 * 86_400_000);
  const [stuckOrders, paidWithoutEntitlement, unresolved, webhookFailures, deviceLockouts] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { status: 'PENDING', createdAt: { lt: stuckBefore } },
          { paymentAttempts: { some: { status: 'PROCESSING', createdAt: { lt: stuckBefore } } } },
        ],
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
      select: { id: true, status: true, createdAt: true, userId: true, product: { select: { name: true } }, paymentAttempts: { select: { status: true, failureCode: true } } },
    }),
    prisma.order.findMany({
      where: { status: 'PAID', entitlements: { none: { status: 'ACTIVE' } } },
      take: 100,
      select: { id: true, userId: true, paidAt: true, product: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { status: 'PENDING' },
      take: 500,
      select: { id: true, userId: true, productId: true, createdAt: true },
    }),
    prisma.paymentWebhookFailure.groupBy({
      by: ['errorCode'],
      _count: { _all: true },
      _max: { receivedAt: true },
      orderBy: { _count: { errorCode: 'desc' } },
      take: 50,
    }),
    prisma.deviceSlot.findMany({
      where: { revokedAt: null, lastReplacedAt: { gte: cooldownStart } },
      take: 100,
      orderBy: { lastReplacedAt: 'desc' },
      select: { id: true, userId: true, slotNumber: true, label: true, lastReplacedAt: true, replacementCount: true },
    }),
  ]);
  const duplicateGroups = new Map<string, { userId: string; productId: string; orderIds: string[] }>();
  for (const order of unresolved) {
    const key = `${order.userId}:${order.productId}`;
    const group = duplicateGroups.get(key) ?? { userId: order.userId, productId: order.productId, orderIds: [] };
    group.orderIds.push(order.id);
    duplicateGroups.set(key, group);
  }
  return {
    stuckOrders,
    paidWithoutEntitlement,
    duplicateUnresolved: [...duplicateGroups.values()].filter((group) => group.orderIds.length > 1),
    webhookFailures,
    deviceLockouts,
  };
}
