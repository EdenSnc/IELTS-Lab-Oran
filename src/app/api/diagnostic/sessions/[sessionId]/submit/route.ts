import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { submitDiagnosticSession } from '@/lib/diagnostic/session-service';
import { DIAGNOSTIC_WRITER_HEADER } from '@/lib/diagnostic/protocol';
import { assertSameOrigin, diagnosticApiError, diagnosticIdSchema, submitBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  let sessionId: string | undefined;
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    sessionId = diagnosticIdSchema.parse((await params).sessionId);
    await parseDiagnosticBody(request, submitBodySchema, { allowEmpty: true });
    return noStoreJson({ session: await submitDiagnosticSession({ sessionId, userId: user.id, writerToken: request.headers.get(DIAGNOSTIC_WRITER_HEADER) ?? '' }) });
  } catch (error) { return diagnosticApiError(error, { sessionId }); }
}
