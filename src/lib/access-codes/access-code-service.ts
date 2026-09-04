import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { assertAccountReady } from '@/lib/auth/account-readiness';
import { AuthError } from '@/lib/auth/request-user';
import { funnelEventData } from '@/lib/growth/funnel-events';

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const STAFF_ROLES = new Set(['TEACHER', 'CONTENT_REVIEWER', 'ADMIN']);

function codeHash(code: string) {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function normalizeCode(value: string) {
  const compact = value.trim().toUpperCase().replace(/[\s-]+/gu, '');
  if (!/^IELTS[0-9A-HJKMNP-TV-Z]{20}$/u.test(compact)) {
    throw new AuthError('ACCESS_CODE_INVALID', 404);
  }
  return `IELTS-${compact.slice(5).match(/.{4}/gu)?.join('-')}`;
}

function generateCode() {
  const body = [...randomBytes(20)].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `IELTS-${body.match(/.{4}/gu)?.join('-')}`;
}

export async function generateAccessCodes(input: {
  actorUserId: string;
  productId: string;
  quantity: number;
  reason: string;
  expiresAt?: Date | null;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 50) {
    throw new AuthError('ACCESS_CODE_QUANTITY_INVALID', 400);
  }
  if (input.expiresAt && input.expiresAt <= new Date()) {
    throw new AuthError('ACCESS_CODE_EXPIRY_INVALID', 400);
  }
  const actor = await prisma.user.findUnique({ where: { id: input.actorUserId }, select: { role: true, status: true } });
  if (!actor || actor.status !== 'ACTIVE' || !STAFF_ROLES.has(actor.role)) throw new AuthError('FORBIDDEN', 403);

  const rawCodes = Array.from({ length: input.quantity }, generateCode);
  return prisma.$transaction(async (transaction) => {
    const product = await transaction.product.findUnique({ where: { id: input.productId }, select: { id: true, active: true } });
    if (!product?.active) throw new AuthError('PRODUCT_NOT_AVAILABLE', 404);
    const generated = [];
    for (const code of rawCodes) {
      const accessCode = await transaction.accessCode.create({
        data: {
          codeHash: codeHash(code),
          codeHint: `…${code.slice(-4)}`,
          productId: input.productId,
          createdByUserId: input.actorUserId,
          expiresAt: input.expiresAt,
        },
      });
      await transaction.staffActionAudit.create({
        data: {
          actorUserId: input.actorUserId,
          action: 'GENERATE_ACCESS_CODE',
          targetType: 'AccessCode',
          targetId: accessCode.id,
          reason: input.reason,
          metadata: { productId: input.productId, expiresAt: input.expiresAt?.toISOString() ?? null },
        },
      });
      generated.push({ id: accessCode.id, code, codeHint: accessCode.codeHint, expiresAt: accessCode.expiresAt });
    }
    return generated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function redeemAccessCode(input: { userId: string; code: string }) {
  await assertAccountReady(input.userId);
  const hash = codeHash(normalizeCode(input.code));
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."User" WHERE id = ${input.userId}::uuid FOR UPDATE
    `);
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."AccessCode" WHERE "codeHash" = ${hash} FOR UPDATE
    `);
    const accessCode = await transaction.accessCode.findUnique({
      where: { codeHash: hash },
      include: { product: true, entitlement: true },
    });
    if (!accessCode) throw new AuthError('ACCESS_CODE_INVALID', 404);
    if (accessCode.redeemedAt) {
      if (accessCode.redeemedByUserId === input.userId && accessCode.entitlement) {
        return { entitlementId: accessCode.entitlement.id, productId: accessCode.productId, replay: true };
      }
      throw new AuthError('ACCESS_CODE_ALREADY_REDEEMED', 409);
    }
    const now = new Date();
    if (accessCode.expiresAt && accessCode.expiresAt <= now) throw new AuthError('ACCESS_CODE_EXPIRED', 410);
    if (!accessCode.product.active) throw new AuthError('PRODUCT_NOT_AVAILABLE', 404);
    const existing = await transaction.entitlement.findFirst({
      where: {
        userId: input.userId,
        productId: accessCode.productId,
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (existing) throw new AuthError('ENTITLEMENT_ALREADY_ACTIVE', 409);
    const endsAt = accessCode.product.accessDays
      ? new Date(now.getTime() + accessCode.product.accessDays * 86_400_000)
      : null;
    const entitlement = await transaction.entitlement.create({
      data: {
        userId: input.userId,
        productId: accessCode.productId,
        accessCodeId: accessCode.id,
        status: 'ACTIVE',
        startsAt: now,
        endsAt,
        maximumAttempts: accessCode.product.maximumAttempts,
      },
    });
    await transaction.accessCode.update({
      where: { id: accessCode.id },
      data: { redeemedByUserId: input.userId, redeemedAt: now },
    });
    await transaction.funnelEvent.create({
      data: funnelEventData({
        type: 'ENTITLEMENT_GRANTED',
        idempotencyKey: `entitlement:${entitlement.id}:granted`,
        userId: input.userId,
        productId: accessCode.productId,
        metadata: { source: 'access_code' },
      }),
    });
    return { entitlementId: entitlement.id, productId: accessCode.productId, replay: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listAccessCodes() {
  return prisma.accessCode.findMany({
    take: 200,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      codeHint: true,
      expiresAt: true,
      redeemedAt: true,
      createdAt: true,
      product: { select: { id: true, code: true, name: true } },
      redeemedBy: { select: { id: true, email: true, name: true } },
    },
  });
}
