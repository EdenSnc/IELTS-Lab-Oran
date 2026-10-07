import assert from 'node:assert/strict';
import test from 'node:test';
import{diagnosticFixture,diagnosticTestPrisma}from'../helpers/diagnostic-fixture';
test('diagnostic writing AI is default-off, adult opt-in scoped, and withdrawal fences an in-flight result',{
 skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';process.env.ENCRYPTION_KEY='11'.repeat(32);
 t.after(()=>{delete process.env.DIAGNOSTIC_AI_ENABLED;delete process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED;});
 const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());const f=await diagnosticFixture({scoringKeys:true});
 const{issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
 const{createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
 const privacy=await import('../../src/lib/diagnostic/ai-consent-service');
 const writing=await import('../../src/lib/diagnostic/writing-service');
 const invitation=await issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
 const session=await createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
 await db.diagnosticResponse.updateMany({where:{sessionId:session.id},data:{answer:'A submitted synthetic essay for controlled testing only.',finalizedAt:new Date()}});
 await db.diagnosticSession.update({where:{id:session.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
 const staff={sessionId:session.id,actorUserId:f.staff},owner={sessionId:session.id,userId:f.owner};
 await assert.rejects(writing.queueDiagnosticWriting(staff),/AI_UNAVAILABLE/u);
 process.env.DIAGNOSTIC_AI_ENABLED='true';process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED='true';
 await assert.rejects(writing.queueDiagnosticWriting(staff),/AI_CONSENT_REQUIRED/u);
 await assert.rejects(privacy.saveDiagnosticWritingConsent({...owner,adultAttested:false,accepted:true}),/AI_CONSENT_REQUIRED/u);
 await assert.rejects(privacy.saveDiagnosticWritingConsent({...owner,userId:f.stranger,adultAttested:true,accepted:true}),/NOT_FOUND/u);
 const consent=await privacy.saveDiagnosticWritingConsent({...owner,adultAttested:true,accepted:true});
 assert.equal(consent.accepted,true);
 const staleInvitation=await issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
 const staleSession=await createDiagnosticSession({invitationId:staleInvitation.id,userId:f.owner});
 await db.diagnosticResponse.updateMany({where:{sessionId:staleSession.id},data:{answer:'Synthetic response.',finalizedAt:new Date()}});
 await db.diagnosticSession.update({where:{id:staleSession.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
 await privacy.saveDiagnosticWritingConsent({sessionId:staleSession.id,userId:f.owner,adultAttested:true,accepted:true});
 const staleRun=await writing.queueDiagnosticWriting({sessionId:staleSession.id,actorUserId:f.staff});
 await db.diagnosticWritingRun.update({where:{id:staleRun.id},data:{createdAt:new Date(Date.now()-30*86400000)}});
 let staleCalls=0;assert.deepEqual(await writing.processDiagnosticWriting(staleRun.id,async()=>{staleCalls++;throw new Error('Expired data must never reach a provider');}),{state:'CANCELLED'});
 assert.equal(staleCalls,0);assert.equal((await db.diagnosticWritingRun.findUniqueOrThrow({where:{id:staleRun.id}})).errorCode,'RETENTION_EXPIRED');
 const run=await writing.queueDiagnosticWriting(staff);let began!:()=>void,resume!:()=>void;
 const started=new Promise<void>(resolve=>{began=resolve;}),wait=new Promise<void>(resolve=>{resume=resolve;});
 const processing=writing.processDiagnosticWriting(run.id,async()=>{began();await wait;return{
  feedback:{criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,observation:'Synthetic draft',evidence:[]})),nextSteps:[],limitations:['Controlled fixture']},
  model:'synthetic-only',usage:{inputTokens:1,outputTokens:1}};});
 await started;await privacy.saveDiagnosticWritingConsent({...owner,adultAttested:true,accepted:false});resume();
 assert.deepEqual(await processing,{state:'CANCELLED'});
 const cancelled=await db.diagnosticWritingRun.findUniqueOrThrow({where:{id:run.id}});
 assert.equal(cancelled.feedback,null);assert.equal(cancelled.leaseOwner,null);
 await assert.rejects(writing.queueDiagnosticWriting(staff),/AI_CONSENT_REQUIRED/u);
});
