import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Role, User } from '@prisma/client';
import prisma from '@/lib/prisma';

export class AuthError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookies = Object.fromEntries(
    (request.headers.get('cookie') ?? '').split(';').map((entry) => {
      const index = entry.indexOf('=');
      return index < 0 ? [entry.trim(), ''] : [entry.slice(0, index).trim(), decodeURIComponent(entry.slice(index + 1))];
    }),
  );
  return cookies['ielts-access-token'] || cookies['sb-access-token'] || null;
}

export async function requireRequestUser(request: Request, roles?: readonly Role[]): Promise<User> {
  let authUserId: string | undefined;
  const devUserId = process.env.SPEAKING_DEV_AUTH_USER_ID;
  if (process.env.NODE_ENV !== 'production' && devUserId) {
    authUserId = devUserId;
  } else {
    const token = bearerToken(request);
    if (!token) throw new AuthError('AUTH_REQUIRED', 401);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new AuthError('AUTH_NOT_CONFIGURED', 503);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new AuthError('INVALID_SESSION', 401);
    authUserId = data.user.id;
  }
  const user = await prisma.user.findUnique({ where: { id: authUserId } });
  if (!user || user.status !== 'ACTIVE') throw new AuthError('ACCOUNT_UNAVAILABLE', 403);
  if (roles && !roles.includes(user.role)) throw new AuthError('FORBIDDEN', 403);
  return user;
}

export function isExaminer(role: Role) {
  return role === 'TEACHER' || role === 'ADMIN';
}
