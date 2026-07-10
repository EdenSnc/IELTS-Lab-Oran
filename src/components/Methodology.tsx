'use client';

import { useTranslations } from 'next-intl';

export default function Methodology() {
  const t = useTranslations('Methodology');

  return (
    <section id="methodology" className="py-24 px-6 md:px-12 max-w-4xl mx-auto text-center relative z-10">
      <div className="mb-10 flex flex-col items-center">
        <div className="w-12 h-1 bg-crimson mb-6 rounded-full"></div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-charcoal uppercase">
          {t('title')}
        </h2>
      </div>
      <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
        {t('subtitle')}
      </p>
      {/* Features Grid */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
        {/* Card 1 */}
        <div className="bg-white border border-gray-100/50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-2 group">
          <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-6 text-crimson group-hover:bg-crimson group-hover:text-white transition-colors duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-charcoal mb-3 tracking-tight">{t('bullet1Title')}</h3>
          <p className="text-gray-500 leading-relaxed font-medium">{t('bullet1Desc')}</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-gray-100/50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-2 group">
          <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-6 text-crimson group-hover:bg-crimson group-hover:text-white transition-colors duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-charcoal mb-3 tracking-tight">{t('bullet2Title')}</h3>
          <p className="text-gray-500 leading-relaxed font-medium">{t('bullet2Desc')}</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-gray-100/50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-2 group">
          <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mb-6 text-crimson group-hover:bg-crimson group-hover:text-white transition-colors duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-charcoal mb-3 tracking-tight">{t('bullet3Title')}</h3>
          <p className="text-gray-500 leading-relaxed font-medium">{t('bullet3Desc')}</p>
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <div className="bg-charcoal text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full shadow-lg border border-white/10">
          {t('notForBeginners')}
        </div>
      </div>

      {/* Video Facade */}
      <div className="mt-16 max-w-3xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-video bg-charcoal group cursor-pointer border-4 border-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://img.youtube.com/vi/r5eiUU3EpHE/maxresdefault.jpg" alt="Methodology Walkthrough" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-crimson rounded-[1.5rem] flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8 text-white ml-2" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
          </div>
        </div>
      </div>
    </section>
  );
}
