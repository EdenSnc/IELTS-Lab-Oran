import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture';
test('encoded audio retains millisecond precision through PostgreSQL validation and snapshot freezing', {
  skip: process.env.TEST_DATABASE_URL ? false : 'Isolated TEST_DATABASE_URL required',
}, async t => {
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
  const db=diagnosticTestPrisma(); t.after(()=>db.$disconnect());
  const fixture=await diagnosticFixture({audioDurationMs:500123});
  const {issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
  const {createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
  const invite=await issueDiagnosticInvitation({recipientId:fixture.owner,blueprintId:fixture.blueprint,actorUserId:fixture.staff});
  const session=await createDiagnosticSession({invitationId:invite.id,userId:fixture.owner});
  const row=await db.diagnosticSession.findUniqueOrThrow({where:{id:session.id}});
  const manifest=row.manifest as unknown as {diagnostic:{reviews:Array<{audio?:{durationSeconds:number}}>}};
  assert.equal(manifest.diagnostic.reviews[0].audio!.durationSeconds,500.123);
});
