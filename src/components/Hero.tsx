import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import type { CohortStatus } from '@/lib/cohort';

interface HeroProps {
  cohortStatus: CohortStatus;
}

export default async function Hero({ cohortStatus }: HeroProps) {
  const [t, ct] = await Promise.all([
    getTranslations('Hero'),
    getTranslations('Cohort'),
  ]);

  return (
    <header className="pt-32 pb-16 px-6 md:px-12 max-w-5xl mx-auto flex flex-col items-center text-center gap-6 min-h-[75vh] justify-center">
      {/* Top badges */}
      <div className="flex flex-col gap-2 items-center justify-center">
        <span className="inline-flex items-center rounded-full border border-crimson/25 bg-crimson/5 px-3.5 py-1 text-xs font-bold tracking-wide text-[#b81428]">
          {t('badge')}
        </span>
        <div className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal/80 sm:text-xs">
          <span aria-hidden="true" className="h-px w-7 bg-crimson" />
          {t('programBadge')}
          <span aria-hidden="true" className="h-px w-7 bg-crimson" />
        </div>
      </div>

      {/* Main heading */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-charcoal">
          {t('title')}
        </h1>
        <p className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#c4162c]">
          {t('subtitle')}
        </p>
      </div>

      {/* Sub-description */}
      <p className="text-xl md:text-2xl text-gray-700 max-w-2xl font-light leading-snug">
        {t.rich('description', {
          highlight: (chunks) => <span className="highlight">{chunks}</span>,
        })}
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {cohortStatus.isFull ? (
            <Link href="/#intake" className="bg-charcoal text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-lg transform hover:-translate-y-1 w-full sm:w-auto flex justify-center items-center gap-2">
              {ct('fullCta')}
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          ) : (
            <Link href="/#intake" className="bg-[#c4162c] text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-red-800 transition-all shadow-glow hover:shadow-2xl transform hover:-translate-y-1 w-full sm:w-auto flex justify-center items-center gap-2">
              {t('reserve')}
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
          <Link href="/#compare" className="bg-white border border-gray-200 text-charcoal px-10 py-5 rounded-full font-bold text-lg hover:bg-gray-100 transition-all w-full sm:w-auto text-center">
            {t('details')}
          </Link>
        </div>
        <span className="text-sm text-gray-700 mt-4 font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {t('noPayment')}
        </span>
      </div>
    </header>
  );
}
