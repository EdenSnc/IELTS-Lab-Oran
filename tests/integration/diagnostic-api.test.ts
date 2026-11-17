import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from 'pg';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
test('diagnostic handlers enforce real owner, deadline, staff and private-media boundaries', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL (isolated local 55322) required',
}, async (t) => {
  assert.equal(new URL(databaseUrl!).hostname, '127.0.0.1');
  assert.equal(new URL(databaseUrl!).port, '55322');
  process.env.DATABASE_URL = databaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  t.after(() => client.end());
  const root = await mkdtemp(path.join(os.tmpdir(), 'diagnostic-api-'));
  process.env.PRIVATE_TEST_ASSET_LOCAL_ROOT = root;
  t.after(async () => { delete process.env.PRIVATE_TEST_ASSET_LOCAL_ROOT; delete process.env.SPEAKING_DEV_AUTH_USER_ID; delete process.env.STAFF_MFA_DEV_AAL2; await rm(root, { recursive: true, force: true }); });
  const prisma = diagnosticTestPrisma();
  t.after(() => prisma.$disconnect());
  const invitations = await import('../../src/app/api/diagnostic/invitations/route');
  const revoke = await import('../../src/app/api/diagnostic/invitations/[invitationId]/route');
  const sessions = await import('../../src/app/api/diagnostic/sessions/route');
  const sessionRoute = await import('../../src/app/api/diagnostic/sessions/[sessionId]/route');
  const writers = await import('../../src/app/api/diagnostic/sessions/[sessionId]/writer/route');
  const responses = await import('../../src/app/api/diagnostic/sessions/[sessionId]/responses/route');
  const submit = await import('../../src/app/api/diagnostic/sessions/[sessionId]/submit/route');
  const content = await import('../../src/app/api/diagnostic/sessions/[sessionId]/content/route');
  const assets = await import('../../src/app/api/diagnostic/sessions/[sessionId]/assets/[assetId]/route');
  const staff = await import('../../src/app/api/diagnostic/staff/route');
  const f = await diagnosticFixture();
  const request = (method = 'GET', body?: unknown, headers: Record<string, string> = {}) => new Request('http://localhost:3000/api/diagnostic', {
    method, headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const context = (sessionId: string) => ({ params: Promise.resolve({ sessionId }) });
  const safe = async (response: Response, status = 200) => {
    assert.equal(response.status, status);
    assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
    const text = await response.text();
    assert.ok(!/reviewerId|storageKey|encryptedPayload|writerTokenHash|sourceTest|manifest|transcript/i.test(text), text);
    return JSON.parse(text);
  };
  const issue = () => invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint }));
  await t.test('anonymous receives 401; learners cannot perform privileged actions; AAL1 staff denied', async () => {
    delete process.env.SPEAKING_DEV_AUTH_USER_ID;
    await safe(await invitations.GET(request()), 401);
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.owner;
    await safe(await staff.GET(request()), 403);
    await safe(await issue(), 403);
    await safe(await revoke.DELETE(request('DELETE', { reason: 'Forged cancellation' }), { params: Promise.resolve({ invitationId: randomUUID() }) }), 403);
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.staff;
    delete process.env.STAFF_MFA_DEV_AAL2;
    await safe(await issue(), 403);
  });
  process.env.STAFF_MFA_DEV_AAL2 = 'true';
  await t.test('staff discovery requires AAL2 and exposes only the exact active account match', async () => {
    const result = await safe(await staff.GET(new Request(`http://localhost:3000/api/diagnostic/staff?email=${f.owner}%40synthetic.invalid&blueprintId=${f.blueprint}`)));
    assert.deepEqual(result.recipients.map((recipient: { id: string }) => recipient.id), [f.owner]);
    assert.equal(result.blueprints.find((blueprint: { id: string }) => blueprint.id === f.blueprint)?.ready, true);
    delete process.env.STAFF_MFA_DEV_AAL2;
    await safe(await staff.GET(request()), 403);
    process.env.STAFF_MFA_DEV_AAL2 = 'true';
  });
  await t.test('cross-origin, malformed and injected authority cannot issue invitations', async () => {
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint }, { origin: 'https://evil.invalid' })), 403);
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint, role: 'ADMIN' })), 400);
    await safe(await invitations.POST(new Request('http://localhost:3000/api/diagnostic', { method: 'POST', body: '{', headers: { host: 'localhost:3000', 'content-type': 'application/json' } })), 400);
    await safe(await invitations.POST(new Request('http://localhost:3000/api/diagnostic', { method: 'POST', body: JSON.stringify({ recipientId: f.owner, blueprintId: f.blueprint }), headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' } })), 403);
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint }, { origin: 'https://localhost:3000' })), 403);
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint }, { origin: 'not-an-origin' })), 400);
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: f.blueprint, reason: 'x'.repeat(10001) })), 400);
  });
  const { invitation } = await safe(await issue(), 201);
  const cancelled = (await safe(await issue(), 201)).invitation;
  await safe(await revoke.DELETE(request('DELETE', { reason: 'Synthetic cancellation' }), { params: Promise.resolve({ invitationId: cancelled.id }) }));
  process.env.SPEAKING_DEV_AUTH_USER_ID = f.owner;
  const start = () => sessions.POST(request('POST', { invitationId: invitation.id, preflightConfirmed: true }));
  await t.test('owner list and strict preflight do not accept a client owner or clock', async () => {
    const list = await safe(await invitations.GET(request()));
    assert.equal(list.invitations.length, 2);
    await safe(await sessions.POST(request('POST', { invitationId: invitation.id, preflightConfirmed: false })), 400);
    await safe(await sessions.POST(request('POST', { invitationId: invitation.id, preflightConfirmed: true, userId: f.stranger, startedAt: '2000-01-01' })), 400);
    await safe(await sessions.POST(request('POST', { invitationId: cancelled.id, preflightConfirmed: true })), 403);
  });
  const { session } = await safe(await start(), 201);
  const ctx = context(session.id);
  let token = '';
  await t.test('candidate starts once, acquires writer and persists acknowledged saves without paid-engine writes', async () => {
    assert.equal((await safe(await start(), 201)).session.id, session.id);
    assert.equal((await safe(await sessionRoute.GET(request(), ctx))).session.id, session.id);
    const writer = await safe(await writers.POST(request('POST', {}), ctx));
    token = writer.writerToken;
    await safe(await writers.POST(request('POST', {}), ctx), 409);
    const body = { questionId: f.questionIds[0], expectedVersion: 0, answer: 'العربية 🦉', markedForReview: true };
    await safe(await responses.PUT(request('PUT', { ...body, deadline: '2099-01-01' }, { 'x-diagnostic-writer': token }), ctx), 400);
    await safe(await responses.PUT(request('PUT', body), ctx), 409);
    const saved = await safe(await responses.PUT(request('PUT', body, { 'x-diagnostic-writer': token }), ctx));
    assert.equal(saved.response.version, 1); assert.equal(saved.response.answer, body.answer);
    await safe(await responses.PUT(request('PUT', { ...body, answer: 'stale' }, { 'x-diagnostic-writer': token }), ctx), 409);
    await safe(await responses.PUT(request('PUT', { ...body, questionId: f.questionIds[20] }, { 'x-diagnostic-writer': token }), ctx), 409);
    assert.equal(await prisma.assessmentAttempt.count({ where: { userId: f.owner } }), 0);
    assert.equal(await prisma.entitlement.count({ where: { userId: f.owner } }), 0);
    assert.equal(await prisma.deviceSlot.count({ where: { userId: f.owner } }), 0);
  });
  await t.test('wrong owner and malformed identifiers denied for state, content and assets', async () => {
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.stranger;
    await safe(await sessionRoute.GET(request(), ctx), 404);
    await safe(await content.GET(request(), ctx), 404);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.assetIds[0] }) }), 404);
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.owner;
    await safe(await sessionRoute.GET(request(), context('not-uuid')), 400);
  });
  await t.test('only current skill and reviewed bounded listening audio are deliverable with safe range headers', async () => {
    const current = await safe(await content.GET(request(), ctx));
    assert.equal(current.section.skill, 'LISTENING');
    assert.equal(current.section.parts.length, 2);
    assert.equal(current.section.parts[0].questionGroups[0].questions[0].sourceNumber, 21);
    assert.equal(current.section.parts[0].questionGroups[0].sourceNumberStart, 21);
    assert.equal(current.section.parts[0].questionGroups[0].sourceNumberEnd, 30);
    assert.equal(current.section.parts[1].questionGroups[0].questions[9].sourceNumber, 40);
    assert.ok(!JSON.stringify(current).includes(f.partIds[2]));
    for (const id of f.assetIds) {
      const row = await prisma.contentAsset.findUniqueOrThrow({ where: { id } });
      const local = path.join(root, row.storageKey);
      await mkdir(path.dirname(local), { recursive: true }); await writeFile(local, '0123456789');
    }
    const assetContext = { params: Promise.resolve({ sessionId: session.id, assetId: f.assetIds[0] }) };
    const audio = await assets.GET(request(), assetContext);
    assert.equal(audio.status, 200); assert.equal(await audio.text(), '0123456789');
    assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
    assert.equal(audio.headers.get('x-content-type-options'), 'nosniff');
    assert.match(audio.headers.get('cache-control') ?? '', /private, no-store/);
    assert.equal(audio.headers.get('authorization'), null); assert.equal(audio.headers.get('apikey'), null);
    const range = await assets.GET(request('GET', undefined, { range: 'bytes=2-5' }), assetContext);
    assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(range.headers.get('content-length'), '4'); assert.equal(await range.text(), '2345');
    assert.equal((await assets.GET(request('GET', undefined, { range: 'bytes=100-' }), assetContext)).status, 416);
    assert.equal((await assets.GET(request('GET', undefined, { range: 'bytes=0-1,3-4' }), assetContext)).status, 416);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: randomUUID() }) }), 404);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.visibleImageId }) }), 404);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.unlinkedAssetId }) }), 404);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.sourceAudioAssetId }) }), 404);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'diagnostic-test-transport-key-only';
    const remote = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.ok(url.startsWith('http://127.0.0.1:55321/storage/v1/object/authenticated/protected-test-assets/synthetic/'));
      assert.equal(options.cache, 'no-store');
      assert.equal(new Headers(options.headers).get('range'), 'bytes=100-');
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */10', 'Accept-Ranges': 'bytes', 'Content-Length': '0', apikey: 'must-not-escape', 'Set-Cookie': 'secret-cookie' } });
    });
    try {
      assert.equal((await assets.GET(request('GET', undefined, { range: 'bytes=9007199254740992-' }), assetContext)).status, 416);
      assert.equal((await assets.GET(request('GET', undefined, { range: 'bytes=9-2' }), assetContext)).status, 416);
      const invalid = await assets.GET(request('GET', undefined, { range: 'bytes=100-' }), assetContext);
      assert.equal(invalid.status, 416); assert.equal(invalid.headers.get('content-range'), 'bytes */10');
      assert.equal(invalid.headers.get('apikey'), null); assert.equal(invalid.headers.get('set-cookie'), null);
    } finally { remote.mock.restore(); delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
    await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',clock_timestamp())-interval '21 minutes',deadline=date_trunc('milliseconds',clock_timestamp())+interval '39 minutes' WHERE id=$1`, [session.id]);
    const reading = (await safe(await content.GET(request(), ctx))).section;
    assert.equal(reading.skill, 'READING');
    assert.equal(reading.parts[0].questionGroups[0].questions[0].sourceNumber, 27);
    await safe(await assets.GET(request(), assetContext), 404);
    const imageRow = await prisma.contentAsset.findUniqueOrThrow({ where: { id: f.visibleImageId } });
    const imagePath = path.join(root, imageRow.storageKey);
    await mkdir(path.dirname(imagePath), { recursive: true }); await writeFile(imagePath, 'SYNTHETIC image bytes');
    const image = await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.visibleImageId }) });
    assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(await image.text(), 'SYNTHETIC image bytes');
    await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',clock_timestamp())-interval '41 minutes',deadline=date_trunc('milliseconds',clock_timestamp())+interval '19 minutes' WHERE id=$1`, [session.id]);
    const writing = (await safe(await content.GET(request(), ctx))).section;
    assert.equal(writing.skill, 'WRITING'); assert.equal(writing.parts.length, 1);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.visibleImageId }) }), 404);
  });
  await t.test('submit body cannot inject state; terminal content withheld and submission is idempotent', async () => {
    await safe(await submit.POST(request('POST', { state: 'SUBMITTED', answers: [] }, { 'x-diagnostic-writer': token }), ctx), 400);
    const final = (await safe(await submit.POST(request('POST', {}, { 'x-diagnostic-writer': token }), ctx))).session;
    const replay = (await safe(await submit.POST(request('POST', {}), ctx))).session;
    assert.equal(replay.version, final.version); assert.equal(replay.submittedAt, final.submittedAt);
    assert.equal((await safe(await content.GET(request(), ctx))).section, null);
    await safe(await assets.GET(request(), { params: Promise.resolve({ sessionId: session.id, assetId: f.assetIds[0] }) }), 404);
  });
  await t.test('server deadline rejects late autosave and withholds expired content without requiring client submit', async () => {
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.staff;
    const invite = (await safe(await issue(), 201)).invitation;
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.owner;
    const active = (await safe(await sessions.POST(request('POST', { invitationId: invite.id, preflightConfirmed: true })), 201)).session;
    const activeCtx = context(active.id);
    const writer = await safe(await writers.POST(request('POST', {}), activeCtx));
    await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',clock_timestamp())-interval '1 hour',deadline=date_trunc('milliseconds',clock_timestamp()) WHERE id=$1`, [active.id]);
    const rejected = await safe(await responses.PUT(request('PUT', { questionId: f.questionIds[0], expectedVersion: 0, answer: 'late', markedForReview: false }, { 'x-diagnostic-writer': writer.writerToken }), activeCtx), 409);
    assert.equal(rejected.error, 'SESSION_EXPIRED');
    assert.equal((await safe(await content.GET(request(), activeCtx))).section, null);
    const final = (await safe(await submit.POST(request('POST'), activeCtx))).session;
    assert.equal(final.state, 'SUBMITTED'); assert.equal(final.responses.find((r: { questionId: string }) => r.questionId === f.questionIds[0]).answer, '');
  });
  await t.test('missing and unready source fail closed with safe diagnostic codes', async () => {
    process.env.SPEAKING_DEV_AUTH_USER_ID = f.staff;
    await safe(await invitations.POST(request('POST', { recipientId: f.owner, blueprintId: randomUUID() })), 409);
    const bad = await diagnosticFixture({ noReview: true });
    await safe(await invitations.POST(request('POST', { recipientId: bad.owner, blueprintId: bad.blueprint })), 409);
  });
  // Removing either the SVG MIME/extension filter or the storage-key validator
  // must expose an asset URL here (and change the owned asset endpoint from 404).
  for (const visibleMedia of ['svg', 'svgExtension', 'unsafeKey'] as const) {
    await t.test(`published source with ${visibleMedia} visible media never yields a learner asset URL`, async () => {
      const unsafe = await diagnosticFixture({ visibleMedia });
      const row = await prisma.contentAsset.findUniqueOrThrow({ where: { id: unsafe.visibleImageId } });
      if (visibleMedia === 'svg') assert.equal(row.mimeType, 'image/svg+xml');
      else if (visibleMedia === 'svgExtension') {
        assert.equal(row.mimeType, 'image/png');
        assert.match(row.storageKey, /\.svg$/iu);
      } else assert.match(row.storageKey, /(?:\.\.|[%_*?\[\]\\])/u);
      process.env.SPEAKING_DEV_AUTH_USER_ID = unsafe.staff;
      const invite = (await safe(await invitations.POST(request('POST', {
        recipientId: unsafe.owner, blueprintId: unsafe.blueprint,
      })), 201)).invitation;
      process.env.SPEAKING_DEV_AUTH_USER_ID = unsafe.owner;
      const active = (await safe(await sessions.POST(request('POST', {
        invitationId: invite.id, preflightConfirmed: true,
      })), 201)).session;
      await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',clock_timestamp())-interval '21 minutes',deadline=date_trunc('milliseconds',clock_timestamp())+interval '39 minutes' WHERE id=$1`, [active.id]);
      const reading = (await safe(await content.GET(request(), context(active.id)))).section;
      assert.equal(reading.skill, 'READING');
      const stimulus = reading.parts[0].stimuli.find((item: { plainText: string | null }) => item.plainText === 'SYNTHETIC image description');
      assert.ok(stimulus, 'the real visible stimulus remains readable');
      assert.equal(stimulus.assetUrl, null);
      assert.ok(!JSON.stringify(reading).includes(unsafe.visibleImageId));
      await safe(await assets.GET(request(), { params: Promise.resolve({
        sessionId: active.id, assetId: unsafe.visibleImageId,
      }) }), 404);
    });
  }
});

