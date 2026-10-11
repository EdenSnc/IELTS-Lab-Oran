import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Prisma, type DiagnosticResponse } from '@prisma/client';
import { z } from 'zod';
import { diagnosticTransaction, diagnosticNow, type DiagnosticTransaction } from './content-service';
import { loadReadinessPack, candidateReadinessPart, scoreReadinessPart, type ReadinessPack } from './readiness-content';
import { readinessPackHash, requireReadinessStaff } from './readiness-provision';
import { readinessIntakeSchema, readinessMarkingSchema, needsReadinessExtension, readinessStage, recommendReadiness } from './readiness-policy';
import { DiagnosticError } from './protocol';
import {diagnosticAiAvailable,assertDiagnosticWritingAiConsent} from './ai-consent-service';
import {READINESS_WRITING_PROMPT_VERSION,parseReadinessWritingFeedback} from './readiness-writing-core';
import {READINESS_SPEAKING_PROMPT_VERSION,validateDiagnosticSpeakingAnalysis,reviewDiagnosticSpeakerTurns,type DiagnosticSpeakerAssignment} from './analysis-core';

const include={responses:true,invitation:true,assessment:true} satisfies Prisma.DiagnosticSessionInclude;
type Session=Prisma.DiagnosticSessionGetPayload<{include:typeof include}>;
const runtimeSchema=z.object({intake:readinessIntakeSchema,extension:z.boolean().nullable(),coreCompletedAt:z.iso.datetime().nullable()}).strict();
type Manifest={profile:'IELTSLAB_READINESS_V2';packHash:string;pack:ReadinessPack;itemIds:Record<string,string>;pathway:'ACADEMIC'|'GENERAL_TRAINING'};
const json=(value:unknown)=>value as Prisma.InputJsonValue;
const hashToken=(value:string)=>createHash('sha256').update(value).digest('hex');

