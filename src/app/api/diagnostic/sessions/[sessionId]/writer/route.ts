import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { acquireDiagnosticWriter } from '@/lib/diagnostic/session-service';
import { assertSameOrigin, diagnosticApiError, diagnosticIdSchema, writerBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  let sessionId: string | undefined;
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    sessionId = diagnosticIdSchema.parse((await params).sessionId);
    const body = await parseDiagnosticBody(request, writerBodySchema);
    return noStoreJson(await acquireDiagnosticWriter({ ...body, sessionId, userId: user.id }));
  } catch (error) { return diagnosticApiError(error, { sessionId }); }
}
