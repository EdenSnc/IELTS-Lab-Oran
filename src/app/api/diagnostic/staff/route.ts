import { z } from 'zod';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { diagnosticApiError } from '@/lib/diagnostic/http';
import { loadDiagnosticStaffOverview } from '@/lib/diagnostic/staff-service';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN']);
    const email = z.union([z.literal(''), z.email().max(254)]).parse(new URL(request.url).searchParams.get('email') ?? '');
    const selected = z.uuid().optional().parse(new URL(request.url).searchParams.get('blueprintId') ?? undefined);
    return noStoreJson(await loadDiagnosticStaffOverview(user.id, email, selected));
  } catch (error) { return diagnosticApiError(error); }
}
