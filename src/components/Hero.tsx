'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { CohortStatus } from '@/lib/cohort';

interface HeroProps {
  cohortStatus: CohortStatus;
}

export default function Hero({ cohortStatus }: HeroProps) {
  const t = useTranslations('Hero');
  const ct = useTranslations('Cohort');

  const fillPct = cohortStatus.total > 0
    ? Math.round((cohortStatus.claimed / cohortStatus.total) * 100)
    : 0;

  return (
    <header className="pt-32 pb-16 px-6 md:px-12 max-w-5xl mx-auto flex flex-col items-center text-center gap-6 min-h-[75vh] justify-center">

      {/* Top badges */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-center">
        <div className="inline-flex items-center gap-2 bg-charcoal text-white px-5 py-2 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-sm border border-charcoal/90">
          <svg className="w-3.5 h-3.5 text-crimson" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {t('programBadge')}
        </div>
      </div>


      {/* Main heading */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-charcoal">
        {t('title')}<br />
        {t.rich('subtitle', {
          red: (chunks) => <span className="text-crimson">{chunks}</span>
        })}
      </h1>

      {/* Sub-description */}
      <p className="text-xl md:text-2xl text-gray-500 max-w-2xl font-light leading-snug">
        {t.rich('description', {
          highlight: (chunks) => <span className="highlight">{chunks}</span>
        })}
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {cohortStatus.isFull ? (
            <Link href="/#intake" className="bg-charcoal text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-lg transform hover:-translate-y-1 w-full sm:w-auto flex justify-center items-center gap-2">
              {ct('fullCta')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          ) : (
            <Link href="/#intake" className="bg-crimson text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-red-800 transition-all shadow-glow hover:shadow-2xl transform hover:-translate-y-1 w-full sm:w-auto flex justify-center items-center gap-2">
              {t('reserve')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          )}
          <Link href="/#compare" className="bg-surface text-charcoal px-10 py-5 rounded-full font-bold text-lg hover:bg-gray-200 transition-all w-full sm:w-auto text-center">
            {t('details')}
          </Link>
        </div>
        <span className="text-sm text-gray-400 mt-4 font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          {t('noPayment')}
        </span>
      </div>
    </header>
  );
}
