import assert from'node:assert/strict';
import test from'node:test';
import{Client}from'pg';
import{diagnosticFixture,diagnosticTestPrisma}from'../helpers/diagnostic-fixture';
test('diagnostic retention clears 30-day private notes/AI and 90-day feedback without extending access',{
 skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
 const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());const sql=new Client({connectionString:process.env.TEST_DATABASE_URL});await sql.connect();t.after(()=>sql.end());
 const f=await diagnosticFixture();const{issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
 const{createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
 const retention=await import('../../src/lib/diagnostic/retention-service');
 const invite=await issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});const s=await createDiagnosticSession({invitationId:invite.id,userId:f.owner});
 const {manifestHash}=await db.diagnosticSession.findUniqueOrThrow({where:{id:s.id},select:{manifestHash:true}});
 await sql.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=now() WHERE id=$1`,[s.id]);
 await sql.query(`INSERT INTO app_private."DiagnosticSpeakingSession" ("sessionId","examinerId",state,"startedAt",deadline,"completedAt",notes)
 VALUES($1,$2,'COMPLETED',now()-interval '31 days',now()-interval '31 days'+interval '7 minutes',now()-interval '30 days','Private expired notes')`,[s.id,f.staff]);
 const releasedAt=new Date(Date.now()-91*86400000),expiresAt=new Date(releasedAt.getTime()+90*86400000);
 const report=await db.diagnosticAssessment.create({data:{sessionId:s.id,manifestHash,state:'RELEASED',rawScores:[{rawScore:2}],writing:{private:'expired'},speaking:{private:'expired'},nextSteps:['expired'],reviewedById:f.staff,releasedAt,expiresAt}});
 const run=await db.diagnosticWritingRun.create({data:{sessionId:s.id,manifestHash,inputHash:'a'.repeat(64),promptVersion:'synthetic-retention',state:'RUNNING',createdAt:new Date(Date.now()-31*86400000),leaseOwner:f.staff,leaseExpiresAt:new Date(Date.now()+60000),feedback:{private:'expired'}}});
 await retention.runDiagnosticRetention({assertPrivate:async()=>{},put:async()=>{},get:async()=>new Uint8Array(),remove:async()=>{}});
 const saved=await db.diagnosticAssessment.findUniqueOrThrow({where:{id:report.id}});
 assert.equal(saved.state,'EXPIRED');assert.equal(saved.writing,null);assert.equal(saved.speaking,null);assert.deepEqual(saved.rawScores,[]);
 assert.equal(saved.expiresAt!.getTime(),report.expiresAt!.getTime());
 assert.equal((await db.diagnosticSpeakingSession.findUniqueOrThrow({where:{sessionId:s.id}})).notes,'');
 const cleared=await db.diagnosticWritingRun.findUniqueOrThrow({where:{id:run.id}});assert.equal(cleared.state,'CANCELLED');assert.equal(cleared.feedback,null);assert.equal(cleared.leaseOwner,null);
 await retention.runDiagnosticRetention({assertPrivate:async()=>{},put:async()=>{},get:async()=>new Uint8Array(),remove:async()=>{}});
 assert.equal((await db.diagnosticAssessment.findUniqueOrThrow({where:{id:report.id}})).version,saved.version);
});
