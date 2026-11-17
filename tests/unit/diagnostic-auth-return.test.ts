import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticAuthReturn } from '../../src/lib/diagnostic/auth-return';
test('diagnostic login return preserves the locale-bound invitation portal and session path', () => {
  assert.equal(diagnosticAuthReturn('/fr/diagnostic', 'fr'), '/fr/diagnostic');
  assert.equal(diagnosticAuthReturn('/ar/diagnostic/session?review=1', 'ar'), '/ar/diagnostic/session?review=1');
});
test('diagnostic auth return rejects external, normalized traversal, wrong-locale and unrelated targets', () => {
  for (const value of ['//evil.invalid', 'https://evil.invalid/en/diagnostic', '/en/diagnostic/../../account', '/en/diagnostic/\\evil', '/fr/diagnostic', '/en/account', '/en/diagnostic\r\nLocation:evil']) {
    assert.equal(diagnosticAuthReturn(value, 'en'), undefined);
  }
});
