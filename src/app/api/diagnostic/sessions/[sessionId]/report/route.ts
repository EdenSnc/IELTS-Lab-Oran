import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { diagnosticApiError, diagnosticIdSchema } from '@/lib/diagnostic/http';
import { loadDiagnosticReport } from '@/lib/diagnostic/assessment-service';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await requireRequestUser(request,['STUDENT']);
    const sessionId = diagnosticIdSchema.parse((await context.params).sessionId);
    return noStoreJson(await loadDiagnosticReport({ sessionId, userId: user.id }));
  } catch (error) { return diagnosticApiError(error); }
}
