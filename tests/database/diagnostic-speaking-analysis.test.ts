import assert from 'node:assert/strict';
import test from 'node:test';
import {diagnosticFixture,diagnosticTestPrisma} from '../helpers/diagnostic-fixture';
import {encodeDiagnosticWav} from '../../src/lib/diagnostic/recording-core';

const output=()=>({segments:[{speaker:'CANDIDATE',startMs:1000,endMs:6000,text:'I choose a quiet place to study.',confidence:0.8}],
 criteria:['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'].map(criterion=>({criterion,observation:'A developed response.',insufficientEvidence:false,
 evidence:[{segmentIndex:0,startMs:1000,endMs:6000,quotation:'a quiet place',basis:criterion==='PRONUNCIATION'?'AUDIO':'TRANSCRIPT'}]})),
 priorities:['Extend the example.'],limitations:['Short diagnostic.'],audioQuality:{speechPresent:true,discontinuity:false,unreliableAttribution:false}});
test('Speaking analysis is durable, single-claimed, examiner-reviewed and fenced by consent and retention',{
 skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';process.env.ENCRYPTION_KEY='11'.repeat(32);
 t.after(()=>{delete process.env.DIAGNOSTIC_RECORDING_ENABLED;delete process.env.DIAGNOSTIC_AI_ENABLED;delete process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED;});
 const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());const f=await diagnosticFixture({scoringKeys:true});
 const invitations=await import('../../src/lib/diagnostic/invitation-service'),sessions=await import('../../src/lib/diagnostic/session-service');
 const speaking=await import('../../src/lib/diagnostic/speaking-service'),recording=await import('../../src/lib/diagnostic/recording-service');
 const analysis=await import('../../src/lib/diagnostic/analysis-service');
 const objects=new Map<string,Uint8Array>();
 const storage={assertPrivate:async()=>{},put:async(key:string,bytes:Uint8Array)=>{objects.set(key,bytes.slice());},get:async(key:string)=>objects.get(key)!,remove:async(keys:string[])=>{keys.forEach(key=>objects.delete(key));}};
 const prepare=async(silent=false)=>{
  const invitation=await invitations.issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
  const session=await sessions.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
  await db.diagnosticResponse.updateMany({where:{sessionId:session.id},data:{finalizedAt:new Date()}});
  await db.diagnosticSession.update({where:{id:session.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
  const staff={sessionId:session.id,actorUserId:f.staff},owner={sessionId:session.id,userId:f.owner};
  await speaking.startDiagnosticSpeaking(staff);await speaking.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:true,aiConsented:true});
  process.env.DIAGNOSTIC_RECORDING_ENABLED='true';const capture=await recording.createDiagnosticRecording({...staff,participantConfirmed:true},storage);
  for(let sequence=0;sequence<6;sequence++)await recording.uploadDiagnosticChunk({...staff,recordingId:capture.id,sequence,bytes:encodeDiagnosticWav(new Float32Array(80000).fill(silent?0:0.2))},storage);
  await recording.finalizeDiagnosticRecording({...staff,recordingId:capture.id,chunkCount:6},storage);
  await db.$executeRaw`UPDATE app_private."DiagnosticSpeakingSession" SET "startedAt"=now()-interval '7 minutes',deadline=now() WHERE "sessionId"=${session.id}::uuid`;
  await speaking.finishDiagnosticSpeaking({...staff,expectedVersion:(await speaking.loadDiagnosticSpeaking(staff)).version});
  return{staff,owner,capture};
 };
 const f1=await prepare();await assert.rejects(analysis.queueDiagnosticSpeakingAnalysis(f1.staff),/AI_UNAVAILABLE/u);
 process.env.DIAGNOSTIC_AI_ENABLED='true';process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED='true';
 await assert.rejects(analysis.queueDiagnosticSpeakingAnalysis({...f1.staff,actorUserId:f.stranger}),/STAFF_REQUIRED/u);
 const run=await analysis.queueDiagnosticSpeakingAnalysis(f1.staff);assert.equal((await analysis.queueDiagnosticSpeakingAnalysis(f1.staff)).id,run.id);
 await assert.rejects(analysis.publishDiagnosticSpeakingAnalysis(run.id,async()=>{throw new Error('Synthetic delivery outage');}),/Synthetic delivery outage/u);
 assert.equal((await db.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:run.id}})).state,'QUEUED');
 let began!:()=>void,resume!:()=>void,calls=0;const begun=new Promise<void>(resolve=>{began=resolve;}),wait=new Promise<void>(resolve=>{resume=resolve;});
 const processing=analysis.processDiagnosticSpeakingAnalysis(run.id,{storage,generate:async(input)=>{
  calls++;assert.equal(input.audio.length,960044);assert.equal(input.durationMs,30000);began();await wait;
  return{output:output(),model:'synthetic-test-only',usage:{inputTokens:1,outputTokens:1}};
 }});
 await begun;assert.deepEqual(await analysis.processDiagnosticSpeakingAnalysis(run.id,{storage,generate:async()=>{throw new Error('Duplicate worker must not call AI');}}),{state:'RUNNING'});
 resume();assert.deepEqual(await processing,{state:'SUCCEEDED'});assert.equal(calls,1);
 assert.deepEqual(await analysis.processDiagnosticSpeakingAnalysis(run.id,{storage,generate:async()=>{throw new Error('Replay must not call AI');}}),{state:'SUCCEEDED'});
 const view=await analysis.loadDiagnosticSpeakingReview(f1.staff);assert.equal(view.run!.reviewed,false);assert.equal(view.run!.output!.segments.length,1);
 const assessments=await import('../../src/lib/diagnostic/assessment-service');
 const edit={...f1.staff,expectedVersion:0,speakingRunId:run.id,
  writing:{criteria:(['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'] as const).map(criterion=>({criterion,observation:'Insufficient written evidence.',evidence:[]})),nextSteps:[],limitations:['Short diagnostic.']},
  speaking:{observations:['Examiner-reviewed response.'],nextSteps:[],limitations:['Short in-person diagnostic.']},nextSteps:[]};
 await assert.rejects(assessments.saveDiagnosticAssessment(edit),/INVALID_RESPONSE/u);
 await assert.rejects(analysis.reviewDiagnosticSpeakingAnalysis({...f1.staff,runId:run.id,expectedVersion:0,assignments:[{segmentIndex:0,speaker:'EXAMINER'}]}),/INVALID_RESPONSE/u);
 const reviewed=await analysis.reviewDiagnosticSpeakingAnalysis({...f1.staff,runId:run.id,expectedVersion:0,assignments:[{segmentIndex:0,speaker:'CANDIDATE'}]});
 assert.equal(reviewed.version,1);assert.equal((await analysis.loadDiagnosticSpeakingReview(f1.staff)).run!.reviewed,true);
 const saved=await assessments.saveDiagnosticAssessment(edit);assert.equal(saved.speakingRunId,run.id);
 assert.equal((await db.diagnosticAssessment.findUniqueOrThrow({where:{sessionId:f1.staff.sessionId}})).state,'DRAFT');
 await assert.rejects(analysis.reviewDiagnosticSpeakingAnalysis({...f1.staff,runId:run.id,expectedVersion:0,assignments:[{segmentIndex:0,speaker:'CANDIDATE'}]}),/ASSESSMENT_CONFLICT/u);
 const pending=await prepare(),pendingRun=await analysis.queueDiagnosticSpeakingAnalysis(pending.staff);
 let blocked!:()=>void,proceed!:()=>void;const blockedPromise=new Promise<void>(resolve=>{blocked=resolve;}),proceedPromise=new Promise<void>(resolve=>{proceed=resolve;});
 const late=analysis.processDiagnosticSpeakingAnalysis(pendingRun.id,{storage,generate:async()=>{blocked();await proceedPromise;return{output:output(),model:'synthetic-test-only',usage:{inputTokens:1,outputTokens:1}};}});
 await blockedPromise;await speaking.saveDiagnosticSpeakingConsent({...pending.owner,adultAttested:true,recordingConsented:false,aiConsented:false});proceed();
 assert.deepEqual(await late,{state:'CANCELLED'});assert.equal((await db.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:pendingRun.id}})).output,null);
 await assert.rejects(analysis.queueDiagnosticSpeakingAnalysis(pending.staff),/AI_CONSENT_REQUIRED/u);
 const expired=await prepare(),expiredRun=await analysis.queueDiagnosticSpeakingAnalysis(expired.staff);
 await db.$executeRaw`UPDATE app_private."DiagnosticRecording" SET "createdAt"=now()-interval '31 days',"expiresAt"=now()-interval '1 day' WHERE id=${expired.capture.id}::uuid`;
 assert.deepEqual(await analysis.processDiagnosticSpeakingAnalysis(expiredRun.id,{storage,generate:async()=>{throw new Error('Expired data must never leave the server');}}),{state:'CANCELLED'});
 await speaking.saveDiagnosticSpeakingConsent({...f1.owner,adultAttested:true,recordingConsented:false,aiConsented:false});
 const erased=await db.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:run.id}});assert.equal(erased.output,null);assert.equal(erased.review,null);
 const silent=await prepare(true),silentRun=await analysis.queueDiagnosticSpeakingAnalysis(silent.staff);
 assert.deepEqual(await analysis.processDiagnosticSpeakingAnalysis(silentRun.id,{storage,generate:async()=>{throw new Error('Silent PCM must not be sent to an AI that could hallucinate speech');}}),{state:'SUCCEEDED'});
 const noSignal=await db.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:silentRun.id}});assert.equal(noSignal.model,'no-signal');
 assert.deepEqual((await analysis.loadDiagnosticSpeakingReview(silent.staff)).run!.output!.segments,[]);
});
