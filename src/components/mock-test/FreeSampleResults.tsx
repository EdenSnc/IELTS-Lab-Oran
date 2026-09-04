'use client';

import Link from 'next/link';

export default function FreeSampleResults({ locale }: { locale: 'ar' | 'en' | 'fr' }) {
  const copy = {
    en: { eyebrow: 'Free sample complete', title: 'Ready for a full IELTS simulation?', body: 'Create your account to purchase one secure full mock-test attempt and keep your verified result.', cta: 'Create your account' },
    fr: { eyebrow: 'Échantillon terminé', title: 'Prêt pour une simulation IELTS complète ?', body: 'Créez votre compte pour acheter une tentative complète et conserver votre résultat vérifié.', cta: 'Créer votre compte' },
    ar: { eyebrow: 'اكتملت العينة المجانية', title: 'هل أنت مستعد لمحاكاة IELTS كاملة؟', body: 'أنشئ حسابك لشراء محاولة اختبار كاملة وآمنة والاحتفاظ بنتيجتك الموثقة.', cta: 'إنشاء حساب' },
  }[locale];
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f3] px-5 py-12">
      <section className="w-full max-w-xl rounded-[2rem] border border-black/[0.07] bg-white p-8 text-center shadow-[0_24px_80px_-46px_rgba(0,0,0,0.45)] sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">{copy.eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-black/55">{copy.body}</p>
        <Link href={`/${locale}/auth/sign-up`} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-charcoal px-7 py-3 text-sm font-bold text-white transition hover:bg-crimson">{copy.cta}</Link>
      </section>
    </main>
  );
}
