import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import test from 'node:test';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

test('diagnostic grading reads only finalized owned content and verified encrypted keys, never full-mock bands', {
  skip: process.env.TEST_DATABASE_URL ? false : 'Isolated TEST_DATABASE_URL required',
}, async t => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  const prisma = diagnosticTestPrisma(); t.after(() => prisma.$disconnect());
  const sql = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await sql.connect(); t.after(() => sql.end());
  const fixture = await diagnosticFixture({ scoringKeys: true });
  const { issueDiagnosticInvitation } = await import('../../src/lib/diagnostic/invitation-service');
  const { createDiagnosticSession } = await import('../../src/lib/diagnostic/session-service');
  const { gradeDiagnosticSubmission } = await import('../../src/lib/diagnostic/grading-service');
  const invitation = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
  const session = await createDiagnosticSession({ invitationId: invitation.id, userId: fixture.owner });
  const grade = (actorUserId: string = fixture.staff) => gradeDiagnosticSubmission({ sessionId: session.id, actorUserId });
  await assert.rejects(grade(), /WRITTEN_NOT_SUBMITTED/u);
  await assert.rejects(grade(fixture.owner), /STAFF_REQUIRED/u);
  const otherTeacher = await prisma.user.create({ data: { id: randomUUID(), role: 'TEACHER' } });
  await assert.rejects(grade(otherTeacher.id), /NOT_FOUND/u);
  await sql.query(`UPDATE app_private."DiagnosticResponse" SET answer='B',"savedAt"=clock_timestamp(),"finalizedAt"=clock_timestamp() WHERE "sessionId"=$1`, [session.id]);
  await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=clock_timestamp() WHERE id=$1`, [session.id]);
  const result = await grade();
  assert.deepEqual(result.scores.map(score => [score.skill, score.rawScore, score.maximumRawScore]), [['LISTENING', 20, 20], ['READING', 13, 13]]);
  assert.ok(!/band|encrypted|answersByStableKey|acceptedSets/u.test(JSON.stringify(result)));
  const bad = await diagnosticFixture();
  const badInvitation = await issueDiagnosticInvitation({ recipientId: bad.owner, blueprintId: bad.blueprint, actorUserId: bad.staff });
  const badSession = await createDiagnosticSession({ invitationId: badInvitation.id, userId: bad.owner });
  await sql.query(`UPDATE app_private."DiagnosticResponse" SET "finalizedAt"=clock_timestamp() WHERE "sessionId"=$1`, [badSession.id]);
  await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=clock_timestamp() WHERE id=$1`, [badSession.id]);
  await assert.rejects(gradeDiagnosticSubmission({ sessionId: badSession.id, actorUserId: bad.staff }), /CONTENT_INTEGRITY/u);
});
