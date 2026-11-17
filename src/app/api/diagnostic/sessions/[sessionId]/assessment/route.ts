import { z } from 'zod';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { assertSameOrigin, diagnosticApiError, diagnosticIdSchema, parseDiagnosticBody } from '@/lib/diagnostic/http';
import { saveDiagnosticAssessment, releaseDiagnosticAssessment } from '@/lib/diagnostic/assessment-service';
import { diagnosticAssessmentEditSchema } from '@/lib/diagnostic/assessment-core';
import { loadDiagnosticReview, publishDiagnosticWriting, queueDiagnosticWriting } from '@/lib/diagnostic/writing-service';

export const runtime = 'nodejs';
type Context = { params: Promise<{ sessionId: string }> };
const actionSchema = z.discriminatedUnion('action',[
  z.object({ action: z.literal('queueWriting') }).strict(),
  diagnosticAssessmentEditSchema.extend({ action: z.literal('save') }),
  z.object({ action: z.literal('release'), expectedVersion: z.number().int().nonnegative(), speakingConductedInPerson: z.literal(true) }).strict(),
]);
export async function GET(request: Request, context: Context) {
  try {
    const user = await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
    const sessionId = diagnosticIdSchema.parse((await context.params).sessionId);
    return noStoreJson(await loadDiagnosticReview({ sessionId, actorUserId: user.id }));
  } catch (error) { return diagnosticApiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
    const sessionId = diagnosticIdSchema.parse((await context.params).sessionId);
    const body = await parseDiagnosticBody(request,actionSchema,{ maxBytes: 40000 });
    const input = { sessionId, actorUserId: user.id };
    if (body.action === 'queueWriting') {
      const run = await queueDiagnosticWriting(input);
      let signalPending = false;
      try { await publishDiagnosticWriting(run.id); } catch { signalPending = true; }
      return noStoreJson({ runId: run.id, state: run.state, signalPending });
    }
    if (body.action === 'release') return noStoreJson(await releaseDiagnosticAssessment({ ...input, expectedVersion: body.expectedVersion, speakingConductedInPerson: body.speakingConductedInPerson }));
    return noStoreJson(await saveDiagnosticAssessment({ ...input, ...body }));
  } catch (error) { return diagnosticApiError(error); }
}
