import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('refunds revoke unused access, retain started access, and replay idempotently', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.CHARGILY_MODE = 'test';
  process.env.CHARGILY_SECRET_KEY = 'database-test-chargily-secret';
  const [{ default: prisma }, { processChargilyWebhook }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/payments/payment-service'),
  ]);
  const user = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid` } });
  const product = await prisma.product.create({
    data: { code: `refund-${randomUUID()}`, tier: 'TIER_1_BASE', name: 'Refund fixture', priceMinor: 390_000, currency: 'DZD', maximumAttempts: 1 },
  });

  async function fixture(started: boolean) {
    const checkoutId = `checkout-${randomUUID()}`;
    const order = await prisma.order.create({
      data: {
        userId: user.id, productId: product.id, idempotencyKey: `refund:${randomUUID()}`,
        amountMinor: product.priceMinor, currency: 'DZD', status: 'PAID', paidAt: new Date(),
        paymentAttempts: { create: { provider: 'CHARGILY', providerCheckoutId: checkoutId, liveMode: false, requestHash: '22'.repeat(32), status: 'SUCCEEDED', amountMinor: product.priceMinor, currency: 'DZD' } },
        entitlements: { create: { userId: user.id, productId: product.id, status: 'ACTIVE', startsAt: new Date(), maximumAttempts: 1 } },
      },
      include: { paymentAttempts: true, entitlements: true },
    });
    if (started) {
      const blueprint = await prisma.testBlueprint.create({ data: { code: `refund-${randomUUID()}`, version: 1, name: 'Refund attempt', variant: 'ACADEMIC' } });
      await prisma.assessmentAttempt.create({
        data: { userId: user.id, blueprintId: blueprint.id, entitlementId: order.entitlements[0].id, state: 'ACTIVE', randomSeed: randomUUID(), startedAt: new Date() },
      });
    }
    const event = {
      id: `event-${randomUUID()}`, entity: 'event', livemode: false, type: 'checkout.refunded',
      data: { id: checkoutId, entity: 'checkout', amount: 3900, currency: 'dzd', status: 'refunded', metadata: [{ schema_version: 1, order_id: order.id, payment_attempt_id: order.paymentAttempts[0].id }] },
    };
    const raw = JSON.stringify(event);
    const signature = createHmac('sha256', process.env.CHARGILY_SECRET_KEY as string).update(raw).digest('hex');
    await processChargilyWebhook(raw, signature);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'REFUNDED');
    assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: order.paymentAttempts[0].id } })).status, 'REFUNDED');
    assert.equal((await prisma.entitlement.findUniqueOrThrow({ where: { id: order.entitlements[0].id } })).status, started ? 'ACTIVE' : 'REVOKED');
    assert.equal((await processChargilyWebhook(raw, signature)).duplicate, true);
  }

  await fixture(false);
  await fixture(true);
});

test('payment reconciliation expires stale orders and staff access extension is audited', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { reconcilePaymentOperations }, { extendEntitlementAccess }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/payments/payment-service'),
    import('../../src/lib/payments/staff-operations'),
  ]);
  const staff = await prisma.user.create({ data: { id: randomUUID(), role: 'ADMIN' } });
  const learner = await prisma.user.create({ data: { id: randomUUID() } });
  const product = await prisma.product.create({ data: { code: `reconcile-${randomUUID()}`, tier: 'TIER_1_BASE', name: 'Reconcile fixture', priceMinor: 390_000 } });
  const order = await prisma.order.create({
    data: { userId: learner.id, productId: product.id, idempotencyKey: `reconcile:${randomUUID()}`, amountMinor: 390_000, createdAt: new Date(Date.now() - 61 * 60_000), paymentAttempts: { create: { provider: 'CHARGILY', liveMode: false, requestHash: '33'.repeat(32), amountMinor: 390_000 } } },
    include: { paymentAttempts: true },
  });
  const result = await reconcilePaymentOperations(new Date());
  assert.equal(result.expiredOrders >= 1, true);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'CANCELLED');
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: order.paymentAttempts[0].id } })).status, 'EXPIRED');

  const entitlement = await prisma.entitlement.create({ data: { userId: learner.id, productId: product.id, status: 'ACTIVE', endsAt: new Date('2026-09-10T00:00:00Z') } });
  await extendEntitlementAccess({ entitlementId: entitlement.id, days: 7, reason: 'Support correction', actorUserId: staff.id });
  assert.equal((await prisma.entitlement.findUniqueOrThrow({ where: { id: entitlement.id } })).endsAt?.toISOString(), '2026-09-17T00:00:00.000Z');
  assert.equal(await prisma.staffActionAudit.count({ where: { actorUserId: staff.id, targetId: entitlement.id, action: 'EXTEND_ACCESS' } }), 1);
});

test('checkout creation reuses one unresolved order per user and product within 30 minutes', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.CHARGILY_MODE = 'test';
  process.env.CHARGILY_SECRET_KEY = 'database-test-chargily-secret';
  process.env.PAYMENT_CALLBACK_BASE_URL = 'http://127.0.0.1:3000';
  const [{ default: prisma }, { completeAccountOnboarding }, { createCheckoutForProduct }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/account-readiness'),
    import('../../src/lib/payments/payment-service'),
  ]);
  const user = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid` } });
  const product = await prisma.product.create({
    data: { code: `checkout-${randomUUID()}`, tier: 'TIER_1_BASE', name: 'Checkout fixture', priceMinor: 390_000, currency: 'DZD' },
  });
  await completeAccountOnboarding({
    userId: user.id,
    name: 'Checkout Learner',
    whatsapp: `+213${Math.floor(100000000 + Math.random() * 900000000)}`,
    wilaya: '31 Oran',
    preferredLocale: 'en',
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false,
    acceptedFrom: 'database-test',
  });

  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async (_input, init) => {
    providerCalls += 1;
    const requestBody = JSON.parse(String(init?.body)) as {
      amount: number;
      currency: string;
      metadata: unknown;
    };
    return Response.json({
      id: `checkout-${randomUUID()}`,
      entity: 'checkout',
      livemode: false,
      amount: requestBody.amount,
      currency: requestBody.currency,
      status: 'pending',
      metadata: requestBody.metadata,
      checkout_url: `https://pay.chargily.dz/test/checkouts/${randomUUID()}`,
    });
  };
  try {
    const first = await createCheckoutForProduct({
      userId: user.id,
      productCode: product.code,
      idempotencyKey: `first-${randomUUID()}`,
      locale: 'en',
    });
    const second = await createCheckoutForProduct({
      userId: user.id,
      productCode: product.code,
      idempotencyKey: `second-${randomUUID()}`,
      locale: 'en',
    });
    assert.equal(second.orderId, first.orderId);
    assert.equal(second.checkoutUrl, first.checkoutUrl);
    assert.equal(providerCalls, 1);
    assert.equal(await prisma.order.count({ where: { userId: user.id, productId: product.id } }), 1);
    assert.equal(await prisma.funnelEvent.count({ where: { orderId: first.orderId, type: 'CHECKOUT_CREATED' } }), 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
