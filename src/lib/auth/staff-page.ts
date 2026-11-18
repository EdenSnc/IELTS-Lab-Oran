import 'server-only';

import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncApplicationUser } from './request-user';

type StaffRole = Extract<Role, 'TEACHER' | 'CONTENT_REVIEWER' | 'ADMIN'>;

export async function requireStaffPageAal2(
  allowedRoles: readonly StaffRole[] = ['TEACHER', 'CONTENT_REVIEWER', 'ADMIN'],
  returnTo?: string,
) {
  const client = await createSupabaseServerClient();
  const [{ data: userData }, { data: aal }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!userData.user) redirect('/en/auth/sign-in');
  const user = await syncApplicationUser(userData.user, { syncWhatsapp: false });
  if (user.status !== 'ACTIVE') redirect('/en/auth/sign-in');
  if (!allowedRoles.includes(user.role as StaffRole)) redirect('/en/account');
  if (aal?.currentLevel !== 'aal2') {
    const mfaTarget = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? `/speaking/mfa?next=${encodeURIComponent(returnTo)}`
      : '/speaking/mfa';
    redirect(mfaTarget);
  }
  return user;
}
