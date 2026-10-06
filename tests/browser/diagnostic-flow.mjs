// Run: node --conditions=react-server --import tsx tests/browser/diagnostic-flow.mjs [playwright module path]
// Synthetic, isolated local DB only. Never uses a live account or real source media.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture.ts';

const db = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
process.env.TEST_DATABASE_URL = db; process.env.DATABASE_URL = db;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
process.env.ENCRYPTION_KEY = '11'.repeat(32);
const prisma = diagnosticTestPrisma();
const sql = new Client({ connectionString: db }); await sql.connect();
const modulePath = process.argv[2];
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const fixture = await diagnosticFixture({ browserChoices: true });
const { issueDiagnosticInvitation } = await import('../../src/lib/diagnostic/invitation-service.ts');
const invitation = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
const artifacts = path.resolve('.superpowers/sdd/PLAN-2026-10-06/browser');
const assetsRoot = path.join(artifacts, 'assets'); await mkdir(assetsRoot, { recursive: true });
// Deliberately synthetic silent PCM; same bounded duration as fixture metadata.
const samples = 8000 * 500, wave = Buffer.alloc(44 + samples * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28); wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40);
for (const asset of await prisma.contentAsset.findMany({ where: { id: { in: [...fixture.assetIds, fixture.visibleImageId] } } })) {
  const target = path.join(assetsRoot, asset.storageKey); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, asset.type === 'AUDIO' ? wave : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jHwAAAABJRU5ErkJggg==', 'base64'));
}
const output = [];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3009'], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', SPEAKING_DEV_AUTH_USER_ID: fixture.owner,
    SUPABASE_SERVICE_ROLE_KEY: undefined, PRIVATE_TEST_ASSET_LOCAL_ROOT: assetsRoot }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => output.push(String(data))); server.stderr.on('data', data => output.push(String(data)));
