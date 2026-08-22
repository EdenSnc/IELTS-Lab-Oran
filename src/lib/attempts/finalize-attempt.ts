import { Prisma, type Skill } from '@prisma/client';
import { roundOverallBand } from '@/lib/grading/writing-run-core';
import { hashFrozenManifestPayload, parseFrozenManifestPayload } from './manifest-core';

export async function finalizeAttemptIfReady(
  transaction: Prisma.TransactionClient,
  attemptId: string,
  now = new Date(),
) {
  await transaction.$queryRaw(Prisma.sql`
    SELECT id FROM app_private."AssessmentAttempt"
    WHERE id = ${attemptId}::uuid
    FOR UPDATE
  `);
  const attempt = await transaction.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { manifest: true, speakingAppointment: true, skillScores: true },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');

  const requiredSkills = new Set<Skill>();
  if (attempt.manifest) {
    const manifest = parseFrozenManifestPayload(attempt.manifest.payload);
    if (hashFrozenManifestPayload(manifest) !== attempt.manifest.contentHash) {
      throw new Error('ATTEMPT_MANIFEST_HASH_MISMATCH');
    }
    manifest.questions.forEach((question) => requiredSkills.add(question.skill as Skill));
  }
  if (attempt.speakingAppointment) requiredSkills.add('SPEAKING');
  const finalScores = new Map(attempt.skillScores.map((score) => [score.skill, score]));
  const complete = requiredSkills.size > 0
    && [...requiredSkills].every((skill) => finalScores.has(skill));
  if (!complete) return { completed: false as const, overallBand: null };

  let overallBand: number | null = null;
  const fourSkills: Skill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
  if (fourSkills.every((skill) => finalScores.has(skill))) {
    const bands = fourSkills.map((skill) => finalScores.get(skill)?.band?.toNumber() ?? null);
    if (bands.every((band): band is number => band !== null)) overallBand = roundOverallBand(bands);
  }
  if (attempt.state !== 'COMPLETED') {
    await transaction.assessmentAttempt.update({
      where: { id: attemptId },
      data: { state: 'COMPLETED', completedAt: now, overallBand, version: { increment: 1 } },
    });
  }
  return { completed: true as const, overallBand };
}
