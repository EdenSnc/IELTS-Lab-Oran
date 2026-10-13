import 'server-only';
import { Prisma, type DiagnosticAssessment } from '@prisma/client';
import { diagnosticNow, diagnosticTransaction, type DiagnosticTransaction } from './content-service';
import { gradeDiagnosticSubmission } from './grading-service';
import { type DiagnosticRawScore } from './grading-core';
import { DiagnosticError } from './protocol';
import { diagnosticAssessmentEditSchema, diagnosticSpeakingFeedbackSchema, type DiagnosticAssessmentEdit, type DiagnosticSpeakingFeedback } from './assessment-core';
import { parseDiagnosticWritingFeedback, type DiagnosticWritingFeedback } from './writing-core';
import { loadOwnedDiagnosticSource } from './session-service';
import {validateDiagnosticSpeakingAnalysis,reviewDiagnosticSpeakerTurns,type DiagnosticSpeakerAssignment} from './analysis-core';

export async function assertDiagnosticExaminer(tx: DiagnosticTransaction, input: { sessionId: string; actorUserId: string }) {
  const actor = await tx.user.findUnique({ where: { id: input.actorUserId }, select: { role: true, status: true } });
  if (!actor || actor.status !== 'ACTIVE' || !['TEACHER','ADMIN'].includes(actor.role)) throw new DiagnosticError('STAFF_REQUIRED',403);
  const session = await tx.diagnosticSession.findFirst({ where: { id: input.sessionId,
    ...(actor.role === 'ADMIN' ? {} : { invitation: { issuedById: input.actorUserId } }) } });
  if (!session) throw new DiagnosticError('NOT_FOUND',404);
  if (session.state !== 'SUBMITTED') throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
  return session;
}
export type DiagnosticAssessmentDto = {
  state: 'DRAFT' | 'RELEASED' | 'EXPIRED'; version: number; rawScores: DiagnosticRawScore[];
  writing: DiagnosticWritingFeedback | null; speaking: DiagnosticSpeakingFeedback | null;
  nextSteps: string[]; writingRunId: string | null; speakingRunId:string|null; releasedAt: string | null; expiresAt: string | null;
};
function dto(row: DiagnosticAssessment): DiagnosticAssessmentDto {
  return { state: row.state as DiagnosticAssessmentDto['state'], version: row.version,
    rawScores: row.rawScores as DiagnosticRawScore[], writing: row.writing as DiagnosticWritingFeedback | null,
    speaking: row.speaking as DiagnosticSpeakingFeedback | null, nextSteps: row.nextSteps as string[],
    writingRunId: row.writingRunId,speakingRunId:row.speakingRunId, releasedAt: row.releasedAt?.toISOString() ?? null, expiresAt: row.expiresAt?.toISOString() ?? null };
}
async function lockAssessment(tx: DiagnosticTransaction, input: { sessionId: string; actorUserId: string }) {
  await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
  await assertDiagnosticExaminer(tx,input);
  const row = await tx.diagnosticAssessment.findUnique({ where: { sessionId: input.sessionId } });
  if (!row) throw new DiagnosticError('NOT_FOUND',404);
  return row;
}
export async function loadDiagnosticAssessment(input: { sessionId: string; actorUserId: string }): Promise<DiagnosticAssessmentDto> {
  // Immutable finalized source is assessed outside the short persistence transaction.
  const graded = await gradeDiagnosticSubmission(input);
  return diagnosticTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
    await assertDiagnosticExaminer(tx,input);
    const row = await tx.diagnosticAssessment.upsert({ where: { sessionId: input.sessionId }, update: {}, create: {
      sessionId: input.sessionId, manifestHash: graded.manifestHash, rawScores: graded.scores,
    } });
    if (row.manifestHash !== graded.manifestHash) throw new DiagnosticError('CONTENT_INTEGRITY',409);
    return dto(row);
  });
}
export async function saveDiagnosticAssessment(input: { sessionId: string; actorUserId: string } & DiagnosticAssessmentEdit): Promise<DiagnosticAssessmentDto> {
  const edit = diagnosticAssessmentEditSchema.parse({ expectedVersion: input.expectedVersion, writing: input.writing,
    speaking: input.speaking, nextSteps: input.nextSteps, writingRunId: input.writingRunId,speakingRunId:input.speakingRunId });
  const target = await diagnosticTransaction(tx => assertDiagnosticExaminer(tx,input));
  const source = await loadOwnedDiagnosticSource({ sessionId: input.sessionId, userId: target.userId });
  const writingQuestion = source.manifest.questions.find(q => q.skill === 'WRITING')!;
  const answer = source.session.responses.find(response => response.questionId === writingQuestion.questionId)!.answer;
  let writing;
  try { writing = parseDiagnosticWritingFeedback(edit.writing,answer); }
  catch { throw new DiagnosticError('INVALID_RESPONSE',400); }
  return diagnosticTransaction(async tx => {
    const row = await lockAssessment(tx,input);
    if (row.state !== 'DRAFT') throw new DiagnosticError('ASSESSMENT_RELEASED',409);
    if (row.version !== edit.expectedVersion) throw new DiagnosticError('ASSESSMENT_CONFLICT',409);
    if (edit.writingRunId && !await tx.diagnosticWritingRun.findFirst({ where: { id: edit.writingRunId, sessionId: input.sessionId, state: 'SUCCEEDED' } })) throw new DiagnosticError('INVALID_RESPONSE',400);
    if(edit.speakingRunId){
      const run=await tx.diagnosticSpeakingRun.findFirst({where:{id:edit.speakingRunId,state:'SUCCEEDED',reviewedAt:{not:null},
        reviewedById:input.actorUserId,recording:{state:'READY',expiresAt:{gt:await diagnosticNow(tx)},speaking:{sessionId:input.sessionId,examinerId:input.actorUserId,
          adultAttested:true,aiConsented:true,recordingConsented:true,privacyRevokedAt:null,session:{user:{status:'ACTIVE'}}}}},include:{recording:{include:{speaking:true}}}});
      if(!run||!edit.speaking||run.consentVersion!==run.recording.speaking.consentVersion)throw new DiagnosticError('INVALID_RESPONSE',400);
      try{reviewDiagnosticSpeakerTurns(validateDiagnosticSpeakingAnalysis(run.output,{durationMs:run.recording.durationMs!,hasAudio:true}),run.review as DiagnosticSpeakerAssignment[]);}
      catch{throw new DiagnosticError('INVALID_RESPONSE',400);}
    }
    const saved = await tx.diagnosticAssessment.update({ where: { id: row.id }, data: {
      writing, speaking: edit.speaking ?? Prisma.DbNull, nextSteps: edit.nextSteps,
      writingRunId: edit.writingRunId ?? null,speakingRunId:edit.speakingRunId??null, reviewedById: input.actorUserId, version: { increment: 1 }, updatedAt: await diagnosticNow(tx),
    } });
    await tx.staffActionAudit.create({ data: { actorUserId: input.actorUserId, action: 'DIAGNOSTIC_ASSESSMENT_EDITED',
      targetType: 'DiagnosticSession', targetId: input.sessionId, reason: 'Examiner feedback saved', metadata: { version: saved.version } } });
    return dto(saved);
  });
}
export async function releaseDiagnosticAssessment(input: { sessionId: string; actorUserId: string; expectedVersion: number; speakingConductedInPerson?: boolean }): Promise<DiagnosticAssessmentDto> {
  return diagnosticTransaction(async tx => {
    const row = await lockAssessment(tx,input);
    if (row.state === 'RELEASED') return dto(row); // Duplicate acknowledgement must not extend retention.
    if (row.state !== 'DRAFT') throw new DiagnosticError('ASSESSMENT_RELEASED',409);
    if (row.version !== input.expectedVersion) throw new DiagnosticError('ASSESSMENT_CONFLICT',409);
    if (!row.writing || !row.speaking || !row.reviewedById || input.speakingConductedInPerson !== true) throw new DiagnosticError('ASSESSMENT_INCOMPLETE',409);
    const interview=await tx.diagnosticSpeakingSession.findUnique({where:{sessionId:input.sessionId},select:{state:true}});
    if(interview?.state!=='COMPLETED')throw new DiagnosticError('ASSESSMENT_INCOMPLETE',409);
    diagnosticSpeakingFeedbackSchema.parse(row.speaking);
    const now = await diagnosticNow(tx);
    const saved = await tx.diagnosticAssessment.update({ where: { id: row.id }, data: {
      state: 'RELEASED', releasedAt: now, expiresAt: new Date(now.getTime()+90*86400000),
      reviewedById: input.actorUserId, updatedAt: now, version: { increment: 1 },
    } });
    await tx.diagnosticWritingRun.updateMany({ where: { sessionId: input.sessionId, state: { in: ['QUEUED','RUNNING'] } },
      data: { state: 'CANCELLED', leaseOwner: null, leaseExpiresAt: null, completedAt: now, errorCode: 'REPORT_RELEASED' } });
    await tx.diagnosticSpeakingRun.updateMany({where:{recording:{speaking:{sessionId:input.sessionId}},state:{in:['QUEUED','RUNNING']}},
      data:{state:'CANCELLED',leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'REPORT_RELEASED'}});
    await tx.staffActionAudit.create({ data: { actorUserId: input.actorUserId, action: 'DIAGNOSTIC_REPORT_RELEASED',
      targetType: 'DiagnosticSession', targetId: input.sessionId, reason: 'Examiner explicitly approved diagnostic feedback', metadata: { version: saved.version } } });
    return dto(saved);
  });
}
export type DiagnosticReportDto = { state: 'PENDING' } | { state: 'EXPIRED' } | {
  state: 'RELEASED'; rawScores: DiagnosticRawScore[]; writing: DiagnosticWritingFeedback; speaking: DiagnosticSpeakingFeedback;
  nextSteps: string[]; aiWritingUsed: boolean; releasedAt: string; expiresAt: string;
};
export async function loadDiagnosticReport(input: { sessionId: string; userId: string }): Promise<DiagnosticReportDto> {
  return diagnosticTransaction(async tx => {
    const target = await tx.diagnosticSession.findFirst({ where: { id: input.sessionId, userId: input.userId, user: { status: 'ACTIVE' } }, select: { id: true } });
    if (!target) throw new DiagnosticError('NOT_FOUND',404);
    const row = await tx.diagnosticAssessment.findUnique({ where: { sessionId: input.sessionId } });
    if (!row || row.state === 'DRAFT') return { state: 'PENDING' };
    if (row.state === 'EXPIRED' || !row.expiresAt || row.expiresAt <= await diagnosticNow(tx)) return { state: 'EXPIRED' };
    const value = dto(row);
    // Explicit learner projection; no private runs, source keys, essays or staff notes.
    return { state: 'RELEASED', rawScores: value.rawScores, writing: value.writing!, speaking: value.speaking!, nextSteps: value.nextSteps,
      aiWritingUsed: !!value.writingRunId, releasedAt: value.releasedAt!, expiresAt: value.expiresAt! };
  });
}
