import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('Prisma inserts and reads an IDP ContentSource', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const { default: prisma } = await import('../../src/lib/prisma');
  const source = await prisma.contentSource.create({
    data: { provider: 'IDP', externalId: `provider-${randomUUID()}`, name: 'Provider alignment fixture' },
  });
  const stored = await prisma.contentSource.findUniqueOrThrow({ where: { id: source.id } });
  assert.equal(stored.provider, 'IDP');
  await prisma.$disconnect();
});
