import 'server-only';
import { randomBytes } from 'node:crypto';
import type { DiagnosticInvitation } from '@prisma/client';
import prisma from '@/lib/prisma';
import { compileReadyDiagnosticContent, diagnosticNow, diagnosticTransaction, type DiagnosticTransaction } from './content-service';
import { DiagnosticError, type DiagnosticInvitationDto } from './protocol';

async function assertStaff(tx: DiagnosticTransaction, actorUserId: string) {
  // Re-read database authority on every staff action; callers cannot supply role.
  const actor = await tx.user.findUnique({ where: { id: actorUserId }, select:{role:true,status:true} });
  if (!actor || actor.status !== 'ACTIVE' || !['ADMIN','TEACHER','CONTENT_REVIEWER'].includes(actor.role)) {
    throw new DiagnosticError('STAFF_REQUIRED',403);
  }
}
function invitationDto(invitation: DiagnosticInvitation & {session: {id:string} | null}, now: Date): DiagnosticInvitationDto {
  return {
    id:invitation.id,blueprintId:invitation.blueprintId,createdAt:invitation.createdAt.toISOString(),
    expiresAt:invitation.expiresAt.toISOString(),revokedAt:invitation.revokedAt?.toISOString()??null,
    sessionId:invitation.session?.id??null,
    status:invitation.session?'STARTED':invitation.revokedAt?'REVOKED':invitation.expiresAt<=now?'EXPIRED':'AVAILABLE',
  };
}

/** Called only by privileged endpoints after trusted authentication/AAL2. */
export async function issueDiagnosticInvitation(input: {
  recipientId:string;blueprintId:string;actorUserId:string;
}): Promise<DiagnosticInvitationDto> {
  return diagnosticTransaction(async tx => {
    await assertStaff(tx,input.actorUserId);
    const recipient=await tx.user.findUnique({where:{id:input.recipientId},select:{status:true,role:true}});
    if(!recipient || recipient.status!=='ACTIVE' || recipient.role!=='STUDENT') throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
    const now=await diagnosticNow(tx);
    await compileReadyDiagnosticContent(tx,{blueprintId:input.blueprintId,seed:randomBytes(32).toString('base64url'),now});
    const invitation=await tx.diagnosticInvitation.create({data:{
      recipientId:input.recipientId,issuedById:input.actorUserId,blueprintId:input.blueprintId,
      createdAt:now,expiresAt:new Date(now.getTime()+7*86400000),
    },include:{session:{select:{id:true}}}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_INVITATION_ISSUED',
      targetType:'DiagnosticInvitation',targetId:invitation.id,reason:'Staff-invited free diagnostic',metadata:{recipientId:input.recipientId,blueprintId:input.blueprintId}}});
    return invitationDto(invitation,now);
  });
}

export async function revokeDiagnosticInvitation(input: {
  invitationId:string;actorUserId:string;reason:string;
}): Promise<DiagnosticInvitationDto> {
  return diagnosticTransaction(async tx => {
    await assertStaff(tx,input.actorUserId);
    if(typeof input.reason!=='string' || !input.reason.trim() || input.reason.length>2000) throw new DiagnosticError('INVALID_RESPONSE',400);
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticInvitation" WHERE id=${input.invitationId}::uuid FOR UPDATE`;
    const invitation=await tx.diagnosticInvitation.findUnique({where:{id:input.invitationId},include:{session:{select:{id:true}}}});
    if(!invitation) throw new DiagnosticError('NOT_FOUND',404);
    if(invitation.session) throw new DiagnosticError('INVITATION_CONSUMED',409);
    const now=await diagnosticNow(tx);
    if(invitation.revokedAt) return invitationDto(invitation,now);
    const revoked=await tx.diagnosticInvitation.update({where:{id:invitation.id},data:{revokedAt:now,revocationReason:input.reason.trim()},include:{session:{select:{id:true}}}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_INVITATION_REVOKED',
      targetType:'DiagnosticInvitation',targetId:invitation.id,reason:input.reason.trim()}});
    return invitationDto(revoked,now);
  });
}

export async function listDiagnosticInvitations(userId:string): Promise<DiagnosticInvitationDto[]> {
  const user=await prisma.user.findUnique({where:{id:userId},select:{status:true}});
  if(!user || user.status!=='ACTIVE') throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
  const invitations=await prisma.diagnosticInvitation.findMany({where:{recipientId:userId,blueprint:{NOT:{code:{startsWith:'IELTSLAB_READINESS_V2_'}}}},include:{session:{select:{id:true}}},orderBy:{createdAt:'desc'}});
  // Listing cannot mutate state; time is still sampled from the database.
  const [{now}]=await prisma.$queryRaw<Array<{now:Date}>>`SELECT date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC' AS now`;
  return invitations.map(i=>invitationDto(i,now));
}
