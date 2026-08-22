import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/http/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  assertSameOrigin(request);
  const client = await createSupabaseServerClient();
  await client.auth.signOut();
  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
