'use client';

import { useTranslations } from 'next-intl';

export default function Methodology() {
  const t = useTranslations('Methodology');

  return (
    <section id="methodology" className="py-24 px-6 md:px-12 max-w-4xl mx-auto text-center relative z-10">
      <h2 className="text-4xl font-extrabold tracking-tight uppercase text-charcoal mb-8">{t('title')}</h2>
      <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
        {t('subtitle')}
      </p>
      <div className="mt-12 bg-surface p-10 md:p-12 rounded-[2.5rem] border border-gray-100 shadow-soft relative">
        <p className="text-lg md:text-xl text-charcoal leading-relaxed font-medium">
          {t('corePhilosophy')}
        </p>
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-charcoal text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
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
