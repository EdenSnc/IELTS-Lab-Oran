import { z } from 'zod';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { recordSpeakingConsent } from '@/lib/speaking/consent-service';

const consentSchema = z.object({
  recording: z.literal(true),
  aiAnalysis: z.boolean(),
  trainingData: z.boolean(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    const { sessionId } = await context.params;
    const decisions = consentSchema.parse(await request.json());
    return noStoreJson(await recordSpeakingConsent({
      sessionId,
      learnerId: user.id,
      aiAnalysis: decisions.aiAnalysis,
      trainingData: decisions.trainingData,
    }));
  } catch (error) {
    return apiError(error, 'SPEAKING_CONSENT_FAILED');
  }
}
