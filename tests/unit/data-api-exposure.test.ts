import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDataApiRefused } from '../../scripts/check-data-api-exposure.mts';

test('deployed Data API exposure check accepts only explicit refusal statuses', () => {
  for (const status of [401, 403, 404]) assert.doesNotThrow(() => assertDataApiRefused(status));
  for (const status of [200, 204, 301, 500]) {
    assert.throws(() => assertDataApiRefused(status), /SUPABASE_DATA_API_EXPOSURE_CHECK_FAILED/u);
  }
});
