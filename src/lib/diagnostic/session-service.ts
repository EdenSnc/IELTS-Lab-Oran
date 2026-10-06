import 'server-only';
import { createHash,randomBytes,timingSafeEqual } from 'node:crypto';
import { Prisma, type DiagnosticResponse } from '@prisma/client';
import {
  compileReadyDiagnosticContent, diagnosticNow, diagnosticTransaction,
  validateStoredDiagnosticContent, type DiagnosticTransaction,
} from './content-service';
import { assertDiagnosticResponseWritable,deriveDiagnosticWindow,DiagnosticTimingError } from './session-core';
import { DiagnosticError,type DiagnosticResponseDto,type DiagnosticSessionDto,type DiagnosticWriterDto } from './protocol';

const includeResponses={responses:true} satisfies Prisma.DiagnosticSessionInclude;
type StoredSession=Prisma.DiagnosticSessionGetPayload<{include:typeof includeResponses}>;

async function activeOwner(tx:DiagnosticTransaction,userId:string) {
  const user=await tx.user.findUnique({where:{id:userId},select:{status:true}});
  if(!user || user.status!=='ACTIVE') throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
}
async function ownedSession(tx:DiagnosticTransaction,sessionId:string,userId:string,lock=false) {
  await activeOwner(tx,userId);
  if(lock) await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${sessionId}::uuid AND "userId"=${userId}::uuid FOR UPDATE`;
  const session=await tx.diagnosticSession.findFirst({where:{id:sessionId,userId},include:includeResponses});
  if(!session) throw new DiagnosticError('NOT_FOUND',404);
  const source=await validateStoredDiagnosticContent(tx,session);
  if(session.responses.length!==source.manifest.questions.length
    || session.responses.some(r=>!source.manifest.questions.some(q=>q.questionId===r.questionId))) throw new DiagnosticError('CONTENT_INTEGRITY',409);
  return {session,...source};
}
function responseDto(r:DiagnosticResponse):DiagnosticResponseDto {
  return {questionId:r.questionId,answer:r.answer,markedForReview:r.markedForReview,version:r.version,
    savedAt:r.savedAt?.toISOString()??null,finalizedAt:r.finalizedAt?.toISOString()??null};
}
function sessionDto(session:StoredSession,now:Date):DiagnosticSessionDto {
  const window=deriveDiagnosticWindow({startedAt:session.startedAt,now});
  const terminal=session.state==='SUBMITTED';
  return {id:session.id,invitationId:session.invitationId,blueprintId:session.blueprintId,
    state:terminal?'SUBMITTED':'ACTIVE',startedAt:session.startedAt.toISOString(),deadline:session.deadline.toISOString(),
    submittedAt:session.submittedAt?.toISOString()??null,version:session.version,serverNow:now.toISOString(),
    window:{stage:terminal?'SUBMITTED':window.stage,sectionDeadline:terminal?null:window.sectionDeadline?.toISOString()??null,
      absoluteDeadline:window.absoluteDeadline.toISOString(),remainingSeconds:terminal?0:window.remainingSeconds},
    responses:session.responses.map(responseDto).sort((a,b)=>a.questionId.localeCompare(b.questionId))};
}
const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
function tokenMatches(session:StoredSession,token:unknown):boolean {
  if(typeof token!=='string'|| !/^[A-Za-z0-9_-]{43}$/u.test(token) || !session.writerTokenHash) return false;
  return timingSafeEqual(Buffer.from(hashToken(token),'hex'),Buffer.from(session.writerTokenHash,'hex'));
}
function requireWriter(session:StoredSession,token:unknown,now:Date,allowExpired=false) {
  if(!tokenMatches(session,token) || !session.writerExpiresAt || (!allowExpired && session.writerExpiresAt<=now)) {
    throw new DiagnosticError('WRITER_REQUIRED',409);
  }
}

export async function createDiagnosticSession(input:{invitationId:string;userId:string}):Promise<DiagnosticSessionDto> {
  const seed=randomBytes(32).toString('base64url');
  return diagnosticTransaction(async tx=>{
    await activeOwner(tx,input.userId);
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticInvitation" WHERE id=${input.invitationId}::uuid AND "recipientId"=${input.userId}::uuid FOR UPDATE`;
    const invitation=await tx.diagnosticInvitation.findFirst({where:{id:input.invitationId,recipientId:input.userId},include:{session:true}});
    if(!invitation) throw new DiagnosticError('NOT_FOUND',404);
    // Replay/resume wins over invitation expiry and never selects content again.
    if(invitation.session) {
      const {session}=await ownedSession(tx,invitation.session.id,input.userId,true);
      return sessionDto(session,await diagnosticNow(tx));
    }
    let now=await diagnosticNow(tx);
    if(invitation.revokedAt || invitation.expiresAt<=now) throw new DiagnosticError('INVITATION_UNAVAILABLE',403);
    const compiled=await compileReadyDiagnosticContent(tx,{blueprintId:invitation.blueprintId,seed,now});
    now=await diagnosticNow(tx);
    if(invitation.expiresAt<=now) throw new DiagnosticError('INVITATION_UNAVAILABLE',403);
    if(compiled.payload.diagnostic.reviews.some(r=>Date.parse(r.reviewDueAt)<=now.getTime())) throw new DiagnosticError('CONTENT_NOT_READY',409);
    // All slots and the consumed invitation link commit together, or none do.
    const created=await tx.diagnosticSession.create({data:{
      invitationId:invitation.id,userId:input.userId,blueprintId:invitation.blueprintId,
      manifest:compiled.payload as unknown as Prisma.InputJsonValue,manifestHash:compiled.contentHash,
      startedAt:now,deadline:new Date(now.getTime()+3600000),
    }});
    await tx.diagnosticResponse.createMany({data:compiled.payload.questions.map(q=>({sessionId:created.id,questionId:q.questionId}))});
    const session=await tx.diagnosticSession.findUniqueOrThrow({where:{id:created.id},include:includeResponses});
    return sessionDto(session,now);
  });
}

