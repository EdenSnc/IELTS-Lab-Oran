import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { createDiagnosticSession } from '@/lib/diagnostic/session-service';
import { assertSameOrigin, diagnosticApiError, startBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request, ['STUDENT']);
    const body = await parseDiagnosticBody(request, startBodySchema);
    return noStoreJson({ session: await createDiagnosticSession({ invitationId: body.invitationId, userId: user.id }) }, 201);
  } catch (error) { return diagnosticApiError(error); }
}
