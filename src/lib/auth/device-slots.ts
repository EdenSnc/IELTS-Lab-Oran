import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type DeviceSlot } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError } from './request-user';

export const DEVICE_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Host-ielts_device'
  : 'ielts_device';

function hashDeviceToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function cookieValue(request: Request, name: string) {
  for (const entry of (request.headers.get('cookie') ?? '').split(';')) {
    const index = entry.indexOf('=');
    if (index < 1 || entry.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(entry.slice(index + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  };
}

export function issueDeviceToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashDeviceToken(token) };
}

export async function findRequestDeviceSlot(request: Request, userId: string) {
  const token = cookieValue(request, DEVICE_COOKIE_NAME);
  if (!token) return null;
  const slot = await prisma.deviceSlot.findUnique({
    where: { userId_tokenHash: { userId, tokenHash: hashDeviceToken(token) } },
  });
  if (!slot || slot.revokedAt) return null;
  await prisma.deviceSlot.update({
    where: { id: slot.id },
    data: { lastSeenAt: new Date() },
  });
  return slot;
}

export async function requireRequestDeviceSlot(request: Request, userId: string) {
  const slot = await findRequestDeviceSlot(request, userId);
  if (!slot) throw new AuthError('TRUSTED_DEVICE_REQUIRED', 403);
  return slot;
}

export async function enrollDeviceSlot(userId: string, label?: string) {
  for (let retry = 0; retry < 3; retry += 1) {
    const issued = issueDeviceToken();
    try {
      const slot = await prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw(Prisma.sql`
          SELECT id FROM app_private."User" WHERE id = ${userId}::uuid FOR UPDATE
        `);
        const existing = await transaction.deviceSlot.findMany({
          where: { userId, revokedAt: null },
          orderBy: { slotNumber: 'asc' },
        });
        const slotNumber = ([1, 2] as const).find((candidate) => (
          !existing.some((slot) => slot.slotNumber === candidate)
        ));
        if (!slotNumber) throw new AuthError('DEVICE_LIMIT_REACHED', 409);
        return transaction.deviceSlot.create({
          data: { userId, slotNumber, tokenHash: issued.tokenHash, label },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { slot, token: issued.token };
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2034' || error.code === 'P2002')
        && retry < 2;
      if (!retryable) throw error;
    }
  }
  throw new Error('UNREACHABLE_DEVICE_ENROLLMENT_STATE');
}

function replacementCooldownHours() {
  const configured = Number(process.env.DEVICE_REPLACEMENT_COOLDOWN_HOURS ?? 168);
  return Number.isFinite(configured) && configured >= 0 ? configured : 168;
}

export async function replaceDeviceSlot(
  userId: string,
  slotNumber: number,
  label?: string,
) {
  const issued = issueDeviceToken();
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - replacementCooldownHours() * 3_600_000);

  const slot = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."User" WHERE id = ${userId}::uuid FOR UPDATE
    `);
    const current = await transaction.deviceSlot.findUnique({
      where: { userId_slotNumber: { userId, slotNumber } },
    });
    if (!current) throw new AuthError('DEVICE_SLOT_NOT_FOUND', 404);
    if (current.lastReplacedAt && current.lastReplacedAt > cooldownStart) {
      throw new AuthError('DEVICE_REPLACEMENT_COOLDOWN', 429);
    }
    return transaction.deviceSlot.update({
      where: { id: current.id },
      data: {
        tokenHash: issued.tokenHash,
        label,
        revokedAt: null,
        lastSeenAt: now,
        lastReplacedAt: now,
        replacementCount: { increment: 1 },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { slot, token: issued.token };
}

export function publicDeviceSlot(slot: DeviceSlot) {
  return {
    id: slot.id,
    slotNumber: slot.slotNumber,
    label: slot.label,
    enrolledAt: slot.enrolledAt,
    lastSeenAt: slot.lastSeenAt,
    lastReplacedAt: slot.lastReplacedAt,
  };
}
