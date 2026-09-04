import 'server-only';

import { Prisma, type FunnelEventType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logSafeError } from '@/lib/observability/safe-log';

export type FunnelEventInput = {
  type: FunnelEventType;
  idempotencyKey?: string;
  userId?: string;
  productId?: string;
  orderId?: string;
  attemptId?: string;
  metadata?: Prisma.InputJsonValue;
};

function data(input: FunnelEventInput): Prisma.FunnelEventUncheckedCreateInput {
  return {
    type: input.type,
    idempotencyKey: input.idempotencyKey,
    userId: input.userId,
    productId: input.productId,
    orderId: input.orderId,
    attemptId: input.attemptId,
    metadata: input.metadata,
  };
}

export async function recordFunnelEvent(input: FunnelEventInput) {
  try {
    return await prisma.funnelEvent.create({ data: data(input) });
  } catch (error) {
    if (
      input.idempotencyKey
      && error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
    ) {
      return prisma.funnelEvent.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    }
    logSafeError('FUNNEL_EVENT_RECORDING_FAILED', error, { type: input.type });
    return null;
  }
}

export function funnelEventData(input: FunnelEventInput) {
  return data(input);
}
