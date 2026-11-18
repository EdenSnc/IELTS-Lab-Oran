import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { syncApplicationUser } from '@/lib/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const SAFE_NEXT_PATH = /^\/(?:(?:en|fr|ar)(?:\/|$)|speaking(?:\/|$)|sim(?:\/|$)|staff(?:\/|$))/;
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

function resolveSafeNext(requestedNext: string | null): string {
  if (!requestedNext) return '/en/account';
  if (requestedNext.startsWith('//') || requestedNext.includes('\\')) return '/en/account';
  return SAFE_NEXT_PATH.test(requestedNext) ? requestedNext : '/en/account';
}

function resolveLocaleFromPath(path: string): 'en' | 'fr' | 'ar' {
  const match = /^\/(en|fr|ar)(?:\/|$)/.exec(path);
  return (match?.[1] as 'en' | 'fr' | 'ar' | undefined) ?? 'en';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const rawType = url.searchParams.get('type');
  const next = resolveSafeNext(url.searchParams.get('next'));
  const locale = resolveLocaleFromPath(next);

  if (!code && (!tokenHash || !rawType || !ALLOWED_OTP_TYPES.has(rawType as EmailOtpType))) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=missing_code`, url.origin));
  }

  const client = await createSupabaseServerClient();
  const { error } = code
    ? await client.auth.exchangeCodeForSession(code)
    : await client.auth.verifyOtp({
      token_hash: tokenHash as string,
      type: rawType as EmailOtpType,
    });

  if (error) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=invalid_code`, url.origin));
  }

  if (!next.includes('/auth/update-password')) {
    const { data } = await client.auth.getUser();
    if (data.user) {
      const user = await syncApplicationUser(data.user, { syncWhatsapp: false });
      if (!user.onboardingCompletedAt) {
        return NextResponse.redirect(new URL(`/${locale}/account/onboarding`, url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
