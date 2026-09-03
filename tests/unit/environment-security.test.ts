import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePublicEnvironment } from '../../src/lib/env';
import { buildContentSecurityPolicy } from '../../src/lib/security/content-security-policy';
import { shouldRefreshSupabaseSession } from '../../src/lib/supabase/proxy-policy';
import { assertValidAssetStorageKey } from '../../src/lib/content/private-asset-storage';

test('public environment rejects a missing or non-Supabase production origin', () => {
  assert.throws(() => parsePublicEnvironment({}), /NEXT_PUBLIC_SUPABASE_URL/u);
  assert.throws(() => parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: 'https://attacker.example',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  }), /NEXT_PUBLIC_SUPABASE_URL/u);
  assert.equal(parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: 'https://project-ref.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  }).NEXT_PUBLIC_SUPABASE_URL, 'https://project-ref.supabase.co');
});

test('nonce CSP preserves Supabase and LiveKit while removing unsafe inline scripts and Tally', () => {
  const csp = buildContentSecurityPolicy({
    nonce: 'unit-test-nonce',
    development: false,
    supabaseOrigin: 'https://project-ref.supabase.co',
    rtcSources: ['https://rtc.example', 'wss://rtc.example'],
  });
  assert.match(csp, /script-src 'self' 'nonce-unit-test-nonce' 'strict-dynamic'/u);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/u);
  assert.match(csp, /connect-src[^;]*https:\/\/project-ref\.supabase\.co/u);
  assert.match(csp, /connect-src[^;]*wss:\/\/rtc\.example/u);
  assert.doesNotMatch(csp, /tally\.so/u);
});

test('session refresh runs only for ordinary page continuations', () => {
  assert.equal(shouldRefreshSupabaseSession('/en', 'next'), true);
  assert.equal(shouldRefreshSupabaseSession('/api/account', 'next'), false);
  assert.equal(shouldRefreshSupabaseSession('/en', 'redirect'), false);
  assert.equal(shouldRefreshSupabaseSession('/missing', 'rewrite'), false);
});

test('asset storage keys reject wildcards, traversal, empty segments and backslashes', () => {
  assert.equal(assertValidAssetStorageKey('reading/test-1/map.png'), 'reading/test-1/map.png');
  for (const invalid of ['reading/%map.png', 'reading/_map.png', '../map.png', 'reading//map.png', 'reading\\map.png']) {
    assert.throws(() => assertValidAssetStorageKey(invalid), /INVALID_PRIVATE_ASSET_KEY/u);
  }
});
