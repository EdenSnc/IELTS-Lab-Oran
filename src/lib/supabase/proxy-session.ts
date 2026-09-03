import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublicConfig } from './config';

export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
) {
  const config = getSupabasePublicConfig();
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => (
    name.startsWith('sb-') && name.includes('-auth-token')
  ));
  if (!hasSessionCookie) return response;

  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates) => {
        updates.forEach(({ name, value }) => request.cookies.set(name, value));
        updates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await client.auth.getClaims();
  return response;
}
