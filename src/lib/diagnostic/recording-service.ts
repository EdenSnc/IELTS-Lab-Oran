import 'server-only';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import prisma from '@/lib/prisma';
import {diagnosticNow,diagnosticTransaction,type DiagnosticTransaction} from './content-service';
import {assertDiagnosticExaminer} from './assessment-service';
import {DiagnosticError} from './protocol';
import {parseDiagnosticWav,joinDiagnosticWav} from './recording-core';
import {diagnosticRecordingStorage,type DiagnosticRecordingStorage} from './recording-storage';
type Staff={sessionId:string;actorUserId:string};
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function enabled(){if(process.env.DIAGNOSTIC_RECORDING_ENABLED!=='true')throw new DiagnosticError('RECORDING_UNAVAILABLE',503);}
async function speaking(tx:DiagnosticTransaction,input:Staff){
  await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
  await assertDiagnosticExaminer(tx,input);
  const row=await tx.diagnosticSpeakingSession.findUnique({where:{sessionId:input.sessionId}});
  if(!row||row.examinerId!==input.actorUserId)throw new DiagnosticError('NOT_FOUND',404);
  return row;
}
async function scoped(tx:DiagnosticTransaction,input:Staff&{recordingId:string}){
  const interview=await speaking(tx,input),now=await diagnosticNow(tx);
  const recording=await tx.diagnosticRecording.findFirst({where:{id:input.recordingId,speakingId:interview.id}});
  if(!recording)throw new DiagnosticError('NOT_FOUND',404);
  if(!interview.adultAttested||!interview.recordingConsented||interview.consentVersion!==recording.consentVersion
    ||interview.privacyRevokedAt||recording.expiresAt<=now||['DELETE_PENDING','DELETED'].includes(recording.state))throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
  return{recording,interview,now};
}
function dto(row:{id:string;state:string;chunkCount:number|null;durationMs:number|null;expiresAt:Date}){
  return{id:row.id,state:row.state,chunkCount:row.chunkCount,durationMs:row.durationMs,expiresAt:row.expiresAt.toISOString()};
}
export async function loadDiagnosticRecording(input:Staff){
  return diagnosticTransaction(async tx=>{
    const interview=await speaking(tx,input);const row=await tx.diagnosticRecording.findUnique({where:{speakingId:interview.id}});
    if(!row)return null;
    const chunks=await tx.diagnosticRecordingChunk.findMany({where:{recordingId:row.id},orderBy:{sequence:'asc'},select:{sequence:true,state:true}});
    return{...dto(row),chunks};
  });
}
export async function createDiagnosticRecording(input:Staff&{participantConfirmed:boolean},storage=diagnosticRecordingStorage){
  enabled();if(input.participantConfirmed!==true)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',400);
  // Storage readiness is checked outside the database transaction.
  await storage.assertPrivate();
  return diagnosticTransaction(async tx=>{
    const interview=await speaking(tx,input),now=await diagnosticNow(tx);
    if(interview.state!=='ACTIVE'||now>=interview.deadline!||!interview.adultAttested||!interview.recordingConsented||interview.privacyRevokedAt)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
    const existing=await tx.diagnosticRecording.findUnique({where:{speakingId:interview.id}});
    if(existing){await scoped(tx,{...input,recordingId:existing.id});return dto(existing);}
    const row=await tx.diagnosticRecording.create({data:{speakingId:interview.id,consentVersion:interview.consentVersion,createdAt:now,expiresAt:new Date(now.getTime()+30*86400000)}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_RECORDING_STARTED',targetType:'DiagnosticRecording',targetId:row.id,reason:'Adult participant identity and recording consent confirmed'}});
    return dto(row);
  });
}
export async function uploadDiagnosticChunk(input:Staff&{recordingId:string;sequence:number;bytes:Uint8Array},storage=diagnosticRecordingStorage){
  enabled();z.number().int().min(0).max(95).parse(input.sequence);
  let parsed;try{parsed=parseDiagnosticWav(input.bytes);}catch{throw new DiagnosticError('INVALID_DIAGNOSTIC_AUDIO',400);}
  const checksum=hash(input.bytes),storageKey=`diagnostic/${input.recordingId}/${input.sequence}.wav`;
  const chunk=await diagnosticTransaction(async tx=>{
    const{recording,interview,now}=await scoped(tx,input);
    if(recording.state!=='UPLOADING'||now.getTime()>interview.deadline!.getTime()+900000)throw new DiagnosticError('RECORDING_CONFLICT',409);
    const previous=await tx.diagnosticRecordingChunk.findUnique({where:{recordingId_sequence:{recordingId:recording.id,sequence:input.sequence}}});
    if(previous){if(previous.checksum!==checksum||previous.byteSize!==input.bytes.length)throw new DiagnosticError('RECORDING_CONFLICT',409);return previous;}
    return tx.diagnosticRecordingChunk.create({data:{recordingId:recording.id,sequence:input.sequence,storageKey,checksum,byteSize:input.bytes.length,sampleCount:parsed.sampleCount}});
  });
  if(chunk.state==='STORED')return{sequence:chunk.sequence,state:'STORED'};
  await storage.put(storageKey,input.bytes); // Durable PENDING row exists before external upload.
  try{return await diagnosticTransaction(async tx=>{
    const{recording}=await scoped(tx,input);
    const current=await tx.diagnosticRecordingChunk.findUniqueOrThrow({where:{id:chunk.id}});
    if(current.state==='STORED')return{sequence:chunk.sequence,state:'STORED'};
    if(recording.state!=='UPLOADING')throw new DiagnosticError('RECORDING_CONFLICT',409);
    const stored=await tx.diagnosticRecordingChunk.updateMany({where:{id:chunk.id,state:{in:['PENDING','STORED']}},data:{state:'STORED'}});
    if(!stored.count)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);return{sequence:chunk.sequence,state:'STORED'};
  });}catch(error){
    // A transient DB failure leaves PENDING durable and resumable; it is not
    // consent withdrawal and must not destroy an otherwise valid recording.
    if(!(error instanceof DiagnosticError)||error.code!=='RECORDING_NOT_ELIGIBLE')throw error;
    // Withdrawal/expiry while storage was in flight: remove, retain a durable
    // tombstone on failure. Never let an old uploader mark the bytes usable.
    await prisma.diagnosticRecordingChunk.updateMany({where:{id:chunk.id},data:{state:'DELETE_PENDING'}});
    try{await storage.remove([storageKey]);await prisma.diagnosticRecordingChunk.update({where:{id:chunk.id},data:{state:'DELETED'}});}catch{console.error('DIAGNOSTIC_RECORDING_DELETE_RETRY',{recordingId:input.recordingId});}
    throw error;
  }
}
async function verifiedBytes(chunks:{checksum:string;storageKey:string;byteSize:number}[],storage:DiagnosticRecordingStorage){
  const result:Uint8Array[]=[];
  for(const chunk of chunks){const bytes=await storage.get(chunk.storageKey);if(bytes.length!==chunk.byteSize||hash(bytes)!==chunk.checksum)throw new DiagnosticError('INVALID_DIAGNOSTIC_AUDIO',409);result.push(bytes);}
  try{return joinDiagnosticWav(result);}catch{throw new DiagnosticError('INVALID_DIAGNOSTIC_AUDIO',409);}
}
export async function finalizeDiagnosticRecording(input:Staff&{recordingId:string;chunkCount:number},storage=diagnosticRecordingStorage){
  z.number().int().min(1).max(96).parse(input.chunkCount);
  const snapshot=await diagnosticTransaction(async tx=>{
    const{recording}=await scoped(tx,input);if(recording.state==='READY'){
      if(recording.chunkCount!==input.chunkCount)throw new DiagnosticError('RECORDING_CONFLICT',409);return{recording,chunks:null};}
    const chunks=await tx.diagnosticRecordingChunk.findMany({where:{recordingId:recording.id},orderBy:{sequence:'asc'}});
    if(chunks.length!==input.chunkCount||chunks.some((chunk,index)=>chunk.sequence!==index||chunk.state!=='STORED'))throw new DiagnosticError('RECORDING_INCOMPLETE',409);
    return{recording,chunks};
  });
  if(!snapshot.chunks)return dto(snapshot.recording);
  const bytes=await verifiedBytes(snapshot.chunks,storage),parsed=parseDiagnosticWav(bytes,{maxDurationMs:420000});
  return diagnosticTransaction(async tx=>{
    const{recording,now}=await scoped(tx,input);
    const chunks=await tx.diagnosticRecordingChunk.findMany({where:{recordingId:recording.id},orderBy:{sequence:'asc'},select:{sequence:true,state:true}});
    if(chunks.length!==input.chunkCount||chunks.some((chunk,index)=>chunk.sequence!==index||chunk.state!=='STORED'))throw new DiagnosticError('RECORDING_CONFLICT',409);
    if(recording.state==='READY')return dto(recording);
    const ready=await tx.diagnosticRecording.update({where:{id:recording.id},data:{state:'READY',chunkCount:input.chunkCount,sampleCount:parsed.sampleCount,durationMs:parsed.durationMs,checksum:hash(bytes),finalizedAt:now}});
    return dto(ready);
  });
}
export async function readDiagnosticRecording(input:Staff&{recordingId:string},storage=diagnosticRecordingStorage){
  const snapshot=await diagnosticTransaction(async tx=>{
    const{recording}=await scoped(tx,input);if(recording.state!=='READY')throw new DiagnosticError('RECORDING_INCOMPLETE',409);
    return{recording,chunks:await tx.diagnosticRecordingChunk.findMany({where:{recordingId:recording.id,state:'STORED'},orderBy:{sequence:'asc'}})};
  });
  const bytes=await verifiedBytes(snapshot.chunks,storage);
  if(hash(bytes)!==snapshot.recording.checksum)throw new DiagnosticError('INVALID_DIAGNOSTIC_AUDIO',409);
  await diagnosticTransaction(tx=>scoped(tx,input)); // Recheck after external downloads.
  return bytes;
}
export async function purgeDiagnosticRecordings(storage=diagnosticRecordingStorage){
  const now=new Date();
  await prisma.diagnosticRecording.updateMany({where:{state:{in:['UPLOADING','READY']},OR:[{expiresAt:{lte:now}},{speaking:{privacyRevokedAt:{not:null}}},{speaking:{recordingConsented:false}},
    {state:'UPLOADING',speaking:{deadline:{lt:new Date(now.getTime()-900000)}}}]},data:{state:'DELETE_PENDING'}});
  const pending=await prisma.diagnosticRecording.findMany({where:{state:'DELETE_PENDING'},take:25,select:{id:true}});
  const results:{recordingId:string;deleted:boolean}[]=[];
  for(const row of pending){
    const chunks=await prisma.diagnosticRecordingChunk.findMany({where:{recordingId:row.id},select:{storageKey:true}});
    try{await storage.remove(chunks.map(chunk=>chunk.storageKey));
      await diagnosticTransaction(async tx=>{
        await tx.diagnosticRecordingChunk.updateMany({where:{recordingId:row.id},data:{state:'DELETED',lastDeletionCheckAt:await diagnosticNow(tx)}});
        await tx.diagnosticRecording.update({where:{id:row.id},data:{state:'DELETED',deletedAt:await diagnosticNow(tx)}});
      });results.push({recordingId:row.id,deleted:true});
    }catch{console.error('DIAGNOSTIC_RECORDING_DELETE_RETRY',{recordingId:row.id});results.push({recordingId:row.id,deleted:false});}
  }
  // A previously completed cleanup may race a still-in-flight uploader. Its
  // retained chunk tombstone is retried even if the parent is already DELETED.
  const pendingChunks=await prisma.diagnosticRecordingChunk.findMany({where:{state:'DELETE_PENDING'},take:96});
  // Keep checking immutable DELETED tombstones too: an uploader can die after
  // storage commit but before acknowledgement. Round-robin timestamps avoid
  // starving newer tombstones behind a permanently repeated first page.
  const deletedChunks=await prisma.diagnosticRecordingChunk.findMany({where:{state:'DELETED'},take:96,orderBy:{lastDeletionCheckAt:{sort:'asc',nulls:'first'}}});
  for(const chunk of [...pendingChunks,...deletedChunks]){try{await storage.remove([chunk.storageKey]);await prisma.diagnosticRecordingChunk.update({where:{id:chunk.id},data:{state:'DELETED',lastDeletionCheckAt:new Date()}});}catch{console.error('DIAGNOSTIC_RECORDING_DELETE_RETRY',{recordingId:chunk.recordingId});}}
  return results;
}
