import { requirePrivilegedRequestUser, requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { issueDiagnosticInvitation, listDiagnosticInvitations } from '@/lib/diagnostic/invitation-service';
import { assertSameOrigin, diagnosticApiError, invitationBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request, ['STUDENT']);
    return noStoreJson({ invitations: await listDiagnosticInvitations(user.id) });
  } catch (error) { return diagnosticApiError(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const body = await parseDiagnosticBody(request, invitationBodySchema);
    return noStoreJson({ invitation: await issueDiagnosticInvitation({ ...body, actorUserId: user.id }) }, 201);
  } catch (error) { return diagnosticApiError(error); }
}
