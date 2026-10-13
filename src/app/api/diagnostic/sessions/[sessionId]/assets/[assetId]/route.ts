import { requireRequestUser } from '@/lib/auth/request-user';
import { fetchDiagnosticAsset } from '@/lib/diagnostic/delivery-service';
import { diagnosticApiError, diagnosticIdSchema } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string; assetId: string }> }) {
  let sessionId: string | undefined;
  let assetId: string | undefined;
  try {
    const user = await requireRequestUser(request, ['STUDENT']);
    const route = await params;
    sessionId = diagnosticIdSchema.parse(route.sessionId);
    assetId = diagnosticIdSchema.parse(route.assetId);
    return await fetchDiagnosticAsset({ sessionId, assetId, userId: user.id, range: request.headers.get('range') });
  } catch (error) { return diagnosticApiError(error, { sessionId, assetId }); }
}
