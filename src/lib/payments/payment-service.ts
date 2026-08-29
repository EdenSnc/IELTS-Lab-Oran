import 'server-only';

import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { CANONICAL_ORIGIN } from '@/lib/seo';
import {
  ChargilyRequestError,
  chargilyAmountFromMinor,
  chargilyLiveMode,
  chargilyMetadata,
  createChargilyCheckout,
  normalizeChargilyCheckoutUrl,
  parseChargilyWebhook,
  sha256,
  verifyChargilySignature,
} from './chargily';

const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9._~-]+$/u);
const localeSchema = z.enum(['ar', 'en', 'fr']);

export class PaymentServiceError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
    this.name = 'PaymentServiceError';
  }
}

function retryableTransactionError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown; meta?: { code?: unknown } };
  return candidate.code === 'P2034'
    || candidate.code === 'P2002'
    || (
      candidate.code === 'P2010'
      && (
        candidate.meta?.code === '40001'
        || (typeof candidate.message === 'string' && candidate.message.includes('Code: `40001`'))
      )
    );
}

function callbackBaseUrl() {
  const url = new URL(process.env.PAYMENT_CALLBACK_BASE_URL ?? CANONICAL_ORIGIN);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('PAYMENT_CALLBACK_BASE_URL_NOT_SECURE');
  }
  return url.origin;
}

function requestHash(input: {
  userId: string;
  productId: string;
  amountMinor: number;
  currency: string;
  liveMode: boolean;
}) {
  return sha256(JSON.stringify({ version: 1, ...input }));
}

