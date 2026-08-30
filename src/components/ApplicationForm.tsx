'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';

const copy = {
  en: {
    eyebrow: 'Application', title: 'Tell us where you are starting.',
    description: 'This takes about two minutes. We use it only to assess fit and contact you about a seat.',
    name: 'Full name', phone: 'WhatsApp number', email: 'Email address', exam: 'IELTS test',
    level: 'Current English level', band: 'Target band', timing: 'When do you plan to take IELTS?',
    notes: 'Anything we should know? (optional)', submit: 'Submit application', pending: 'Submitting…',
    success: 'Application received. We will contact you on WhatsApp if a seat is available.',
    privacy: 'Your details are used only for your application and essential follow-up.',
  },
  fr: {
    eyebrow: 'Candidature', title: 'Parlez-nous de votre point de départ.',
    description: 'Deux minutes suffisent. Ces informations servent uniquement à évaluer votre profil et à vous contacter pour une place.',
    name: 'Nom complet', phone: 'Numéro WhatsApp', email: 'Adresse e-mail', exam: 'Test IELTS',
    level: "Niveau d'anglais actuel", band: 'Score visé', timing: 'Quand prévoyez-vous de passer l’IELTS ?',
    notes: 'Autre information utile ? (facultatif)', submit: 'Envoyer la candidature', pending: 'Envoi…',
    success: 'Candidature reçue. Nous vous contacterons sur WhatsApp si une place est disponible.',
    privacy: 'Vos informations servent uniquement à votre candidature et au suivi essentiel.',
  },
  ar: {
    eyebrow: 'طلب الانضمام', title: 'أخبرنا عن مستواك الحالي.',
    description: 'يستغرق الطلب دقيقتين تقريباً. نستخدم هذه المعلومات فقط لتقييم ملاءمة البرنامج والتواصل معك بشأن المقعد.',
    name: 'الاسم الكامل', phone: 'رقم واتساب', email: 'البريد الإلكتروني', exam: 'اختبار IELTS',
    level: 'مستوى الإنجليزية الحالي', band: 'النتيجة المستهدفة', timing: 'متى تنوي اجتياز IELTS؟',
    notes: 'هل هناك معلومات إضافية؟ (اختياري)', submit: 'إرسال الطلب', pending: 'جارٍ الإرسال…',
    success: 'تم استلام طلبك. سنتواصل معك عبر واتساب إذا توفر مقعد.',
    privacy: 'تُستخدم بياناتك فقط لمعالجة الطلب والتواصل الضروري.',
  },
} as const;

const fieldClass = 'h-12 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-4 text-[15px] text-charcoal outline-none transition focus:border-crimson/45 focus:bg-white focus:ring-4 focus:ring-crimson/[0.07]';

export default function ApplicationForm() {
  const locale = useLocale() as keyof typeof copy;
  const searchParams = useSearchParams();
  const text = copy[locale] ?? copy.en;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: form.get('phone'),
        email: form.get('email') || null,
        fullName: form.get('fullName'),
        formName: 'IELTS Lab Oran Application',
        source: 'cohort_waitlist',
        utmSource: searchParams.get('utm_source'),
        utmMedium: searchParams.get('utm_medium'),
        utmCampaign: searchParams.get('utm_campaign'),
        application: {
          examType: form.get('examType'),
          englishLevel: form.get('englishLevel'),
          targetBand: form.get('targetBand'),
          timing: form.get('timing'),
          notes: form.get('notes') || null,
          locale,
        },
      }),
    });
    const payload = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(payload.error ?? 'Unable to submit the application.');
      return;
    }
    event.currentTarget.reset();
    setComplete(true);
    setMessage(text.success);
    try { window.localStorage.setItem('ielts_cohort_signed_up', 'true'); } catch { /* optional */ }
  }

  return (
    <div className="flex h-full flex-col">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">{text.eyebrow}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-charcoal">{text.title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/50">{text.description}</p>
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-black/70">{text.name}<input className={fieldClass} name="fullName" autoComplete="name" minLength={2} maxLength={120} required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.phone}<input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+213 555 00 00 00" required /></label>
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.email}<input className={fieldClass} name="email" type="email" autoComplete="email" required /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.exam}<select className={fieldClass} name="examType" required defaultValue=""><option value="" disabled>—</option><option value="Academic">Academic</option><option value="General Training">General Training</option><option value="Undecided">Not sure yet</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.level}<select className={fieldClass} name="englishLevel" required defaultValue=""><option value="" disabled>—</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1+">C1+</option><option value="Unsure">Not sure</option></select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.band}<select className={fieldClass} name="targetBand" required defaultValue=""><option value="" disabled>—</option>{['6.0', '6.5', '7.0', '7.5', '8.0+', 'Unsure'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-black/70">{text.timing}<select className={fieldClass} name="timing" required defaultValue=""><option value="" disabled>—</option><option value="0-3 months">0–3 months</option><option value="3-6 months">3–6 months</option><option value="6+ months">6+ months</option><option value="No date">No date yet</option></select></label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-black/70">{text.notes}<textarea className="min-h-24 w-full resize-y rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-3 text-[15px] outline-none transition focus:border-crimson/45 focus:bg-white focus:ring-4 focus:ring-crimson/[0.07]" name="notes" maxLength={1000} /></label>
        <button disabled={pending || complete} className="mt-1 h-12 rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:bg-crimson focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-crimson/20 disabled:opacity-55">{pending ? text.pending : text.submit}</button>
        {message && <p role="status" aria-live="polite" className={`rounded-2xl px-4 py-3 text-sm leading-5 ${complete ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message}</p>}
        <p className="text-center text-xs leading-5 text-black/40">{text.privacy}</p>
      </form>
    </div>
  );
}
