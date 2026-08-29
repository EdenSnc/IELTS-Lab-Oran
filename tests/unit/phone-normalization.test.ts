import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeE164Phone } from '../../src/lib/phone';

test('signup phone normalization produces database-safe E.164 values', () => {
  assert.equal(normalizeE164Phone('+213 555 00 00 00'), '+213555000000');
  assert.equal(normalizeE164Phone('0555-00-00-00'), '+213555000000');
  assert.equal(normalizeE164Phone('+33 (6) 12 34 56 78'), '+33612345678');
  assert.equal(normalizeE164Phone('555000000'), null);
  assert.equal(normalizeE164Phone('+012345678'), null);
});
