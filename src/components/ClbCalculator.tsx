'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/seo';

type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

const thresholds: Record<Skill, Array<[number, number]>> = {
  listening: [[8.5, 10], [8, 9], [7.5, 8], [6, 7], [5.5, 6], [5, 5], [4.5, 4]],
  reading: [[8, 10], [7, 9], [6.5, 8], [6, 7], [5, 6], [4, 5], [3.5, 4]],
  writing: [[7.5, 10], [7, 9], [6.5, 8], [6, 7], [5.5, 6], [5, 5], [4, 4]],
  speaking: [[7.5, 10], [7, 9], [6.5, 8], [6, 7], [5.5, 6], [5, 5], [4, 4]],
};

const copy = {
  en: {
    title: 'IELTS General → CLB calculator',
    subtitle: 'Enter each IELTS General Training score. Your overall language level is limited by your lowest skill.',
    labels: { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' },
    result: 'Lowest converted level',
    below: 'Below CLB 4',
    note: 'Based on the current IRCC Express Entry conversion table. IELTS One Skill Retake is not accepted for Express Entry.',
  },
  fr: {
    title: 'Calculateur IELTS General → CLB',
    subtitle: 'Entrez chaque score IELTS General Training. Le niveau global est limité par la compétence la plus faible.',
    labels: { listening: 'Écoute', reading: 'Lecture', writing: 'Écriture', speaking: 'Expression orale' },
    result: 'Niveau converti le plus faible',
    below: 'Sous CLB 4',
    note: 'Basé sur le tableau actuel d’IRCC pour Entrée express. IELTS One Skill Retake n’est pas accepté pour Entrée express.',
  },
  ar: {
    title: 'حاسبة IELTS General ← CLB',
    subtitle: 'أدخل درجة كل مهارة. يحدد أضعف مستوى لغوي النتيجة الإجمالية.',
    labels: { listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة', speaking: 'المحادثة' },
    result: 'أدنى مستوى محوّل',
    below: 'أقل من CLB 4',
    note: 'مبنية على جدول IRCC الحالي لـExpress Entry. لا يُقبل IELTS One Skill Retake في Express Entry.',
  },
} as const;

const scores = Array.from({ length: 12 }, (_, index) => 3.5 + index * 0.5);

function toClb(skill: Skill, score: number) {
  return thresholds[skill].find(([minimum]) => score >= minimum)?.[1] ?? 0;
}

export default function ClbCalculator({ locale }: { locale: Locale }) {
  const [values, setValues] = useState<Record<Skill, number>>({
    listening: 8,
    reading: 7,
    writing: 7,
    speaking: 7,
  });
  const t = copy[locale];
  const result = useMemo(
    () => Math.min(...(Object.keys(values) as Skill[]).map((skill) => toClb(skill, values[skill]))),
    [values],
  );

  return (
    <section className="not-prose my-12 rounded-[2rem] bg-charcoal p-6 text-white md:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-crimson">
        Interactive calculator
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">{t.subtitle}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {(Object.keys(values) as Skill[]).map((skill) => (
          <label key={skill} className="text-sm font-bold">
            {t.labels[skill]}
            <select
              value={values[skill]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [skill]: Number(event.target.value) }))
              }
              className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-charcoal"
            >
              {scores.map((score) => (
                <option key={score} value={score}>
                  {score.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div aria-live="polite" className="mt-6 rounded-2xl bg-white p-5 text-charcoal">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.result}</p>
        <p className="mt-1 text-3xl font-extrabold text-crimson">
          {result ? `CLB ${result}` : t.below}
        </p>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-gray-400">{t.note}</p>
    </section>
  );
}
