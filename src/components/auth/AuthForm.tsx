'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { normalizeE164Phone } from '@/lib/phone';

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';

const content = {
  'sign-in': {
    eyebrow: 'Welcome back',
    title: 'Sign in to IELTS Lab',
    description: 'Continue your preparation, tests and speaking appointments.',
    submit: 'Sign in',
  },
  'sign-up': {
    eyebrow: 'Your preparation starts here',
    title: 'Create your account',
    description: 'One secure account for your tests, results and appointments.',
    submit: 'Create account',
  },
  'forgot-password': {
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    description: 'We will send a secure reset link to your email address.',
    submit: 'Send reset link',
  },
  'update-password': {
    eyebrow: 'Secure your account',
    title: 'Choose a new password',
    description: 'Use at least eight characters and keep it unique to IELTS Lab.',
    submit: 'Update password',
  },
} as const;

export default function AuthForm({ locale, mode }: { locale: string; mode: AuthMode }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const copy = content[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    const fullName = String(form.get('fullName') ?? '').trim();
    const rawWhatsapp = String(form.get('whatsapp') ?? '').trim();
    const whatsapp = mode === 'sign-up' ? normalizeE164Phone(rawWhatsapp) : null;

    if ((mode === 'sign-up' || mode === 'update-password') && password !== confirmPassword) {
      setPending(false);
      setMessage('Passwords do not match.');
      return;
    }
    if (mode === 'sign-up' && !whatsapp) {
      setPending(false);
      setMessage('Enter a valid WhatsApp number with its country code.');
      return;
    }

    const client = createSupabaseBrowserClient();
    let error: { message: string } | null = null;

    if (mode === 'sign-in') {
      ({ error } = await client.auth.signInWithPassword({ email, password }));
    } else if (mode === 'sign-up') {
      const emailRedirectTo = `${window.location.origin}/api/auth/callback?next=/${locale}/account`;
      ({ error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            whatsapp,
            preferred_locale: locale,
          },
        },
      }));
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
  const needsConfirmation = mode === 'sign-up' || mode === 'update-password';
  const inputClassName = 'h-12 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-4 text-[15px] text-charcoal outline-none transition placeholder:text-black/35 focus:border-crimson/50 focus:bg-white focus:ring-4 focus:ring-crimson/[0.08]';

  return (
    <section className="w-full max-w-[31rem] rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.25)] sm:p-10">
      <Link href={`/${locale}`} className="inline-flex items-center gap-3" aria-label="IELTS Lab Oran home">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-crimson/[0.08]">
          <Image src="/ielts-lab-mark.svg" alt="" aria-hidden="true" width={30} height={30} priority draggable={false} />
        </span>
        <span className="leading-none">
          <strong className="block text-[15px] font-bold tracking-tight">IELTS Lab</strong>
          <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">Oran</small>
        </span>
      </Link>

      <div className="mt-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">{copy.eyebrow}</p>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.035em] text-charcoal sm:text-[2.25rem]">{copy.title}</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-6 text-black/55">{copy.description}</p>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        {mode === 'sign-up' && (
          <>
            <label className="grid gap-2 text-sm font-semibold text-black/75">
              Full name
              <input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={120} required className={inputClassName} placeholder="Your full name" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-black/75">
              WhatsApp number
              <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" minLength={8} maxLength={24} required className={inputClassName} placeholder="+213 555 00 00 00" />
              <span className="text-xs font-normal leading-5 text-black/45">Used only for essential test and appointment communication.</span>
            </label>
          </>
        )}

        {needsEmail && (
          <label className="grid gap-2 text-sm font-semibold text-black/75">
            Email address
            <input name="email" type="email" autoComplete="email" required className={inputClassName} placeholder="you@example.com" />
          </label>
        )}

        {needsPassword && (
          <label className="grid gap-2 text-sm font-semibold text-black/75">
            Password
            <input name="password" type="password" minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required className={inputClassName} placeholder="At least 8 characters" />
          </label>
        )}

        {needsConfirmation && (
          <label className="grid gap-2 text-sm font-semibold text-black/75">
            Confirm password
            <input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required className={inputClassName} placeholder="Repeat your password" />
          </label>
        )}

        <button disabled={pending} className="mt-2 h-12 rounded-full bg-charcoal px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-crimson focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-crimson/20 disabled:cursor-wait disabled:opacity-50">
          {pending ? 'Please wait…' : copy.submit}
        </button>

        {message && (
          <p role="status" aria-live="polite" className="rounded-2xl bg-black/[0.035] px-4 py-3 text-sm leading-5 text-black/65">
            {message}
          </p>
        )}
      </form>

      <div className="mt-7 border-t border-black/[0.07] pt-6 text-center text-sm text-black/55">
        {mode === 'sign-in' && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <Link className="font-semibold text-charcoal hover:text-crimson" href={`/${locale}/auth/sign-up`}>Create an account</Link>
            <Link className="hover:text-charcoal" href={`/${locale}/auth/forgot-password`}>Forgot password?</Link>
          </div>
        )}
        {mode === 'sign-up' && <p>Already registered? <Link className="font-semibold text-charcoal hover:text-crimson" href={`/${locale}/auth/sign-in`}>Sign in</Link></p>}
        {mode === 'forgot-password' && <Link className="font-semibold text-charcoal hover:text-crimson" href={`/${locale}/auth/sign-in`}>Back to sign in</Link>}
      </div>
    </section>
  );
}
