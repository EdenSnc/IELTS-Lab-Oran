import assert from 'node:assert/strict';
import test from 'node:test';
import { ChargilyRequestError, createChargilyCheckout } from '../../src/lib/payments/chargily';

const input = {
  amountMinor: 390_000, currency: 'DZD', locale: 'en' as const,
  successUrl: 'https://example.invalid/success',
  failureUrl: 'https://example.invalid/failure',
  webhookUrl: 'https://example.invalid/webhook',
  description: 'Checkout error regression', orderId: 'fixture-order',
  paymentAttemptId: 'fixture-attempt',
};

test('checkout creation preserves ambiguous HTTP outcomes for reconciliation', async () => {
  const originalFetch = globalThis.fetch;
  const originalMode = process.env.CHARGILY_MODE;
  const originalKey = process.env.CHARGILY_SECRET_KEY;
  process.env.CHARGILY_MODE = 'test';
  process.env.CHARGILY_SECRET_KEY = 'unit-test-only';
  try {
    for (const status of [408, 500, 502, 503, 504]) {
      globalThis.fetch = async () => new Response('', { status });
      await assert.rejects(createChargilyCheckout(input), (error: unknown) => (
        error instanceof ChargilyRequestError && error.ambiguous && error.httpStatus === status
      ), `HTTP ${status} must not be treated as a definitive rejection`);
    }
    for (const status of [400, 401, 403, 422]) {
      globalThis.fetch = async () => new Response('', { status });
      await assert.rejects(createChargilyCheckout(input), (error: unknown) => (
        error instanceof ChargilyRequestError && !error.ambiguous && error.httpStatus === status
      ));
    }
    globalThis.fetch = async () => { throw new TypeError('Simulated network failure'); };
    await assert.rejects(createChargilyCheckout(input), (error: unknown) => (
      error instanceof ChargilyRequestError && error.ambiguous
    ));
    globalThis.fetch = async () => new Response('not json', { status: 200 });
    await assert.rejects(createChargilyCheckout(input), (error: unknown) => (
      error instanceof ChargilyRequestError && error.ambiguous
    ));
    globalThis.fetch = async () => Response.json({
      id: 'fixture-checkout', entity: 'checkout', livemode: false,
      amount: 3900, currency: 'dzd', status: 'pending',
      metadata: [], checkout_url: 'https://pay.chargily.dz/test/checkout/fixture',
    });
    assert.equal((await createChargilyCheckout(input)).id, 'fixture-checkout');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMode === undefined) delete process.env.CHARGILY_MODE;
    else process.env.CHARGILY_MODE = originalMode;
    if (originalKey === undefined) delete process.env.CHARGILY_SECRET_KEY;
    else process.env.CHARGILY_SECRET_KEY = originalKey;
  }
});
