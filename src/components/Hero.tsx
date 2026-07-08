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
    <header className="pt-40 pb-20 px-6 md:px-12 max-w-5xl mx-auto flex flex-col items-center text-center gap-6 min-h-[80vh] justify-center">

        <div className="inline-flex items-center gap-2 bg-surface text-charcoal px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-crimson animate-pulse"></span>
            {t('badge')}
        </div>

        <div className="relative w-full">
            {/* Premium Coming Soon Overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-visible">
                {/* Glassmorphic card overlay */}
                <div
                  className="absolute inset-[-20px] rounded-[2.5rem] overflow-hidden"
                  style={{ backdropFilter: 'blur(2px)', background: 'rgba(255,255,255,0.55)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-transparent" />
                </div>

                {/* Central premium badge */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  {/* Pulsing status dot */}
                  <div className="flex items-center gap-2.5 bg-charcoal/90 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-xl border border-white/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson"></span>
                    </span>
                    Launching Soon
                  </div>

                  {/* Main message */}
                  <div className="bg-white/95 backdrop-blur-lg border border-gray-200/80 shadow-2xl rounded-[2rem] px-10 py-8 flex flex-col items-center gap-3 max-w-lg"
                    style={{ boxShadow: '0 25px 80px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)' }}
                  >
                    <div className="text-5xl md:text-7xl font-black text-charcoal leading-none tracking-tighter">
                      Lab is <span className="text-crimson">Loading.</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xs text-center">
                      Preparing Algeria&apos;s most rigorous IELTS facility. Applications open soon.
                    </p>

                    {/* Founding Cohort Counter — real data, no fake numbers */}
                    <div className="w-full mt-2">
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-gray-500">
                          {cohortStatus.isFull
                            ? ct('full')
                            : ct('remaining', { remaining: cohortStatus.remaining, total: cohortStatus.total })}
                        </span>
                        <span className={cohortStatus.isFull ? 'text-crimson font-bold' : 'text-blue-600 font-bold'}>
                          {cohortStatus.claimed}/{cohortStatus.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${cohortStatus.isFull ? 'bg-gradient-to-r from-crimson to-red-400' : 'bg-blue-600'}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      {!cohortStatus.isFull && (
                        <p className="text-xs text-blue-500 mt-1.5 text-center">{ct('discountNote')}</p>
                      )}
                    </div>
                  </div>

                  {/* Floating sub-tags */}
                  <div className="flex gap-3 flex-wrap justify-center">
                    <div className="bg-white/90 backdrop-blur border border-gray-200 text-charcoal text-xs font-bold px-4 py-2 rounded-full shadow-md">
                      ✓ Lab Ready
                    </div>
                    <div className="bg-white/90 backdrop-blur border border-gray-200 text-charcoal text-xs font-bold px-4 py-2 rounded-full shadow-md">
                      ✓ Curriculum Set
                    </div>
                    <div className="bg-crimson/10 backdrop-blur border border-crimson/20 text-crimson text-xs font-bold px-4 py-2 rounded-full shadow-md">
                      ◷ Scheduling...
                    </div>
                  </div>
                </div>
            </div>

            {/* Original Text Content (behind overlay) */}
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] relative z-10">
                {t('title')}<br />
                <span className="text-crimson">{t('subtitle')}</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 max-w-2xl font-light leading-snug mt-6 relative z-10">
                Protect your <span className="highlight">40,000 DA</span> test fee with an elite, in-person PC sprint led by an
                <span className="highlight">IELTS 8.0 Scorer</span>.
            </p>
        </div>

        <div className="flex flex-col items-center mt-6 w-full sm:w-auto">
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
