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

test('Proxy passes through /r/, /sample, /staff, and BotID Kasada routes without rewriting to /_not-found', async () => {
  const { default: proxy } = await import('../../src/proxy');

  const passthroughPaths = [
    '/r/abcDEF1234',
    '/sample?locale=en',
    '/staff/operations',
    '/149e9513-01fa-4fb0-aad4-566afd725d1b-2d206a39-8ed7-437e-a3be-862e0f06eea3/c.js',
  ];

  for (const path of passthroughPaths) {
    const response = await proxy(new NextRequest(`https://www.ieltslab.org${path}`));
    assert.equal(response.headers.get('x-middleware-rewrite'), null, `${path} should not rewrite to /_not-found`);
  }
});

test('Proxy rewrites unmatched non-localized paths to /_not-found with 404 status and CSP nonce', async () => {
  const { default: proxy } = await import('../../src/proxy');

  const response = await proxy(new NextRequest('https://www.ieltslab.org/zz-unmatched-route'));
  assert.equal(response.status, 404);
  assert.match(response.headers.get('x-middleware-rewrite') ?? '', /\/_not-found$/);
  const nonce = response.headers.get('x-middleware-request-x-nonce');
  assert.ok(nonce, 'Rewrite to /_not-found must forward x-nonce so dynamic GlobalNotFound stamps inline scripts');
  const csp = response.headers.get('content-security-policy') ?? response.headers.get('content-security-policy-report-only') ?? '';
  assert.ok(csp.includes(`'nonce-${nonce}'`), '404 CSP header must include per-request nonce');
});

test('Proxy supplies the current workspace return path rather than a caller-provided header', async () => {
  const { default: proxy } = await import('../../src/proxy');
  const headers = { 'x-ielts-admin-path': '/en/admin/operations' };
  const workspace = await proxy(new NextRequest(
    'https://www.ieltslab.org/fr/admin/applications?placement=W17khKhvB-6o&page=2', { headers },
  ));
  assert.equal(workspace.headers.get('x-middleware-request-x-ielts-admin-path'),
    '/fr/admin/applications?placement=W17khKhvB-6o&page=2');
  const other = await proxy(new NextRequest('https://www.ieltslab.org/fr/articles', { headers }));
  assert.ok(!other.headers.get('x-middleware-override-headers')?.split(',').includes('x-ielts-admin-path'));
});

test('Proxy strips Link hreflang on 404/private paths, sets X-Robots-Tag, rewrites bare /staff to 404, and forwards x-sample-locale', async () => {
  const { default: proxy } = await import('../../src/proxy');

  const staffRes = await proxy(new NextRequest('https://www.ieltslab.org/staff'));
  assert.equal(staffRes.status, 404);
  assert.match(staffRes.headers.get('x-middleware-rewrite') ?? '', /\/_not-found$/);
  assert.equal(staffRes.headers.get('link'), null);
  assert.equal(staffRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  const missingLocaleRes = await proxy(new NextRequest('https://www.ieltslab.org/en/this-does-not-exist'));
  assert.equal(missingLocaleRes.headers.get('link'), null);
  assert.equal(missingLocaleRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  const adminRes = await proxy(new NextRequest('https://www.ieltslab.org/en/admin/acquisition'));
  assert.equal(adminRes.headers.get('link'), null);
  assert.equal(adminRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  const sampleArRes = await proxy(new NextRequest('https://www.ieltslab.org/sample?locale=ar'));
  assert.equal(sampleArRes.headers.get('x-middleware-request-x-sample-locale'), 'ar');
  assert.equal(sampleArRes.headers.get('x-robots-tag'), 'noindex, nofollow');

  for (const locale of ['en', 'fr', 'ar']) {
    for (const newSlug of ['mock-test', 'about', 'privacy', 'terms', 'articles/first-ielts-preparation-cohort-oran']) {
      const okRes = await proxy(new NextRequest(`https://www.ieltslab.org/${locale}/${newSlug}`));
      assert.match(okRes.headers.get('link') ?? '', /hreflang="x-default"/);
    }
  }
});
