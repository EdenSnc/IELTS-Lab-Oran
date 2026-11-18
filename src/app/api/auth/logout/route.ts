import { NextResponse } from 'next/server';
import { apiError, assertSameOrigin } from '@/lib/http/api';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const client = await createSupabaseServerClient();
    await client.auth.signOut();
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    return apiError(error, 'LOGOUT_FAILED');
  }
}