export async function createCheckoutForProduct(input: {
  userId: string;
  productCode: string;
  idempotencyKey: string;
  locale: string;
}) {
  const clientKey = idempotencyKeySchema.parse(input.idempotencyKey);
  const locale = localeSchema.parse(input.locale);
  const liveMode = chargilyLiveMode();
  const localIdempotencyKey = `chargily:${input.userId}:${clientKey}`;

  let prepared: {
    orderId: string;
    paymentAttemptId: string;
    productName: string;
    amountMinor: number;
    currency: string;
    requestHash: string;
    existingCheckoutUrl: string | null;
  } | undefined;

  for (let retry = 0; retry < 3; retry += 1) {
    try {
      prepared = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.order.findUnique({
          where: { idempotencyKey: localIdempotencyKey },
          include: {
            product: { select: { code: true, name: true } },
            paymentAttempts: {
              where: { provider: 'CHARGILY' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        if (existing) {
          if (existing.userId !== input.userId || existing.product.code !== input.productCode) {
            throw new PaymentServiceError('IDEMPOTENCY_KEY_CONFLICT', 409);
          }
          const attempt = existing.paymentAttempts.at(0);
          if (!attempt) throw new Error('PAYMENT_ATTEMPT_MISSING');
          if (!attempt.checkoutUrl) {
            throw new PaymentServiceError('CHECKOUT_CREATION_PENDING_RECONCILIATION', 409);
          }
          return {
            orderId: existing.id,
            paymentAttemptId: attempt.id,
            productName: existing.product.name,
            amountMinor: existing.amountMinor,
            currency: existing.currency,
            requestHash: attempt.requestHash,
            existingCheckoutUrl: attempt.checkoutUrl,
          };
        }

        const product = await transaction.product.findFirst({
          where: { code: input.productCode, active: true },
        });
        if (!product) throw new PaymentServiceError('PRODUCT_NOT_FOUND', 404);
        try {
          chargilyAmountFromMinor(product.priceMinor, product.currency);
        } catch {
          throw new PaymentServiceError('PRODUCT_PRICE_NOT_SUPPORTED', 409);
        }
        const hash = requestHash({
          userId: input.userId,
          productId: product.id,
          amountMinor: product.priceMinor,
          currency: product.currency,
          liveMode,
        });
        const order = await transaction.order.create({
          data: {
            userId: input.userId,
            productId: product.id,
            idempotencyKey: localIdempotencyKey,
            amountMinor: product.priceMinor,
            currency: product.currency,
            paymentAttempts: {
              create: {
                provider: 'CHARGILY',
                liveMode,
                requestHash: hash,
                amountMinor: product.priceMinor,
                currency: product.currency,
              },
            },
          },
          include: { paymentAttempts: true },
        });
        return {
          orderId: order.id,
          paymentAttemptId: order.paymentAttempts[0].id,
          productName: product.name,
          amountMinor: order.amountMinor,
          currency: order.currency,
          requestHash: hash,
          existingCheckoutUrl: null,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (error) {
      const retryable = retryableTransactionError(error) && retry < 2;
      if (!retryable) throw error;
    }
  }
  if (!prepared) throw new Error('UNREACHABLE_CHECKOUT_PREPARATION_STATE');
  if (prepared.existingCheckoutUrl) return { ...prepared, checkoutUrl: prepared.existingCheckoutUrl };

  const baseUrl = callbackBaseUrl();
  let checkout: Awaited<ReturnType<typeof createChargilyCheckout>>;
  try {
    checkout = await createChargilyCheckout({
      amountMinor: prepared.amountMinor,
      currency: prepared.currency,
      successUrl: `${baseUrl}/${locale}/account?payment=success&order=${prepared.orderId}`,
      failureUrl: `${baseUrl}/${locale}/account?payment=failed&order=${prepared.orderId}`,
      webhookUrl: `${baseUrl}/api/payments/webhooks/chargily`,
      locale,
      description: prepared.productName,
      orderId: prepared.orderId,
      paymentAttemptId: prepared.paymentAttemptId,
    });
  } catch (error) {
    const ambiguous = !(error instanceof ChargilyRequestError) || error.ambiguous;
    await prisma.paymentAttempt.update({
      where: { id: prepared.paymentAttemptId },
      data: {
        status: ambiguous ? 'PROCESSING' : 'FAILED',
        failureCode: ambiguous ? 'CHECKOUT_CREATE_AMBIGUOUS' : 'CHECKOUT_CREATE_REJECTED',
        failureMessage: null,
      },
    });
    throw new PaymentServiceError(
      ambiguous ? 'CHECKOUT_CREATION_PENDING_RECONCILIATION' : 'CHECKOUT_CREATION_FAILED',
      ambiguous ? 503 : 502,
    );
  }

  const metadata = chargilyMetadata(checkout.metadata);
  const checkoutUrl = new URL(checkout.checkout_url);
  const normalizedCheckoutUrl = normalizeChargilyCheckoutUrl(checkout.checkout_url);
  const providerAmount = chargilyAmountFromMinor(prepared.amountMinor, prepared.currency);
  const responseMismatch = {
    liveMode: checkout.livemode !== liveMode,
    amount: checkout.amount !== providerAmount,
    currency: checkout.currency.toUpperCase() !== prepared.currency,
    metadata: !metadata,
    orderMetadata: metadata?.orderId !== prepared.orderId,
    attemptMetadata: metadata?.paymentAttemptId !== prepared.paymentAttemptId,
    checkoutUrl: !normalizedCheckoutUrl,
  };
  if (Object.values(responseMismatch).some(Boolean)) {
    console.error('Chargily checkout response integrity mismatch', {
      mismatch: responseMismatch,
      expected: { liveMode, amount: providerAmount, currency: prepared.currency },
      received: {
        liveMode: checkout.livemode,
        amount: checkout.amount,
        currency: checkout.currency,
        metadataShape: Array.isArray(checkout.metadata) ? 'array' : typeof checkout.metadata,
        protocol: checkoutUrl.protocol,
        hostname: checkoutUrl.hostname,
      },
    });
    await prisma.paymentAttempt.update({
      where: { id: prepared.paymentAttemptId },
      data: { status: 'FAILED', failureCode: 'CHECKOUT_RESPONSE_MISMATCH' },
    });
    throw new PaymentServiceError('CHECKOUT_RESPONSE_MISMATCH', 502);
  }

  const persisted = await prisma.paymentAttempt.updateMany({
    where: {
      id: prepared.paymentAttemptId,
      requestHash: prepared.requestHash,
      providerCheckoutId: null,
      status: 'PENDING',
    },
    data: {
      providerCheckoutId: checkout.id,
      checkoutUrl: normalizedCheckoutUrl!,
      status: checkout.status === 'processing' ? 'PROCESSING' : 'PENDING',
      failureCode: null,
      failureMessage: null,
    },
  });
  if (persisted.count !== 1) throw new PaymentServiceError('CHECKOUT_PERSISTENCE_CONFLICT', 409);
  return { ...prepared, checkoutUrl: normalizedCheckoutUrl! };
}

function expectedStatus(eventType: string) {
  if (eventType === 'checkout.paid') return 'paid';
  if (eventType === 'checkout.failed') return 'failed';
  return 'canceled';
}

export async function processChargilyWebhook(rawBody: string, signature: string | null) {
  if (!verifyChargilySignature(rawBody, signature)) {
    throw new PaymentServiceError('INVALID_WEBHOOK_SIGNATURE', 403);
  }
  const event = parseChargilyWebhook(rawBody);
  const payloadHash = sha256(rawBody);
  const metadata = chargilyMetadata(event.data.metadata);
  if (!metadata || event.data.status !== expectedStatus(event.type)) {
    throw new PaymentServiceError('INVALID_WEBHOOK_PAYLOAD', 400);
  }
  if (event.liveMode !== chargilyLiveMode()) {
    throw new PaymentServiceError('WEBHOOK_ENVIRONMENT_MISMATCH', 400);
  }

  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
    const duplicate = await transaction.paymentEvent.findUnique({
      where: { providerEventId: event.id },
    });
    if (duplicate) {
      if (duplicate.payloadHash !== payloadHash) {
        throw new PaymentServiceError('WEBHOOK_EVENT_REPLAY_MISMATCH', 409);
      }
      return { duplicate: true, eventType: duplicate.eventType };
    }

    await transaction.$queryRaw(Prisma.sql`
      SELECT id FROM app_private."PaymentAttempt"
      WHERE provider = 'CHARGILY'
        AND "providerCheckoutId" = ${event.data.id}
      FOR UPDATE
    `);
    const payment = await transaction.paymentAttempt.findFirst({
      where: { provider: 'CHARGILY', providerCheckoutId: event.data.id },
      include: { order: { include: { product: true, entitlements: true } } },
    });
    if (!payment) throw new PaymentServiceError('PAYMENT_ATTEMPT_NOT_FOUND', 404);
    const duplicateAfterLock = await transaction.paymentEvent.findUnique({
      where: { providerEventId: event.id },
    });
    if (duplicateAfterLock) {
      if (duplicateAfterLock.payloadHash !== payloadHash) {
        throw new PaymentServiceError('WEBHOOK_EVENT_REPLAY_MISMATCH', 409);
      }
      return { duplicate: true, eventType: duplicateAfterLock.eventType };
    }
    if (
      payment.id !== metadata.paymentAttemptId
      || payment.orderId !== metadata.orderId
      || payment.liveMode !== event.liveMode
      || chargilyAmountFromMinor(payment.amountMinor, payment.currency) !== event.data.amount
      || payment.currency !== event.data.currency.toUpperCase()
      || chargilyAmountFromMinor(payment.order.amountMinor, payment.order.currency) !== event.data.amount
      || payment.order.currency !== event.data.currency.toUpperCase()
    ) throw new PaymentServiceError('PAYMENT_WEBHOOK_MISMATCH', 409);

    const now = new Date();
    const paymentEvent = await transaction.paymentEvent.create({
      data: {
        paymentAttemptId: payment.id,
        providerEventId: event.id,
        eventType: event.type,
        payloadHash,
      },
    });

    if (event.type === 'checkout.paid') {
      await transaction.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', completedAt: payment.completedAt ?? now, failureCode: null, failureMessage: null },
      });
      await transaction.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paidAt: payment.order.paidAt ?? now, cancelledAt: null },
      });
      const existingEntitlement = payment.order.entitlements.at(0);
      if (existingEntitlement) {
        if (
          existingEntitlement.userId !== payment.order.userId
          || existingEntitlement.productId !== payment.order.productId
        ) throw new PaymentServiceError('ENTITLEMENT_ORDER_MISMATCH', 409);
      } else {
        await transaction.entitlement.create({
          data: {
            userId: payment.order.userId,
            productId: payment.order.productId,
            orderId: payment.order.id,
            status: 'ACTIVE',
            startsAt: now,
            endsAt: payment.order.product.accessDays
              ? new Date(now.getTime() + payment.order.product.accessDays * 86_400_000)
              : null,
            maximumAttempts: payment.order.product.maximumAttempts,
          },
        });
      }
    } else if (payment.status !== 'SUCCEEDED') {
      await transaction.paymentAttempt.update({
        where: { id: payment.id },
        data: {
          status: event.type === 'checkout.failed' ? 'FAILED' : 'CANCELLED',
          completedAt: now,
          failureCode: event.type === 'checkout.failed' ? 'CHECKOUT_FAILED' : 'CHECKOUT_CANCELLED',
        },
      });
      if (event.type === 'checkout.canceled' && payment.order.status !== 'PAID') {
        await transaction.order.update({
          where: { id: payment.orderId },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
      }
    }

    await transaction.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: { processedAt: now },
    });
    return { duplicate: false, eventType: event.type };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = retryableTransactionError(error) && retry < 2;
      if (!retryable) throw error;
    }
  }
  throw new Error('UNREACHABLE_PAYMENT_WEBHOOK_STATE');
}
