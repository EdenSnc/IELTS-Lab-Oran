import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncApplicationUser } from './request-user';
import { adminReturnPath } from '@/lib/admin/navigation';

type StaffRole = Extract<Role, 'TEACHER' | 'CONTENT_REVIEWER' | 'ADMIN'>;

const loadCurrentStaffAuthContext = cache(async () => {
  const client = await createSupabaseServerClient();
  const [{ data: userData }, { data: aal }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!userData.user) return { user: null, currentLevel: null };
  const user = await syncApplicationUser(userData.user, { syncWhatsapp: false });
  return { user, currentLevel: aal?.currentLevel ?? null };
});

export async function requireStaffPageAal2(
  allowedRoles: readonly StaffRole[] = ['TEACHER', 'CONTENT_REVIEWER', 'ADMIN'],
  returnTo?: string,
) {
  const { user, currentLevel } = await loadCurrentStaffAuthContext();
  if (!user || user.status !== 'ACTIVE') {
    const workspace = adminReturnPath(returnTo);
    if (workspace) redirect(`/${workspace.split('/')[1]}/auth/sign-in?next=${encodeURIComponent(workspace)}`);
    redirect('/en/auth/sign-in');
  }
  if (!allowedRoles.includes(user.role as StaffRole)) {
    const locale = adminReturnPath(returnTo)?.split('/')[1] ?? 'en';
    redirect(`/${locale}/account`);
  }
  if (currentLevel !== 'aal2') {
    const mfaTarget = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? `/speaking/mfa?next=${encodeURIComponent(returnTo)}`
      : '/speaking/mfa';
    redirect(mfaTarget);
  }
  return user;
}
