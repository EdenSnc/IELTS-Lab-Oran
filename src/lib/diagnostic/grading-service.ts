import 'server-only';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { assertSupportedAnswerKeyFormatVersion, normalizationSchema, objectiveAnswerKeySchema } from '@/lib/grading/objective-scoring-core';
import { loadOwnedDiagnosticSource } from './session-service';
import { gradeDiagnosticRaw, type DiagnosticObjectiveGroup } from './grading-core';
import { DiagnosticError } from './protocol';

/** Internal assessment only. No key, correct answer or essay is returned to a learner. */
export async function gradeDiagnosticSubmission(input: { sessionId: string; actorUserId: string }) {
  const actor = await prisma.user.findUnique({ where: { id: input.actorUserId }, select: { role: true, status: true } });
  if (!actor || actor.status !== 'ACTIVE' || !['TEACHER', 'ADMIN'].includes(actor.role)) throw new DiagnosticError('STAFF_REQUIRED', 403);
  const target = await prisma.diagnosticSession.findFirst({ where: { id: input.sessionId,
    ...(actor.role === 'ADMIN' ? {} : { invitation: { issuedById: input.actorUserId } }) }, select: { userId: true } });
  if (!target) throw new DiagnosticError('NOT_FOUND', 404);
  const source = await loadOwnedDiagnosticSource({ sessionId: input.sessionId, userId: target.userId });
  if (source.session.state !== 'SUBMITTED' || source.session.responses.some(response => !response.finalizedAt)) throw new DiagnosticError('WRITTEN_NOT_SUBMITTED', 409);
  const selected = source.manifest.parts.filter(part => ['LISTENING', 'READING'].includes(part.skill)).flatMap(part => part.groupIds);
  const records = await prisma.answerKey.findMany({ where: { questionGroupId: { in: selected } },
    select: { questionGroupId: true, encryptedPayload: true, formatVersion: true, normalization: true, reviewStatus: true } });
  let scores;
  try {
    const groups: DiagnosticObjectiveGroup[] = selected.map(id => {
      const group = source.parts.flatMap(part => part.questionGroups).find(item => item.id === id)!;
      const record = records.find(item => item.questionGroupId === id);
      if (!record || record.reviewStatus !== 'VERIFIED' || !['PER_ITEM_EXACT', 'UNORDERED_EXACT_SET'].includes(group.scoringStrategy)) throw new Error('KEY_UNAVAILABLE');
      assertSupportedAnswerKeyFormatVersion(record.formatVersion);
      return { id, maxMarks: group.maxMarks, scoringStrategy: group.scoringStrategy as DiagnosticObjectiveGroup['scoringStrategy'],
        questions: group.questions.map(question => ({ id: question.id, stableKey: question.stableKey, maxMarks: question.maxMarks })),
        answerKey: objectiveAnswerKeySchema.parse(JSON.parse(decrypt(record.encryptedPayload))), normalization: normalizationSchema.parse(record.normalization ?? {}) };
    });
    scores = gradeDiagnosticRaw({ manifest: source.manifest, groups, responses: source.session.responses });
  } catch {
    // No decrypted keys, accepted alternatives, essays or provider payloads in logs.
    console.error('DIAGNOSTIC_OBJECTIVE_GRADING_FAILED', { sessionId: input.sessionId });
    throw new DiagnosticError('CONTENT_INTEGRITY', 409);
  }
  return { manifestHash: source.session.manifestHash, scores };
}
