'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function StopTraining() {
  const t = useTranslations('StopTraining');

  return (
    <section className="py-12 bg-charcoal text-white my-12 mx-4 md:mx-12 rounded-4xl md:rounded-5xl px-6 md:px-16 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
      <div className="md:w-1/2">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
          {t.rich('title', {
            mark: (chunks) => <mark className="bg-yellow-300 text-charcoal px-2 py-0.5 mx-1 rounded-sm inline-block transform -rotate-1 font-black shadow-sm">{chunks}</mark>
          })}
        </h2>
        <p className="text-gray-400 text-lg font-light leading-relaxed">
          {t.rich('subtitle', {
            mark: (chunks) => <mark className="bg-yellow-300 text-charcoal px-1.5 py-0 mx-1 rounded-sm font-semibold shadow-sm">{chunks}</mark>
          })}
        </p>
        <ul className="mt-6 space-y-3">
          <li className="flex items-start gap-3 text-gray-400">
            <svg className="w-5 h-5 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            <span>{t.rich('bullet1', { strong: (chunks) => <strong className="text-white font-bold">{chunks}</strong> })}</span>
          </li>
          <li className="flex items-start gap-3 text-gray-400">
            <svg className="w-5 h-5 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            <span>{t.rich('bullet2', { strong: (chunks) => <strong className="text-white font-bold">{chunks}</strong> })}</span>
          </li>
          <li className="flex items-start gap-3 text-gray-400">
            <svg className="w-5 h-5 text-crimson shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            <span>{t.rich('bullet3', { strong: (chunks) => <strong className="text-white font-bold">{chunks}</strong> })}</span>
          </li>
        </ul>
      </div>
      <div className="md:w-1/2 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col gap-6 shadow-2xl">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 bg-crimson/20 text-crimson px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase w-fit">
            <span className="w-2 h-2 rounded-full bg-crimson animate-pulse"></span>
            {t('proofBadge')}
          </div>
          <h3 className="text-xl font-bold text-white tracking-wide">
            {t('proofTitle')}
          </h3>
        </div>
        <div className="w-full bg-white rounded-2xl p-2 shadow-soft overflow-hidden group border border-white/10">
          <Image src="/ielts_cropped.png" alt="Official IELTS Test Report Form Band 8.0" width={800} height={600} className="w-full h-auto object-contain rounded-xl shadow-sm" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }} sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
      </div>
    </section>
  );
}
