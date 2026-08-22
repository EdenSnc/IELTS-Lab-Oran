import { z } from 'zod';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { saveHumanSpeakingAssessment } from '@/lib/speaking/assessment-service';

const score = z.number().min(0).max(9).multipleOf(0.5);
const priority = z.object({
  criterion: z.enum(['FC', 'LR', 'GRA', 'P']),
  problem: z.string().min(1).max(500),
  evidence: z.string().min(1).max(500),
  whyItMatters: z.string().min(1).max(500),
  recommendedPractice: z.string().min(1).max(500),
});
const schema = z.object({
  stage: z.enum(['PROVISIONAL', 'FINAL']),
  fluencyCoherence: score,
  lexicalResource: score,
  grammaticalRange: score,
  pronunciation: score,
  notes: z.string().max(10_000).optional(),
  priorities: z.array(priority).max(3).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const { sessionId } = await context.params;
    const { stage, ...scores } = schema.parse(await request.json());
    return noStoreJson({ assessment: await saveHumanSpeakingAssessment({ user, sessionId, stage, scores }) }, 201);
  } catch (error) {
    return apiError(error, 'SPEAKING_SCORE_FAILED');
  }
}
