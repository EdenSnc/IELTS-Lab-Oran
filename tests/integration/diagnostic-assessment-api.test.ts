import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

function signature(body: string, url: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const payload = Buffer.from(JSON.stringify({ iss: 'Upstash', sub: url, body: createHash('sha256').update(body).digest('base64url'), nbf: now-1, exp: now+60 })).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256','diagnostic-signature-test-only').update(`${header}.${payload}`).digest('base64url')}`;
}
test('diagnostic assessment HTTP requires owner or staff AAL2 and verifies exact QStash body/destination', {
  skip: process.env.TEST_DATABASE_URL ? false : 'Isolated TEST_DATABASE_URL required',
}, async t => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  process.env.QSTASH_CALLBACK_BASE_URL = 'https://diagnostic.synthetic.invalid';
  process.env.QSTASH_CURRENT_SIGNING_KEY = 'diagnostic-signature-test-only';
  process.env.QSTASH_NEXT_SIGNING_KEY = 'diagnostic-next-test-only';
  t.after(() => { delete process.env.SPEAKING_DEV_AUTH_USER_ID; delete process.env.STAFF_MFA_DEV_AAL2; });
  const db = diagnosticTestPrisma(); t.after(() => db.$disconnect());
  const fixture = await diagnosticFixture({ scoringKeys: true });
  const { issueDiagnosticInvitation } = await import('../../src/lib/diagnostic/invitation-service');
  const { createDiagnosticSession } = await import('../../src/lib/diagnostic/session-service');
  const invitation = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
  const session = await createDiagnosticSession({ invitationId: invitation.id, userId: fixture.owner });
  const route = await import('../../src/app/api/diagnostic/sessions/[sessionId]/assessment/route');
  const report = await import('../../src/app/api/diagnostic/sessions/[sessionId]/report/route');
  const jobs = await import('../../src/app/api/internal/diagnostic/writing/route');
  const context = { params: Promise.resolve({ sessionId: session.id }) };
  const req = (method = 'GET', body?: unknown, origin = 'https://diagnostic.synthetic.invalid') => new Request(`https://diagnostic.synthetic.invalid/api/diagnostic/sessions/${session.id}/assessment`, {
    method, headers: { origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  process.env.SPEAKING_DEV_AUTH_USER_ID = fixture.owner;
  assert.equal((await report.GET(req(),context)).status,200);
  assert.equal((await route.GET(req(),context)).status,403);
  process.env.SPEAKING_DEV_AUTH_USER_ID = fixture.stranger;
  assert.equal((await report.GET(req(),context)).status,404);
  process.env.SPEAKING_DEV_AUTH_USER_ID = fixture.staff;
  assert.equal((await route.GET(req(),context)).status,403);
  process.env.STAFF_MFA_DEV_AAL2 = 'true';
  assert.equal((await route.GET(req(),context)).status,409);
  await db.diagnosticResponse.updateMany({ where: { sessionId: session.id }, data: { finalizedAt: new Date() } });
  await db.diagnosticSession.update({ where: { id: session.id }, data: { state: 'SUBMITTED', submittedAt: new Date() } });
  const loaded = await route.GET(req(),context); assert.equal(loaded.status,200);
  const details = await loaded.json(); assert.equal(details.assessment.rawScores[0].maximumRawScore,20);
  assert.ok(!/encryptedPayload|answersByStableKey|writerToken/u.test(JSON.stringify(details)));
  assert.equal((await route.POST(req('POST',{ action: 'release', expectedVersion: 0 },'https://evil.invalid'),context)).status,403);
  assert.equal((await route.POST(req('POST',{ action: 'release', expectedVersion: 0, speakingConductedInPerson: true }),context)).status,409);
  assert.equal((await route.POST(req('POST',{ action: 'release', expectedVersion: 0 }),context)).status,400);
  assert.equal((await route.POST(req('POST',{ action: 'queueWriting', essay: 'client-forged' }),context)).status,400);
  const url = 'https://diagnostic.synthetic.invalid/api/internal/diagnostic/writing';
  const raw = `{ "version": 1, "type": "DIAGNOSTIC_WRITING", "runId": "${randomUUID()}" }`;
  const signed = signature(raw,url);
  const job = (body: string, sig: string) => new Request(url,{ method: 'POST', headers: { 'content-type': 'application/json', 'upstash-signature': sig }, body });
  assert.equal((await jobs.POST(job(raw,signed))).status,200);
  assert.equal((await jobs.POST(job(`${raw} `,signed))).status,403);
  assert.equal((await jobs.POST(job(raw,signature(raw,`${url}/wrong`)))).status,403);
  const privatePayload = JSON.stringify({ version: 1, type: 'DIAGNOSTIC_WRITING', runId: randomUUID(), essay: 'private' });
  assert.equal((await jobs.POST(job(privatePayload,signature(privatePayload,url)))).status,400);
  assert.equal((await jobs.POST(job('x'.repeat(4097),signed))).status,400);
});
