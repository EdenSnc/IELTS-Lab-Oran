import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncApplicationUser } from './request-user';

export async function requireStaffPageAal2() {
  const client = await createSupabaseServerClient();
  const [{ data: userData }, { data: aal }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (!userData.user) redirect('/en/auth/sign-in');
  const user = await syncApplicationUser(userData.user);
  if (!['TEACHER', 'CONTENT_REVIEWER', 'ADMIN'].includes(user.role)) redirect('/en/account');
  if (aal?.currentLevel !== 'aal2') redirect('/speaking/mfa');
  return user;
}
