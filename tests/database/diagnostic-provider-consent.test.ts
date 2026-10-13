import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

test('readiness provider switch requires new provider-specific consent and fences old queued work', {
  skip: !process.env.TEST_DATABASE_URL && 'Isolated TEST_DATABASE_URL required',
}, async t => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ENCRYPTION_KEY = '11'.repeat(32);
  process.env.DIAGNOSTIC_AI_ENABLED = 'true'; process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED = 'true';
  t.after(() => { delete process.env.DIAGNOSTIC_WRITING_PROVIDER; delete process.env.DIAGNOSTIC_AI_ENABLED; delete process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED; });
  const db = diagnosticTestPrisma(); t.after(() => db.$disconnect());
  const staff=randomUUID(), userId=randomUUID();
  for(const [id,role] of [[staff,'ADMIN'],[userId,'STUDENT']] as const)
    await db.user.create({data:{id,email:`${id}@provider-consent-test.invalid`,role}});
  const {provisionReadinessPack}=await import('../../src/lib/diagnostic/readiness-provision');
  const {inviteReadiness,startReadiness,readinessStaffView}=await import('../../src/lib/diagnostic/readiness-service');
  await provisionReadinessPack(staff,true);
  const privacy = await import('../../src/lib/diagnostic/ai-consent-service');
  const invitation = await inviteReadiness({recipientId:userId,actorUserId:staff,cohort:'PROVIDER_CONSENT_TEST'});
  const session = await startReadiness({userId,invitationId:invitation.id,intake:{name:'Controlled participant',phone:'+213780000004',pathway:'ACADEMIC',targetBand:6.5,timeframe:'ONE_TO_THREE_MONTHS',contactConsent:true}});
  await db.diagnosticSession.update({ where: { id: session.id }, data: { state: 'SUBMITTED', submittedAt: new Date() } });
  await db.diagnosticResponse.updateMany({where:{sessionId:session.id},data:{finalizedAt:new Date()}});
  await db.diagnosticResponse.updateMany({where:{sessionId:session.id,questionId:session.responses.find(r=>r.stableKey==='W1')!.questionId},data:{answer:'A controlled response used for testing.'}});
  const writing=await import('../../src/lib/diagnostic/writing-service');
  const owner = { sessionId: session.id, userId };
  const first = await privacy.saveDiagnosticWritingConsent({ ...owner, adultAttested: true, accepted: true, provider: 'gemini' });
  assert.equal(first.provider, 'gemini'); assert.equal(first.accepted, true);
  const googleRun=await writing.queueDiagnosticWriting({sessionId:session.id,actorUserId:staff});
  process.env.DIAGNOSTIC_WRITING_PROVIDER = 'deepseek';
  const changed = await privacy.loadDiagnosticWritingConsent(owner);
  assert.equal(changed.provider, 'deepseek'); assert.equal(changed.accepted, false);
  assert.equal((await readinessStaffView(staff,session.id))[0].writingAi.available,false,'Staff cannot offer analysis until the currently selected provider is consented');
  await assert.rejects(db.$transaction(tx => privacy.assertDiagnosticWritingAiConsent(tx, session.id, first.version)), /AI_CONSENT_REQUIRED/u);
  await assert.rejects(privacy.saveDiagnosticWritingConsent({ ...owner, adultAttested: true, accepted: true, provider: 'gemini' }), /AI_CONSENT_REQUIRED/u);
  await assert.rejects(privacy.saveDiagnosticWritingConsent({ ...owner, adultAttested: true, accepted: true }), /AI_CONSENT_REQUIRED/u);
  const renewed = await privacy.saveDiagnosticWritingConsent({ ...owner, adultAttested: true, accepted: true, provider: 'deepseek' });
  assert.ok(renewed.version > first.version); assert.equal(renewed.accepted, true);
  assert.equal(await db.$transaction(tx => privacy.assertDiagnosticWritingAiConsent(tx, session.id, renewed.version)), renewed.version);
  const deepseekRun=await writing.queueDiagnosticWriting({sessionId:session.id,actorUserId:staff});
  assert.notEqual(deepseekRun.id,googleRun.id);assert.notEqual(deepseekRun.inputHash,googleRun.inputHash);
  const originalFetch=globalThis.fetch,originalKey=process.env.DEEPSEEK_API_KEY;
  let calls=0;process.env.DEEPSEEK_API_KEY='controlled-provider-test-key-only';
  globalThis.fetch=async(url,options)=>{
    calls++;assert.equal(String(url),'https://api.deepseek.com/chat/completions');
    const body=JSON.parse(String(options?.body));assert.equal(body.model,'deepseek-flash');
    assert.ok(!String(options?.body).includes('+213780000004'),'Contact details must not reach the provider');
    return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify({
      criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,rating:1,observation:'Develop supporting examples.',evidence:['A controlled response used for testing.']})),
      nextSteps:['Develop examples.'],limitations:['Controlled test, not provider calibration.'],
    })}}],usage:{prompt_tokens:12,completion_tokens:8}}),{status:200});
  };
  try{
    assert.deepEqual(await writing.processDiagnosticWriting(deepseekRun.id),{state:'SUCCEEDED'});
    assert.deepEqual(await writing.processDiagnosticWriting(deepseekRun.id),{state:'SUCCEEDED'});
    assert.equal(calls,1,'Completed deliveries must not spend another provider request');
    assert.equal((await db.diagnosticWritingRun.findUniqueOrThrow({where:{id:deepseekRun.id}})).model,'deepseek:deepseek-flash');
    assert.equal((await db.diagnosticAssessment.findUniqueOrThrow({where:{sessionId:session.id}})).state,'DRAFT','AI never releases the teacher report');
  }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=originalKey;}
  const records = await db.consentRecord.findMany({ where: { userId, acceptedFrom: `diagnostic-writing:${session.id}` } });
  assert.ok(records.some(r => r.policyVersion === 'diagnostic-writing-v2:deepseek' && r.action === 'ACCEPTED'));
  const secondInvite=await inviteReadiness({recipientId:userId,actorUserId:staff,cohort:'REVERSE_PROVIDER_TEST'});
  const second=await startReadiness({userId,invitationId:secondInvite.id,intake:{name:'Controlled participant',phone:'+213780000004',pathway:'ACADEMIC',targetBand:6.5,timeframe:'LATER',contactConsent:true}});
  await db.diagnosticSession.update({where:{id:second.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
  await privacy.saveDiagnosticWritingConsent({sessionId:second.id,userId,adultAttested:true,accepted:true,provider:'deepseek'});
  process.env.DIAGNOSTIC_WRITING_PROVIDER='gemini';
  assert.equal((await privacy.loadDiagnosticWritingConsent({sessionId:second.id,userId})).accepted,false,'DeepSeek-only consent must never authorize Google');
  await assert.rejects(db.$transaction(tx=>privacy.assertDiagnosticWritingAiConsent(tx,second.id)),/AI_CONSENT_REQUIRED/u);
  process.env.DIAGNOSTIC_WRITING_PROVIDER='deepseek';
  await privacy.saveDiagnosticWritingConsent({ ...owner, adultAttested: true, accepted: false, provider: 'deepseek' });
  await assert.rejects(db.$transaction(tx => privacy.assertDiagnosticWritingAiConsent(tx, session.id, renewed.version)), /AI_CONSENT_REQUIRED/u);
});
