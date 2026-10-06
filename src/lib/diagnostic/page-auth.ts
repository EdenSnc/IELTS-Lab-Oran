import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError, requireRequestUser, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import type { DiagnosticLocale } from './messages';

export async function requireDiagnosticPageUser(locale: DiagnosticLocale, staff = false) {
  const request = new Request('https://www.ieltslab.org/diagnostic', { headers: await headers() });
  try {
    return staff ? await requirePrivilegedRequestUser(request, ['TEACHER', 'ADMIN'])
      : await requireRequestUser(request, ['STUDENT']);
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === 'MFA_AAL2_REQUIRED') redirect('/speaking/mfa');
      if (error.status === 401) redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(`/${locale}/diagnostic${staff ? '/staff' : ''}`)}`);
      if (error.status === 403) redirect(`/${locale}/account`);
    }
    throw error;
  }
}
