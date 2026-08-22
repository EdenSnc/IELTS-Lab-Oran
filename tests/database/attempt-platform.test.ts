import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('actual attempt services enforce entitlement, devices, immutable manifests, autosave, and strict leases', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  const [
    { default: prisma },
    { encrypt },
    { createAuthenticatedAttempt },
    { enrollDeviceSlot },
    { acquireAttemptExecution },
    { saveResponseOptimistically },
    { submitAndGradeObjectiveAttempt },
  ] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/crypto'),
    import('../../src/lib/attempts/attempt-service'),
    import('../../src/lib/auth/device-slots'),
    import('../../src/lib/attempts/execution-lease'),
    import('../../src/lib/db/concurrency'),
    import('../../src/lib/attempts/objective-attempt-grading'),
  ]);

  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `attempt-${suffix}@example.invalid` },
  });
  const source = await prisma.contentSource.create({
    data: { provider: 'OTHER', name: `attempt source ${suffix}` },
  });
  const contentTest = await prisma.test.create({
    data: {
      sourceId: source.id,
      externalId: `attempt-${suffix}`,
      title: 'Attempt integration fixture',
      variant: 'ACADEMIC',
      sourceYear: 2026,
    },
  });
  const version = await prisma.testVersion.create({
    data: {
      testId: contentTest.id,
      version: 1,
      status: 'DRAFT',
      contentHash: `attempt-content-${suffix}`,
    },
  });
  const section = await prisma.testSection.create({
    data: {
      testVersionId: version.id,
      skill: 'READING',
      displayOrder: 1,
      timeLimitSeconds: 3_600,
    },
  });
  const part = await prisma.testPart.create({
    data: {
      testSectionId: section.id,
      sourceKey: 'reading-1',
      slot: 'READING_SECTION_1',
      title: 'Reading section',
      reviewStatus: 'VERIFIED',
    },
  });
  await prisma.stimulus.create({
    data: {
      testPartId: part.id,
      sourceKey: 'passage',
      type: 'READING_PASSAGE',
      displayOrder: 1,
      plainText: 'A verified integration passage.',
      reviewStatus: 'VERIFIED',
    },
  });
  const group = await prisma.questionGroup.create({
    data: {
      testPartId: part.id,
      sourceKey: 'q1',
      displayOrder: 1,
      questionType: 'SHORT_ANSWER',
      responseKind: 'SHORT_TEXT',
      scoringStrategy: 'PER_ITEM_EXACT',
      maxMarks: 1,
      independent: true,
      reviewStatus: 'VERIFIED',
    },
  });
  const question = await prisma.question.create({
    data: {
      questionGroupId: group.id,
      stableKey: 'q1',
      sourceNumber: 27,
      displayOrder: 1,
      maxMarks: 1,
    },
  });
  await prisma.answerKey.create({
    data: {
      questionGroupId: group.id,
      encryptedPayload: encrypt(JSON.stringify({
        strategy: 'PER_ITEM_EXACT',
        answersByStableKey: { q1: ['correct'] },
      })),
      formatVersion: 2,
      sourceType: 'HUMAN_VERIFIED',
      normalization: { caseSensitive: false },
      reviewStatus: 'VERIFIED',
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
  });
  await prisma.testVersion.update({
    where: { id: version.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });

  const blueprint = await prisma.testBlueprint.create({
    data: {
      code: `reading-${suffix}`,
      version: 1,
      name: 'Secure Reading integration fixture',
      variant: 'ACADEMIC',
      fixedTestVersionId: version.id,
    },
  });
  const slot = await prisma.blueprintSlot.create({
    data: {
      blueprintId: blueprint.id,
      partSlot: 'READING_SECTION_1',
      displayOrder: 1,
      requiredCount: 1,
      selectionMode: 'WHOLE_PART',
      targetMarks: 1,
    },
  });
  await prisma.testBlueprint.update({
    where: { id: blueprint.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  const product = await prisma.product.create({
    data: {
      code: `product-${suffix}`,
      tier: 'TIER_1_BASE',
      name: 'Attempt integration product',
      priceMinor: 100,
      maximumAttempts: 1,
      blueprints: { create: { blueprintId: blueprint.id } },
    },
  });
  const entitlement = await prisma.entitlement.create({
    data: {
      userId: user.id,
      productId: product.id,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 60_000),
      maximumAttempts: 1,
    },
  });

  const creationInput = {
    userId: user.id,
    entitlementId: entitlement.id,
    blueprintId: blueprint.id,
    mode: 'STRICT' as const,
  };
  const creations = await Promise.allSettled([
    createAuthenticatedAttempt(creationInput),
    createAuthenticatedAttempt(creationInput),
  ]);
  assert.equal(creations.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(creations.filter((result) => result.status === 'rejected').length, 1);
  const attempt = creations.find((result) => result.status === 'fulfilled')!.value;
  assert.equal(attempt.questions.length, 1);
  assert.equal(attempt.questions[0].questionId, question.id);
  assert.ok(attempt.questions[0].response);
  assert.ok(!/answerKey|acceptedSets|answersByStableKey|encryptedPayload/.test(JSON.stringify(attempt.manifest?.payload)));
  assert.equal((await prisma.entitlement.findUniqueOrThrow({ where: { id: entitlement.id } })).attemptsUsed, 1);
  assert.equal(await prisma.entitlementConsumption.count({
    where: { entitlementId: entitlement.id, attemptId: attempt.id, kind: 'RESERVATION' },
  }), 1);

  const deviceResults = await Promise.allSettled([
    enrollDeviceSlot(user.id, 'First browser'),
    enrollDeviceSlot(user.id, 'Second browser'),
  ]);
  assert.equal(deviceResults.filter((result) => result.status === 'fulfilled').length, 2);
  await assert.rejects(enrollDeviceSlot(user.id, 'Third browser'), (error: Error) => error.message === 'DEVICE_LIMIT_REACHED');
  const firstDevice = deviceResults[0].status === 'fulfilled' ? deviceResults[0].value.slot : null;
  const secondDevice = deviceResults[1].status === 'fulfilled' ? deviceResults[1].value.slot : null;
  assert.ok(firstDevice && secondDevice);

  const firstExecution = await acquireAttemptExecution({ attemptId: attempt.id, userId: user.id, deviceSlot: firstDevice });
  assert.ok(firstExecution.leaseToken);
  const fixedDeadline = firstExecution.attempt.expiresAt?.toISOString();
  const reconnect = await acquireAttemptExecution({ attemptId: attempt.id, userId: user.id, deviceSlot: firstDevice });
  assert.equal(reconnect.attempt.expiresAt?.toISOString(), fixedDeadline, 'reconnect must not extend the attempt deadline');
  await assert.rejects(
    acquireAttemptExecution({ attemptId: attempt.id, userId: user.id, deviceSlot: secondDevice }),
    (error: Error) => error.message === 'ATTEMPT_LEASE_CONFLICT',
  );
  await prisma.attemptExecutionLease.update({
    where: { attemptId: attempt.id },
    data: {
      heartbeatAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  const reclaimed = await acquireAttemptExecution({ attemptId: attempt.id, userId: user.id, deviceSlot: secondDevice });
  assert.equal(reclaimed.attempt.expiresAt?.toISOString(), fixedDeadline, 'lease recovery must not extend the attempt deadline');

  const responseId = attempt.questions[0].response!.id;
  assert.deepEqual(await saveResponseOptimistically({
    responseId,
    attemptId: attempt.id,
    expectedVersion: 0,
    answer: 'correct',
    markedForReview: false,
  }), { version: 1 });
  await assert.rejects(saveResponseOptimistically({
    responseId,
    attemptId: attempt.id,
    expectedVersion: 0,
    answer: 'stale',
    markedForReview: false,
  }), (error: Error) => error.name === 'OptimisticConcurrencyError');

  await assert.rejects(
    prisma.attemptManifest.update({ where: { attemptId: attempt.id }, data: { contentHash: 'changed' } }),
    /immutable/i,
  );
  await assert.rejects(
    prisma.attemptQuestion.update({ where: { id: attempt.questions[0].id }, data: { questionNumber: 99 } }),
    /immutable/i,
  );
  await assert.rejects(
    prisma.blueprintSlot.update({ where: { id: slot.id }, data: { targetMarks: 2 } }),
    /immutable/i,
  );

  const grade = await submitAndGradeObjectiveAttempt(attempt.id, user.id);
  assert.deepEqual(grade.scores, [{ skill: 'READING', rawScore: 1, maximumRawScore: 1, band: null }]);
  const repeated = await submitAndGradeObjectiveAttempt(attempt.id, user.id);
  assert.deepEqual(repeated.scores, grade.scores, 'stored scores must be returned without recalculation');

  await prisma.$disconnect();
});
