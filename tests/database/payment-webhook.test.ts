import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('concurrent verified Chargily webhooks grant exactly one entitlement', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.CHARGILY_MODE = 'test';
  process.env.CHARGILY_SECRET_KEY = 'database-test-chargily-secret';
  const [{ default: prisma }, { processChargilyWebhook }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/payments/payment-service'),
  ]);
  const userId = randomUUID();
  const productCode = `payment-${randomUUID()}`;
  const providerCheckoutId = `checkout-${randomUUID()}`;
  let orderId: string | undefined;
  let paymentAttemptId: string | undefined;
  let productId: string | undefined;

  try {
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.invalid` } });
    const product = await prisma.product.create({
      data: {
        code: productCode,
        tier: 'TIER_2_DIAGNOSTIC',
        name: 'Payment integration fixture',
        priceMinor: 29_500,
        currency: 'DZD',
        accessDays: 30,
        maximumAttempts: 2,
      },
    });
    productId = product.id;
    const order = await prisma.order.create({
      data: {
        userId,
        productId: product.id,
        idempotencyKey: `database-test:${randomUUID()}`,
        amountMinor: product.priceMinor,
        currency: product.currency,
        paymentAttempts: {
          create: {
            provider: 'CHARGILY',
            providerCheckoutId,
            liveMode: false,
            requestHash: '11'.repeat(32),
            amountMinor: product.priceMinor,
            currency: product.currency,
          },
        },
      },
      include: { paymentAttempts: true },
    });
    orderId = order.id;
    paymentAttemptId = order.paymentAttempts[0].id;
    const event = {
      id: `event-${randomUUID()}`,
      entity: 'event',
      livemode: false,
      type: 'checkout.paid',
      data: {
        id: providerCheckoutId,
        entity: 'checkout',
        amount: 295,
        currency: 'dzd',
        status: 'paid',
        metadata: [{ schema_version: 1, order_id: order.id, payment_attempt_id: paymentAttemptId }],
      },
    };
    const rawBody = JSON.stringify(event);
    const signature = createHmac('sha256', process.env.CHARGILY_SECRET_KEY).update(rawBody).digest('hex');
    const results = await Promise.all([
      processChargilyWebhook(rawBody, signature),
      processChargilyWebhook(rawBody, signature),
    ]);
    assert.equal(results.filter((result) => result.duplicate).length, 1);
    assert.equal(await prisma.paymentEvent.count({ where: { providerEventId: event.id } }), 1);
    assert.equal(await prisma.entitlement.count({ where: { orderId: order.id } }), 1);
    const persisted = await prisma.order.findUnique({
      where: { id: order.id },
      include: { paymentAttempts: true, entitlements: true },
    });
    assert.equal(persisted?.status, 'PAID');
    assert.equal(persisted?.paymentAttempts[0].status, 'SUCCEEDED');
    assert.equal(persisted?.entitlements[0].status, 'ACTIVE');
    assert.equal(persisted?.entitlements[0].maximumAttempts, 2);

    const tampered = rawBody.replace('"amount":295', '"amount":296');
    await assert.rejects(processChargilyWebhook(tampered, signature));
    assert.equal(await prisma.entitlement.count({ where: { orderId: order.id } }), 1);
  } finally {
    if (orderId) {
      await prisma.entitlement.deleteMany({ where: { orderId } });
      if (paymentAttemptId) await prisma.paymentEvent.deleteMany({ where: { paymentAttemptId } });
      await prisma.paymentAttempt.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});
