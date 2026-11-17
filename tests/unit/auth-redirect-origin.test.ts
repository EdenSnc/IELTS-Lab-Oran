import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'publishable-test-key';

test('auth callback origin follows the verified public proxy origin', async () => {
  const { verifiedRequestOrigin } = await import('../../src/lib/http/api');
  const request = new Request('http://internal-next-host:3000/api/auth/password', {
    method: 'POST',
    headers: {
      host: '127.0.0.1:3010',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-host': '127.0.0.1:3010',
      'x-forwarded-proto': 'http',
    },
  });

  assert.equal(verifiedRequestOrigin(request), 'http://127.0.0.1:3010');
});

test('auth callback origin rejects a cross-site browser request', async () => {
  const { verifiedRequestOrigin } = await import('../../src/lib/http/api');
  const request = new Request('https://www.ieltslab.org/api/auth/password', {
    method: 'POST',
    headers: {
      host: 'www.ieltslab.org',
      origin: 'https://attacker.example',
      'sec-fetch-site': 'cross-site',
    },
  });

  assert.throws(() => verifiedRequestOrigin(request), /CROSS_SITE_REQUEST_REJECTED/u);
});
