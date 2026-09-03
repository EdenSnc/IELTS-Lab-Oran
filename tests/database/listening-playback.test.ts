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
    { completeAccountOnboarding },
    { createAuthenticatedAttempt },
    { beginListeningPlayback, authorizeStrictListeningAsset },
  ] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/account-readiness'),
    import('../../src/lib/attempts/attempt-service'),
    import('../../src/lib/audio/listening-playback'),
  ]);
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `listening-${suffix}@example.invalid` },
  });
  await completeAccountOnboarding({
    userId: user.id, name: 'Listening Learner',
    whatsapp: `+213${Math.floor(100000000 + Math.random() * 900000000)}`,
    wilaya: '31 Oran', preferredLocale: 'en', termsAccepted: true, privacyAccepted: true,
    marketingAccepted: false, acceptedFrom: 'database-test',
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
      durationMs: 120_000,
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
      formatVersion: 1,
      sourceType: 'HUMAN_VERIFIED',
      reviewStatus: 'VERIFIED',
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
  });
  const secondPart = await prisma.testPart.create({
    data: { testSectionId: section.id, sourceKey: 'listening-2', slot: 'LISTENING_PART_2', reviewStatus: 'VERIFIED' },
  });
  const secondAsset = await prisma.contentAsset.create({
    data: {
      type: 'AUDIO', storageKey: `listening/${suffix}-2.mp3`, checksum: randomBytes(32).toString('hex'),
      mimeType: 'audio/mpeg', durationMs: 120_000, reviewStatus: 'VERIFIED',
    },
  });
  const secondStimulus = await prisma.stimulus.create({
    data: {
      testPartId: secondPart.id, assetId: secondAsset.id, sourceKey: 'audio-2', type: 'AUDIO_TRACK',
      displayOrder: 1, reviewStatus: 'VERIFIED',
    },
  });
  const secondGroup = await prisma.questionGroup.create({
    data: {
      testPartId: secondPart.id, sourceKey: 'q2', displayOrder: 1, questionType: 'SHORT_ANSWER',
      responseKind: 'SHORT_TEXT', scoringStrategy: 'PER_ITEM_EXACT', maxMarks: 1, reviewStatus: 'VERIFIED',
    },
  });
  await prisma.question.create({ data: { questionGroupId: secondGroup.id, stableKey: 'q2', displayOrder: 1, maxMarks: 1 } });
  await prisma.answerKey.create({
    data: {
      questionGroupId: secondGroup.id, encryptedPayload: 'fixture-not-decrypted', formatVersion: 1,
      sourceType: 'HUMAN_VERIFIED', reviewStatus: 'VERIFIED', verifiedById: user.id, verifiedAt: new Date(),
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
      slots: { create: [
        { partSlot: 'LISTENING_PART_1', displayOrder: 1, targetMarks: 1 },
        { partSlot: 'LISTENING_PART_2', displayOrder: 2, targetMarks: 1 },
      ] },
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
  assert.ok(duplicates.every((playback) => (
    playback.assetId === asset.id && playback.stimulusId === stimulus.id
    && playback.strict && playback.resumeAtSeconds >= 0
  )));
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
  await prisma.attemptMediaPlayback.update({
    where: { attemptId_stimulusId: { attemptId: attempt.id, stimulusId: stimulus.id } },
    data: { startedAt: new Date(Date.now() - 10_000) },
  });
  const refreshToken = token();
  const refreshed = await beginListeningPlayback({ ...input, playbackToken: refreshToken });
  assert.equal(refreshed.stimulusId, stimulus.id);
  assert.ok(refreshed.resumeAtSeconds >= 9, 'refresh/new token resumes the authoritative elapsed timeline');
  assert.equal(await authorizeStrictListeningAsset({
    attemptId: attempt.id, stimulusId: stimulus.id, assetId: asset.id,
    deviceSlotId: device.id, playbackToken,
  }), false, 'token rotation invalidates the old fetch URL');
  const earlyNext = await beginListeningPlayback({ ...input, stimulusId: secondStimulus.id, playbackToken: token() });
  assert.equal(earlyNext.stimulusId, stimulus.id, 'question navigation cannot start a later track early');

  await prisma.attemptMediaPlayback.update({
    where: { attemptId_stimulusId: { attemptId: attempt.id, stimulusId: stimulus.id } },
    data: { startedAt: new Date(Date.now() - 130_000) },
  });
  const progressed = await beginListeningPlayback({ ...input, stimulusId: secondStimulus.id, playbackToken: token() });
  assert.equal(progressed.stimulusId, secondStimulus.id);
  assert.equal(progressed.assetId, secondAsset.id);
  assert.ok(progressed.resumeAtSeconds >= 9 && progressed.resumeAtSeconds < 20);

  await prisma.assessmentAttempt.update({ where: { id: attempt.id }, data: { mode: 'PRACTICE' } });
  const practiceOne = await beginListeningPlayback({ ...input, playbackToken: token() });
  const practiceTwo = await beginListeningPlayback({ ...input, playbackToken: token() });
  assert.equal(practiceOne.resumeAtSeconds, 0);
  assert.equal(practiceTwo.resumeAtSeconds, 0);
});
