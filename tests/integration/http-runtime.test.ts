import { spawn, ChildProcess } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess: ChildProcess;
const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

test.before(async () => {
  serverProcess = spawn(process.execPath, [nextCli, 'start', '-p', String(PORT)], {
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
  });

  serverProcess.stdout?.on('data', (d) => process.stdout.write(d));
  serverProcess.stderr?.on('data', (d) => process.stderr.write(d));

  await waitForServer(`${BASE_URL}/en`);
});

test.after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    serverProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    serverProcess.kill('SIGTERM');
  });
});

test('HTTP Runtime: X-Powered-By header is suppressed', async () => {
  const res = await fetch(`${BASE_URL}/en`);
  assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By header must not be exposed');
});

test('HTTP Runtime: root permanently redirects directly to canonical English landing page', async () => {
  const res = await fetch(`${BASE_URL}/`, {
    redirect: 'manual',
  });
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), '/en');

  const withQuery = await fetch(`${BASE_URL}/?domainMigrationTest=1`, {
    redirect: 'manual',
  });
  assert.equal(withQuery.status, 308);
  assert.equal(
    withQuery.headers.get('location'),
    '/en?domainMigrationTest=1',
  );
});

test('HTTP Runtime: /favicon.ico serves a valid, crawlable ICO', async () => {
  const res = await fetch(`${BASE_URL}/favicon.ico`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /^image\/(?:x-icon|vnd\.microsoft\.icon)$/i);

  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.ok(bytes.length > 6, 'favicon.ico must contain an ICO directory and image data');
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [0, 0, 1, 0], 'favicon.ico must have ICO magic bytes');
});

test('HTTP Runtime: /robots.txt serves correct canonical sitemap', async () => {
  const res = await fetch(`${BASE_URL}/robots.txt`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Sitemap: https:\/\/www\.ieltslab\.org\/sitemap\.xml/);
  assert.ok(!text.includes('ieltslab.app'), 'robots.txt must not contain ieltslab.app');
  assert.ok(!text.includes('ieltslaboran.com'), 'robots.txt must not contain ieltslaboran.com');
  assert.ok(!text.includes('ieltslab.tech'), 'robots.txt must not contain ieltslab.tech');
  assert.ok(!text.includes('Host:'), 'robots.txt should not define obsolete Host directive');
});

test('HTTP Runtime: /sitemap.xml serves canonical URLs', async () => {
  const res = await fetch(`${BASE_URL}/sitemap.xml`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /<loc>https:\/\/www\.ieltslab\.org\/en<\/loc>/);
  assert.match(text, /<loc>https:\/\/www\.ieltslab\.org\/fr<\/loc>/);
  assert.match(text, /<loc>https:\/\/www\.ieltslab\.org\/ar<\/loc>/);
  assert.match(text, /<lastmod>\d{4}-\d{2}-\d{2}T00:00:00\.000Z<\/lastmod>/, 'Sitemap must emit valid ISO lastmod dates');
  assert.ok(!text.includes('ieltslab.app'), 'sitemap.xml must not contain ieltslab.app');
  assert.ok(!text.includes('ieltslaboran.com'), 'sitemap.xml must not contain ieltslaboran.com');
  assert.ok(!text.includes('ieltslab.tech'), 'sitemap.xml must not contain ieltslab.tech');
});

