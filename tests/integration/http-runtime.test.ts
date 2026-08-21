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
  assert.ok(!text.includes('ieltslab.app'), 'sitemap.xml must not contain ieltslab.app');
  assert.ok(!text.includes('ieltslaboran.com'), 'sitemap.xml must not contain ieltslaboran.com');
  assert.ok(!text.includes('ieltslab.tech'), 'sitemap.xml must not contain ieltslab.tech');
});

test('HTTP Runtime: /en serves correct canonical, hreflang, Open Graph, and JSON-LD', async () => {
  const res = await fetch(`${BASE_URL}/en`);
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

test('HTTP Runtime: test-engine pages stay noindex and never emit localhost social URLs', async () => {
  const res = await fetch(`${BASE_URL}/speaking`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/i);
  assert.ok(!html.includes('http://localhost:3000'), 'Production metadata must not expose localhost URLs');
});
