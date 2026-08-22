import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

function token() {
  return randomBytes(32).toString('base64url');
}

test('Strict Listening grants one idempotent playback token and rejects refresh replay', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [
    { default: prisma },
    { createAuthenticatedAttempt },
    { beginListeningPlayback, authorizeStrictListeningAsset },
  ] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/attempts/attempt-service'),
    import('../../src/lib/audio/listening-playback'),
  ]);
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `listening-${suffix}@example.invalid` },
  });
  const device = await prisma.deviceSlot.create({
    data: { userId: user.id, slotNumber: 1, tokenHash: randomBytes(32).toString('hex') },
  });
  const source = await prisma.contentSource.create({
    data: { provider: 'OTHER', name: `listening source ${suffix}` },
  });
  const contentTest = await prisma.test.create({
    data: {
      sourceId: source.id,
      externalId: `listening-${suffix}`,
      title: 'Listening playback fixture',
      variant: 'ACADEMIC',
      sourceYear: 2026,
    },
  });
  const version = await prisma.testVersion.create({
    data: { testId: contentTest.id, version: 1, status: 'DRAFT', contentHash: `listening-${suffix}` },
  });
  const section = await prisma.testSection.create({
    data: { testVersionId: version.id, skill: 'LISTENING', displayOrder: 1, timeLimitSeconds: 1_800 },
  });
  const part = await prisma.testPart.create({
    data: {
      testSectionId: section.id,
      sourceKey: 'listening-1',
      slot: 'LISTENING_PART_1',
      reviewStatus: 'VERIFIED',
    },
  });
  const asset = await prisma.contentAsset.create({
    data: {
      type: 'AUDIO',
      storageKey: `listening/${suffix}.mp3`,
      checksum: randomBytes(32).toString('hex'),
      mimeType: 'audio/mpeg',
      reviewStatus: 'VERIFIED',
    },
  });
  const stimulus = await prisma.stimulus.create({
    data: {
      testPartId: part.id,
      assetId: asset.id,
      sourceKey: 'audio',
      type: 'AUDIO_TRACK',
      displayOrder: 1,
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
      reviewStatus: 'VERIFIED',
    },
  });
  await prisma.question.create({
    data: { questionGroupId: group.id, stableKey: 'q1', displayOrder: 1, maxMarks: 1 },
  });
  await prisma.answerKey.create({
    data: {
      questionGroupId: group.id,
      encryptedPayload: 'fixture-not-decrypted',
      formatVersion: 2,
      sourceType: 'HUMAN_VERIFIED',
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
      code: `listening-${suffix}`,
      version: 1,
      name: 'Listening playback fixture',
      variant: 'ACADEMIC',
      status: 'DRAFT',
      fixedTestVersionId: version.id,
      slots: { create: { partSlot: 'LISTENING_PART_1', displayOrder: 1, targetMarks: 1 } },
    },
  });
  await prisma.testBlueprint.update({
    where: { id: blueprint.id },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
  const product = await prisma.product.create({
    data: {
      code: `listening-${suffix}`,
      tier: 'TIER_1_BASE',
      name: 'Listening playback fixture',
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
  const attempt = await createAuthenticatedAttempt({
    userId: user.id,
    entitlementId: entitlement.id,
    blueprintId: blueprint.id,
    mode: 'STRICT',
  });
  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { state: 'ACTIVE', startedAt: new Date(), expiresAt: new Date(Date.now() + 1_800_000) },
  });

  const playbackToken = token();
  const input = {
    attemptId: attempt.id,
    userId: user.id,
    deviceSlotId: device.id,
    stimulusId: stimulus.id,
    playbackToken,
  };
  const duplicates = await Promise.all([
    beginListeningPlayback(input),
    beginListeningPlayback(input),
  ]);
  assert.deepEqual(duplicates, [
    { assetId: asset.id, strict: true },
    { assetId: asset.id, strict: true },
  ]);
  assert.equal(await prisma.attemptMediaPlayback.count({
    where: { attemptId: attempt.id, stimulusId: stimulus.id },
  }), 1);
  assert.equal(await authorizeStrictListeningAsset({
    attemptId: attempt.id,
    stimulusId: stimulus.id,
    assetId: asset.id,
    deviceSlotId: device.id,
    playbackToken,
  }), true);
  assert.equal(await authorizeStrictListeningAsset({
    attemptId: attempt.id,
    stimulusId: stimulus.id,
    assetId: asset.id,
    deviceSlotId: device.id,
    playbackToken: token(),
  }), false);
  await assert.rejects(
    beginListeningPlayback({ ...input, playbackToken: token() }),
    (error: Error) => error.message === 'LISTENING_AUDIO_ALREADY_STARTED',
  );
});
