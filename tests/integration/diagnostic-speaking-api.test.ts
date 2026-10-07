import assert from 'node:assert/strict';
import test from 'node:test';
import {diagnosticFixture,diagnosticTestPrisma} from '../helpers/diagnostic-fixture';
test('Speaking consent is owner-only; all examiner controls require staff AAL2 and reject forged clock input',{
  skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
  const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());t.after(()=>{delete process.env.SPEAKING_DEV_AUTH_USER_ID;delete process.env.STAFF_MFA_DEV_AAL2;});
  const fixture=await diagnosticFixture();
  const {issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
  const {createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
  const invite=await issueDiagnosticInvitation({recipientId:fixture.owner,blueprintId:fixture.blueprint,actorUserId:fixture.staff});
  const written=await createDiagnosticSession({invitationId:invite.id,userId:fixture.owner});
  await db.diagnosticResponse.updateMany({where:{sessionId:written.id},data:{finalizedAt:new Date()}});
  await db.diagnosticSession.update({where:{id:written.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
  const owner=await import('../../src/app/api/diagnostic/sessions/[sessionId]/speaking/route');
  const staff=await import('../../src/app/api/diagnostic/sessions/[sessionId]/speaking/staff/route');
  const context={params:Promise.resolve({sessionId:written.id})};
  const req=(body?:unknown,origin='https://diag.synthetic.invalid')=>new Request('https://diag.synthetic.invalid/api/diagnostic/speaking',{
    method:body?'POST':'GET',headers:{origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),
  });
  process.env.SPEAKING_DEV_AUTH_USER_ID=fixture.stranger;assert.equal((await owner.GET(req(),context)).status,404);
  process.env.SPEAKING_DEV_AUTH_USER_ID=fixture.owner;assert.equal((await owner.GET(req(),context)).status,200);
  assert.equal((await staff.POST(req({action:'start'}),context)).status,403);
  assert.equal((await owner.POST(req({adultAttested:false,recordingConsented:true,aiConsented:false}),context)).status,400);
  assert.equal((await owner.POST(req({adultAttested:true,recordingConsented:true,aiConsented:true},'https://evil.invalid'),context)).status,403);
  process.env.SPEAKING_DEV_AUTH_USER_ID=fixture.staff;assert.equal((await staff.POST(req({action:'start'}),context)).status,403);
  process.env.STAFF_MFA_DEV_AAL2='true';
  assert.equal((await staff.GET(req(),context)).status,200);
  assert.equal((await staff.POST(req({action:'start',startedAt:'2000-01-01'}),context)).status,400);
  const started=await staff.POST(req({action:'start'}),context);assert.equal(started.status,200);
  const data=await started.json();assert.equal(data.eligibility.canRecord,false);
  assert.equal((await staff.POST(req({action:'finish',expectedVersion:data.version}),context)).status,409);
  assert.equal((await staff.POST(req({action:'notes',expectedVersion:data.version,notes:'private examiner notes'}),context)).status,200);
  process.env.SPEAKING_DEV_AUTH_USER_ID=fixture.owner;
  const viewed=await owner.GET(req(),context);assert.ok(!/notes|examinerId/u.test(JSON.stringify(await viewed.json())));
});
