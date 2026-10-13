import { notFound } from 'next/navigation';
import AuthForm, { type AuthMode } from '@/components/auth/AuthForm';
import { authCopyForLocale, authErrorMessage } from '@/components/auth/auth-copy';
import { getEnabledAuthProviders } from '@/lib/supabase/auth-providers';
import { diagnosticAuthReturn } from '@/lib/diagnostic/auth-return';

const MODES = new Set<AuthMode>(['sign-in', 'sign-up', 'forgot-password', 'update-password']);

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; mode: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale, mode } = await params;
  if (!MODES.has(mode as AuthMode)) notFound();
  const providers = await getEnabledAuthProviders();
  const { error, next } = await searchParams;
  const copy = authCopyForLocale(locale);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f5f3] px-4 py-10 sm:px-6 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-crimson/35 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-crimson/[0.055] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-black/[0.035] blur-3xl" />
      <div className="relative z-10 mx-auto w-full max-w-[31rem]">
        <AuthForm
          locale={locale}
          mode={mode as AuthMode}
          providers={providers}
          initialMessage={error ? authErrorMessage(locale, error) : undefined}
          diagnosticNext={diagnosticAuthReturn(next, locale)}
        />
        <p className="mx-auto mt-6 max-w-md text-center text-xs leading-5 text-black/40">
          {copy.secureAccess}
        </p>
      </div>
    </main>
  );
}
