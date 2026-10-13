'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeE164Phone } from '@/lib/phone';
import { wilayas } from './AuthForm';
import { authCopyForLocale } from './auth-copy';

export default function OnboardingForm({
  locale,
  initial,
  diagnosticNext,
}: {
  locale: string;
  initial: { name: string; whatsapp: string; wilaya: string; preferredLocale: string };
  diagnosticNext?: string;
}) {
  const router = useRouter();
  const copy = authCopyForLocale(locale);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const inputClassName = 'h-12 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-4 text-[15px] outline-none focus:border-crimson/50 focus:bg-white focus:ring-4 focus:ring-crimson/[0.08]';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const whatsapp = normalizeE164Phone(String(form.get('whatsapp') ?? ''));
    if (!whatsapp) {
      setPending(false);
      setMessage(copy.invalidWhatsapp);
      return;
    }
    const response = await fetch('/api/account/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name') ?? ''),
        whatsapp,
        wilaya: String(form.get('wilaya') ?? ''),
        preferredLocale: String(form.get('preferredLocale') ?? locale),
        termsAccepted: form.get('termsAccepted') === 'on',
        privacyAccepted: form.get('privacyAccepted') === 'on',
        marketingAccepted: form.get('marketingAccepted') === 'on',
      }),
    });
    const payload = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(payload.error === 'WHATSAPP_ALREADY_IN_USE'
        ? copy.onboarding.duplicateWhatsapp
        : copy.onboarding.failed);
      return;
    }
    router.replace(diagnosticNext ?? `/${locale}/account`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-black/75">{copy.fullName}<input name="name" defaultValue={initial.name} minLength={2} maxLength={120} required className={inputClassName} /></label>
      <label className="grid gap-2 text-sm font-semibold text-black/75">{copy.whatsapp}<input name="whatsapp" type="tel" defaultValue={initial.whatsapp} minLength={8} maxLength={32} required className={inputClassName} /></label>
      <label className="grid gap-2 text-sm font-semibold text-black/75">{copy.wilaya}<select name="wilaya" defaultValue={initial.wilaya} required className={inputClassName}><option value="" disabled>{copy.select}</option>{wilayas.map((wilaya) => <option key={wilaya} value={wilaya}>{wilaya}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold text-black/75">{copy.preferredLanguage}<select name="preferredLocale" defaultValue={initial.preferredLocale || locale} required className={inputClassName}><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></select></label>
      <div className="grid gap-3 rounded-2xl bg-black/[0.025] p-4 text-sm text-black/65">
        <label className="flex items-start gap-3"><input name="termsAccepted" type="checkbox" required className="mt-1 accent-crimson" /><span>{copy.acceptTerms}</span></label>
        <label className="flex items-start gap-3"><input name="privacyAccepted" type="checkbox" required className="mt-1 accent-crimson" /><span>{copy.acceptPrivacy}</span></label>
        <label className="flex items-start gap-3"><input name="marketingAccepted" type="checkbox" className="mt-1 accent-crimson" /><span>{copy.marketing}</span></label>
      </div>
      <button disabled={pending} className="mt-2 h-12 rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:bg-crimson disabled:opacity-50">{pending ? copy.onboarding.saving : copy.onboarding.submit}</button>
      {message && <p role="status" className="rounded-2xl bg-black/[0.035] px-4 py-3 text-sm text-black/65">{message}</p>}
    </form>
  );
}