async function active(tx:DiagnosticTransaction,id:string) {
  const u=await tx.user.findUnique({where:{id},select:{status:true}});
  if(!u||u.status!=='ACTIVE')throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
}
function source(session:Session) {
  const manifest=session.manifest as unknown as Manifest;
  if(!session.readiness||manifest.profile!=='IELTSLAB_READINESS_V2'||readinessPackHash(manifest)!==session.manifestHash
    ||readinessPackHash(manifest.pack)!==manifest.packHash||!['ACADEMIC','GENERAL_TRAINING'].includes(manifest.pathway))throw new DiagnosticError('CONTENT_INTEGRITY',409);
  const runtime=runtimeSchema.parse(session.readiness);
  const partIds=manifest.pack.parts.filter(p=>p.pathway==='BOTH'||p.pathway===manifest.pathway).map(p=>p.id);
  const ids=Object.values(manifest.itemIds);
  const expectedKeys=[...manifest.pack.parts.filter(p=>partIds.includes(p.id)).flatMap(p=>p.items.map(q=>q.id)),'W1'];
  if(ids.length!==expectedKeys.length||expectedKeys.some(k=>!manifest.itemIds[k])||new Set(ids).size!==ids.length||session.responses.length!==ids.length
    ||session.responses.some(r=>!ids.includes(r.questionId)))throw new DiagnosticError('CONTENT_INTEGRITY',409);
  return {manifest,runtime,partIds};
}
async function owned(tx:DiagnosticTransaction,id:string,userId:string) {
  await active(tx,userId);
  await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${id}::uuid AND "userId"=${userId}::uuid FOR UPDATE`;
  const session=await tx.diagnosticSession.findFirst({where:{id,userId},include});
  if(!session)throw new DiagnosticError('NOT_FOUND',404);
  source(session);return session;
}
function answers(session:Session,manifest:Manifest) {return Object.fromEntries(Object.entries(manifest.itemIds).map(([stable,id])=>[stable,session.responses.find(r=>r.questionId===id)!.answer]));}
function scores(session:Session) {
  const {manifest,runtime}=source(session);const submitted=answers(session,manifest);
  const total=(skill:'LISTENING'|'READING',phase:'CORE'|'EXTENSION')=>manifest.pack.parts
    .filter(p=>p.skill===skill&&p.phase===phase&&(p.pathway==='BOTH'||p.pathway===manifest.pathway))
    .map(p=>scoreReadinessPart(p.id,submitted,manifest.pack)).reduce((a,s)=>({score:a.score+s.score,maximum:a.maximum+s.maximum}),{score:0,maximum:0});
  const l=total('LISTENING','CORE'),r=total('READING','CORE'),el=total('LISTENING','EXTENSION'),er=total('READING','EXTENSION');
  return {listening:l.score,listeningMaximum:l.maximum,reading:r.score,readingMaximum:r.maximum,
    ...(runtime.extension?{extensionListening:el.score,extensionListeningMaximum:el.maximum,extensionReading:er.score,extensionReadingMaximum:er.maximum}:{})};
}
function clock(session:Session,now:Date) {
  const {runtime}=source(session);
  if(session.state==='SUBMITTED')return {stage:'SUBMITTED' as const,remainingSeconds:0};
  if(runtime.coreCompletedAt) {
    const elapsed=(now.getTime()-Date.parse(runtime.coreCompletedAt))/1000;
    if(!runtime.extension||elapsed>=540)return {stage:'SUBMITTED' as const,remainingSeconds:0};
    return {stage:elapsed<270?'EXTENSION_LISTENING' as const:'EXTENSION_READING' as const,remainingSeconds:Math.ceil((elapsed<270?270:540)-elapsed)};
  }
  return readinessStage(session.startedAt,now,runtime.extension??false);
}
async function advance(tx:DiagnosticTransaction,session:Session,now:Date) {
  if(session.state==='SUBMITTED')return session;
  const {runtime}=source(session);
  if(runtime.extension===null&&now.getTime()>=session.startedAt.getTime()+1560000) {
    const score=scores(session);runtime.extension=needsReadinessExtension(score.listening,score.reading);
    session=await tx.diagnosticSession.update({where:{id:session.id},data:{readiness:json(runtime),deadline:new Date(session.startedAt.getTime()+(runtime.extension?3060000:2520000)),version:{increment:1}},include});
  }
  if(clock(session,now).stage==='SUBMITTED') {
    const cutoff=session.deadline;
    session=await tx.diagnosticSession.update({where:{id:session.id},data:{state:'SUBMITTED',submittedAt:cutoff,writerTokenHash:null,writerExpiresAt:null,version:{increment:1}},include});
    await tx.diagnosticResponse.updateMany({where:{sessionId:session.id,finalizedAt:null},data:{finalizedAt:cutoff}});
    session=await tx.diagnosticSession.findUniqueOrThrow({where:{id:session.id},include});
  }
  return session;
}
function selected(session:Session,now:Date) {
  const {manifest}=source(session);const stage=clock(session,now).stage;
  const skill=stage.includes('LISTENING')?'LISTENING':stage.includes('READING')?'READING':null;
  const phase=stage.startsWith('EXTENSION')?'EXTENSION':'CORE';
  return stage==='SUBMITTED'?[]:manifest.pack.parts.filter(p=>p.skill===skill&&p.phase===phase&&(p.pathway==='BOTH'||p.pathway===manifest.pathway));
}
function response(r:DiagnosticResponse) {return {questionId:r.questionId,answer:r.answer,markedForReview:r.markedForReview,version:r.version,savedAt:r.savedAt?.toISOString()??null,finalizedAt:r.finalizedAt?.toISOString()??null};}
function dto(session:Session,now:Date) {
  const {manifest,runtime}=source(session);const current=clock(session,now);const assessment=session.assessment;
  const released=assessment?.state==='RELEASED'&&assessment.expiresAt&&assessment.expiresAt>now?assessment.readiness as {decision:string;notes:string;writing:number[];speaking:number[]|null}|null:null;
  return {id:session.id,state:session.state,startedAt:session.startedAt.toISOString(),serverNow:now.toISOString(),deadline:session.deadline.toISOString(),
    ...current,intake:runtime.intake,extension:runtime.extension,coreCompletedAt:runtime.coreCompletedAt,
    parts:selected(session,now).map(p=>candidateReadinessPart(p.id,manifest.pack)),
    writing:current.stage==='WRITING'?{id:manifest.itemIds.W1,prompt:manifest.pack.writing.prompt,instructions:manifest.pack.writing.instructions}:null,
    responses:session.responses.map(r=>({...response(r),stableKey:Object.entries(manifest.itemIds).find(([,id])=>id===r.questionId)![0]})),
    itemIds:Object.fromEntries(selected(session,now).flatMap(p=>p.items.map(q=>[q.id,manifest.itemIds[q.id]]))),
    report:released?{decision:released.decision,notes:released.notes,writing:released.writing,speaking:released.speaking,aiWritingUsed:!!assessment?.writingRunId,aiSpeakingUsed:!!assessment?.speakingRunId}:null,
  };
}
export type ReadinessDto=ReturnType<typeof dto>;

export async function inviteReadiness(input:{actorUserId:string;recipientId:string;cohort:string}) {
  const cohort=z.string().regex(/^[A-Za-z0-9_-]{1,80}$/u).parse(input.cohort);
  return diagnosticTransaction(async tx=>{
    await requireReadinessStaff(tx,input.actorUserId);await active(tx,input.recipientId);
    const recipient=await tx.user.findUniqueOrThrow({where:{id:input.recipientId},select:{role:true}});
    if(recipient.role!=='STUDENT')throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
    const now=await diagnosticNow(tx);
    const blueprint=await tx.testBlueprint.findFirst({where:{code:'IELTSLAB_READINESS_V2_ACADEMIC',status:'PUBLISHED',fixedTestVersion:{contentHash:readinessPackHash(loadReadinessPack())}},orderBy:{version:'desc'}});
    if(!blueprint||blueprint.status!=='PUBLISHED')throw new DiagnosticError('CONTENT_NOT_READY',409);
    const invite=await tx.diagnosticInvitation.create({data:{recipientId:input.recipientId,issuedById:input.actorUserId,blueprintId:blueprint.id,cohort,createdAt:now,expiresAt:new Date(now.getTime()+7*86400000)}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'READINESS_INVITED',targetType:'DiagnosticInvitation',targetId:invite.id,reason:`Free readiness invitation: ${cohort}`}});
    return {id:invite.id,expiresAt:invite.expiresAt.toISOString(),cohort};
  });
}
export async function listReadiness(userId:string) {
  return diagnosticTransaction(async tx=>{
    await active(tx,userId);const now=await diagnosticNow(tx);
    return tx.diagnosticInvitation.findMany({where:{recipientId:userId,cohort:{not:null},blueprint:{code:{startsWith:'IELTSLAB_READINESS_V2_'}},revokedAt:null,
      OR:[{expiresAt:{gt:now}},{session:{isNot:null}}]},select:{id:true,cohort:true,expiresAt:true,session:{select:{id:true,state:true}}},orderBy:{createdAt:'desc'}});
  });
}
export async function startReadiness(input:{userId:string;invitationId:string;intake:unknown}) {
  const intake=readinessIntakeSchema.parse(input.intake);
  return diagnosticTransaction(async tx=>{
    await active(tx,input.userId);
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticInvitation" WHERE id=${input.invitationId}::uuid AND "recipientId"=${input.userId}::uuid FOR UPDATE`;
    const invite=await tx.diagnosticInvitation.findFirst({where:{id:input.invitationId,recipientId:input.userId},include:{session:true,blueprint:true}});
    if(!invite||!invite.cohort||!invite.blueprint.code.startsWith('IELTSLAB_READINESS_V2_'))throw new DiagnosticError('NOT_FOUND',404);
    const now=await diagnosticNow(tx);
    if(invite.session)return dto(await advance(tx,await owned(tx,invite.session.id,input.userId),now),now);
    if(invite.revokedAt||invite.expiresAt<=now)throw new DiagnosticError('INVITATION_UNAVAILABLE',403);
    const pathway=intake.pathway==='GENERAL_TRAINING'?'GENERAL_TRAINING':'ACADEMIC';
    const pack=loadReadinessPack();const packHash=readinessPackHash(pack);
    const blueprint=await tx.testBlueprint.findFirst({where:{code:`IELTSLAB_READINESS_V2_${pathway}`,status:'PUBLISHED',fixedTestVersion:{contentHash:packHash}},orderBy:{version:'desc'},include:{fixedTestVersion:{include:{sections:{include:{parts:{include:{questionGroups:{include:{questions:true}}}}}}}}}});
    if(!blueprint||blueprint.status!=='PUBLISHED'||blueprint.fixedTestVersion?.status!=='PUBLISHED'||blueprint.fixedTestVersion.contentHash!==packHash)throw new DiagnosticError('CONTENT_NOT_READY',409);
    const rows=blueprint.fixedTestVersion.sections.flatMap(s=>s.parts.flatMap(p=>p.questionGroups.flatMap(g=>g.questions)));
    const manifest:Manifest={profile:'IELTSLAB_READINESS_V2',packHash,pack,pathway,itemIds:Object.fromEntries(rows.map(q=>[q.stableKey,q.id]))};
    const expectedKeys=[...pack.parts.filter(p=>p.pathway==='BOTH'||p.pathway===pathway).flatMap(p=>p.items.map(q=>q.id)),'W1'];
    if(rows.length!==expectedKeys.length||expectedKeys.some(k=>!manifest.itemIds[k]))throw new DiagnosticError('CONTENT_INTEGRITY',409);
    await tx.diagnosticInvitation.update({where:{id:invite.id},data:{blueprintId:blueprint.id}});
    const session=await tx.diagnosticSession.create({data:{userId:input.userId,invitationId:invite.id,blueprintId:blueprint.id,startedAt:now,
      deadline:new Date(now.getTime()+3060000),manifest:json(manifest),manifestHash:readinessPackHash(manifest),readiness:json({intake,extension:null,coreCompletedAt:null})}});
    await tx.diagnosticResponse.createMany({data:rows.map(q=>({sessionId:session.id,questionId:q.id}))});
    return dto(await tx.diagnosticSession.findUniqueOrThrow({where:{id:session.id},include}),now);
  });
}
export async function loadReadiness(input:{userId:string;sessionId:string}) {
  return diagnosticTransaction(async tx=>{const s=await owned(tx,input.sessionId,input.userId);const now=await diagnosticNow(tx);return dto(await advance(tx,s,now),now);});
}
function requireWriter(session:Session,token:string,now:Date) {
  if(!/^[A-Za-z0-9_-]{43}$/u.test(token)||!session.writerTokenHash||!session.writerExpiresAt||session.writerExpiresAt<=now
    ||!timingSafeEqual(Buffer.from(hashToken(token),'hex'),Buffer.from(session.writerTokenHash,'hex')))throw new DiagnosticError('WRITER_REQUIRED',409);
}
export async function claimReadinessWriter(input:{userId:string;sessionId:string;token:string}) {
  if(!/^[A-Za-z0-9_-]{43}$/u.test(input.token))throw new DiagnosticError('INVALID_RESPONSE',400);
  return diagnosticTransaction(async tx=>{
    let s=await owned(tx,input.sessionId,input.userId);const now=await diagnosticNow(tx);s=await advance(tx,s,now);
    if(s.state==='SUBMITTED')throw new DiagnosticError('SESSION_SUBMITTED',409);
    if(s.writerExpiresAt&&s.writerExpiresAt>now&&s.writerTokenHash!==hashToken(input.token))throw new DiagnosticError('WRITER_CONFLICT',409);
    s=await tx.diagnosticSession.update({where:{id:s.id},data:{writerTokenHash:hashToken(input.token),writerExpiresAt:new Date(now.getTime()+90000)},include});
    return dto(s,now);
  });
}
export async function saveReadiness(input:{userId:string;sessionId:string;token:string;questionId:string;expectedVersion:number;answer:string;markedForReview:boolean}) {
  return diagnosticTransaction(async tx=>{
    let s=await owned(tx,input.sessionId,input.userId);const now=await diagnosticNow(tx);s=await advance(tx,s,now);
    if(s.state==='SUBMITTED')throw new DiagnosticError('SESSION_SUBMITTED',409);requireWriter(s,input.token,now);
    const {manifest}=source(s);const current=clock(s,now);
    const permitted=current.stage==='WRITING'?[manifest.itemIds.W1]:selected(s,now).flatMap(p=>p.items.map(q=>manifest.itemIds[q.id]));
    if(!permitted.includes(input.questionId))throw new DiagnosticError('SECTION_NOT_ACTIVE',409);
    const value=z.string().max(20000).parse(input.answer);const r=s.responses.find(r=>r.questionId===input.questionId)!;
    if(r.version!==input.expectedVersion){if(r.version===input.expectedVersion+1&&r.answer===value&&r.markedForReview===input.markedForReview)return response(r);throw new DiagnosticError('RESPONSE_CONFLICT',409);}
    return response(await tx.diagnosticResponse.update({where:{id:r.id},data:{answer:value,markedForReview:input.markedForReview,savedAt:now,version:{increment:1}}}));
  });
}
export async function finishReadiness(input:{userId:string;sessionId:string;token:string}) {
  return diagnosticTransaction(async tx=>{
    let s=await owned(tx,input.sessionId,input.userId);const now=await diagnosticNow(tx);s=await advance(tx,s,now);
    if(s.state==='SUBMITTED')return dto(s,now);requireWriter(s,input.token,now);
    const stage=clock(s,now).stage;const {runtime}=source(s);
    if(stage==='WRITING'&&!runtime.coreCompletedAt){runtime.coreCompletedAt=now.toISOString();
      if(runtime.extension){s=await tx.diagnosticSession.update({where:{id:s.id},data:{readiness:json(runtime),deadline:new Date(now.getTime()+540000),version:{increment:1}},include});return dto(s,now);}}
    else if(stage!=='EXTENSION_READING')throw new DiagnosticError('SECTION_NOT_ACTIVE',409);
    s=await tx.diagnosticSession.update({where:{id:s.id},data:{state:'SUBMITTED',submittedAt:now,readiness:json(runtime),writerTokenHash:null,writerExpiresAt:null,version:{increment:1}},include});
    await tx.diagnosticResponse.updateMany({where:{sessionId:s.id,finalizedAt:null},data:{finalizedAt:now}});
    return dto(await tx.diagnosticSession.findUniqueOrThrow({where:{id:s.id},include}),now);
  });
}

