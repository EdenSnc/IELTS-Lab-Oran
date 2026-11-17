import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { loadDiagnosticSession } from '@/lib/diagnostic/session-service';
import { diagnosticApiError, diagnosticIdSchema } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  let sessionId: string | undefined;
  try {
    const user = await requireRequestUser(request, ['STUDENT']);
    sessionId = diagnosticIdSchema.parse((await params).sessionId);
    return noStoreJson({ session: await loadDiagnosticSession({ sessionId, userId: user.id }) });
  } catch (error) { return diagnosticApiError(error, { sessionId }); }
}
