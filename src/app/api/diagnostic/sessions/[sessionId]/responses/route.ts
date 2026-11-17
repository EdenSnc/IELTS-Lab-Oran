import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { saveDiagnosticResponse } from '@/lib/diagnostic/session-service';
import { DIAGNOSTIC_WRITER_HEADER } from '@/lib/diagnostic/protocol';
import { assertSameOrigin, diagnosticApiError, diagnosticIdSchema, responseBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function PUT(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  let sessionId: string | undefined;
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    sessionId = diagnosticIdSchema.parse((await params).sessionId);
    const body = await parseDiagnosticBody(request, responseBodySchema, { maxBytes: 100000 });
    return noStoreJson({ response: await saveDiagnosticResponse({ ...body, sessionId, userId: user.id, writerToken: request.headers.get(DIAGNOSTIC_WRITER_HEADER) ?? '' }) });
  } catch (error) { return diagnosticApiError(error, { sessionId }); }
}
