import assert from 'node:assert/strict';
import test from 'node:test';

test('same-origin protection respects the incoming host when Next normalizes its internal request URL', async () => {
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'diagnostic-local-test-key-only';
  const { assertSameOrigin } = await import('../../src/lib/diagnostic/http');
  const request = (origin: string, host?: string) => new Request('http://localhost:3009/api/diagnostic/sessions', {
    headers: { origin, ...(host ? { host } : {}) },
  });
  assert.doesNotThrow(() => assertSameOrigin(request('http://127.0.0.1:3009', '127.0.0.1:3009')));
  assert.throws(() => assertSameOrigin(request('https://127.0.0.1:3009', '127.0.0.1:3009')));
  assert.throws(() => assertSameOrigin(request('https://evil.invalid')));
  assert.throws(() => assertSameOrigin(request('http://evil.invalid', '127.0.0.1:3009')));
});
