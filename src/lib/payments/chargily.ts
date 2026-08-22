import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const checkoutSchema = z.object({
  id: z.string().min(8).max(128),
  entity: z.literal('checkout'),
  livemode: z.boolean(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'canceled']),
  metadata: z.unknown().optional().nullable(),
  checkout_url: z.url(),
}).passthrough();

const webhookCheckoutSchema = z.object({
  id: z.string().min(8).max(128),
  entity: z.literal('checkout'),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'canceled']),
  metadata: z.unknown().optional().nullable(),
}).passthrough();

const chargilyWebhookSchema = z.object({
  id: z.string().min(8).max(128),
  entity: z.literal('event'),
  livemode: z.union([z.boolean(), z.enum(['true', 'false'])]),
  type: z.enum(['checkout.paid', 'checkout.failed', 'checkout.canceled']),
  data: webhookCheckoutSchema,
}).passthrough();

export type ChargilyWebhook = z.infer<typeof chargilyWebhookSchema> & { liveMode: boolean };

export class ChargilyRequestError extends Error {
  constructor(
    public readonly ambiguous: boolean,
    public readonly httpStatus?: number,
  ) {
    super(ambiguous ? 'CHARGILY_CHECKOUT_AMBIGUOUS' : 'CHARGILY_CHECKOUT_REJECTED');
    this.name = 'ChargilyRequestError';
  }
}

function chargilyMode() {
  const mode = process.env.CHARGILY_MODE;
  if (mode !== 'test' && mode !== 'live') throw new Error('CHARGILY_MODE_NOT_CONFIGURED');
  return mode;
}

export function chargilyLiveMode() {
  return chargilyMode() === 'live';
}

function secretKey() {
  const value = process.env.CHARGILY_SECRET_KEY;
  if (!value) throw new Error('CHARGILY_SECRET_KEY_NOT_CONFIGURED');
  return value;
}

function apiBaseUrl() {
  return chargilyLiveMode()
    ? 'https://pay.chargily.net/api/v2'
    : 'https://pay.chargily.net/test/api/v2';
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function verifyChargilySignature(rawBody: string, signature: string | null) {
  if (!signature || !/^[0-9a-f]{64}$/iu.test(signature)) return false;
  const expected = createHmac('sha256', secretKey()).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function parseChargilyWebhook(rawBody: string): ChargilyWebhook {
  const parsed = chargilyWebhookSchema.parse(JSON.parse(rawBody));
  return {
    ...parsed,
    liveMode: parsed.livemode === true || parsed.livemode === 'true',
  };
}

export function chargilyMetadata(value: unknown) {
  const candidate = Array.isArray(value) ? value.at(0) : value;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, unknown>;
  const orderId = record.order_id;
  const paymentAttemptId = record.payment_attempt_id;
  const schemaVersion = record.schema_version;
  if (
    typeof orderId !== 'string'
    || typeof paymentAttemptId !== 'string'
    || schemaVersion !== 1
  ) return null;
  return { orderId, paymentAttemptId };
}

export async function createChargilyCheckout(input: {
  amountMinor: number;
  currency: string;
  successUrl: string;
  failureUrl: string;
  webhookUrl: string;
  locale: 'ar' | 'en' | 'fr';
  description: string;
  orderId: string;
  paymentAttemptId: string;
}) {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        success_url: input.successUrl,
        failure_url: input.failureUrl,
        webhook_endpoint: input.webhookUrl,
        locale: input.locale,
        description: input.description,
        metadata: [{
          schema_version: 1,
          order_id: input.orderId,
          payment_attempt_id: input.paymentAttemptId,
        }],
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // A timeout or broken connection may occur after Chargily accepted the
    // request. Without a documented provider idempotency key this is ambiguous.
    throw new ChargilyRequestError(true);
  }
  if (!response.ok) throw new ChargilyRequestError(false, response.status);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ChargilyRequestError(true, response.status);
  }
  return checkoutSchema.parse(body);
}
