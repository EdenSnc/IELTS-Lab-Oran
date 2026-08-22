import assert from 'node:assert/strict';
import test from 'node:test';
import { SourceProvider } from '@prisma/client';
import { SourceProviderSchema } from '../../src/lib/content/staging-schema';

const expected = ['IDP', 'BRITISH_COUNCIL', 'IELTS_ORG', 'CAMBRIDGE', 'IELTS_LAB', 'OTHER'];

test('Prisma and staging parsing expose the six live SourceProvider values', () => {
  assert.deepEqual(Object.values(SourceProvider), expected);
  expected.forEach((provider) => assert.equal(SourceProviderSchema.parse(provider), provider));
  assert.throws(() => SourceProviderSchema.parse('UNKNOWN_PROVIDER'));
});