/** Trusted delivery/asset boundary. Server-only: never serialize this return value. */
export async function loadOwnedDiagnosticSource(input:{sessionId:string;userId:string}) {
  return diagnosticTransaction(async tx=>({
    ...await ownedSession(tx,input.sessionId,input.userId),now:await diagnosticNow(tx),
  }));
}

export async function loadDiagnosticSession(input:{sessionId:string;userId:string}):Promise<DiagnosticSessionDto> {
  return diagnosticTransaction(async tx=>{
    const {session}=await ownedSession(tx,input.sessionId,input.userId);
    return sessionDto(session,await diagnosticNow(tx));
  });
}

export async function acquireDiagnosticWriter(input:{sessionId:string;userId:string;previousToken?:string}):Promise<DiagnosticWriterDto> {
  return diagnosticTransaction(async tx=>{
    const {session}=await ownedSession(tx,input.sessionId,input.userId,true);
    const now=await diagnosticNow(tx);
    if(session.state==='SUBMITTED') throw new DiagnosticError('SESSION_SUBMITTED',409);
    if(now>=session.deadline) throw new DiagnosticError('SESSION_EXPIRED',409);
    const renewing=tokenMatches(session,input.previousToken) && !!session.writerExpiresAt && session.writerExpiresAt>now;
    if(!renewing && session.writerExpiresAt && session.writerExpiresAt>now) throw new DiagnosticError('WRITER_CONFLICT',409);
    const writerToken=renewing?input.previousToken!:randomBytes(32).toString('base64url');
    const expiresAt=new Date(now.getTime()+90000);
    const updated=await tx.diagnosticSession.update({where:{id:session.id},data:{writerTokenHash:hashToken(writerToken),writerExpiresAt:expiresAt,version:{increment:1}},include:includeResponses});
    return {writerToken,expiresAt:expiresAt.toISOString(),session:sessionDto(updated,now)};
  });
}

export async function saveDiagnosticResponse(input:{
  sessionId:string;userId:string;writerToken:string;questionId:string;expectedVersion:number;
  answer:string;markedForReview:boolean;
}):Promise<DiagnosticResponseDto> {
  return diagnosticTransaction(async tx=>{
    const {session,manifest}=await ownedSession(tx,input.sessionId,input.userId,true);
    const now=await diagnosticNow(tx);
    requireWriter(session,input.writerToken,now);
    if(session.state==='SUBMITTED') throw new DiagnosticError('SESSION_SUBMITTED',409);
    if(typeof input.answer!=='string' || input.answer.length>20000 || typeof input.markedForReview!=='boolean'
      || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<0) throw new DiagnosticError('INVALID_RESPONSE',400);
    const question=manifest.questions.find(q=>q.questionId===input.questionId);
    if(!question) throw new DiagnosticError('NOT_FOUND',404);
    try {assertDiagnosticResponseWritable({startedAt:session.startedAt,now,skill:question.skill});}
    catch(error){
      if(error instanceof DiagnosticTimingError) throw new DiagnosticError(error.code==='SESSION_EXPIRED'?'SESSION_EXPIRED':'SECTION_NOT_ACTIVE',409);
      throw error;
    }
    const response=session.responses.find(r=>r.questionId===input.questionId)!;
    if(response.version!==input.expectedVersion) {
      if(response.version===input.expectedVersion+1 && response.answer===input.answer && response.markedForReview===input.markedForReview) return responseDto(response);
      throw new DiagnosticError('RESPONSE_CONFLICT',409);
    }
    const updated=await tx.diagnosticResponse.update({where:{id:response.id},data:{
      answer:input.answer,markedForReview:input.markedForReview,savedAt:now,version:{increment:1},
    }});
    await tx.diagnosticSession.update({where:{id:session.id},data:{version:{increment:1}}});
    return responseDto(updated);
  });
}

export async function submitDiagnosticSession(input:{sessionId:string;userId:string;writerToken:string}):Promise<DiagnosticSessionDto> {
  return diagnosticTransaction(async tx=>{
    const {session}=await ownedSession(tx,input.sessionId,input.userId,true);
    const now=await diagnosticNow(tx);
    if(session.state==='SUBMITTED') return sessionDto(session,now);
    // Late authenticated owner can finalize persisted work after a lost lease or
    // suspended tab; this path never accepts any answers or extends any deadline.
    if(now<session.deadline) requireWriter(session,input.writerToken,now);
    await tx.diagnosticResponse.updateMany({where:{sessionId:session.id},data:{finalizedAt:now}});
    const submitted=await tx.diagnosticSession.update({where:{id:session.id},data:{
      state:'SUBMITTED',submittedAt:now,writerTokenHash:null,writerExpiresAt:null,version:{increment:1},
    },include:includeResponses});
    return sessionDto(submitted,now);
  });
}
