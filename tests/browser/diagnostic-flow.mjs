// Run: node --conditions=react-server --import tsx tests/browser/diagnostic-flow.mjs [playwright module path]
// Synthetic, isolated local DB only. Never uses a live account or real source media.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Client } from 'pg';
import sharp from 'sharp';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture.ts';

const db = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
process.env.TEST_DATABASE_URL = db; process.env.DATABASE_URL = db;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55621';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
process.env.ENCRYPTION_KEY = '11'.repeat(32);
const prisma = diagnosticTestPrisma();
const sql = new Client({ connectionString: db }); await sql.connect();
const modulePath = process.argv[2];
const { chromium } = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const fixture = await diagnosticFixture({ browserChoices: true, scoringKeys: true });
const { issueDiagnosticInvitation } = await import('../../src/lib/diagnostic/invitation-service.ts');
const invitation = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
const artifacts = path.resolve('.superpowers/sdd/PLAN-2026-10-06/browser');
const assetsRoot = path.join(artifacts, 'assets'); await mkdir(assetsRoot, { recursive: true });
// Deliberately synthetic silent PCM; same bounded duration as fixture metadata.
const samples = 8000 * 500, wave = Buffer.alloc(44 + samples * 2);
const png = await sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 220, g: 220, b: 220, alpha: 1 } } }).png().toBuffer();
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28); wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40);
for (const asset of await prisma.contentAsset.findMany({ where: { id: { in: [...fixture.assetIds, fixture.visibleImageId] } } })) {
  const target = path.join(assetsRoot, asset.storageKey); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, asset.type === 'AUDIO' ? wave : png);
}
const output = [];
// Stub only the external identity/storage transports. The production app, its
// authorization, cookies, route matching and PostgreSQL transactions remain real.
const expires = Math.floor(Date.now() / 1000) + 7200;
const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: fixture.owner, aud: 'authenticated', role: 'authenticated', exp: expires, iat: expires - 7200 })).toString('base64url'), 'synthetic-signature'].join('.');
const authUser = { id: fixture.owner, aud: 'authenticated', role: 'authenticated', email: `${fixture.owner}@synthetic.invalid`,
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: new Date().toISOString() };
const staffJwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: fixture.staff, aud: 'authenticated', role: 'authenticated', aal: 'aal2', exp: expires, iat: expires - 7200 })).toString('base64url'), Buffer.from('synthetic-staff-signature').toString('base64url')].join('.');
const staffAuthUser = { ...authUser, id: fixture.staff, email: `${fixture.staff}@synthetic.invalid` };
const transport = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:55621');
  if (url.pathname === '/auth/v1/user') {
    response.setHeader('Content-Type', 'application/json');
    if (request.headers.authorization === `Bearer ${staffJwt}`) response.end(JSON.stringify(staffAuthUser));
    else if (request.headers.authorization === `Bearer ${jwt}`) response.end(JSON.stringify(authUser));
    else { response.writeHead(401); response.end('{"message":"invalid test token"}'); }
    return;
  }
  const prefix = '/storage/v1/object/authenticated/protected-test-assets/';
  if (url.pathname.startsWith(prefix)) {
    try {
      const key = decodeURIComponent(url.pathname.slice(prefix.length));
      const target = path.resolve(assetsRoot, key);
      if (!target.startsWith(assetsRoot + path.sep)) throw new Error('unsafe test key');
      const bytes = await readFile(target); response.setHeader('Accept-Ranges', 'bytes');
      const range = /^bytes=(\d+)-(\d*)$/u.exec(request.headers.range ?? '');
      if (range) {
        const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
        if (start > end || start >= bytes.length) { response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); response.end(); return; }
        response.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 }); response.end(bytes.subarray(start, end + 1));
      } else { response.setHeader('Content-Length', bytes.length); response.end(bytes); }
    } catch { response.writeHead(404); response.end(); }
    return;
  }
  response.writeHead(404); response.end();
});
await new Promise((resolve, reject) => { transport.once('error', reject); transport.listen(55621, '127.0.0.1', resolve); });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3009'], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', SPEAKING_DEV_AUTH_USER_ID: undefined,
    SUPABASE_SERVICE_ROLE_KEY: 'diagnostic-storage-test-key-only' }, stdio: ['ignore', 'pipe', 'pipe'],
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
  await until(async () => { try { return (await fetch('http://127.0.0.1:3009/favicon.ico')).status === 200; } catch { return false; } }, 'local production server', 30000);
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify({ access_token: jwt,
    refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: expires, expires_in: 7200, user: authUser })).toString('base64url'),
    domain: '127.0.0.1', path: '/', sameSite: 'Lax' }]);
  page = await context.newPage();
  page.on('dialog', async dialog => { console.log('Browser dialog:', dialog.type()); await dialog.accept(); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (response.status() >= 400 && response.url().includes('/api/diagnostic/') && !response.url().includes('/assets/')) {
      try { console.log('API failure', new URL(response.url()).pathname, response.status(), (await response.json()).error ?? 'UNKNOWN'); } catch { console.log('API failure', new URL(response.url()).pathname, response.status(), 'NON_JSON'); }
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
  await until(async () => await page.locator('header [role=status] span').last().innerText() === 'Saved', 'frontend save acknowledgement');
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
  const readingInput = page.locator('main input:not([type=checkbox]):not([type=radio])').first();
  await until(() => readingInput.isEnabled(), 'Arabic writer resumed');
  const sourceImage = page.locator('img[src*="/assets/"]').first();
  await until(() => sourceImage.evaluate(image => image.complete && image.naturalWidth > 0), 'protected source image rendered');
  pass('protected standalone source image loads with authenticated cookies');
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
  await page.goto(`http://127.0.0.1:3009/fr/diagnostic/${sessionId}/report`);
  await page.getByRole('heading', { name: 'En attente de validation', exact: true }).waitFor();
  pass('participant sees pending state, not private examiner draft');
  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  await staffContext.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify({ access_token: staffJwt,
    refresh_token: 'synthetic-staff-refresh', token_type: 'bearer', expires_at: expires, expires_in: 7200, user: staffAuthUser })).toString('base64url'),
    domain: '127.0.0.1', path: '/', sameSite: 'Lax' }]);
  const examiner = await staffContext.newPage(); examiner.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:3009/en/diagnostic/${sessionId}/speaking`);
  await page.getByRole('heading',{name:'Recording preferences',exact:true}).waitFor({timeout:4000});
  assert.equal(await page.getByLabel('I agree to audio recording for this diagnostic.',{exact:true}).isChecked(),false);
  assert.equal(await page.getByLabel('I agree to audio recording for this diagnostic.',{exact:true}).isDisabled(),true);
  await page.getByLabel('I am 18 or older.',{exact:true}).check();
  await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.getByText('Preferences saved.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('I agree to Google Gemini analysis of my submitted diagnostic essay.',{exact:true}).isDisabled(),true);
  pass('participant controls optional adult/privacy preferences; unavailable recording and AI stay disabled');
  await examiner.goto(`http://127.0.0.1:3009/en/diagnostic/examiner/${sessionId}`);
  await examiner.getByRole('button',{name:'Start Speaking',exact:true}).click();
  await examiner.getByLabel('Private examiner notes',{exact:true}).fill('Private synthetic observation, never participant-visible.');
  await examiner.getByRole('button',{name:'Save notes',exact:true}).click();
  await examiner.getByText('Notes saved.',{exact:true}).waitFor();
  const speakingBefore=await prisma.diagnosticSpeakingSession.findUnique({where:{sessionId}});
  await examiner.reload();
  assert.equal((await prisma.diagnosticSpeakingSession.findUnique({where:{sessionId}})).startedAt.toISOString(),speakingBefore.startedAt.toISOString());
  const speakingOwner=await page.request.get(`http://127.0.0.1:3009/api/diagnostic/sessions/${sessionId}/speaking`);
  assert.ok(!JSON.stringify(await speakingOwner.json()).includes('Private synthetic observation'));
  await sql.query(`WITH clock AS MATERIALIZED(SELECT date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC' AS now)
    UPDATE app_private."DiagnosticSpeakingSession" SET "startedAt"=clock.now-interval '7 minutes',deadline=clock.now FROM clock WHERE "sessionId"=$1`,[sessionId]);
  await examiner.getByRole('button',{name:'Check status',exact:true}).click();
  await examiner.getByRole('button',{name:'Complete Speaking',exact:true}).click();
  await examiner.getByText('Completed',{exact:true}).waitFor();
  pass('human-only Speaking uses fixed server clock, private notes and explicit completion');
  await examiner.goto(`http://127.0.0.1:3009/en/diagnostic/staff/${sessionId}`);
  for (const criterion of ['Task response','Coherence and cohesion','Lexical resource','Grammatical range and accuracy']) {
    await examiner.getByLabel(criterion, { exact: true }).fill('Examiner-reviewed observation from this synthetic response.');
  }
  await examiner.getByLabel('Speaking observations', { exact: true }).fill('SYNTHETIC in-person observation, not a real participant.');
  await examiner.getByLabel('Speaking limitations', { exact: true }).fill('Short in-person diagnostic; synthetic browser fixture.');
  await examiner.getByLabel('Priority next steps', { exact: true }).fill('Develop one specific example.');
  await examiner.getByRole('button', { name: 'Save examiner feedback', exact: true }).click();
  await examiner.getByText('Feedback saved.', { exact: true }).waitFor();
  const candidatePending = await page.request.get(`http://127.0.0.1:3009/api/diagnostic/sessions/${sessionId}/report`);
  assert.deepEqual(await candidatePending.json(), { state: 'PENDING' });
  await examiner.getByRole('checkbox', { name: 'I conducted the in-person Speaking diagnostic and reviewed all feedback.', exact: true }).check();
  await examiner.getByRole('button', { name: 'Release participant report', exact: true }).click();
  await examiner.getByText('Released', { exact: true }).waitFor();
  assert.equal((await prisma.diagnosticAssessment.findUnique({ where: { sessionId } })).state, 'RELEASED');
  pass('staff AAL2 review saves real draft and explicitly releases report');
  await page.goto(`http://127.0.0.1:3009/ar/diagnostic/${sessionId}/report`);
  await page.getByRole('heading', { name: 'تقرير الاختبار التشخيصي', exact: true }).waitFor();
  assert.ok((await page.locator('main').innerText()).includes('Develop one specific example.'));
  await page.setViewportSize({ width: 320, height: 800 });
  const reportWidth = await page.locator('main').evaluate(element => ({ scroll: element.scrollWidth, width: element.clientWidth }));
  assert.ok(reportWidth.scroll <= reportWidth.width+1);
  pass('released Arabic report is owner scoped and reflows at 320px');
  assert.deepEqual(errors, []); pass('no uncaught browser application errors');
} catch (error) {
  console.error('Flow failure:', error);
  console.error('Browser errors:', errors);
  if (page && !page.isClosed()) {
    try {
      await writeFile(path.join(artifacts, 'failure.html'), await page.content());
      await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true });
    } catch { /* Never replace the actual assertion with an artifact/navigation error. */ }
  }
  throw error;
} finally {
  await browser?.close();
  if (process.platform === 'win32' && server.exitCode === null) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else server.kill();
  await sql.end(); await prisma.$disconnect();
  transport.closeAllConnections(); await new Promise(resolve => transport.close(resolve));
  await writeFile(path.join(artifacts, 'server.log'), output.join(''));
  await writeFile(path.join(artifacts, 'result.json'), JSON.stringify({ checks }, null, 2));
}
