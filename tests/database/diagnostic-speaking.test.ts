import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';
import { diagnosticFixture,diagnosticTestPrisma } from '../helpers/diagnostic-fixture';
test('in-person Speaking preserves written work, supports human-only, binds owner consent and never restarts its clock',{
  skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55321';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
  const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());
  const sql=new Client({connectionString:process.env.TEST_DATABASE_URL});await sql.connect();t.after(()=>sql.end());
  const fixture=await diagnosticFixture();
  const {issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
  const {createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
  const service=await import('../../src/lib/diagnostic/speaking-service');
  const invite=await issueDiagnosticInvitation({recipientId:fixture.owner,blueprintId:fixture.blueprint,actorUserId:fixture.staff});
  const written=await createDiagnosticSession({invitationId:invite.id,userId:fixture.owner});
  const staff={sessionId:written.id,actorUserId:fixture.staff};
  await assert.rejects(service.startDiagnosticSpeaking(staff),/WRITTEN_NOT_SUBMITTED/u);
  await sql.query(`UPDATE app_private."DiagnosticResponse" SET "finalizedAt"=now() WHERE "sessionId"=$1`,[written.id]);
  await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=now() WHERE id=$1`,[written.id]);
  await assert.rejects(service.saveDiagnosticSpeakingConsent({sessionId:written.id,userId:fixture.stranger,adultAttested:true,recordingConsented:true,aiConsented:true}),/NOT_FOUND/u);
  await assert.rejects(service.saveDiagnosticSpeakingConsent({sessionId:written.id,userId:fixture.owner,adultAttested:false,recordingConsented:true,aiConsented:false}),/RECORDING_NOT_ELIGIBLE/u);
  const started=await service.startDiagnosticSpeaking(staff);
  assert.equal(started.eligibility.canRecord,false);assert.equal(started.state,'ACTIVE');
  assert.equal((await service.startDiagnosticSpeaking(staff)).startedAt,started.startedAt);
  assert.equal(Date.parse(started.deadline!)-Date.parse(started.startedAt!),420000);
  await assert.rejects(service.startDiagnosticSpeaking({...staff,actorUserId:fixture.owner}),/STAFF_REQUIRED/u);
  const owner={sessionId:written.id,userId:fixture.owner};
  const consent=await service.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:true,aiConsented:true});
  assert.equal(consent.eligibility.canAnalyse,true);
  assert.equal((await service.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:true,aiConsented:true})).consentVersion,consent.consentVersion);
  const revoked=await service.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:false,aiConsented:false});
  assert.equal(revoked.eligibility.canAnalyse,false);assert.ok(revoked.privacyRevokedAt);
  const current=await service.loadDiagnosticSpeaking(staff);
  const notes=await service.saveDiagnosticSpeakingNotes({...staff,expectedVersion:current.version,notes:'Private examiner note, never learner-visible.'});
  await assert.rejects(service.saveDiagnosticSpeakingNotes({...staff,expectedVersion:current.version,notes:'Stale overwrite'}),/SPEAKING_CONFLICT/u);
  const view=await service.loadDiagnosticSpeakingStatus(owner);
  assert.ok(!/Private examiner|examinerId|notes/u.test(JSON.stringify(view)));
  await assert.rejects(service.finishDiagnosticSpeaking({...staff,expectedVersion:notes.version}),/SPEAKING_NOT_FINISHED/u);
  await sql.query(`WITH clock AS MATERIALIZED (SELECT date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC' AS now)
    UPDATE app_private."DiagnosticSpeakingSession" SET "startedAt"=clock.now-interval '7 minutes',deadline=clock.now FROM clock WHERE "sessionId"=$1`,[written.id]);
  const finished=await service.finishDiagnosticSpeaking({...staff,expectedVersion:notes.version});
  assert.equal(finished.state,'COMPLETED');
  assert.equal((await service.finishDiagnosticSpeaking({...staff,expectedVersion:notes.version})).version,finished.version);
  assert.equal((await db.diagnosticSession.findUniqueOrThrow({where:{id:written.id}})).deadline.toISOString(),written.deadline);
  assert.equal(await db.consentRecord.count({where:{userId:fixture.owner,acceptedFrom:`diagnostic-speaking:${written.id}`}}),4);
});
