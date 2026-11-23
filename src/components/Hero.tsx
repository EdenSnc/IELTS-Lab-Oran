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
    <header className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 px-4 pb-10 pt-24 text-center md:min-h-[75vh] md:gap-6 md:px-12 md:pb-16 md:pt-32">
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
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-charcoal sm:text-5xl md:text-7xl">
          {t('title')}
        </h1>
        <p className="text-xl font-bold tracking-tight text-[#c4162c] sm:text-3xl md:text-5xl md:font-extrabold">
          {t('subtitle')}
        </p>
      </div>

      {/* Sub-description */}
      <p className="max-w-2xl text-base font-medium leading-snug text-gray-700 sm:text-xl md:text-2xl md:font-light">
        {t.rich('description', {
          highlight: (chunks) => <span className="highlight">{chunks}</span>,
        })}
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center w-full sm:w-auto">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-4">
          {cohortStatus.isFull ? (
            <Link href="/#intake" className="flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-5 py-3 font-bold text-white shadow-lg transition hover:bg-gray-800 sm:w-auto md:px-10 md:py-5 md:text-lg">
              {ct('fullCta')}
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          ) : (
            <Link href="/#intake" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#c4162c] px-5 py-3 font-bold text-white shadow-glow transition hover:bg-red-800 sm:w-auto md:px-10 md:py-5 md:text-lg">
              {t('reserve')}
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
          <Link href="/#compare" className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-center font-bold text-charcoal transition hover:bg-gray-100 sm:w-auto md:px-10 md:py-5 md:text-lg">
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
