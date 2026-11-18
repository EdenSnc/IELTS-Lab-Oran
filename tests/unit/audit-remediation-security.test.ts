import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { normalizeObjectiveAnswer } from '../../src/lib/grading/objective-scoring-core';
import { buildContentSecurityPolicy } from '../../src/lib/security/content-security-policy';
import { checkSlidingWindowRateLimit, extractClientIp } from '../../src/lib/security/rate-limit';

process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'publishable-test-key';

test('assertSameOrigin strictly requires a valid matching Origin and normalizes x-forwarded-host', async () => {
  const [{ AuthError }, { assertSameOrigin }] = await Promise.all([
    import('../../src/lib/auth/request-user'),
    import('../../src/lib/http/api'),
  ]);

  // Missing Origin must fail with 403 (never fall through cleanly)
  assert.throws(
    () => assertSameOrigin(new Request('https://www.ieltslab.org/api/auth/logout', {
      method: 'POST',
      headers: { host: 'www.ieltslab.org' },
    })),
    (err: unknown) => err instanceof AuthError && err.status === 403 && err.code === 'CROSS_SITE_REQUEST_REJECTED',
  );

  // Sandboxed iframe "Origin: null" must fail with 403 (not 500 TypeError from new URL('null'))
  assert.throws(
    () => assertSameOrigin(new Request('https://www.ieltslab.org/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'null', host: 'www.ieltslab.org' },
    })),
    (err: unknown) => err instanceof AuthError && err.status === 403 && err.code === 'CROSS_SITE_REQUEST_REJECTED',
  );

  // Cross-origin must fail with 403
  assert.throws(
    () => assertSameOrigin(new Request('https://www.ieltslab.org/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://evil.example', host: 'www.ieltslab.org' },
    })),
    (err: unknown) => err instanceof AuthError && err.status === 403 && err.code === 'CROSS_SITE_REQUEST_REJECTED',
  );

  // Comma-separated x-forwarded-host must match first proxy host
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://internal.vercel.app/api/auth/logout', {
    method: 'POST',
    headers: {
      origin: 'https://www.ieltslab.org',
      'x-forwarded-host': 'www.ieltslab.org, edge-proxy.internal',
      host: 'internal.vercel.app',
    },
  })));
});

test('apiError scrubs internal Error details while preserving structured 4xx AuthError codes', async () => {
  const [{ AuthError }, { apiError }] = await Promise.all([
    import('../../src/lib/auth/request-user'),
    import('../../src/lib/http/api'),
  ]);

  const internalRes = apiError(new Error('Postgres password leak at host db.internal:5432'), 'INTERNAL_FALLBACK');
  assert.equal(internalRes.status, 500);
  const internalBody = await internalRes.json() as { error: string };
  assert.equal(internalBody.error, 'INTERNAL_FALLBACK');

  const structuredRes = apiError(new AuthError('FORBIDDEN', 403), 'INTERNAL_FALLBACK');
  assert.equal(structuredRes.status, 403);
  const structuredBody = await structuredRes.json() as { error: string };
  assert.equal(structuredBody.error, 'FORBIDDEN');
});

test('extractClientIp prefers trusted x-real-ip over spoofable leftmost x-forwarded-for', () => {
  const req = new Request('https://www.ieltslab.org/api/grade', {
    headers: {
      'x-forwarded-for': '1.2.3.4, 198.51.100.77',
      'x-real-ip': '198.51.100.77',
    },
  });
  assert.equal(extractClientIp(req), '198.51.100.77');

  const key = `unit-test-rl-${Date.now()}`;
  assert.equal(checkSlidingWindowRateLimit({ namespace: 'test', key, limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkSlidingWindowRateLimit({ namespace: 'test', key, limit: 2, windowMs: 60_000 }).allowed, true);
  assert.equal(checkSlidingWindowRateLimit({ namespace: 'test', key, limit: 2, windowMs: 60_000 }).allowed, false);
});

test('buildContentSecurityPolicy omits upgrade-insecure-requests in dev and omits strict-dynamic when disabled', () => {
  const devCsp = buildContentSecurityPolicy({
    nonce: 'dev-nonce',
    development: true,
    supabaseOrigin: 'http://127.0.0.1:54321',
    rtcSources: [],
  });
  assert.doesNotMatch(devCsp, /upgrade-insecure-requests/);

  const static404Csp = buildContentSecurityPolicy({
    nonce: '404-nonce',
    development: false,
    strictDynamic: false,
    supabaseOrigin: 'https://project-ref.supabase.co',
    rtcSources: [],
  });
  assert.doesNotMatch(static404Csp, /'strict-dynamic'/);
  assert.match(static404Csp, /upgrade-insecure-requests/);
});

test('normalizeObjectiveAnswer re-trims and collapses whitespace after stripping punctuation', () => {
  assert.equal(normalizeObjectiveAnswer('  library ! ', { punctuationSensitive: false }), 'library');
  assert.equal(normalizeObjectiveAnswer('  north - east! ', { punctuationSensitive: false }), 'north east');
  assert.equal(normalizeObjectiveAnswer(' ! trailing . ', { punctuationSensitive: false }), 'trailing');
});

test('sharp rasterizes QTI diagram SVGs to safe PNG bytes', async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#f7f6f3"/><text x="20" y="90" font-size="24" fill="#171717">Map Label A</text></svg>',
    'utf8',
  );
  const png = await sharp(svg, { density: 144, limitInputPixels: 16_777_216 }).png().toBuffer();
  assert.ok(png.length > 8);
  assert.deepEqual(Array.from(png.subarray(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});