test('unknown HTTP failures do not reveal private exception text', async (t) => {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  const { diagnosticApiError } = await import('../../src/lib/diagnostic/http');
  t.mock.method(console, 'error', () => undefined);
  const response = diagnosticApiError(new Error('private-storage-key-and-answer-secret'), { sessionId: '11111111-1111-4111-8111-111111111111' });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'DIAGNOSTIC_REQUEST_FAILED' });
  assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
});

test('delivery HTML strips executable and unlinked media while adapting only approved private UUID URLs', async () => {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  const { sanitizeDiagnosticDeliveryHtml } = await import('../../src/lib/diagnostic/delivery-service');
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const assetId = '22222222-2222-4222-8222-222222222222';
  const result = sanitizeDiagnosticDeliveryHtml(`<p onclick="evil()">Question21</p><script>evil()</script><img src="content-asset://private/image.png" onerror="evil()"><img src="/api/test-assets/33333333-3333-4333-8333-333333333333"><img src="https://evil.invalid/secret"><iframe src="evil"></iframe>`, sessionId, [{ id: assetId, storageKey: 'private/image.png' }]);
  assert.match(result!, /Question21/);
  assert.match(result!, new RegExp(`/api/diagnostic/sessions/${sessionId}/assets/${assetId}`));
  assert.ok(!/script|onclick|onerror|iframe|evil|33333333|private\/image|content-asset|api\/test-assets/u.test(result!));
});
