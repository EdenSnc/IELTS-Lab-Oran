import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';
import { diagnosticFixture, diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

test('diagnostic assessment is versioned, owner-private, examiner released and expiry bounded', {
  skip: process.env.TEST_DATABASE_URL ? false : 'Isolated TEST_DATABASE_URL required',
}, async t => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'diagnostic-local-test-key-only';
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  const db = diagnosticTestPrisma(); t.after(() => db.$disconnect());
  const sql = new Client({ connectionString: process.env.TEST_DATABASE_URL }); await sql.connect(); t.after(() => sql.end());
  const fixture = await diagnosticFixture({ scoringKeys: true });
  const { issueDiagnosticInvitation } = await import('../../src/lib/diagnostic/invitation-service');
  const { createDiagnosticSession } = await import('../../src/lib/diagnostic/session-service');
  const service = await import('../../src/lib/diagnostic/assessment-service');
  const worker = await import('../../src/lib/diagnostic/writing-service');
  const speakingService=await import('../../src/lib/diagnostic/speaking-service');
  async function completeSpeaking(input:{sessionId:string;actorUserId:string}){
    const started=await speakingService.startDiagnosticSpeaking(input);
    await sql.query(`WITH clock AS MATERIALIZED(SELECT date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC' AS now)
      UPDATE app_private."DiagnosticSpeakingSession" SET "startedAt"=clock.now-interval '7 minutes',deadline=clock.now FROM clock WHERE "sessionId"=$1`,[input.sessionId]);
    await speakingService.finishDiagnosticSpeaking({...input,expectedVersion:started.version});
  }
  const invitation = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
  const session = await createDiagnosticSession({ invitationId: invitation.id, userId: fixture.owner });
  const input = { sessionId: session.id, actorUserId: fixture.staff };
  await assert.rejects(service.loadDiagnosticAssessment(input), /WRITTEN_NOT_SUBMITTED/u);
  await sql.query(`UPDATE app_private."DiagnosticResponse" SET answer='B',"finalizedAt"=now() WHERE "sessionId"=$1`, [session.id]);
  await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=now() WHERE id=$1`, [session.id]);
  const draft = await service.loadDiagnosticAssessment(input);
  assert.equal(draft.version, 0); assert.equal(draft.state, 'DRAFT');
  assert.deepEqual(draft.rawScores.map(score => [score.rawScore, score.maximumRawScore]), [[20,20],[13,13]]);
  assert.deepEqual(await service.loadDiagnosticReport({ sessionId: session.id, userId: fixture.owner }), { state: 'PENDING' });
  await assert.rejects(service.loadDiagnosticReport({ sessionId: session.id, userId: fixture.stranger }), /NOT_FOUND/u);
  await assert.rejects(service.releaseDiagnosticAssessment({ ...input, expectedVersion: 0 }), /ASSESSMENT_INCOMPLETE/u);
  const run = await worker.queueDiagnosticWriting(input);
  assert.equal((await worker.queueDiagnosticWriting(input)).id, run.id);
  // QStash publication is outside the committed transaction; failing publication must not erase work.
  await assert.rejects(worker.publishDiagnosticWriting(run.id, async () => { throw new Error('provider failure'); }));
  assert.equal((await db.diagnosticWritingRun.findUniqueOrThrow({ where: { id: run.id } })).state, 'QUEUED');
  const ai = { criteria: (['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'] as const).map(criterion => ({ criterion, observation: 'AI draft', evidence: ['B'] })), nextSteps: ['Develop an example.'], limitations: ['Shortened Task 2.'] };
  let unblock!: () => void; let entered!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const wait = new Promise<void>(resolve => { unblock = resolve; });
  const processing = worker.processDiagnosticWriting(run.id, async () => { entered(); await wait; return { feedback: ai, model: 'synthetic-test-only', usage: { inputTokens: 10, outputTokens: 20 } }; });
  await ready;
  assert.deepEqual(await worker.processDiagnosticWriting(run.id, async () => { throw new Error('duplicate must not call AI'); }), { state: 'RUNNING' });
  const human = { ...ai, criteria: ai.criteria.map(item => ({ ...item, observation: 'Examiner-approved observation' })) };
  const saved = await service.saveDiagnosticAssessment({ ...input, expectedVersion: 0, writing: human,
    speaking: { observations: ['Position developed clearly.'], nextSteps: ['Extend answers with examples.'], limitations: ['Short in-person diagnostic.'] }, nextSteps: ['Develop examples.'] });
  assert.equal(saved.version, 1);
  await assert.rejects(service.saveDiagnosticAssessment({ ...input, expectedVersion: 0, writing: human, speaking: saved.speaking!, nextSteps: [] }), /ASSESSMENT_CONFLICT/u);
  unblock(); assert.deepEqual(await processing, { state: 'SUCCEEDED' });
  assert.equal((await service.loadDiagnosticAssessment(input)).writing!.criteria[0].observation, 'Examiner-approved observation');
  await assert.rejects(service.releaseDiagnosticAssessment({ ...input, expectedVersion: 1 }), /ASSESSMENT_INCOMPLETE/u);
  await assert.rejects(service.releaseDiagnosticAssessment({ ...input, expectedVersion: 1, speakingConductedInPerson: true }), /ASSESSMENT_INCOMPLETE/u);
  await completeSpeaking(input);
  const released = await service.releaseDiagnosticAssessment({ ...input, expectedVersion: 1, speakingConductedInPerson: true });
  assert.equal(released.state, 'RELEASED');
  assert.equal(Date.parse(released.expiresAt!) - Date.parse(released.releasedAt!), 90 * 86400000);
  assert.equal((await service.releaseDiagnosticAssessment({ ...input, expectedVersion: 1 })).version, released.version);
  const report = await service.loadDiagnosticReport({ sessionId: session.id, userId: fixture.owner });
  assert.equal(report.state, 'RELEASED');
  assert.ok(!/inputHash|leaseOwner|questionId|encrypted|examiner-private/u.test(JSON.stringify(report)));
  await assert.rejects(service.saveDiagnosticAssessment({ ...input, expectedVersion: released.version, writing: human, speaking: saved.speaking!, nextSteps: [] }), /ASSESSMENT_RELEASED/u);
  assert.deepEqual(await worker.processDiagnosticWriting(run.id, async () => { throw new Error('completed must not call AI'); }), { state: 'SUCCEEDED' });
  // Advance only the synthetic report, never the machine clock or a real participant.
  await sql.query(`UPDATE app_private."DiagnosticAssessment" SET "releasedAt"=now()-interval '91 days',"expiresAt"=now()-interval '1 day' WHERE "sessionId"=$1`, [session.id]);
  assert.deepEqual(await service.loadDiagnosticReport({ sessionId: session.id, userId: fixture.owner }), { state: 'EXPIRED' });
  assert.equal(await db.staffActionAudit.count({ where: { targetId: session.id, action: 'DIAGNOSTIC_REPORT_RELEASED' } }), 1);
  await t.test('delayed AI completion cannot resurrect analysis after explicit examiner release', async () => {
    const nextInvite = await issueDiagnosticInvitation({ recipientId: fixture.owner, blueprintId: fixture.blueprint, actorUserId: fixture.staff });
    const next = await createDiagnosticSession({ invitationId: nextInvite.id, userId: fixture.owner });
    await sql.query(`UPDATE app_private."DiagnosticResponse" SET answer='B',"finalizedAt"=now() WHERE "sessionId"=$1`,[next.id]);
    await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=now() WHERE id=$1`,[next.id]);
    const nextInput={sessionId:next.id,actorUserId:fixture.staff};
    await service.loadDiagnosticAssessment(nextInput);
    const delayedRun=await worker.queueDiagnosticWriting(nextInput);
    let finish!:()=>void, start!:()=>void;
    const started=new Promise<void>(resolve=>{start=resolve;});
    const blocked=new Promise<void>(resolve=>{finish=resolve;});
    const delayed=worker.processDiagnosticWriting(delayedRun.id,async()=>{start();await blocked;return{feedback:ai,model:'synthetic-test-only',usage:{inputTokens:1,outputTokens:1}};});
    await started;
    await service.saveDiagnosticAssessment({...nextInput,expectedVersion:0,writing:human,speaking:saved.speaking!,nextSteps:[]});
    await completeSpeaking(nextInput);
    await service.releaseDiagnosticAssessment({...nextInput,expectedVersion:1,speakingConductedInPerson:true});
    finish(); assert.deepEqual(await delayed,{state:'CANCELLED'});
    const result=await db.diagnosticWritingRun.findUniqueOrThrow({where:{id:delayedRun.id}});
    assert.equal(result.feedback,null);
    assert.equal((await service.loadDiagnosticAssessment(nextInput)).writing!.criteria[0].observation,'Examiner-approved observation');
  });
});
