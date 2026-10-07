import assert from 'node:assert/strict';
import test from 'node:test';
import {Client} from 'pg';
import {diagnosticFixture,diagnosticTestPrisma} from '../helpers/diagnostic-fixture';
import {encodeDiagnosticWav} from '../../src/lib/diagnostic/recording-core';

test('private diagnostic capture resumes immutable chunks, fences withdrawal and retries deletion without resurrection',{
  skip:process.env.TEST_DATABASE_URL?false:'Isolated TEST_DATABASE_URL required',
},async t=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
  const db=diagnosticTestPrisma();t.after(()=>db.$disconnect());
  const sql=new Client({connectionString:process.env.TEST_DATABASE_URL});await sql.connect();t.after(()=>sql.end());
  t.after(()=>{delete process.env.DIAGNOSTIC_RECORDING_ENABLED;});
  const f=await diagnosticFixture();
  const {issueDiagnosticInvitation}=await import('../../src/lib/diagnostic/invitation-service');
  const {createDiagnosticSession}=await import('../../src/lib/diagnostic/session-service');
  const speaking=await import('../../src/lib/diagnostic/speaking-service');
  const recording=await import('../../src/lib/diagnostic/recording-service');
  const invitation=await issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
  const written=await createDiagnosticSession({invitationId:invitation.id,userId:f.owner});
  await db.diagnosticResponse.updateMany({where:{sessionId:written.id},data:{finalizedAt:new Date()}});
  await db.diagnosticSession.update({where:{id:written.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
  const owner={sessionId:written.id,userId:f.owner},staff={sessionId:written.id,actorUserId:f.staff};
  const objects=new Map<string,Uint8Array>();let failedPut=true,failedDelete=false;
  const storage={assertPrivate:async()=>{},put:async(key:string,bytes:Uint8Array)=>{
    if(failedPut){failedPut=false;throw new Error('synthetic storage outage');}objects.set(key,bytes.slice());
  },get:async(key:string)=>{const value=objects.get(key);if(!value)throw new Error('synthetic missing object');return value;},
  remove:async(keys:string[])=>{if(failedDelete)throw new Error('synthetic delete outage');keys.forEach(key=>objects.delete(key));}};
  await speaking.startDiagnosticSpeaking(staff);
  await speaking.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:true,aiConsented:true});
  await assert.rejects(recording.createDiagnosticRecording({...staff,participantConfirmed:true},storage),/RECORDING_UNAVAILABLE/u);
  process.env.DIAGNOSTIC_RECORDING_ENABLED='true';
  await assert.rejects(recording.createDiagnosticRecording({...staff,participantConfirmed:false},storage),/RECORDING_NOT_ELIGIBLE/u);
  await assert.rejects(recording.createDiagnosticRecording({...staff,actorUserId:f.stranger,participantConfirmed:true},storage),/STAFF_REQUIRED/u);
  const captured=await recording.createDiagnosticRecording({...staff,participantConfirmed:true},storage);
  assert.equal((await recording.createDiagnosticRecording({...staff,participantConfirmed:true},storage)).id,captured.id);
  const chunk=encodeDiagnosticWav(new Float32Array(80000).fill(0.2));
  const input={...staff,recordingId:captured.id,sequence:0,bytes:chunk};
  await assert.rejects(recording.uploadDiagnosticChunk(input,storage),/synthetic storage outage/u);
  assert.equal(await db.diagnosticRecordingChunk.count({where:{recordingId:captured.id}}),1);
  let duplicateBegun!:()=>void,duplicateResume!:()=>void;
  const duplicateStarted=new Promise<void>(resolve=>{duplicateBegun=resolve;}),duplicateWait=new Promise<void>(resolve=>{duplicateResume=resolve;});
  const duplicate=recording.uploadDiagnosticChunk(input,{...storage,put:async(key,bytes)=>{duplicateBegun();await duplicateWait;objects.set(key,bytes.slice());}});
  await duplicateStarted;
  await recording.uploadDiagnosticChunk(input,storage);await recording.uploadDiagnosticChunk(input,storage);
  await assert.rejects(recording.uploadDiagnosticChunk({...input,bytes:encodeDiagnosticWav(new Float32Array(80000).fill(0.7))},storage),/RECORDING_CONFLICT/u);
  await recording.uploadDiagnosticChunk({...input,sequence:1},storage);
  await assert.rejects(recording.finalizeDiagnosticRecording({...staff,recordingId:captured.id,chunkCount:3},storage),/RECORDING_INCOMPLETE/u);
  const ready=await recording.finalizeDiagnosticRecording({...staff,recordingId:captured.id,chunkCount:2},storage);
  assert.equal(ready.state,'READY');assert.equal(ready.durationMs,10000);
  duplicateResume();assert.deepEqual(await duplicate,{sequence:0,state:'STORED'});
  assert.equal((await recording.finalizeDiagnosticRecording({...staff,recordingId:captured.id,chunkCount:2},storage)).id,ready.id);
  await assert.rejects(recording.readDiagnosticRecording({...staff,actorUserId:f.stranger,recordingId:captured.id},storage),/STAFF_REQUIRED/u);
  assert.equal((await recording.readDiagnosticRecording({...staff,recordingId:captured.id},storage)).length,320044);
  await speaking.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:false,aiConsented:false});
  await assert.rejects(recording.readDiagnosticRecording({...staff,recordingId:captured.id},storage),/RECORDING_NOT_ELIGIBLE/u);
  failedDelete=true;await recording.purgeDiagnosticRecordings(storage);
  assert.equal((await db.diagnosticRecording.findUniqueOrThrow({where:{id:captured.id}})).state,'DELETE_PENDING');
  failedDelete=false;await recording.purgeDiagnosticRecordings(storage);assert.equal(objects.size,0);
  assert.equal((await db.diagnosticRecording.findUniqueOrThrow({where:{id:captured.id}})).state,'DELETED');
  await assert.rejects(speaking.saveDiagnosticSpeakingConsent({...owner,adultAttested:true,recordingConsented:true,aiConsented:true}),/RECORDING_NOT_ELIGIBLE/u);
  await assert.rejects(recording.uploadDiagnosticChunk(input,storage),/RECORDING_NOT_ELIGIBLE/u);
  await assert.rejects(recording.createDiagnosticRecording({...staff,participantConfirmed:true},storage),/RECORDING_NOT_ELIGIBLE/u);

  // A late storage write after withdrawal is fenced and physically removed.
  const second=await issueDiagnosticInvitation({recipientId:f.owner,blueprintId:f.blueprint,actorUserId:f.staff});
  const next=await createDiagnosticSession({invitationId:second.id,userId:f.owner});
  await db.diagnosticResponse.updateMany({where:{sessionId:next.id},data:{finalizedAt:new Date()}});
  await db.diagnosticSession.update({where:{id:next.id},data:{state:'SUBMITTED',submittedAt:new Date()}});
  const s={sessionId:next.id,actorUserId:f.staff},o={sessionId:next.id,userId:f.owner};
  await speaking.startDiagnosticSpeaking(s);await speaking.saveDiagnosticSpeakingConsent({...o,adultAttested:true,recordingConsented:true,aiConsented:false});
  const r=await recording.createDiagnosticRecording({...s,participantConfirmed:true},storage);
  let begun!:()=>void,unblock!:()=>void;const started=new Promise<void>(resolve=>{begun=resolve;}),wait=new Promise<void>(resolve=>{unblock=resolve;});
  const delayed=recording.uploadDiagnosticChunk({...s,recordingId:r.id,sequence:0,bytes:chunk},{...storage,put:async(key,bytes)=>{begun();await wait;objects.set(key,bytes.slice());}});
  await started;await speaking.saveDiagnosticSpeakingConsent({...o,adultAttested:true,recordingConsented:false,aiConsented:false});
  await recording.purgeDiagnosticRecordings(storage);unblock();await assert.rejects(delayed,/RECORDING_NOT_ELIGIBLE/u);
  await recording.purgeDiagnosticRecordings(storage);assert.equal(objects.size,0);
  assert.equal((await db.diagnosticRecording.findUniqueOrThrow({where:{id:r.id}})).state,'DELETED');
  // Emulate a server dying after a remote upload committed, before the fenced
  // acknowledgement/compensating delete. Durable tombstones must still sweep it.
  const tombstone=await db.diagnosticRecordingChunk.findFirstOrThrow({where:{recordingId:r.id}});
  objects.set(tombstone.storageKey,chunk);
  await recording.purgeDiagnosticRecordings(storage);assert.equal(objects.size,0);
});
