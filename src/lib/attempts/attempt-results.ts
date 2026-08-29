import 'server-only';

import prisma from '@/lib/prisma';
import { AuthError } from '@/lib/auth/request-user';
import { resultAccessActive } from './result-access';

export async function loadStoredAttemptResult(attemptId: string, userId: string) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      skillScores: { orderBy: { skill: 'asc' } },
      questions: { select: { skill: true } },
      gradingRuns: {
        where: { skill: 'WRITING', graderKind: 'AI' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true },
      },
      speakingAppointment: { select: { status: true } },
      entitlement: { select: { endsAt: true } },
    },
  });
  if (!attempt) throw new AuthError('ATTEMPT_NOT_FOUND', 404);
  if (!resultAccessActive(attempt.entitlement?.endsAt)) {
    throw new AuthError('ATTEMPT_RESULTS_ACCESS_EXPIRED', 403);
  }
  if (!attempt.submittedAt && !['GRADING', 'COMPLETED'].includes(attempt.state)) {
    throw new AuthError('ATTEMPT_RESULTS_NOT_AVAILABLE', 409);
  }
  const includedSkills = new Set(attempt.questions.map((question) => question.skill));
  if (attempt.speakingAppointment) includedSkills.add('SPEAKING');
  const scoreBySkill = new Map(attempt.skillScores.map((score) => [score.skill, score]));
  const writingRun = attempt.gradingRuns.at(0);
  const writingStatus = !includedSkills.has('WRITING')
    ? 'NOT_INCLUDED'
    : scoreBySkill.has('WRITING')
      ? 'COMPLETE'
      : writingRun?.status === 'FAILED'
        ? 'FAILED'
        : 'PENDING';
  const speakingStatus = !includedSkills.has('SPEAKING')
    ? 'NOT_INCLUDED'
    : scoreBySkill.has('SPEAKING')
      ? 'COMPLETE'
      : attempt.speakingAppointment?.status === 'BOOKED'
        ? 'BOOKED'
        : 'PENDING';

  return {
    attemptId: attempt.id,
    state: attempt.state,
    overallBand: attempt.overallBand?.toNumber() ?? null,
    scores: attempt.skillScores.map((score) => ({
      skill: score.skill,
      rawScore: score.rawScore,
      maximumRawScore: score.maximumRawScore,
      band: score.band?.toNumber() ?? null,
    })),
    writingStatus,
    speakingStatus,
  };
}
