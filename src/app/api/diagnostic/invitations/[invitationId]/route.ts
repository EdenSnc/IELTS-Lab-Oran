import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { revokeDiagnosticInvitation } from '@/lib/diagnostic/invitation-service';
import { assertSameOrigin, diagnosticApiError, diagnosticIdSchema, revocationBodySchema, parseDiagnosticBody } from '@/lib/diagnostic/http';

export const runtime = 'nodejs';
export async function DELETE(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  let invitationId: string | undefined;
  try {
    assertSameOrigin(request);
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    invitationId = diagnosticIdSchema.parse((await params).invitationId);
    const body = await parseDiagnosticBody(request, revocationBodySchema);
    return noStoreJson({ invitation: await revokeDiagnosticInvitation({ ...body, invitationId, actorUserId: user.id }) });
  } catch (error) { return diagnosticApiError(error, { invitationId }); }
}
