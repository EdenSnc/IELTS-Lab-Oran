import assert from 'node:assert/strict';
import test from 'node:test';

test('auth provider UI fails closed and follows Supabase public settings', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
  const { parseEnabledAuthProviders } = await import('../../src/lib/supabase/auth-providers');
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
