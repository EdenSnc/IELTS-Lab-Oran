'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { EnabledAuthProviders } from '@/lib/supabase/auth-providers';
import { normalizeE164Phone } from '@/lib/phone';

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';

export const wilayas = [
  '01 Adrar', '02 Chlef', '03 Laghouat', '04 Oum El Bouaghi', '05 Batna', '06 Béjaïa', '07 Biskra', '08 Béchar',
  '09 Blida', '10 Bouira', '11 Tamanrasset', '12 Tébessa', '13 Tlemcen', '14 Tiaret', '15 Tizi Ouzou', '16 Alger',
  '17 Djelfa', '18 Jijel', '19 Sétif', '20 Saïda', '21 Skikda', '22 Sidi Bel Abbès', '23 Annaba', '24 Guelma',
  '25 Constantine', '26 Médéa', '27 Mostaganem', '28 M’Sila', '29 Mascara', '30 Ouargla', '31 Oran', '32 El Bayadh',
  '33 Illizi', '34 Bordj Bou Arréridj', '35 Boumerdès', '36 El Tarf', '37 Tindouf', '38 Tissemsilt', '39 El Oued',
  '40 Khenchela', '41 Souk Ahras', '42 Tipaza', '43 Mila', '44 Aïn Defla', '45 Naâma', '46 Aïn Témouchent',
  '47 Ghardaïa', '48 Relizane', '49 Timimoun', '50 Bordj Badji Mokhtar', '51 Ouled Djellal', '52 Béni Abbès',
  '53 In Salah', '54 In Guezzam', '55 Touggourt', '56 Djanet', '57 El M’Ghair', '58 El Meniaa', 'Outside Algeria',
] as const;

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
    description: 'Use at least ten characters with lowercase, uppercase and a number.',
    submit: 'Update password',
  },
} as const;

export default function AuthForm({
  locale,
  mode,
  providers,
  initialMessage,
}: {
  locale: string;
  mode: AuthMode;
  providers: EnabledAuthProviders;
  initialMessage?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | undefined>(initialMessage);
  const [pending, setPending] = useState(false);
  const copy = content[mode];

  async function signInWithProvider(provider: 'google' | 'facebook') {
    setPending(true);
    setMessage(undefined);
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/${locale}/account`;
    const response = await fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, redirectTo }),
    });
    const payload = await response.json() as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      setPending(false);
      setMessage(payload.error ?? 'Unable to start social sign-in.');
      return;
    }
    window.location.assign(payload.url);
  }

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
    const wilaya = String(form.get('wilaya') ?? '').trim();
    const preferredLocale = String(form.get('preferredLocale') ?? locale);
    const termsAccepted = form.get('termsAccepted') === 'on';
    const privacyAccepted = form.get('privacyAccepted') === 'on';
    const marketingAccepted = form.get('marketingAccepted') === 'on';

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
    if (mode === 'sign-up' && (!termsAccepted || !privacyAccepted)) {
      setPending(false);
      setMessage('Accept the current Terms and Privacy Policy to create an account.');
      return;
    }

    const client = createSupabaseBrowserClient();
    let error: { message: string } | null = null;

    if (mode === 'sign-in' || mode === 'sign-up') {
      const emailRedirectTo = `${window.location.origin}/api/auth/callback?next=/${locale}/account`;
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'sign-in'
          ? { action: 'sign-in', email, password }
          : {
            action: 'sign-up', email, password, fullName, whatsapp, wilaya, preferredLocale,
            termsAccepted, privacyAccepted, marketingAccepted, emailRedirectTo,
          }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) error = { message: payload.error ?? 'Authentication failed.' };
      if (mode === 'sign-up' && response.ok) setMessage('Check your email to verify your account.');
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
        {(mode === 'sign-in' || mode === 'sign-up') && (providers.google || providers.facebook) && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {providers.google && (
                <button type="button" disabled={pending} onClick={() => void signInWithProvider('google')} className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-charcoal transition hover:border-black/20 hover:bg-black/[0.02] disabled:opacity-50">
                  Continue with Google
                </button>
              )}
              {providers.facebook && (
                <button type="button" disabled={pending} onClick={() => void signInWithProvider('facebook')} className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-charcoal transition hover:border-black/20 hover:bg-black/[0.02] disabled:opacity-50">
                  Continue with Facebook
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/35">
              <span className="h-px flex-1 bg-black/[0.08]" />
              Or use email
              <span className="h-px flex-1 bg-black/[0.08]" />
            </div>
          </>
        )}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-black/75 sm:col-span-2">
                Wilaya
                <select name="wilaya" defaultValue="" required className={inputClassName}>
                  <option value="" disabled>Select</option>
                  {wilayas.map((wilaya) => <option key={wilaya} value={wilaya}>{wilaya}</option>)}
                </select>
                <span className="text-xs font-normal leading-5 text-black/45">Used for local and in-centre service planning.</span>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-black/75">
              Preferred account language
              <select name="preferredLocale" defaultValue={locale} required className={inputClassName}>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
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
            <input name="password" type="password" minLength={mode === 'sign-in' ? 1 : 10} pattern={mode === 'sign-in' ? undefined : '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required className={inputClassName} placeholder={mode === 'sign-in' ? 'Your password' : 'At least 10 characters'} />
          </label>
        )}

        {needsConfirmation && (
          <label className="grid gap-2 text-sm font-semibold text-black/75">
            Confirm password
            <input name="confirmPassword" type="password" minLength={10} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}" autoComplete="new-password" required className={inputClassName} placeholder="Repeat your password" />
          </label>
        )}

        {mode === 'sign-up' && (
          <div className="grid gap-3 rounded-2xl bg-black/[0.025] p-4 text-sm text-black/65">
            <label className="flex items-start gap-3"><input name="termsAccepted" type="checkbox" required className="mt-1 accent-crimson" /><span>I accept the current Terms.</span></label>
            <label className="flex items-start gap-3"><input name="privacyAccepted" type="checkbox" required className="mt-1 accent-crimson" /><span>I accept the current Privacy Policy.</span></label>
            <label className="flex items-start gap-3"><input name="marketingAccepted" type="checkbox" className="mt-1 accent-crimson" /><span>Send me optional IELTS Lab news and offers.</span></label>
          </div>
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
