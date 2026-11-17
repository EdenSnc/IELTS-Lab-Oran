import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { diagnosticFixture,diagnosticTestPrisma } from '../helpers/diagnostic-fixture';
import { hashFrozenManifestPayload } from '../../src/lib/attempts/manifest-core';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('standalone diagnostic services enforce account invitations, atomic start, immutable content and ordered writer saves', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async (t) => {
  process.env.DATABASE_URL=databaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55321';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
  process.env.ENCRYPTION_KEY='11'.repeat(32);
  const client=new Client({connectionString:databaseUrl});await client.connect();
  t.after(()=>client.end());
  const table=(await client.query(`SELECT to_regclass('app_private."DiagnosticSession"') AS table`)).rows[0].table;
  assert.ok(table,'DiagnosticSession persistence must exist before starting an invitation');
  const prisma=diagnosticTestPrisma();
  t.after(()=>prisma.$disconnect());
  const invitationService=await import('../../src/lib/diagnostic/invitation-service');
  const service=await import('../../src/lib/diagnostic/session-service');
  const f=await diagnosticFixture();
  const issue=()=>invitationService.issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
  const error=(code:string)=>(e:unknown)=>!!e && typeof e==='object' && 'code' in e && e.code===code;
  try {
    await t.test('student cannot issue or revoke; staff actions are audited',async()=>{
      await assert.rejects(invitationService.issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.owner}),error('STAFF_REQUIRED'));
      const invite=await issue();
      assert.equal(Date.parse(invite.expiresAt)-Date.parse(invite.createdAt),7*86400000);
      await assert.rejects(invitationService.revokeDiagnosticInvitation({invitationId:invite.id,actorUserId:f.owner,reason:'No'}),error('STAFF_REQUIRED'));
      await invitationService.revokeDiagnosticInvitation({invitationId:invite.id,actorUserId:f.staff,reason:'Synthetic cancellation'});
      await assert.rejects(service.createDiagnosticSession({invitationId:invite.id,userId:f.owner}),error('INVITATION_UNAVAILABLE'));
      assert.equal(await prisma.staffActionAudit.count({where:{targetId:invite.id}}),2);
      const ownerList=await invitationService.listDiagnosticInvitations(f.owner);
      assert.equal(ownerList.find(i=>i.id===invite.id)?.status,'REVOKED');
      assert.deepEqual(await invitationService.listDiagnosticInvitations(f.stranger),[]);
      await prisma.user.update({where:{id:f.staff},data:{role:'STUDENT'}});
      await assert.rejects(issue(),error('STAFF_REQUIRED'));
      await prisma.user.update({where:{id:f.staff},data:{role:'ADMIN'}});
    });
    await t.test('expired and wrong-owner invitations cannot start',async()=>{
      const invite=await issue();
      await assert.rejects(service.createDiagnosticSession({invitationId:invite.id,userId:f.stranger}),error('NOT_FOUND'));
      await client.query(`UPDATE app_private."DiagnosticInvitation" SET "createdAt"=now()-interval '8 days',"expiresAt"=now()-interval '1 day' WHERE id=$1`,[invite.id]);
      await assert.rejects(service.createDiagnosticSession({invitationId:invite.id,userId:f.owner}),error('INVITATION_UNAVAILABLE'));
    });
    await t.test('materialization failure rolls the entire start back and later retry creates all slots',async()=>{
      const invitation=await issue();const suffix=randomUUID().replaceAll('-','');
      const fn=`synthetic_failure_${suffix}`;
      await client.query(`CREATE FUNCTION app_private."${fn}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM app_private."DiagnosticSession" WHERE id=NEW."sessionId" AND "invitationId"='${invitation.id}'::uuid) THEN RAISE EXCEPTION 'SYNTHETIC materialization failure' USING ERRCODE='55000'; END IF; RETURN NEW; END $$`);
      await client.query(`CREATE TRIGGER "${fn}" BEFORE INSERT ON app_private."DiagnosticResponse" FOR EACH ROW EXECUTE FUNCTION app_private."${fn}"()`);
      try {
        await assert.rejects(service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner}),/SYNTHETIC materialization failure/);
        assert.equal(await prisma.diagnosticSession.count({where:{invitationId:invitation.id}}),0);
      } finally {
        await client.query(`DROP TRIGGER "${fn}" ON app_private."DiagnosticResponse"`);
        await client.query(`DROP FUNCTION app_private."${fn}"()`);
      }
      const recovered=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      assert.equal(recovered.responses.length,34);assert.equal(await prisma.diagnosticSession.count({where:{invitationId:invitation.id}}),1);
    });
    await t.test('real SQLSTATE serialization failure is retried without duplicate consumption',async()=>{
      const invitation=await issue();const suffix=randomUUID().replaceAll('-','');
      const fn=`synthetic_retry_${suffix}`,seq=`synthetic_seq_${suffix}`;
      await client.query(`CREATE SEQUENCE app_private."${seq}"`);
      await client.query(`CREATE FUNCTION app_private."${fn}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."invitationId"='${invitation.id}'::uuid AND nextval('app_private."${seq}"')=1 THEN RAISE EXCEPTION 'SYNTHETIC serialization failure' USING ERRCODE='40001'; END IF; RETURN NEW; END $$`);
      await client.query(`CREATE TRIGGER "${fn}" BEFORE INSERT ON app_private."DiagnosticSession" FOR EACH ROW EXECUTE FUNCTION app_private."${fn}"()`);
      try {
        const recovered=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
        assert.equal(recovered.responses.length,34);assert.equal(await prisma.diagnosticSession.count({where:{invitationId:invitation.id}}),1);
        assert.equal((await client.query(`SELECT last_value FROM app_private."${seq}"`)).rows[0].last_value,'2');
      } finally {
        await client.query(`DROP TRIGGER "${fn}" ON app_private."DiagnosticSession"`);
        await client.query(`DROP FUNCTION app_private."${fn}"()`);await client.query(`DROP SEQUENCE app_private."${seq}"`);
      }
    });
    const invite=await issue();
    const [session,replay]=await Promise.all([service.createDiagnosticSession({invitationId:invite.id,userId:f.owner}),service.createDiagnosticSession({invitationId:invite.id,userId:f.owner})]);
    await t.test('simultaneous start converges on one complete session and leaves the paid engine untouched',async()=>{
      assert.equal(session.id,replay.id);assert.equal(session.responses.length,34);
      assert.equal(Date.parse(session.deadline)-Date.parse(session.startedAt),3600000);
      assert.equal(await prisma.diagnosticSession.count({where:{invitationId:invite.id}}),1);
      assert.equal(await prisma.assessmentAttempt.count({where:{userId:f.owner}}),0);
      assert.equal(await prisma.entitlement.count({where:{userId:f.owner}}),0);
      assert.equal(await prisma.deviceSlot.count({where:{userId:f.owner}}),0);
      assert.equal(await prisma.assessmentAttempt.findUnique({where:{id:session.id}}),null);
      await client.query(`UPDATE app_private."DiagnosticInvitation" SET "createdAt"=now()-interval '8 days',"expiresAt"=now()-interval '1 day' WHERE id=$1`,[invite.id]);
      assert.equal((await service.createDiagnosticSession({invitationId:invite.id,userId:f.owner})).deadline,session.deadline);
      assert.ok(!/reviewerId|storageKey|encryptedPayload|manifest|writerTokenHash/.test(JSON.stringify(session)));
      await assert.rejects(service.loadDiagnosticSession({sessionId:session.id,userId:f.stranger}),error('NOT_FOUND'));
      await assert.rejects(service.acquireDiagnosticWriter({sessionId:session.id,userId:f.stranger}),error('NOT_FOUND'));
      await assert.rejects(service.submitDiagnosticSession({sessionId:session.id,userId:f.stranger,writerToken:''}),error('NOT_FOUND'));
    });
    await t.test('SQL enforces account linkage, complete hashes, chronology and positive durations',async()=>{
      await assert.rejects(client.query(`UPDATE app_private."DiagnosticSession" SET "userId"=$2 WHERE id=$1`,[session.id,f.stranger]),(e:NodeJS.ErrnoException)=>e.code==='23503');
      await assert.rejects(client.query(`UPDATE app_private."DiagnosticSession" SET deadline="startedAt" WHERE id=$1`,[session.id]),(e:NodeJS.ErrnoException)=>e.code==='23514');
      await assert.rejects(client.query(`UPDATE app_private."DiagnosticSession" SET "writerTokenHash"=repeat('a',64),"writerExpiresAt"=NULL WHERE id=$1`,[session.id]),(e:NodeJS.ErrnoException)=>e.code==='23514');
    });
    await t.test('SQL rejects incomplete reviewed audio facts',async()=>{
      await client.query('BEGIN');
      try {
      await assert.rejects(client.query(`INSERT INTO app_private."DiagnosticContentReview" ("testPartId","contentHash","reviewerId","reviewedAt","reviewDueAt",suitability,"audioAssetId","audioBoundariesVerified") VALUES ($1,repeat('a',64),$2,now(),now()+interval '1 day','HARDER_LISTENING',$3,true)`,[f.partIds[0],f.staff,f.assetIds[0]]),(e:NodeJS.ErrnoException)=>e.code==='23514');
      } finally {await client.query('ROLLBACK');}
    });
    await t.test('SQL requires an actual submission timestamp for terminal state',async()=>{
      await client.query('BEGIN');
      try {
        await assert.rejects(client.query(`UPDATE app_private."DiagnosticSession" SET state='SUBMITTED',"submittedAt"=NULL WHERE id=$1`,[session.id]),(e:NodeJS.ErrnoException)=>e.code==='23514');
      } finally {await client.query('ROLLBACK');}
    });
    let writer=await service.acquireDiagnosticWriter({sessionId:session.id,userId:f.owner});
    await t.test('a lost writer issuance acknowledgement can retry its persisted claim without waiting out the lease',async()=>{
      const invitation=await issue();const active=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      const claimToken=Buffer.alloc(32,42).toString('base64url');
      await service.acquireDiagnosticWriter({sessionId:active.id,userId:f.owner,claimToken});
      const recovered=await service.acquireDiagnosticWriter({sessionId:active.id,userId:f.owner,claimToken});
      assert.equal(recovered.writerToken,claimToken);assert.equal(recovered.session.deadline,active.deadline);
      await assert.rejects(service.acquireDiagnosticWriter({sessionId:active.id,userId:f.owner,claimToken:Buffer.alloc(32,43).toString('base64url')}),error('WRITER_CONFLICT'));
      await assert.rejects(service.acquireDiagnosticWriter({sessionId:active.id,userId:f.stranger,claimToken}),error('NOT_FOUND'));
    });
    await t.test('writer conflicts, heartbeat and expiry recovery never shift deadline',async()=>{
      assert.equal(Buffer.from(writer.writerToken,'base64url').length,32);
      await assert.rejects(service.acquireDiagnosticWriter({sessionId:session.id,userId:f.owner}),error('WRITER_CONFLICT'));
      const renewed=await service.acquireDiagnosticWriter({sessionId:session.id,userId:f.owner,previousToken:writer.writerToken});
      assert.equal(renewed.writerToken,writer.writerToken);assert.equal(renewed.session.deadline,session.deadline);
      await client.query(`UPDATE app_private."DiagnosticSession" SET "writerExpiresAt"="startedAt" WHERE id=$1`,[session.id]);
      const previous=writer.writerToken;writer=await service.acquireDiagnosticWriter({sessionId:session.id,userId:f.owner});
      assert.notEqual(writer.writerToken,previous);assert.equal(writer.session.deadline,session.deadline);
      await assert.rejects(service.saveDiagnosticResponse({sessionId:session.id,userId:f.owner,writerToken:previous,questionId:f.questionIds[0],expectedVersion:0,answer:'old tab',markedForReview:false}),error('WRITER_REQUIRED'));
    });
    const save={sessionId:session.id,userId:f.owner,writerToken:writer.writerToken,questionId:f.questionIds[0],expectedVersion:0,answer:'Unicode العربية 🦉 <script>text</script>',markedForReview:true};
    await t.test('acknowledged revisions reject conflicting stale saves but accept identical retries',async()=>{
      const first=await service.saveDiagnosticResponse(save);assert.equal(first.version,1);assert.equal(first.answer,save.answer);
      const duplicate=await service.saveDiagnosticResponse(save);assert.deepEqual(duplicate,first);
      await assert.rejects(service.saveDiagnosticResponse({...save,answer:'stale'}),error('RESPONSE_CONFLICT'));
      await assert.rejects(service.saveDiagnosticResponse({...save,expectedVersion:1,answer:'x'.repeat(20001)}),error('INVALID_RESPONSE'));
      await assert.rejects(service.saveDiagnosticResponse({...save,questionId:f.questionIds[20]}),error('SECTION_NOT_ACTIVE'));
      assert.equal((await service.loadDiagnosticSession({sessionId:session.id,userId:f.owner})).responses.find(r=>r.questionId===save.questionId)?.answer,save.answer);
      await assert.rejects(service.saveDiagnosticResponse({...save,userId:f.stranger}),error('NOT_FOUND'));
      const raced=await Promise.allSettled(['first concurrent save','second concurrent save'].map(answer=>service.saveDiagnosticResponse({...save,questionId:f.questionIds[1],answer})));
      assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);
      const loser=raced.find(r=>r.status==='rejected');assert.ok(loser && error('RESPONSE_CONFLICT')(loser.reason));
    });
    await t.test('server deadline rejects answers; late owner submission finalizes saved work exactly once',async()=>{
      await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',now())-interval '1 hour',deadline=date_trunc('milliseconds',now()) WHERE id=$1`,[session.id]);
      await assert.rejects(service.saveDiagnosticResponse({...save,expectedVersion:1,answer:'late'}),error('SESSION_EXPIRED'));
      const final=await service.submitDiagnosticSession({sessionId:session.id,userId:f.owner,writerToken:writer.writerToken});
      assert.equal(final.state,'SUBMITTED');assert.ok(final.submittedAt);
      assert.equal(final.responses.find(r=>r.questionId===save.questionId)?.answer,save.answer);
      const duplicate=await service.submitDiagnosticSession({sessionId:session.id,userId:f.owner,writerToken:''});
      assert.equal(duplicate.submittedAt,final.submittedAt);assert.equal(duplicate.version,final.version);
    });
    await t.test('expired sessions finalize on read even when the browser never submits',async()=>{
      const invitation=await issue();const active=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      const editing=await service.acquireDiagnosticWriter({sessionId:active.id,userId:f.owner});
      await service.saveDiagnosticResponse({sessionId:active.id,userId:f.owner,writerToken:editing.writerToken,
        questionId:f.questionIds[0],expectedVersion:0,answer:'acknowledged',markedForReview:false});
      await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',now())-interval '1 hour',deadline=date_trunc('milliseconds',now()) WHERE id=$1`,[active.id]);
      const before=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:active.id}});
      const reads=await Promise.all([0,1].map(()=>service.loadDiagnosticSession({sessionId:active.id,userId:f.owner})));
      for(const read of reads) {
        assert.equal(read.state,'SUBMITTED');assert.equal(read.submittedAt,before.deadline.toISOString());
        assert.equal(read.responses.find(response=>response.questionId===f.questionIds[0])?.answer,'acknowledged');
        assert.ok(read.responses.every(response=>response.finalizedAt===read.submittedAt));
      }
      assert.equal(reads[0].version,before.version+1);assert.equal(reads[1].version,reads[0].version);
      const replay=await service.submitDiagnosticSession({sessionId:active.id,userId:f.owner,writerToken:''});
      assert.equal(replay.submittedAt,reads[0].submittedAt);
    });
    await t.test('server-scheduled Reading and Writing stages reject prior-section saves',async()=>{
      const invitation=await issue();const active=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      const lease=await service.acquireDiagnosticWriter({sessionId:active.id,userId:f.owner});
      const input={...save,sessionId:active.id,writerToken:lease.writerToken,answer:'stage answer',markedForReview:false};
      await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',now())-interval '20 minutes',deadline=date_trunc('milliseconds',now())+interval '40 minutes' WHERE id=$1`,[active.id]);
      assert.equal((await service.loadDiagnosticSession({sessionId:active.id,userId:f.owner})).window.stage,'READING');
      await assert.rejects(service.saveDiagnosticResponse(input),error('SECTION_NOT_ACTIVE'));
      assert.equal((await service.saveDiagnosticResponse({...input,questionId:f.questionIds[20]})).version,1);
      await client.query(`UPDATE app_private."DiagnosticSession" SET "startedAt"=date_trunc('milliseconds',now())-interval '40 minutes',deadline=date_trunc('milliseconds',now())+interval '20 minutes' WHERE id=$1`,[active.id]);
      assert.equal((await service.loadDiagnosticSession({sessionId:active.id,userId:f.owner})).window.stage,'WRITING');
      await assert.rejects(service.saveDiagnosticResponse({...input,questionId:f.questionIds[20],expectedVersion:1}),error('SECTION_NOT_ACTIVE'));
      assert.equal((await service.saveDiagnosticResponse({...input,questionId:f.questionIds[33]})).version,1);
    });
    await t.test('frozen manifest tampering is rejected and published source content remains immutable',async()=>{
      const other=await issue();const active=await service.createDiagnosticSession({invitationId:other.id,userId:f.owner});
      await client.query(`UPDATE app_private."DiagnosticSession" SET "manifestHash"=repeat('b',64) WHERE id=$1`,[active.id]);
      await assert.rejects(service.loadDiagnosticSession({sessionId:active.id,userId:f.owner}),error('CONTENT_INTEGRITY'));
      await assert.rejects(client.query(`UPDATE app_private."Question" SET "promptHtml"='changed' WHERE id=$1`,[f.questionIds[0]]),(e:NodeJS.ErrnoException)=>e.code==='55000');
      await assert.rejects(client.query(`UPDATE app_private."ContentAsset" SET "durationMs"=1 WHERE id=$1`,[f.assetIds[0]]),(e:NodeJS.ErrnoException)=>e.code==='55000');
      await assert.rejects(client.query(`UPDATE app_private."DiagnosticContentReview" SET suitability='TASK_2_DIAGNOSTIC' WHERE "testPartId"=$1`,[f.partIds[0]]),(e:NodeJS.ErrnoException)=>e.code==='55000');
    });
    await t.test('rehashing a forged review or foreign question cannot bypass source provenance checks',async()=>{
      const invitation=await issue();const active=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      const stored=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:active.id}});
      const original=stored.manifest as unknown as import('../../src/lib/diagnostic/manifest').DiagnosticManifestPayload;
      for(const mutation of ['review','question']) {
        const corrupt=structuredClone(original);
        if(mutation==='review') corrupt.diagnostic.reviews[0].reviewerId=f.stranger;
        else corrupt.questions[0].questionId=randomUUID();
        await prisma.diagnosticSession.update({where:{id:active.id},data:{manifest:corrupt as unknown as import('@prisma/client').Prisma.InputJsonValue,manifestHash:hashFrozenManifestPayload(corrupt)}});
        await assert.rejects(service.loadDiagnosticSession({sessionId:active.id,userId:f.owner}),error('CONTENT_INTEGRITY'));
      }
    });
    await t.test('latest future review blocks new starts while frozen existing sessions remain usable',async()=>{
      const invitation=await issue();const active=await service.createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
      await client.query(`INSERT INTO app_private."DiagnosticContentReview" ("testPartId","contentHash","reviewerId","reviewedAt","reviewDueAt",suitability) VALUES ($1,repeat('a',64),$2,now()+interval '1 hour',now()+interval '1 day','REPRESENTATIVE_READING')`,[f.partIds[2],f.staff]);
      await assert.rejects(issue(),error('CONTENT_NOT_READY'));
      assert.equal((await service.loadDiagnosticSession({sessionId:active.id,userId:f.owner})).deadline,active.deadline);
    });
    for(const options of [{noReview:true},{staleReview:true},{wrongHash:true},{missingKey:true},{unverifiedKey:true},{media:'missing' as const},{media:'wrongType' as const},{media:'unverified' as const},{media:'wrongHash' as const},{media:'unlinked' as const},{media:'tooLong' as const},{missingOptions:true},{missingPassage:true},{unpublished:true}]) {
      await t.test(`unready source ${JSON.stringify(options)} cannot consume an invitation`,async()=>{
        const bad=await diagnosticFixture(options);
        // Issue is permitted only for content-ready blueprints; any readiness failure is safe.
        await assert.rejects(async()=>{
          const invitation=await invitationService.issueDiagnosticInvitation({recipientId:bad.owner,blueprintId:bad.blueprint,actorUserId:bad.staff});
          await service.createDiagnosticSession({invitationId:invitation.id,userId:bad.owner});
        },error('CONTENT_NOT_READY'));
        assert.equal(await prisma.diagnosticSession.count({where:{userId:bad.owner}}),0);
      });
    }
    await t.test('all added private objects deny anonymous and authenticated roles',async()=>{
      for(const role of ['anon','authenticated']) for(const table of ['DiagnosticInvitation','DiagnosticSession','DiagnosticResponse','DiagnosticContentReview']) {
        await client.query('BEGIN');await client.query(`SET LOCAL ROLE ${role}`);
        await assert.rejects(client.query(`SELECT * FROM app_private."${table}" LIMIT 1`),(e:NodeJS.ErrnoException)=>e.code==='42501');
        await client.query('ROLLBACK');
      }
    });
  } finally { /* Connections close through t.after, including fixture failures. */ }
});
