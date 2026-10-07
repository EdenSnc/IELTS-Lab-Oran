import 'server-only';
import type { DiagnosticSpeakingSession } from '@prisma/client';
import { z } from 'zod';
import { diagnosticNow,diagnosticTransaction,type DiagnosticTransaction } from './content-service';
import { assertDiagnosticExaminer } from './assessment-service';
import { DiagnosticError } from './protocol';
import {diagnosticAiAvailable} from './ai-consent-service';
import { deriveDiagnosticSpeakingWindow,diagnosticRecordingEligibility,DIAGNOSTIC_RECORDING_POLICY_VERSION,DIAGNOSTIC_AI_POLICY_VERSION } from './speaking-core';

const consentSchema=z.object({adultAttested:z.boolean(),recordingConsented:z.boolean(),aiConsented:z.boolean()}).strict();
async function lockWritten(tx:DiagnosticTransaction,sessionId:string){await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${sessionId}::uuid FOR UPDATE`;}
async function owner(tx:DiagnosticTransaction,input:{sessionId:string;userId:string}){
  const session=await tx.diagnosticSession.findFirst({where:{id:input.sessionId,userId:input.userId,user:{status:'ACTIVE'}}});
  if(!session)throw new DiagnosticError('NOT_FOUND',404);
  if(session.state!=='SUBMITTED')throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
}
function status(row:DiagnosticSpeakingSession|null,now:Date){
  const window=row?.startedAt?deriveDiagnosticSpeakingWindow({startedAt:row.startedAt,now}):null;
  return{state:row?.state??'NOT_STARTED',startedAt:row?.startedAt?.toISOString()??null,deadline:row?.deadline?.toISOString()??null,
    completedAt:row?.completedAt?.toISOString()??null,serverNow:now.toISOString(),
    window:window?{...window,deadline:window.deadline.toISOString(),sectionDeadline:window.sectionDeadline?.toISOString()??null}:null,
    adultAttested:row?.adultAttested??false,recordingConsented:row?.recordingConsented??false,aiConsented:row?.aiConsented??false,
    consentVersion:row?.consentVersion??0,privacyRevokedAt:row?.privacyRevokedAt?.toISOString()??null,
    captureAvailable:process.env.DIAGNOSTIC_RECORDING_ENABLED==='true',aiAvailable:diagnosticAiAvailable(),
    eligibility:diagnosticRecordingEligibility(row??{adultAttested:false,recordingConsented:false,aiConsented:false})};
}
function staffView(row:DiagnosticSpeakingSession,now:Date){return{...status(row,now),id:row.id,version:row.version,notes:row.notes};}
export async function loadDiagnosticSpeakingStatus(input:{sessionId:string;userId:string}){
  return diagnosticTransaction(async tx=>{await owner(tx,input);return status(await tx.diagnosticSpeakingSession.findUnique({where:{sessionId:input.sessionId}}),await diagnosticNow(tx));});
}
export async function saveDiagnosticSpeakingConsent(input:{sessionId:string;userId:string;adultAttested:boolean;recordingConsented:boolean;aiConsented:boolean}){
  const decisions=consentSchema.parse({adultAttested:input.adultAttested,recordingConsented:input.recordingConsented,aiConsented:input.aiConsented});
  if((decisions.recordingConsented&&!decisions.adultAttested)||(decisions.aiConsented&&!decisions.recordingConsented))throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',400);
  return diagnosticTransaction(async tx=>{
    await lockWritten(tx,input.sessionId);await owner(tx,input);
    const now=await diagnosticNow(tx);
    const previous=await tx.diagnosticSpeakingSession.upsert({where:{sessionId:input.sessionId},update:{},create:{sessionId:input.sessionId}});
    if(previous.adultAttested===decisions.adultAttested&&previous.recordingConsented===decisions.recordingConsented&&previous.aiConsented===decisions.aiConsented)return status(previous,now);
    if(previous.privacyRevokedAt&&(decisions.recordingConsented||decisions.aiConsented))throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
    const existingCapture=await tx.diagnosticRecording.findUnique({where:{speakingId:previous.id},select:{id:true}});
    if(existingCapture&&((decisions.recordingConsented&&!previous.recordingConsented)||(decisions.aiConsented&&!previous.aiConsented)))throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
    // Consent cannot retrospectively authorize capture after an interview has ended.
    if(['COMPLETED','CANCELLED'].includes(previous.state)&&decisions.recordingConsented&&!previous.recordingConsented)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
    const revoked=(previous.recordingConsented&&!decisions.recordingConsented)||(previous.aiConsented&&!decisions.aiConsented);
    const saved=await tx.diagnosticSpeakingSession.update({where:{id:previous.id},data:{...decisions,consentVersion:{increment:1},version:{increment:1},updatedAt:now,...(revoked?{privacyRevokedAt:now}:{})}});
    if(revoked)await tx.diagnosticRecording.updateMany({where:{speakingId:previous.id,state:{in:['UPLOADING','READY']}},data:{state:'DELETE_PENDING'}});
    for(const choice of [{type:'RECORDING' as const,accepted:decisions.recordingConsented,previous:previous.recordingConsented,policyVersion:DIAGNOSTIC_RECORDING_POLICY_VERSION},
      {type:'AI_ASSISTED_GRADING' as const,accepted:decisions.aiConsented,previous:previous.aiConsented,policyVersion:DIAGNOSTIC_AI_POLICY_VERSION}]){
      if(choice.accepted!==choice.previous)await tx.consentRecord.create({data:{userId:input.userId,type:choice.type,action:choice.accepted?'ACCEPTED':'WITHDRAWN',policyVersion:choice.policyVersion,
        acceptedFrom:`diagnostic-speaking:${input.sessionId}`,createdAt:now}});
    }
    return status(saved,now);
  });
}
export async function loadDiagnosticSpeaking(input:{sessionId:string;actorUserId:string}){
  return diagnosticTransaction(async tx=>{await assertDiagnosticExaminer(tx,input);const row=await tx.diagnosticSpeakingSession.findUnique({where:{sessionId:input.sessionId}});
    const now=await diagnosticNow(tx);return row?staffView(row,now):{...status(null,now),id:null,version:0,notes:''};});
}
export async function startDiagnosticSpeaking(input:{sessionId:string;actorUserId:string}){
  return diagnosticTransaction(async tx=>{
    await lockWritten(tx,input.sessionId);await assertDiagnosticExaminer(tx,input);
    const now=await diagnosticNow(tx);
    const row=await tx.diagnosticSpeakingSession.upsert({where:{sessionId:input.sessionId},update:{},create:{sessionId:input.sessionId}});
    if(row.state!=='NOT_STARTED'){
      if(row.examinerId!==input.actorUserId)throw new DiagnosticError('SPEAKING_CONFLICT',409);
      return staffView(row,now); // Refresh/double Start never moves any deadline.
    }
    const saved=await tx.diagnosticSpeakingSession.update({where:{id:row.id},data:{state:'ACTIVE',examinerId:input.actorUserId,startedAt:now,deadline:new Date(now.getTime()+420000),version:{increment:1},updatedAt:now}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_SPEAKING_STARTED',targetType:'DiagnosticSpeakingSession',targetId:row.id,reason:'In-person diagnostic started'}});
    return staffView(saved,now);
  });
}
async function editable(tx:DiagnosticTransaction,input:{sessionId:string;actorUserId:string;expectedVersion:number}){
  await lockWritten(tx,input.sessionId);await assertDiagnosticExaminer(tx,input);
  const row=await tx.diagnosticSpeakingSession.findUnique({where:{sessionId:input.sessionId}});
  if(!row)throw new DiagnosticError('NOT_FOUND',404);
  if(row.examinerId!==input.actorUserId)throw new DiagnosticError('SPEAKING_CONFLICT',409);
  return row;
}
export async function saveDiagnosticSpeakingNotes(input:{sessionId:string;actorUserId:string;expectedVersion:number;notes:string}){
  const notes=z.string().max(10000).parse(input.notes);
  return diagnosticTransaction(async tx=>{
    const row=await editable(tx,input);const now=await diagnosticNow(tx);
    if(row.state!=='ACTIVE'||(row.version!==input.expectedVersion&&row.notes!==notes))throw new DiagnosticError('SPEAKING_CONFLICT',409);
    if(row.notes===notes)return staffView(row,now);
    const saved=await tx.diagnosticSpeakingSession.update({where:{id:row.id},data:{notes,version:{increment:1},updatedAt:now}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_SPEAKING_NOTES_SAVED',targetType:'DiagnosticSpeakingSession',targetId:row.id,reason:'Private examiner notes saved'}});
    return staffView(saved,now);
  });
}
export async function finishDiagnosticSpeaking(input:{sessionId:string;actorUserId:string;expectedVersion:number}){
  return diagnosticTransaction(async tx=>{
    const row=await editable(tx,input);const now=await diagnosticNow(tx);
    if(row.state==='COMPLETED')return staffView(row,now);
    if(row.state!=='ACTIVE'||row.version!==input.expectedVersion)throw new DiagnosticError('SPEAKING_CONFLICT',409);
    if(now<row.deadline!)throw new DiagnosticError('SPEAKING_NOT_FINISHED',409);
    const saved=await tx.diagnosticSpeakingSession.update({where:{id:row.id},data:{state:'COMPLETED',completedAt:now,version:{increment:1},updatedAt:now}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_SPEAKING_COMPLETED',targetType:'DiagnosticSpeakingSession',targetId:row.id,reason:'Examiner finalized the in-person diagnostic'}});
    return staffView(saved,now);
  });
}
