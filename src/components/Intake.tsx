'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  COHORT_APPLICATION_DEADLINE,
  COHORT_ARTICLE_PATH,
  cohortLaunch,
  isCohortDeadlinePassed,
} from '@/lib/cohort-launch';
import type { Locale } from '@/lib/seo';
import ApplicationForm from './ApplicationForm';
import TrustBadges from './TrustBadges';
import type { CohortStatus } from '@/lib/cohort';
import { VENUE_MAP_URL, VENUE_PLUS_CODE } from '@/lib/location';

interface IntakeProps {
  cohortStatus: CohortStatus;
}

export default function Intake({ cohortStatus }: IntakeProps) {
  const t = useTranslations('Intake');
  const ct = useTranslations('Cohort');
  const bt = useTranslations('Bypass');
  const location = useTranslations('Facility');
  const launch = cohortLaunch[useLocale() as Locale];

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '213780343103';

  const deadlinePassed = isCohortDeadlinePassed();
  const waitlist = deadlinePassed || cohortStatus.isFull;
  const confirmedSeats = cohortStatus.claimed;
  const fillPct = cohortStatus.total > 0
    ? Math.round((confirmedSeats / cohortStatus.total) * 100)
    : 0;

  return (
    <section id="intake" className="relative z-10 mx-auto w-full max-w-7xl scroll-mt-20 px-3 py-10 sm:px-6 md:px-12 md:py-24">
      {/* Outer card - always column so bypass sits below the two columns */}
      <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-charcoal p-3 text-white shadow-2xl sm:p-6 md:rounded-5xl md:p-10 lg:p-14">

        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[orange]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Two-column row: Info + Form */}
        <div className="relative z-10 grid gap-4 md:grid-cols-2 md:items-start md:gap-x-8 lg:gap-x-12">

          {/* Left Column: Info */}
          <div className="min-w-0 px-2 pt-2 md:px-0 md:pt-0">
            <p className="mb-2 text-xs font-bold text-gray-300">{t('badge')}</p>
            <h2 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{waitlist ? launch.closedCta : t('title')}</h2>

            {waitlist ? (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                <p className="font-bold">{deadlinePassed ? t('closedBadge') : ct('full')}</p>
                <p className="mt-1 text-amber-100/90 leading-relaxed">{deadlinePassed ? t('closedNote') : launch.waitlistNote}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-3xl font-extrabold md:text-4xl">{t('fee')}</p>
                  <p className="text-sm font-semibold text-gray-300">{t('feeTitle')}</p>
                </div>
                <p className="mt-2 text-sm font-semibold">
                  {launch.deadlineLabel} · <time dateTime={COHORT_APPLICATION_DEADLINE}>{launch.deadline}</time>
                </p>
              </>
            )}
            <a href={VENUE_MAP_URL} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 flex-wrap items-center gap-x-2 text-sm font-semibold text-white underline underline-offset-4">
              {location('location')} · <bdi>{VENUE_PLUS_CODE}</bdi> <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/15 bg-white p-4 text-charcoal shadow-xl md:col-start-2 md:row-span-2 md:row-start-1 md:rounded-3xl md:p-8">
            <ApplicationForm waitlist={waitlist} />
          </div>

          <details className="min-w-0 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 md:col-start-1 md:row-start-2 md:px-4">
            <summary className="cursor-pointer text-sm font-semibold">{t('details')}</summary>
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-gray-200">{t('feeDesc')}</p>
              <p className="mt-1 text-sm text-gray-300">{t('previousFee')}</p>
              <Link href={COHORT_ARTICLE_PATH} className="mt-3 block text-sm text-white underline underline-offset-4">{launch.title}</Link>
            </div>

            <ul className="my-5 flex flex-col gap-3 font-medium">
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

            {/* Founding Cohort Counter / Capacity summary */}
            {confirmedSeats === 0 && !waitlist ? (
              <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] px-6 py-4 flex flex-col items-start gap-1.5 mb-8">
                <p className="text-sm font-bold text-white">{t('capacitySummary')}</p>
                <p className="text-xs text-white/70">{ct('discountNote')}</p>
              </div>
            ) : (
              <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] px-8 py-6 flex flex-col items-center gap-3 mb-8">
                <div className="flex justify-between w-full text-xs font-medium">
                  <span className="text-white/70">
                    {cohortStatus.isFull
                      ? ct('full')
                      : ct('claimedText', { claimed: confirmedSeats, total: cohortStatus.total })}
                  </span>
                  <span className="text-white font-bold">
                    {confirmedSeats}/{cohortStatus.total}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all shadow-[0_0_10px_rgba(250,204,21,0.5)] ${cohortStatus.isFull ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-yellow-400'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                {!waitlist && (
                  <p className="text-xs text-white/70 text-center">{ct('discountNote')}</p>
                )}
              </div>
            )}

            {/* Status sub-tags */}
            <div className="flex gap-3 flex-wrap justify-start mb-8">
              <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                {t('statusLabReady')}
              </div>
              <div className="bg-white/5 border border-white/10 text-white/90 text-xs font-bold px-4 py-2 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                {t('statusCurriculumSet')}
              </div>
              <div className="bg-[#c4162c] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-crimson/30 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                {t('statusScheduling')}
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed font-light text-sm border-s-2 border-white/15 ps-4 mt-auto">
              {t('footerText')}
            </p>
          </details>
        </div>

        {/* Bypass CTA - full-width row BELOW the two columns */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* WhatsApp icon */}
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.099 1.51 5.827L0 24l6.335-1.484A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.003-1.366l-.36-.214-3.76.882.924-3.658-.234-.376A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{bt('label')}</p>
              <p className="text-gray-300 text-xs leading-relaxed mt-0.5">{bt('text')}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(bt('waMessage'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 backdrop-blur-sm"
          >
            {bt('cta')}
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

      </div>
    </section>
  );
}
