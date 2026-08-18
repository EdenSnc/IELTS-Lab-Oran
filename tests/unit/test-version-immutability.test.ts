import test from 'node:test';
import assert from 'node:assert/strict';

test('Algorithm Model: TestVersion immutability version increment check (Specification Invariant 10)', () => {
  // Simulating the version occupied check from importPackage
  const existingVersion = {
    testId: 'test-123',
    version: 1,
    status: 'PUBLISHED',
    contentHash: 'hash-abc-123',
  };

  const incomingPackage = {
    testId: 'test-123',
    version: 1,
    contentHash: 'hash-xyz-456', // Different content hash for same version
  };

  const validateImportImmutability = () => {
    if (
      existingVersion.version === incomingPackage.version
      && existingVersion.contentHash !== incomingPackage.contentHash
    ) {
      throw new Error(
        `Test version ${incomingPackage.version} already exists with different content. `
        + 'Increment staged.test.version instead of mutating an imported version.',
      );
    }
  };

  assert.throws(validateImportImmutability, /already exists with different content/);
});
