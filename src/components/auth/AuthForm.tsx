'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';

export default function AuthForm({ locale, mode }: { locale: string; mode: AuthMode }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const client = createSupabaseBrowserClient();
    let error: { message: string } | null = null;

    if (mode === 'sign-in') {
      ({ error } = await client.auth.signInWithPassword({ email, password }));
    } else if (mode === 'sign-up') {
      const emailRedirectTo = `${window.location.origin}/api/auth/callback?next=/${locale}/account`;
      ({ error } = await client.auth.signUp({ email, password, options: { emailRedirectTo } }));
      if (!error) setMessage('Check your email to verify your account.');
    } else if (mode === 'forgot-password') {
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/${locale}/auth/update-password`;
      ({ error } = await client.auth.resetPasswordForEmail(email, { redirectTo }));
      if (!error) setMessage('Check your email for the password-reset link.');
    } else {
      ({ error } = await client.auth.updateUser({ password }));
    }

    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (mode === 'sign-in' || mode === 'update-password') {
      router.replace(`/${locale}/account`);
      router.refresh();
    }
  }

  const needsEmail = mode !== 'update-password';
  const needsPassword = mode !== 'forgot-password';
  const title = {
    'sign-in': 'Sign in',
    'sign-up': 'Create your account',
    'forgot-password': 'Reset your password',
    'update-password': 'Choose a new password',
  }[mode];

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-md gap-5 rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {needsEmail && (
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required className="rounded-xl border border-black/20 px-4 py-3" />
        </label>
      )}
      {needsPassword && (
        <label className="grid gap-2 text-sm font-medium">
          Password
          <input name="password" type="password" minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required className="rounded-xl border border-black/20 px-4 py-3" />
        </label>
      )}
      <button disabled={pending} className="rounded-full bg-black px-5 py-3 font-semibold text-white disabled:opacity-50">
        {pending ? 'Please wait…' : title}
      </button>
      {message && <p role="status" className="text-sm text-black/70">{message}</p>}
      {mode === 'sign-in' && (
        <div className="flex justify-between text-sm underline">
          <a href={`/${locale}/auth/sign-up`}>Create account</a>
          <a href={`/${locale}/auth/forgot-password`}>Forgot password?</a>
        </div>
      )}
    </form>
  );
}
