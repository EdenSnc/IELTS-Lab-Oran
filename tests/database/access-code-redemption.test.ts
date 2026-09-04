import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('access codes are single-use, retry-safe, product-bound and audited', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-database-test-key';
  const [{ default: prisma }, { completeAccountOnboarding }, { generateAccessCodes, redeemAccessCode }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/account-readiness'),
    import('../../src/lib/access-codes/access-code-service'),
  ]);
  const staff = await prisma.user.create({ data: { id: randomUUID(), role: 'ADMIN' } });
  const learner = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid` } });
  const otherLearner = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid` } });
  const product = await prisma.product.create({
    data: { code: `code-${randomUUID()}`, tier: 'TIER_1_BASE', name: 'Access code fixture', priceMinor: 390_000, accessDays: 30, maximumAttempts: 1 },
  });
  for (const [index, user] of [learner, otherLearner].entries()) {
    await completeAccountOnboarding({
      userId: user.id,
      name: `Code Learner ${index}`,
      whatsapp: `+213${610000000 + Math.floor(Math.random() * 80_000_000)}`,
      wilaya: '31 Oran',
      preferredLocale: 'en',
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
      acceptedFrom: 'database-test',
    });
  }

  const [generated] = await generateAccessCodes({
    actorUserId: staff.id,
    productId: product.id,
    quantity: 1,
    reason: 'Student club allocation',
  });
  assert.match(generated.code, /^IELTS(?:-[A-Z0-9]{4}){5}$/u);
  const first = await redeemAccessCode({ userId: learner.id, code: generated.code });
  const replay = await redeemAccessCode({ userId: learner.id, code: generated.code });
  assert.equal(replay.entitlementId, first.entitlementId);
  await assert.rejects(
    redeemAccessCode({ userId: otherLearner.id, code: generated.code }),
    /ACCESS_CODE_ALREADY_REDEEMED/u,
  );
  assert.equal(await prisma.entitlement.count({ where: { accessCodeId: generated.id } }), 1);
  assert.equal(await prisma.staffActionAudit.count({ where: { targetId: generated.id, action: 'GENERATE_ACCESS_CODE' } }), 1);
  assert.equal(await prisma.funnelEvent.count({ where: { userId: learner.id, type: 'ENTITLEMENT_GRANTED' } }), 1);

  const concurrentLearner = await prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@example.invalid` } });
  await completeAccountOnboarding({
    userId: concurrentLearner.id,
    name: 'Concurrent Code Learner',
    whatsapp: `+213${710000000 + Math.floor(Math.random() * 80_000_000)}`,
    wilaya: '31 Oran',
    preferredLocale: 'en',
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false,
    acceptedFrom: 'database-test',
  });
  const concurrentCodes = await generateAccessCodes({
    actorUserId: staff.id,
    productId: product.id,
    quantity: 2,
    reason: 'Concurrent redemption test',
  });
  const concurrentResults = await Promise.allSettled(concurrentCodes.map(({ code }) => (
    redeemAccessCode({ userId: concurrentLearner.id, code })
  )));
  assert.equal(concurrentResults.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(await prisma.entitlement.count({
    where: { userId: concurrentLearner.id, productId: product.id, status: 'ACTIVE' },
  }), 1);
});
