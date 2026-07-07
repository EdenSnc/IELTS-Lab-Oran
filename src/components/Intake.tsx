'use client';

import { useTranslations } from 'next-intl';
import TallyForm from './TallyForm';

export default function Intake() {
  const t = useTranslations('Intake');

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
