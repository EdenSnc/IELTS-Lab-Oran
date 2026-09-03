import { NextResponse } from 'next/server';
import { syncApplicationUser } from '@/lib/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const SAFE_NEXT_PATH = /^\/(en|fr|ar)(?:\/|$)/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') ?? '/en/account';
  const next = SAFE_NEXT_PATH.test(requestedNext) ? requestedNext : '/en/account';

  if (!code) {
    return NextResponse.redirect(new URL('/en/auth/sign-in?error=missing_code', url.origin));
  }

  const client = await createSupabaseServerClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/en/auth/sign-in?error=invalid_code', url.origin));
  }

  if (!next.includes('/auth/update-password')) {
    const { data } = await client.auth.getUser();
    if (data.user) {
      const user = await syncApplicationUser(data.user, { syncWhatsapp: false });
      if (!user.onboardingCompletedAt) {
        const locale = next.split('/')[1] || 'en';
        return NextResponse.redirect(new URL(`/${locale}/account/onboarding`, url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
