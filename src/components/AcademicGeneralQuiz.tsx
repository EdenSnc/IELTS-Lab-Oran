'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/seo';

const copy = {
  en: {
    title: 'Which IELTS should you book?',
    prompt: 'Choose your primary purpose.',
    study: 'University or professional registration',
    migration: 'Migration, work, or below-degree study',
    studyResult: 'IELTS Academic is usually the relevant test.',
    migrationResult: 'IELTS General Training is often the relevant test.',
    caveat: 'Your institution or immigration authority makes the final decision. Confirm its exact requirement before booking.',
  },
  fr: {
    title: 'Quel IELTS devez-vous réserver ?',
    prompt: 'Choisissez votre objectif principal.',
    study: 'Université ou inscription professionnelle',
    migration: 'Immigration, travail ou études sous le niveau licence',
    studyResult: 'IELTS Academic est généralement le test adapté.',
    migrationResult: 'IELTS General Training est souvent le test adapté.',
    caveat: 'L’établissement ou l’autorité d’immigration décide. Confirmez l’exigence exacte avant de réserver.',
  },
  ar: {
    title: 'أي IELTS ينبغي أن تحجز؟',
    prompt: 'اختر هدفك الأساسي.',
    study: 'الجامعة أوالتسجيل المهني',
    migration: 'الهجرة أوالعمل أوالدراسة دون مستوى الشهادة',
    studyResult: 'يكون IELTS Academic غالباً هو الاختبار المناسب.',
    migrationResult: 'يكون IELTS General Training غالباً هو الاختبار المناسب.',
    caveat: 'القرار النهائي للمؤسسة أوسلطة الهجرة. تحقق من الشرط الدقيق قبل الحجز.',
  },
} as const;

export default function AcademicGeneralQuiz({ locale }: { locale: Locale }) {
  const [choice, setChoice] = useState<'study' | 'migration' | null>(null);
  const t = copy[locale];

  return (
    <section className="not-prose my-12 rounded-[2rem] border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-crimson">
        Interactive check
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-charcoal">{t.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{t.prompt}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(['study', 'migration'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={choice === option}
            onClick={() => setChoice(option)}
            className={`rounded-2xl border p-4 text-start text-sm font-bold transition ${
              choice === option
                ? 'border-crimson bg-crimson text-white'
                : 'border-gray-200 bg-gray-50 text-charcoal hover:border-crimson/40'
            }`}
          >
            {t[option]}
          </button>
        ))}
      </div>
      {choice && (
        <div aria-live="polite" className="mt-5 rounded-2xl bg-charcoal p-5 text-white">
          <p className="font-extrabold">
            {choice === 'study' ? t.studyResult : t.migrationResult}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-300">{t.caveat}</p>
        </div>
      )}
    </section>
  );
}
