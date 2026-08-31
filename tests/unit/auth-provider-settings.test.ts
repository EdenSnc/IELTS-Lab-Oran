import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEnabledAuthProviders } from '../../src/lib/supabase/auth-providers';

test('auth provider UI fails closed and follows Supabase public settings', () => {
  assert.deepEqual(parseEnabledAuthProviders(null), { google: false, facebook: false });
  assert.deepEqual(parseEnabledAuthProviders({ external: { google: true, facebook: false } }), {
    google: true,
    facebook: false,
  });
  assert.deepEqual(parseEnabledAuthProviders({ external: { google: 'true', facebook: true } }), {
    google: false,
    facebook: true,
  });
});
