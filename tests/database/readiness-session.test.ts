import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { diagnosticTestPrisma } from '../helpers/diagnostic-fixture';

test('authentic readiness delivery persists real content, enforces owners/leases and freezes Academic/GT intake', {
  skip: !process.env.TEST_DATABASE_URL ? 'TEST_DATABASE_URL required' : false,
}, async t=>{
  const url=process.env.TEST_DATABASE_URL!;
  assert.equal(new URL(url).port,'55322');
  process.env.DATABASE_URL=url;process.env.ENCRYPTION_KEY='11'.repeat(32);
  const prisma=diagnosticTestPrisma();t.after(()=>prisma.$disconnect());
  const staff=randomUUID(),owner=randomUUID(),other=randomUUID();
  for(const [id,role] of [[staff,'ADMIN'],[owner,'STUDENT'],[other,'STUDENT']] as const)
    await prisma.user.create({data:{id,email:`${id}@readiness-test.invalid`,role}});
  const file='../../src/lib/diagnostic/readiness-service';
  const service=await import(file).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});
  assert.ok(service,'native original readiness service missing');
  const {provisionReadinessPack,readinessPackHash}=await import('../../src/lib/diagnostic/readiness-provision');
  const {loadReadinessPack}=await import('../../src/lib/diagnostic/readiness-content');
  const priorKey=await prisma.answerKey.findFirst({where:{questionGroup:{testPart:{testSection:{testVersion:{contentHash:readinessPackHash(loadReadinessPack()),test:{externalId:'IELTSLAB_READINESS_V2_GENERAL_TRAINING'}}}}}},orderBy:{verifiedAt:'asc'},select:{verifiedById:true}});
  await assert.rejects(provisionReadinessPack(staff,false),e=>!!e&&typeof e==='object'&&'code' in e&&e.code==='CONTENT_NOT_READY');
  await provisionReadinessPack(staff,true);
  const invitation=await service.inviteReadiness({actorUserId:staff,recipientId:owner,cohort:'CEIL_AUTUMN_2026'});
  const intake={name:'Test Participant',phone:'+213780000001',pathway:'GENERAL_TRAINING',targetBand:6.5,timeframe:'ONE_TO_THREE_MONTHS',contactConsent:true};
  const code=(want:string)=>(e:unknown)=>!!e&&typeof e==='object'&&'code' in e&&e.code===want;
  await assert.rejects(service.startReadiness({userId:other,invitationId:invitation.id,intake}),code('NOT_FOUND'));
  const [a,b]=await Promise.all([service.startReadiness({userId:owner,invitationId:invitation.id,intake}),service.startReadiness({userId:owner,invitationId:invitation.id,intake})]);
  assert.equal(a.id,b.id);
  assert.equal(a.stage,'LISTENING');assert.equal(a.parts.flatMap((p:{items:unknown[]})=>p.items).length,12);
  assert.ok(!JSON.stringify(a).includes('answersByStableKey'));assert.ok(!JSON.stringify(a).includes('script'));
  await assert.rejects(service.loadReadiness({userId:other,sessionId:a.id}),code('NOT_FOUND'));
  const token='a'.repeat(43);await service.claimReadinessWriter({userId:owner,sessionId:a.id,token});
  await assert.rejects(service.claimReadinessWriter({userId:owner,sessionId:a.id,token:'b'.repeat(43)}),code('WRITER_CONFLICT'));
  const first=a.responses.find((r:{stableKey:string})=>r.stableKey==='L1');assert.ok(first);
  const save={userId:owner,sessionId:a.id,token,questionId:first.questionId,expectedVersion:0,answer:'12',markedForReview:false};
  const saved=await service.saveReadiness(save);assert.equal(saved.version,1);
  assert.equal((await service.saveReadiness(save)).version,1);
  await assert.rejects(service.saveReadiness({...save,answer:'5'}),code('RESPONSE_CONFLICT'));
  const resumed=await service.startReadiness({userId:owner,invitationId:invitation.id,intake:{...intake,pathway:'ACADEMIC'}});
  assert.equal(resumed.intake.pathway,'GENERAL_TRAINING');
  assert.equal(await prisma.entitlement.count({where:{userId:owner}}),0);
  assert.equal(await prisma.assessmentAttempt.count({where:{userId:owner}}),0);
  const canonical=await prisma.question.findUnique({where:{id:first.questionId},include:{questionGroup:{include:{answerKey:true}}}});
  assert.ok(canonical?.promptHtml?.includes('Dining table'));
  assert.equal(canonical?.questionGroup.answerKey?.sourceType,'HUMAN_VERIFIED');
  assert.equal(canonical?.questionGroup.answerKey?.verifiedById,priorKey?.verifiedById??staff,'repeat activation preserves the original staff verification');
  await t.test('old diagnostic lists never send a readiness invitation to the 60-minute runner',async()=>{
    const {listDiagnosticInvitations}=await import('../../src/lib/diagnostic/invitation-service');
    assert.ok(!(await listDiagnosticInvitations(owner)).some(i=>i.id===invitation.id));
  });
  await t.test('real core scores trigger one distinct extension; human release is versioned and owner-private',async()=>{
    const stored=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:a.id}});
    const manifest=stored.manifest as unknown as {itemIds:Record<string,string>;pack:{parts:Array<{id:string;items:Array<{id:string;answers:string[]}>}>}};
    const core=manifest.pack.parts.filter(p=>['listening-social','listening-research','reading-general'].includes(p.id));
    for(const p of core)for(const [index,q] of p.items.entries()) {
      // 12 Listening and 8 Reading: a hand-derived borderline/inconsistent profile.
      const answer=p.id==='reading-general'&&index>=8?'wrong':q.answers[0];
      await prisma.diagnosticResponse.update({where:{sessionId_questionId:{sessionId:a.id,questionId:manifest.itemIds[q.id]}},data:{answer,savedAt:new Date()}});
    }
    const start=new Date(Date.now()-26*60000-1000);
    await prisma.diagnosticSession.update({where:{id:a.id},data:{startedAt:start,deadline:new Date(start.getTime()+51*60000)}});
    const writing=await service.loadReadiness({userId:owner,sessionId:a.id});
    assert.equal(writing.stage,'WRITING');assert.equal(writing.extension,true);
    await assert.rejects(service.saveReadiness({...save,expectedVersion:1,answer:'18'}),code('SECTION_NOT_ACTIVE'));
    const extension=await service.finishReadiness({userId:owner,sessionId:a.id,token});
    assert.equal(extension.stage,'EXTENSION_LISTENING');assert.equal(extension.parts.flatMap((p:{items:unknown[]})=>p.items).length,7);
    assert.ok(extension.parts[0].items.every((q:{id:string})=>q.id.startsWith('EL')));
    const state=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:a.id}});
    const runtime=state.readiness as unknown as {intake:Prisma.InputJsonObject;extension:boolean;coreCompletedAt:string};
    runtime.coreCompletedAt=new Date(Date.now()-270000-1000).toISOString();
    await prisma.diagnosticSession.update({where:{id:a.id},data:{readiness:runtime,deadline:new Date(Date.parse(runtime.coreCompletedAt)+540000)}});
    const reading=await service.loadReadiness({userId:owner,sessionId:a.id});assert.equal(reading.stage,'EXTENSION_READING');
    assert.ok(reading.parts[0].items.every((q:{id:string})=>q.id.startsWith('EG')));
    const final=await service.finishReadiness({userId:owner,sessionId:a.id,token});assert.equal(final.state,'SUBMITTED');
    assert.equal((await service.finishReadiness({userId:owner,sessionId:a.id,token})).id,final.id);
    const view=(await service.readinessStaffView(staff,a.id))[0];assert.equal(view.scores.reading,8);assert.equal(view.scores.listening,12);
    assert.equal(view.scores.extensionListeningMaximum,7);assert.equal(view.scores.extensionReadingMaximum,5);
    const worker=await import('../../src/lib/diagnostic/writing-service');
    const consent=await import('../../src/lib/diagnostic/ai-consent-service');
    process.env.DIAGNOSTIC_AI_ENABLED='true';process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED='true';
    await assert.rejects(worker.queueDiagnosticWriting({sessionId:a.id,actorUserId:staff}),code('AI_CONSENT_REQUIRED'));
    await consent.saveDiagnosticWritingConsent({sessionId:a.id,userId:owner,adultAttested:true,accepted:true});
    await prisma.diagnosticResponse.update({where:{sessionId_questionId:{sessionId:a.id,questionId:manifest.itemIds.W1}},data:{answer:'I disagree. Preventive care can improve health.'}});
    const run=await worker.queueDiagnosticWriting({sessionId:a.id,actorUserId:staff});
    await worker.processDiagnosticWriting(run.id,async input=>{
      assert.equal(input.promptVersion,'readiness-task2-ratings-v1');
      return {feedback:{criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,rating:2,observation:'A clear position is present.',evidence:['I disagree.']})),nextSteps:['Develop examples.'],limitations:['Shortened 16-minute sample.']},model:'test-provider-only',usage:{inputTokens:1,outputTokens:1}};
    });
    assert.equal((await service.readinessStaffView(staff,a.id))[0].writingAi.run?.state,'SUCCEEDED');
    const speaking=await import('../../src/lib/diagnostic/speaking-service');
    const recording=await import('../../src/lib/diagnostic/recording-service');
    const analysis=await import('../../src/lib/diagnostic/analysis-service');
    const {encodeDiagnosticWav}=await import('../../src/lib/diagnostic/recording-core');
    const objects=new Map<string,Uint8Array>();
    const storage={assertPrivate:async()=>{},put:async(k:string,b:Uint8Array)=>{objects.set(k,b.slice());},get:async(k:string)=>objects.get(k)!,remove:async(keys:string[])=>{keys.forEach(k=>objects.delete(k));}};
    const interview={sessionId:a.id,actorUserId:staff};
    process.env.DIAGNOSTIC_RECORDING_ENABLED='true';
    await speaking.startDiagnosticSpeaking(interview);
    await speaking.saveDiagnosticSpeakingConsent({sessionId:a.id,userId:owner,adultAttested:true,recordingConsented:true,aiConsented:true});
    const capture=await recording.createDiagnosticRecording({...interview,participantConfirmed:true},storage);
    for(let sequence=0;sequence<6;sequence++)await recording.uploadDiagnosticChunk({...interview,recordingId:capture.id,sequence,bytes:encodeDiagnosticWav(new Float32Array(80000).fill(0.2))},storage);
    await recording.finalizeDiagnosticRecording({...interview,recordingId:capture.id,chunkCount:6},storage);
    await prisma.$executeRaw`UPDATE app_private."DiagnosticSpeakingSession" SET "startedAt"=now()-interval '7 minutes',deadline=now() WHERE "sessionId"=${a.id}::uuid`;
    await speaking.finishDiagnosticSpeaking({...interview,expectedVersion:(await speaking.loadDiagnosticSpeaking(interview)).version});
    const spoken=await analysis.queueDiagnosticSpeakingAnalysis(interview);
    assert.equal(spoken.promptVersion,'readiness-speaking-ratings-v1');
    await analysis.processDiagnosticSpeakingAnalysis(spoken.id,{storage,generate:async input=>{
      assert.equal(input.readinessRubric?.length,4);
      return {output:{segments:[{speaker:'CANDIDATE',startMs:0,endMs:1000,text:'I enjoy reading.',confidence:1}],criteria:['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'].map(criterion=>({criterion,observation:'A short response needs development.',insufficientEvidence:criterion==='PRONUNCIATION',evidence:criterion==='PRONUNCIATION'?[]:[{segmentIndex:0,startMs:0,endMs:1000,quotation:'I enjoy reading.',basis:'TRANSCRIPT'}]})),priorities:['Develop examples.'],limitations:['Short sample; pronunciation needs teacher review.'],audioQuality:{speechPresent:true,discontinuity:false,unreliableAttribution:false},readinessRatings:{FLUENCY_COHERENCE:1,LEXICAL_RESOURCE:1,GRAMMAR:1,PRONUNCIATION:null}},model:'test-provider-only',usage:{inputTokens:1,outputTokens:1}};
    }});
    await analysis.reviewDiagnosticSpeakingAnalysis({...interview,runId:spoken.id,expectedVersion:0,assignments:[{segmentIndex:0,speaker:'CANDIDATE'}]});
    assert.equal((await analysis.loadDiagnosticSpeakingReview(interview)).run?.output?.readinessRatings?.PRONUNCIATION,null);
    const marking={writing:[0,2,2,2],speaking:null,notes:'Develop a clear position and supporting examples before intensive preparation.',decision:null,overrideReason:'',expectedVersion:0,release:false,writingRunId:run.id};
    await assert.rejects(service.markReadiness({actorUserId:other,sessionId:a.id,marking}),code('STAFF_REQUIRED'));
    const reviewed=await service.markReadiness({actorUserId:staff,sessionId:a.id,marking});assert.equal(reviewed.readiness.decision,'FOUNDATION');
    assert.deepEqual(reviewed.readiness.writing,[0,2,2,2],'teacher ratings override the separate AI suggestions');
    assert.equal((await prisma.diagnosticAssessment.findUniqueOrThrow({where:{sessionId:a.id}})).writingRunId,run.id);
    assert.equal((await service.loadReadiness({userId:owner,sessionId:a.id})).report,null);
    await assert.rejects(service.markReadiness({actorUserId:staff,sessionId:a.id,marking}),code('ASSESSMENT_CONFLICT'));
    const released=await service.markReadiness({actorUserId:staff,sessionId:a.id,marking:{...marking,speaking:[2,2,2,1],speakingRunId:spoken.id,expectedVersion:1,release:true}});assert.equal(released.state,'RELEASED');
    assert.deepEqual(released.readiness.speaking,[2,2,2,1],'teacher edits and manual pronunciation remain authoritative');
    assert.equal((await service.loadReadiness({userId:owner,sessionId:a.id})).report.decision,'FOUNDATION');
  });
});
