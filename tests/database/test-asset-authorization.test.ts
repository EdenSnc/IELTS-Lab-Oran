import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('attempt asset authorization uses explicit content links and rejects unlinked assets', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { isAssetLinkedToAttemptContent }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/content/asset-authorization'),
  ]);
  const suffix = randomUUID();
  const source = await prisma.contentSource.create({ data: { provider: 'OTHER', name: `asset source ${suffix}` } });
  const contentTest = await prisma.test.create({
    data: { sourceId: source.id, externalId: `asset-${suffix}`, title: 'Asset authorization fixture', variant: 'ACADEMIC' },
  });
  const version = await prisma.testVersion.create({ data: { testId: contentTest.id, version: 1, status: 'DRAFT', contentHash: `asset-${suffix}` } });
  const section = await prisma.testSection.create({ data: { testVersionId: version.id, skill: 'READING', displayOrder: 1 } });
  const part = await prisma.testPart.create({ data: { testSectionId: section.id, sourceKey: 'reading-1', slot: 'READING_SECTION_1' } });
  const group = await prisma.questionGroup.create({
    data: { testPartId: part.id, sourceKey: 'q1', displayOrder: 1, questionType: 'SHORT_ANSWER', responseKind: 'SHORT_TEXT', scoringStrategy: 'PER_ITEM_EXACT', maxMarks: 1 },
  });
  const question = await prisma.question.create({ data: { questionGroupId: group.id, stableKey: 'q1', displayOrder: 1 } });
  const linked = await prisma.contentAsset.create({
    data: { type: 'PHOTO', storageKey: `reading/${suffix}-linked.png`, checksum: randomBytes(32).toString('hex'), mimeType: 'image/png' },
  });
  const unlinked = await prisma.contentAsset.create({
    data: { type: 'PHOTO', storageKey: `reading/${suffix}-unlinked.png`, checksum: randomBytes(32).toString('hex'), mimeType: 'image/png' },
  });
  await prisma.contentAssetReference.create({ data: { assetId: linked.id, questionId: question.id } });

  const scope = { allowedPartIds: [part.id], allowedGroupIds: [group.id] };
  assert.equal(await isAssetLinkedToAttemptContent(linked.id, scope), true);
  assert.equal(await isAssetLinkedToAttemptContent(unlinked.id, scope), false);
});