test('HTTP Runtime: /en serves correct canonical, hreflang, Open Graph, and JSON-LD', async () => {
  const res = await fetch(`${BASE_URL}/en`, {
    headers: {
      'x-forwarded-host': 'www.ieltslab.org',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(res.status, 200);
  const html = await res.text();

  // Canonical
  assert.match(html, /<link[^>]*rel="canonical"[^>]*href="https:\/\/www\.ieltslab\.org\/en"/i);

  // Alternates / hreflang (case-insensitive for React hrefLang attribute)
  assert.match(html, /<link[^>]*rel="alternate"[^>]*hreflang="en"[^>]*href="https:\/\/www\.ieltslab\.org\/en"/i);
  assert.match(html, /<link[^>]*rel="alternate"[^>]*hreflang="fr"[^>]*href="https:\/\/www\.ieltslab\.org\/fr"/i);
  assert.match(html, /<link[^>]*rel="alternate"[^>]*hreflang="ar"[^>]*href="https:\/\/www\.ieltslab\.org\/ar"/i);
  assert.match(html, /<link[^>]*rel="alternate"[^>]*hreflang="x-default"[^>]*href="https:\/\/www\.ieltslab\.org\/en"/i);

  // Open Graph
  assert.match(html, /<meta[^>]*property="og:url"[^>]*content="https:\/\/www\.ieltslab\.org\/en"/i);

  // Apple Touch Icon
  assert.match(html, /<link[^>]*rel="apple-touch-icon"[^>]*href="\/apple-icon\.png/i);

  // Root favicon
  assert.match(html, /<link[^>]*rel="icon"[^>]*href="\/favicon\.ico/i);

  // JSON-LD validation
  assert.match(html, /"https:\/\/www\.ieltslab\.org\/#organization"/);
  assert.ok(!html.includes('https://www.ieltslab.app/#organization'), 'Organization @id must not reference .app');
  assert.ok(!html.includes('https://www.ieltslaboran.com/#organization'), 'Organization @id must not reference .com');

  // Person schema validation
  assert.match(html, /"https:\/\/www\.ieltslab\.org\/#instructor"/);

  // Zero unintended domain references
  assert.ok(!html.includes('ieltslab.app'), 'Page must contain zero ieltslab.app occurrences');
  assert.ok(!html.includes('ieltslaboran.com'), 'Page must contain zero ieltslaboran.com occurrences');
  assert.ok(!html.includes('ieltslab.tech'), 'Page must contain zero ieltslab.tech occurrences');

  const linkHeader = res.headers.get('link') ?? '';
  assert.match(
    linkHeader,
    /<https:\/\/www\.ieltslab\.org\/en>;\s*rel="alternate";\s*hreflang="x-default"/i,
    'HTTP Link x-default must agree with the HTML x-default',
  );
});

test('HTTP Runtime: /fr serves correct localized canonical and hreflang', async () => {
  const res = await fetch(`${BASE_URL}/fr`);
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.match(html, /<link[^>]*rel="canonical"[^>]*href="https:\/\/www\.ieltslab\.org\/fr"/);
  assert.match(html, /<meta[^>]*property="og:url"[^>]*content="https:\/\/www\.ieltslab\.org\/fr"/);
  assert.ok(!html.includes('ieltslab.app'));
  assert.ok(!html.includes('ieltslaboran.com'));
  assert.ok(!html.includes('ieltslab.tech'));
});

test('HTTP Runtime: /ar serves correct localized canonical, RTL dir, and hreflang', async () => {
  const res = await fetch(`${BASE_URL}/ar`);
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.match(html, /<link[^>]*rel="canonical"[^>]*href="https:\/\/www\.ieltslab\.org\/ar"/);
  assert.match(html, /dir="rtl"/);
  assert.ok(!html.includes('ieltslab.app'));
  assert.ok(!html.includes('ieltslaboran.com'));
  assert.ok(!html.includes('ieltslab.tech'));
});

test('HTTP Runtime: Nonexistent route returns HTTP 404', async () => {
  const res = await fetch(`${BASE_URL}/en/nonexistent-test-page-12345`);
  assert.equal(res.status, 404, 'Nonexistent page must return 404 status code');
});

test('HTTP Runtime: global unmatched routes use the custom global 404 without page metadata', async () => {
  for (const pathname of ['/this-does-not-exist', '/zz', '/random/unmatched/path']) {
    const res = await fetch(`${BASE_URL}${pathname}`);
    assert.equal(res.status, 404, `${pathname} must return 404`);

    const html = await res.text();
    assert.match(html, />Page Not Found</, `${pathname} must render the custom 404 UI`);
    assert.equal((html.match(/<html(?:\s|>)/gi) ?? []).length, 1, `${pathname} must contain one html element`);
    assert.equal((html.match(/<body(?:\s|>)/gi) ?? []).length, 1, `${pathname} must contain one body element`);
    assert.ok(!html.includes('__next_error__'), `${pathname} must not use the generic Next.js error document`);
    assert.match(html, /<meta[^>]*name="robots"[^>]*content="noindex"/i, `${pathname} must be noindex`);
    assert.ok(!/<link[^>]*rel="canonical"/i.test(html), `${pathname} must not emit a canonical`);
    assert.ok(!/<meta[^>]*property="og:url"/i.test(html), `${pathname} must not emit og:url`);
    assert.ok(!/<meta[^>]*property="og:locale"/i.test(html), `${pathname} must not emit og:locale`);
    assert.ok(!/<link[^>]*rel="alternate"[^>]*hreflang=/i.test(html), `${pathname} must not emit hreflang`);

    const csp = res.headers.get('content-security-policy') ?? '';
    const nonceMatch = /'nonce-([^']+)'/.exec(csp);
    assert.ok(nonceMatch?.[1], `${pathname} must emit a per-request CSP nonce`);
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/gi)];
    assert.ok(inlineScripts.length > 0, `${pathname} should have inline RSC bootstrap scripts`);
    for (const [tag] of inlineScripts) {
      assert.ok(
        tag.includes(`nonce="${nonceMatch[1]}"`),
        `${pathname} inline script must carry matching CSP nonce, got: ${tag}`,
      );
    }
  }
});

test('HTTP Runtime: localized unmatched routes preserve localized 404 behavior', async () => {
  const localizedRoutes = [
    '/en/this-does-not-exist',
    '/fr/this-does-not-exist',
    '/ar/this-does-not-exist',
    '/en/foo/bar/this-does-not-exist',
  ];

  for (const pathname of localizedRoutes) {
    const res = await fetch(`${BASE_URL}${pathname}`);
    assert.equal(res.status, 404, `${pathname} must return 404`);

    const html = await res.text();
    assert.ok(!html.includes('__next_error__'), `${pathname} must not use the generic Next.js error document`);
    assert.match(html, /<meta[^>]*name="robots"[^>]*content="noindex"/i, `${pathname} must be noindex`);
    assert.ok(!/<link[^>]*rel="canonical"/i.test(html), `${pathname} must not emit a canonical for a missing page`);
    assert.ok(!/<meta[^>]*property="og:url"/i.test(html), `${pathname} must not emit og:url for a missing page`);
  }
});

test('HTTP Runtime: test-engine pages stay noindex and never emit localhost social URLs', async () => {
  const res = await fetch(`${BASE_URL}/speaking`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/i);
  assert.ok(!html.includes('http://localhost:3000'), 'Production metadata must not expose localhost URLs');
});


test('HTTP Runtime: llms.txt, new trilingual hubs, landmarks, breadcrumbs, gated 307s, single-robots 404s, and RTL /sample', async () => {
  for (const llmPath of ['/llms.txt', '/llms-full.txt']) {
    const res = await fetch(`${BASE_URL}${llmPath}`);
    assert.equal(res.status, 200, `${llmPath} must return 200`);
    const text = await res.text();
    assert.match(text, /https:\/\/www\.ieltslab\.org/);
  }

  for (const route of ['/en', '/en/mock-test', '/fr/mock-test', '/ar/mock-test', '/en/about', '/en/privacy', '/en/terms', '/en/articles/first-ielts-preparation-cohort-oran']) {
    const res = await fetch(`${BASE_URL}${route}`);
    assert.equal(res.status, 200, `${route} must return 200`);
    assert.match(res.headers.get('link') ?? '', /hreflang="x-default"/i, `${route} must emit HTTP Link hreflang`);
    const html = await res.text();
    assert.equal((html.match(/<main(?:\s|>)/gi) ?? []).length, 1, `${route} must have exactly 1 <main>`);
    assert.match(html, /<main[^>]*id="main-content"/i, `${route} <main> must expose id="main-content"`);
    assert.equal((html.match(/<footer(?:\s|>)/gi) ?? []).length, 1, `${route} must have exactly 1 <footer>`);
    assert.ok(html.indexOf('<footer') > html.indexOf('</main>'), `${route} <footer> must be a sibling after </main>`);
    assert.ok(!html.includes('ieltslab.app') && !html.includes('ieltslaboran.com') && !html.includes('ieltslab.tech'));
  }

  const guideRes = await fetch(`${BASE_URL}/en/articles/how-to-register-algeria`);
  assert.equal(guideRes.status, 200);
  const guideHtml = await guideRes.text();
  const breadcrumbIdx = guideHtml.indexOf('aria-label="Breadcrumb"');
  const h1Idx = guideHtml.indexOf('<h1');
  assert.ok(breadcrumbIdx !== -1 && h1Idx !== -1 && breadcrumbIdx < h1Idx, 'Visible breadcrumb must appear before <h1>');
  assert.match(guideHtml, /"https:\/\/www\.ieltslab\.org\/#organization"/);
  assert.match(guideHtml, /"https:\/\/www\.ieltslab\.org\/#instructor"/);
  assert.match(guideHtml, /"inLanguage":"en"/);

  const adminRes = await fetch(`${BASE_URL}/en/admin/acquisition`, { redirect: 'manual' });
  assert.equal(adminRes.status, 307, 'Unauthenticated /en/admin/acquisition must redirect 307 instead of streaming 200 loading skeleton');
  assert.equal(adminRes.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.ok(!/hreflang=/i.test(adminRes.headers.get('link') ?? ''), 'Admin redirect must not emit Link hreflang');

  for (const missingPath of ['/staff', '/en/this-does-not-exist', '/this-does-not-exist']) {
    const res404 = await fetch(`${BASE_URL}${missingPath}`);
    assert.equal(res404.status, 404, `${missingPath} must return 404`);
    assert.equal(res404.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok(!/hreflang=/i.test(res404.headers.get('link') ?? ''), `${missingPath} must not emit Link hreflang`);
    const html404 = await res404.text();
    const robotsTags = html404.match(/<meta[^>]*name="robots"[^>]*>/gi) ?? [];
    assert.equal(robotsTags.length, 1, `${missingPath} must emit exactly 1 <meta name="robots"> tag, got: ${JSON.stringify(robotsTags)}`);
    assert.ok(!/<link[^>]*rel="canonical"/i.test(html404), `${missingPath} must not emit canonical`);
  }

  const sampleAr = await fetch(`${BASE_URL}/sample?locale=ar`);
  assert.equal(sampleAr.status, 200);
  assert.equal(sampleAr.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.ok(!/hreflang=/i.test(sampleAr.headers.get('link') ?? ''));
  const sampleArHtml = await sampleAr.text();
  assert.match(sampleArHtml, /<html[^>]*lang="ar"[^>]*dir="rtl"/i);
  assert.match(sampleArHtml, /<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/i);
  assert.ok(!/<link[^>]*rel="canonical"/i.test(sampleArHtml));
});
