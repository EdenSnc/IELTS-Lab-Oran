// Targeted production-build smoke. No test identity bypass, cookies or live services.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const root = 'http://127.0.0.1:3010';
const logs = [];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3010'], {
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'diagnostic-local-test-key-only',
    SUPABASE_SERVICE_ROLE_KEY: undefined, SPEAKING_DEV_AUTH_USER_ID: undefined },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', data => logs.push(String(data))); server.stderr.on('data', data => logs.push(String(data)));
try {
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    try { ready = (await fetch(`${root}/favicon.ico`, { signal: AbortSignal.timeout(2000) })).status === 200; } catch { /* Startup only. */ }
    if (ready) break; await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'production server starts and favicon stays 200');
  const page = await fetch(`${root}/en/diagnostic`, { redirect: 'manual' });
  assert.equal(page.status, 307);
  assert.ok(page.headers.get('location')?.startsWith('/en/auth/sign-in?next='));
  for (const url of ['/api/diagnostic/invitations', '/api/diagnostic/staff']) {
    const response = await fetch(root + url);
    assert.equal(response.status, 401); assert.match(response.headers.get('cache-control'), /private, no-store/u);
  }
  const start = await fetch(`${root}/api/diagnostic/sessions`, { method: 'POST', headers: { Origin: root, 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitationId: '00000000-0000-4000-8000-000000000001', preflightConfirmed: true }) });
  assert.equal(start.status, 401);
  const home = await fetch(`${root}/en`); assert.equal(home.status, 200);
  assert.match(await home.text(), /https:\/\/www\.ieltslab\.org\/en/u);
  const ordinaryMock = await fetch(`${root}/sim`, { redirect: 'manual' });
  assert.equal(ordinaryMock.status, 307); assert.equal(ordinaryMock.headers.get('location'), '/sim/test-1');
  console.log('PASS production auth boundaries, private no-store, public landing, favicon and unchanged ordinary mock entry redirect');
} finally {
  if (process.platform === 'win32' && server.exitCode === null) spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else server.kill();
  await writeFile('.superpowers/sdd/PLAN-2026-10-06/production-runtime-server.log', logs.join(''));
}
