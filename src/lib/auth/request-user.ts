import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import type { Role, User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';

export class AuthError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function requestCookies(request: Request) {
  return (request.headers.get('cookie') ?? '').split(';').flatMap((entry) => {
    const index = entry.indexOf('=');
    if (index < 1) return [];
    const name = entry.slice(0, index).trim();
    try {
      return [{ name, value: decodeURIComponent(entry.slice(index + 1)) }];
    } catch {
      return [];
    }
  });
}

async function authenticateRequest(request: Request): Promise<SupabaseUser> {
  const config = requireSupabasePublicConfig();
  const token = bearerToken(request);

  if (token) {
    const client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new AuthError('INVALID_SESSION', 401);
    return data.user;
  }

  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => requestCookies(request),
      setAll: () => undefined,
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AuthError('AUTH_REQUIRED', 401);
  return data.user;
}

async function authenticatePrivilegedRequest(request: Request) {
  const config = requireSupabasePublicConfig();
  const token = bearerToken(request);
  const client = token
    ? createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    : createServerClient(config.url, config.publishableKey, {
      cookies: { getAll: () => requestCookies(request), setAll: () => undefined },
    });
  const { data: userData, error: userError } = await client.auth.getUser(token ?? undefined);
  if (userError || !userData.user) throw new AuthError('AUTH_REQUIRED', 401);
  const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel(token ?? undefined);
  if (aalError) throw new AuthError('MFA_ASSURANCE_UNAVAILABLE', 503);
  return { authUser: userData.user, currentLevel: aal.currentLevel };
}

function authDisplayName(authUser: SupabaseUser) {
  const candidate = authUser.user_metadata?.full_name ?? authUser.user_metadata?.name;
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim().slice(0, 120)
    : undefined;
}

export async function syncApplicationUser(authUser: SupabaseUser) {
  const email = authUser.email?.trim().toLowerCase();
  const name = authDisplayName(authUser);

  return prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email, name },
    update: {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    },
  });
}

export async function requireRequestUser(request: Request, roles?: readonly Role[]): Promise<User> {
  let user: User | null;
  const devUserId = process.env.SPEAKING_DEV_AUTH_USER_ID;
  if (process.env.NODE_ENV !== 'production' && devUserId) {
    user = await prisma.user.findUnique({ where: { id: devUserId } });
  } else {
    let authUser: SupabaseUser;
    try {
      authUser = await authenticateRequest(request);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error instanceof Error && error.message === 'SUPABASE_AUTH_NOT_CONFIGURED') {
        throw new AuthError('AUTH_NOT_CONFIGURED', 503);
      }
      throw error;
    }
    user = await syncApplicationUser(authUser);
  }

  if (!user || user.status !== 'ACTIVE') throw new AuthError('ACCOUNT_UNAVAILABLE', 403);
  if (roles && !roles.includes(user.role)) throw new AuthError('FORBIDDEN', 403);
  return user;
}

export async function requirePrivilegedRequestUser(
  request: Request,
  roles: readonly Role[] = ['TEACHER', 'CONTENT_REVIEWER', 'ADMIN'],
): Promise<User> {
  let user: User | null;
  let currentLevel: 'aal1' | 'aal2' | null = null;
  const devUserId = process.env.SPEAKING_DEV_AUTH_USER_ID;
  if (process.env.NODE_ENV !== 'production' && devUserId) {
    user = await prisma.user.findUnique({ where: { id: devUserId } });
    currentLevel = process.env.STAFF_MFA_DEV_AAL2 === 'true' ? 'aal2' : 'aal1';
  } else {
    const identity = await authenticatePrivilegedRequest(request);
    user = await syncApplicationUser(identity.authUser);
    currentLevel = identity.currentLevel === 'aal2'
      ? 'aal2'
      : identity.currentLevel === 'aal1' ? 'aal1' : null;
  }
  if (!user || user.status !== 'ACTIVE') throw new AuthError('ACCOUNT_UNAVAILABLE', 403);
  if (!roles.includes(user.role)) throw new AuthError('FORBIDDEN', 403);
  if (currentLevel !== 'aal2') throw new AuthError('MFA_AAL2_REQUIRED', 403);
  return user;
}

export function isExaminer(role: Role) {
  return role === 'TEACHER' || role === 'ADMIN';
}
