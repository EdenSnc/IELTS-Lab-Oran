'use client';

import { useTranslations } from 'next-intl';
import TallyForm from './TallyForm';
import TrustBadges from './TrustBadges';
import type { CohortStatus } from '@/lib/cohort';

interface IntakeProps {
  cohortStatus: CohortStatus;
}

export default function Intake({ cohortStatus }: IntakeProps) {
  const t = useTranslations('Intake');
  const ct = useTranslations('Cohort');
  const bt = useTranslations('Bypass');

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '213780343103';

  const fillPct = cohortStatus.total > 0
    ? Math.round((cohortStatus.claimed / cohortStatus.total) * 100)
    : 0;

  return (
    <section id="intake" className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      {/* Outer card — always column so bypass sits below the two columns */}
      <div className="bg-charcoal text-white rounded-5xl p-8 md:p-14 flex flex-col gap-10 shadow-2xl relative overflow-hidden">

        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[orange]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Two-column row: Info + Form */}
        <div className="flex flex-col md:flex-row md:items-start gap-12">

          {/* Left Column: Info */}
          <div className="md:w-1/2 flex flex-col justify-center relative z-10 text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-white/10 shadow-sm backdrop-blur-md w-fit">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse shadow-glow" />
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
                <svg className="w-5 h-5 text-crimson shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-[15px]">{t('feature1')}</span>
              </li>
              <li className="flex items-center gap-4 text-gray-200">
                <svg className="w-5 h-5 text-crimson shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-[15px]">{t('feature2')}</span>
              </li>
              <li className="flex items-center gap-4 text-gray-200">
                <svg className="w-5 h-5 text-crimson shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                <span className="text-[15px]">{t('feature3')}</span>
              </li>
            </ul>

            {/* Trust row */}
            <div className="mb-6 w-full flex justify-center md:justify-start">
              <TrustBadges variant="light" />
            </div>

            {/* Founding Cohort Counter */}
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] px-8 py-6 flex flex-col items-center gap-3 mb-8">
              <div className="flex justify-between w-full text-xs font-medium">
                <span className="text-white/70">
                  {cohortStatus.isFull
                    ? ct('full')
                    : ct('claimedText', { claimed: cohortStatus.claimed, total: cohortStatus.total })}
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
              <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                Lab Ready
              </div>
              <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                Curriculum Set
              </div>
              <div className="bg-crimson text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-crimson/30 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                Scheduling...
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

        {/* Bypass CTA — full-width row BELOW the two columns */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* WhatsApp icon */}
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.099 1.51 5.827L0 24l6.335-1.484A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.003-1.366l-.36-.214-3.76.882.924-3.658-.234-.376A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
              </svg>
            </div>
            <div>
              <p className="text-white/90 text-sm font-semibold leading-tight">{bt('label')}</p>
              <p className="text-white/45 text-xs leading-relaxed mt-0.5">{bt('text')}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(bt('waMessage'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            {bt('cta')}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

      </div>
    </section>
  );
}
