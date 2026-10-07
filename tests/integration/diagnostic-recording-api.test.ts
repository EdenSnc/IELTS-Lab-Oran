import assert from 'node:assert/strict';
import test from 'node:test';
import {diagnosticFixture,diagnosticTestPrisma} from '../helpers/diagnostic-fixture';
test('diagnostic recording API denies anonymous/non-AAL2/cross-site capture and bounds streamed upload bytes',{
 skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
 const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());t.after(()=>{delete process.env.SPEAKING_DEV_AUTH_USER_ID;delete process.env.STAFF_MFA_DEV_AAL2;});
 const f=await diagnosticFixture();
 const create=await import('../../src/app/api/diagnostic/sessions/[sessionId]/speaking/recordings/route');
 const chunks=await import('../../src/app/api/diagnostic/sessions/[sessionId]/speaking/recordings/[recordingId]/chunks/[sequence]/route');
 const url='https://diagnostic.synthetic.invalid/api/diagnostic/recordings';
 const req=(body:unknown,origin='https://diagnostic.synthetic.invalid')=>new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const context={params:Promise.resolve({sessionId:f.blueprint})};
 delete process.env.SPEAKING_DEV_AUTH_USER_ID;assert.equal((await create.POST(req({participantConfirmed:true}),context)).status,401);
 process.env.SPEAKING_DEV_AUTH_USER_ID=f.owner;assert.equal((await create.POST(req({participantConfirmed:true}),context)).status,403);
 process.env.SPEAKING_DEV_AUTH_USER_ID=f.staff;assert.equal((await create.POST(req({participantConfirmed:true}),context)).status,403);
 process.env.STAFF_MFA_DEV_AAL2='true';assert.equal((await create.POST(req({participantConfirmed:true},'https://evil.invalid'),context)).status,403);
 assert.equal((await create.POST(req({participantConfirmed:true,consent:true}),context)).status,400);
 const uploadContext={params:Promise.resolve({sessionId:f.blueprint,recordingId:f.version,sequence:'0'})};
 const oversized=new Request(url,{method:'PUT',headers:{origin:'https://diagnostic.synthetic.invalid','content-type':'audio/wav'},body:new Uint8Array(160045)});
 assert.equal((await chunks.PUT(oversized,uploadContext)).status,413);
});
