import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';

test('Proxy forwards the URL locale alongside the CSP nonce', async () => {
  const { default: proxy } = await import('../../src/proxy');

  for (const locale of ['fr', 'ar', 'en']) {
    const response = await proxy(new NextRequest(
      `https://www.ieltslab.org/${locale}/articles/how-to-register-algeria`,
      { headers: { 'accept-language': 'en', 'x-next-intl-locale': 'en' } },
    ));
    const overrides = response.headers.get('x-middleware-override-headers')?.split(',');

    assert.ok(overrides?.includes('x-next-intl-locale'));
    assert.ok(overrides?.includes('x-nonce'));
    assert.equal(response.headers.get('x-middleware-request-x-next-intl-locale'), locale);
    assert.ok(response.headers.get('x-middleware-request-x-nonce'));
    assert.equal(response.headers.get('x-middleware-request-accept-language'), 'en');
    assert.match(response.headers.get('link') ?? '', /hreflang="fr"/);
  }
});
