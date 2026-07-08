'use client';

import { useTranslations } from 'next-intl';
import TallyForm from './TallyForm';
import type { CohortStatus } from '@/lib/cohort';

interface IntakeProps {
  cohortStatus: CohortStatus;
}

export default function Intake({ cohortStatus }: IntakeProps) {
  const t = useTranslations('Intake');
  const ct = useTranslations('Cohort');

  const fillPct = cohortStatus.total > 0
    ? Math.round((cohortStatus.claimed / cohortStatus.total) * 100)
    : 0;

  return (
    <section id="intake" className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      <div className="bg-charcoal text-white rounded-5xl p-8 md:p-14 flex flex-col md:flex-row md:items-start gap-12 shadow-2xl relative">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[orange]/5 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Left Column: Info */}
        <div className="md:w-1/2 flex flex-col justify-center relative z-10 text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-white/10 shadow-sm backdrop-blur-md w-fit">
            <span className="w-2 h-2 rounded-full bg-crimson animate-pulse shadow-glow"></span>
            {t('badge')}
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{t('title')}</h2>
          
          <div className="mb-10">
            <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs mb-3">{t('feeTitle')}</h3>
            <div className="text-4xl font-extrabold text-crimson drop-shadow-sm mb-3">{t('fee')}</div>
            <p className="text-gray-300 font-medium text-lg leading-relaxed">{t('feeDesc')}</p>
          </div>
          
          <ul className="flex flex-col gap-5 font-medium mb-12">
            <li className="flex items-center gap-4 text-gray-200">
              <div className="w-2 h-2 rounded-full bg-crimson shadow-glow shrink-0"></div> 
              <span className="text-[15px]">{t('feature1')}</span>
            </li>
            <li className="flex items-center gap-4 text-gray-200">
              <div className="w-2 h-2 rounded-full bg-crimson shadow-glow shrink-0"></div> 
              <span className="text-[15px]">{t('feature2')}</span>
            </li>
            <li className="flex items-center gap-4 text-gray-200">
              <div className="w-2 h-2 rounded-full bg-crimson shadow-glow shrink-0"></div> 
              <span className="text-[15px]">{t('feature3')}</span>
            </li>
          </ul>

          {/* Founding Cohort Counter */}
          <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] px-8 py-6 flex flex-col items-center gap-3 mb-8">
            <div className="flex justify-between w-full text-xs font-medium">
              <span className="text-white/70">
                {cohortStatus.isFull
                  ? ct('full')
                  : ct('remaining', { remaining: cohortStatus.remaining, total: cohortStatus.total })}
              </span>
              <span className="text-white font-bold">
                {cohortStatus.claimed}/{cohortStatus.total}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all shadow-[0_0_10px_rgba(250,204,21,0.5)] ${cohortStatus.isFull ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-yellow-400'}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {!cohortStatus.isFull && (
              <p className="text-xs text-white/50 text-center">{ct('discountNote')}</p>
            )}
          </div>

          {/* Status sub-tags */}
          <div className="flex gap-3 flex-wrap justify-start mb-8">
            <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md">
              ✓ Lab Ready
            </div>
            <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md">
              ✓ Curriculum Set
            </div>
            <div className="bg-crimson text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-crimson/30">
              ◷ Scheduling...
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed font-light text-sm border-l-2 border-white/10 pl-4 mt-auto">
            {t('footerText')}
          </p>
        </div>

        {/* Right Column: Tally Form */}
        <div className="md:w-1/2 bg-white rounded-3xl p-6 md:p-8 shadow-xl relative z-10 border-4 border-surface text-charcoal flex flex-col min-h-[600px]">
          <TallyForm formId="ODrqpp" />
        </div>
      </div>
    </section>
  );
}