export async function readinessStaffView(actorUserId:string,sessionId?:string) {
  return diagnosticTransaction(async tx=>{
    const actor=await requireReadinessStaff(tx,actorUserId);
    const rows=await tx.diagnosticSession.findMany({where:{readiness:{not:Prisma.DbNull},...(sessionId?{id:sessionId}:{}),
      ...(actor.role==='ADMIN'?{}:{invitation:{issuedById:actorUserId}})},include,orderBy:{startedAt:'desc'},take:200});
    if(sessionId&&!rows.length)throw new DiagnosticError('NOT_FOUND',404);
    const now=await diagnosticNow(tx);
    const result=[];
    for(const row of rows){const s=await advance(tx,row,now);const {manifest,runtime}=source(s);
      const run=sessionId?await tx.diagnosticWritingRun.findFirst({where:{sessionId:s.id,promptVersion:READINESS_WRITING_PROMPT_VERSION,createdAt:{gt:new Date(now.getTime()-30*86400000)}},orderBy:{createdAt:'desc'},select:{id:true,state:true,feedback:true}}):null;
      const essay=s.responses.find(r=>r.questionId===manifest.itemIds.W1)!.answer;
      result.push({id:s.id,state:s.state,intake:runtime.intake,cohort:s.invitation.cohort,extension:runtime.extension,startedAt:s.startedAt.toISOString(),
        completionSeconds:s.submittedAt?(s.submittedAt.getTime()-s.startedAt.getTime())/1000:null,
        scores:s.state==='SUBMITTED'?scores(s):null,writing:essay,
        writingAi:{available:diagnosticAiAvailable()&&s.writingAiAdultAttested&&s.writingAiConsented&&!s.writingAiRevokedAt,
          run:run?{id:run.id,state:run.state,feedback:run.state==='SUCCEEDED'&&s.writingAiConsented&&!s.writingAiRevokedAt?parseReadinessWritingFeedback(run.feedback,essay):null}:null},
        assessment:s.assessment?{version:s.assessment.version,state:s.assessment.state,readiness:s.assessment.readiness}:null,
        ...(sessionId?{pack:manifest.pack,answers:answers(s,manifest)}:{})});}
    return result;
  });
}
/** Internal worker input from the frozen manifest, never current mutable content or browser data. */
export async function loadReadinessWritingInput(sessionId:string) {
 return diagnosticTransaction(async tx=>{
  const s=await tx.diagnosticSession.findUnique({where:{id:sessionId},include});
  if(!s)throw new DiagnosticError('NOT_FOUND',404);
  const {manifest}=source(s);
  if(s.state!=='SUBMITTED'||s.responses.some(r=>!r.finalizedAt))throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
  return {manifestHash:s.manifestHash,questionId:manifest.itemIds.W1,prompt:manifest.pack.writing.prompt,
    answer:s.responses.find(r=>r.questionId===manifest.itemIds.W1)!.answer,rubric:manifest.pack.writing.rubric,promptVersion:READINESS_WRITING_PROMPT_VERSION};
 });
}
export async function ensureReadinessWritingAssessment(input:{sessionId:string;actorUserId:string}) {
 return diagnosticTransaction(async tx=>{
  const actor=await requireReadinessStaff(tx,input.actorUserId);
  await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
  const s=await tx.diagnosticSession.findFirst({where:{id:input.sessionId,...(actor.role==='ADMIN'?{}:{invitation:{issuedById:input.actorUserId}})},include});
  if(!s)throw new DiagnosticError('NOT_FOUND',404);source(s);
  if(s.state!=='SUBMITTED')throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
  return tx.diagnosticAssessment.upsert({where:{sessionId:s.id},update:{},create:{sessionId:s.id,manifestHash:s.manifestHash,rawScores:json(scores(s))}});
 });
}
export async function markReadiness(input:{actorUserId:string;sessionId:string;marking:unknown}) {
  const marking=readinessMarkingSchema.parse(input.marking);
  return diagnosticTransaction(async tx=>{
    const actor=await requireReadinessStaff(tx,input.actorUserId);
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
    let s=await tx.diagnosticSession.findFirst({where:{id:input.sessionId,...(actor.role==='ADMIN'?{}:{invitation:{issuedById:input.actorUserId}})},include});
    if(!s)throw new DiagnosticError('NOT_FOUND',404);const now=await diagnosticNow(tx);s=await advance(tx,s,now);
    if(s.state!=='SUBMITTED')throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
    if(s.assessment?.state!=='DRAFT'&&s.assessment)throw new DiagnosticError('ASSESSMENT_RELEASED',409);
    if((s.assessment?.version??0)!==marking.expectedVersion)throw new DiagnosticError('ASSESSMENT_CONFLICT',409);
    if(marking.writingRunId){
      const consentVersion=await assertDiagnosticWritingAiConsent(tx,s.id);
      const run=await tx.diagnosticWritingRun.findFirst({where:{id:marking.writingRunId,sessionId:s.id,state:'SUCCEEDED',consentVersion,
        manifestHash:s.manifestHash,promptVersion:READINESS_WRITING_PROMPT_VERSION,createdAt:{gt:new Date(now.getTime()-30*86400000)}}});
      if(!run)throw new DiagnosticError('INVALID_RESPONSE',400);
    }
    if(marking.speakingRunId){
      const run=await tx.diagnosticSpeakingRun.findFirst({where:{id:marking.speakingRunId,state:'SUCCEEDED',promptVersion:READINESS_SPEAKING_PROMPT_VERSION,
        reviewedById:input.actorUserId,reviewedAt:{not:null},recording:{state:'READY',expiresAt:{gt:now},speaking:{sessionId:s.id,examinerId:input.actorUserId,
          adultAttested:true,aiConsented:true,recordingConsented:true,privacyRevokedAt:null}}},include:{recording:{include:{speaking:true}}}});
      if(!run||!marking.speaking||run.consentVersion!==run.recording.speaking.consentVersion)throw new DiagnosticError('INVALID_RESPONSE',400);
      try{reviewDiagnosticSpeakerTurns(validateDiagnosticSpeakingAnalysis(run.output,{durationMs:run.recording.durationMs!,hasAudio:true,readiness:true}),run.review as DiagnosticSpeakerAssignment[]);}catch{throw new DiagnosticError('INVALID_RESPONSE',400);}
    }
    const {runtime}=source(s);const raw=scores(s);
    const recommendation=recommendReadiness({...raw,...runtime.intake,writing:marking.writing,speaking:marking.speaking});
    const decision=marking.decision??recommendation.category;
    if(decision!==recommendation.category&&marking.overrideReason.length<10)throw new DiagnosticError('ASSESSMENT_INCOMPLETE',400);
    if(decision==='READY'&&!marking.speaking)throw new DiagnosticError('ASSESSMENT_INCOMPLETE',400);
    const result={writing:marking.writing,speaking:marking.speaking,notes:marking.notes,decision,recommendation,overrideReason:marking.overrideReason,writingRunId:marking.writingRunId??null,speakingRunId:marking.speakingRunId??null,
      meaning:'Internal IELTSLab readiness estimate; not an official IELTS band'};
    const data={manifestHash:s.manifestHash,rawScores:json(raw),readiness:json(result),writing:json({ratings:marking.writing}),writingRunId:marking.writingRunId??null,speakingRunId:marking.speakingRunId??null,speaking:json({ratings:marking.speaking,status:marking.speaking?'ASSESSED':'PENDING_OR_NOT_REQUIRED'}),
      reviewedById:input.actorUserId,version:{increment:1},...(marking.release?{state:'RELEASED',releasedAt:now,expiresAt:new Date(now.getTime()+90*86400000)}:{})};
    const assessment=s.assessment?await tx.diagnosticAssessment.update({where:{id:s.assessment.id},data}):await tx.diagnosticAssessment.create({data:{...data,sessionId:s.id,version:1}});
    if(marking.release)await tx.diagnosticWritingRun.updateMany({where:{sessionId:s.id,state:{in:['QUEUED','RUNNING']}},data:{state:'CANCELLED',leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'REPORT_RELEASED'}});
    if(marking.release)await tx.diagnosticSpeakingRun.updateMany({where:{recording:{speaking:{sessionId:s.id}},state:{in:['QUEUED','RUNNING']}},data:{state:'CANCELLED',leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'REPORT_RELEASED'}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:marking.release?'READINESS_RELEASED':'READINESS_MARKED',targetType:'DiagnosticSession',targetId:s.id,reason:marking.overrideReason||marking.notes,metadata:{decision,recommendation:recommendation.category,version:assessment.version}}});
    return {version:assessment.version,state:assessment.state,readiness:result};
  });
}
