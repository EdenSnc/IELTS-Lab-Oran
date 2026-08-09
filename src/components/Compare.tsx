'use client';

import { useTranslations } from 'next-intl';

export default function Compare() {
  const t = useTranslations('Compare');

  return (
    <section id="compare" className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      <h2 className="text-4xl font-extrabold text-center mb-16 tracking-tight uppercase">{t('title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface rounded-4xl p-10 md:p-14 flex flex-col gap-8 border border-gray-200">
          <div>
            <h3 className="text-3xl font-bold text-gray-400 mb-2 tracking-tight">{t('traditionalTitle')}</h3>
            <p className="text-gray-500 font-medium">{t('traditionalSubtitle')}</p>
          </div>
          <ul className="flex flex-col gap-6 text-gray-600 text-lg">
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-gray-300 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              <span>{t('traditional1')}</span></li>
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-gray-300 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              <span>{t('traditional2')}</span></li>
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-gray-300 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              <span>{t('traditional3')}</span></li>
          </ul>
        </div>
        <div className="bg-charcoal text-white rounded-4xl p-10 md:p-14 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-crimson mb-2 tracking-tight">{t('labTitle')}</h3>
            <p className="text-gray-300 font-medium">{t('labSubtitle')}</p>
          </div>
          <ul className="flex flex-col gap-6 text-gray-100 text-lg relative z-10">
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              <span>{t('lab1')}</span></li>
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              <span>{t('lab2')}</span></li>
            <li className="flex items-start gap-4">
              <svg className="w-6 h-6 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              <span>{t('lab3')}</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