let browser, page;
const errors = [];
const checks = [];
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function until(check, description, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error(`Timed out: ${description}`);
}
try {
  await until(async () => { try { return (await fetch('http://127.0.0.1:3009/en/diagnostic')).status === 200; } catch { return false; } }, 'local dev server', 90000);
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (response.status() >= 400 && response.url().includes('/api/diagnostic/') && !response.url().includes('/assets/')) {
      try { console.log('API failure', response.status(), (await response.json()).error ?? 'UNKNOWN'); } catch { console.log('API failure', response.status(), 'NON_JSON'); }
    }
  });
  await page.goto('http://127.0.0.1:3009/en/diagnostic');
  await page.getByRole('button', { name: 'Play test tone', exact: true }).click();
  await page.getByRole('checkbox', { name: 'I heard the tone clearly' }).check();
  await page.getByRole('button', { name: 'Start diagnostic', exact: true }).click();
  await page.waitForURL(/\/diagnostic\/[0-9a-f-]{36}$/u);
  const sessionId = page.url().split('/').at(-1);
  const firstText = page.locator('main input:not([type=checkbox]):not([type=radio])').first();
  await until(() => firstText.isEnabled(), 'writer granted');
  assert.equal(await prisma.diagnosticSession.count({ where: { invitationId: invitation.id } }), 1);
  pass('preflight creates exactly one invited diagnostic, no purchase');
  const audioId = await page.locator('audio').getAttribute('data-diagnostic-audio');
  await firstText.fill('synthetic answer');
  await until(async () => (await prisma.diagnosticResponse.findMany({ where: { sessionId, savedAt: { not: null } } })).length > 0, 'save acknowledgement');
  pass('text answer reaches real database');
  await page.getByRole('button', { name: 'Next group', exact: true }).click();
  assert.equal(await page.locator('audio').getAttribute('data-diagnostic-audio'), audioId);
  pass('question navigation does not restart or replace audio');
  await context.setOffline(true);
  await page.locator('main input[type=radio]').first().check(); await page.waitForTimeout(1800);
  assert.ok((await page.locator('header').innerText()).includes('Offline'));
  assert.equal(await prisma.diagnosticResponse.count({ where: { sessionId, answer: 'A' } }), 0);
  await context.setOffline(false);
  await until(async () => await prisma.diagnosticResponse.count({ where: { sessionId, answer: 'A' } }) === 1, 'offline retry');
  pass('offline work is not falsely saved; reconnect persists it');
  const second = await context.newPage(); await second.goto(page.url());
  await second.getByRole('alert').filter({ hasText: 'open elsewhere' }).waitFor();
  assert.equal(await second.locator('main input:not([type=checkbox]):not([type=radio])').first().isEnabled(), false); await second.close();
  pass('second tab cannot acquire editing access');
  await page.reload();
  await until(() => firstText.isEnabled(), 'reload resumes lease');
  assert.equal(await prisma.diagnosticSession.count({ where: { invitationId: invitation.id } }), 1);
  pass('reload resumes same session and writer, without consuming another invitation');
  await sql.query(`WITH timing AS MATERIALIZED (SELECT date_trunc('milliseconds',clock_timestamp()) AS now)
    UPDATE app_private."DiagnosticSession" SET "startedAt"=timing.now-interval '1198 seconds', deadline=timing.now+interval '2402 seconds' FROM timing WHERE id=$1`, [sessionId]);
  await page.reload(); await until(async () => (await page.locator('header').innerText()).includes('1 min'), 'static final minute');
  await page.getByRole('heading', { name: 'Reading', exact: true }).waitFor({ timeout: 15000 });
  pass('exact section boundary advances to Reading without a timer reset');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`http://127.0.0.1:3009/ar/diagnostic/${sessionId}`);
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => { document.querySelector('header').parentElement.scrollTop = 650; });
  assert.ok((await page.locator('header').boundingBox()).y >= 0);
  await page.screenshot({ path: path.join(artifacts, 'arabic-mobile.png'), fullPage: true });
  pass('Arabic 320px reflow and persistent mobile clock');
  await sql.query(`WITH timing AS MATERIALIZED (SELECT date_trunc('milliseconds',clock_timestamp()) AS now)
    UPDATE app_private."DiagnosticSession" SET "startedAt"=timing.now-interval '2405 seconds',deadline=timing.now+interval '1195 seconds' FROM timing WHERE id=$1`, [sessionId]);
  await page.goto(`http://127.0.0.1:3009/fr/diagnostic/${sessionId}`);
  const essay = page.getByRole('textbox', { name: 'Votre réponse à la tâche 2' });
  await until(() => essay.isEnabled(), 'writing writer');
  await essay.fill('SYNTHETIC writing response for local browser verification.');
  await until(async () => await prisma.diagnosticResponse.count({ where: { sessionId, answer: { startsWith: 'SYNTHETIC writing' } } }) === 1, 'writing acknowledged');
  await page.getByRole('button', { name: 'Soumettre l’écrit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer la soumission', exact: true }).click();
  await page.getByRole('heading', { name: 'Écrit soumis', exact: true }).waitFor();
  assert.equal((await prisma.diagnosticSession.findUnique({ where: { id: sessionId } })).state, 'SUBMITTED');
  assert.equal(await prisma.diagnosticResponse.count({ where: { sessionId, finalizedAt: null } }), 0);
  assert.equal(await page.locator('audio').count(), 0);
  pass('French Task2 saves and irreversible submission finalizes all response slots');
  assert.deepEqual(errors, []); pass('no uncaught browser application errors');
} catch (error) {
  console.error('Browser errors:', errors);
  if (page && !page.isClosed()) {
    await writeFile(path.join(artifacts, 'failure.html'), await page.content());
    await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true });
  }
  throw error;
} finally {
  await browser?.close();
  if (process.platform === 'win32' && server.exitCode === null) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else server.kill();
  await sql.end(); await prisma.$disconnect();
  await writeFile(path.join(artifacts, 'server.log'), output.join(''));
  await writeFile(path.join(artifacts, 'result.json'), JSON.stringify({ checks }, null, 2));
}
