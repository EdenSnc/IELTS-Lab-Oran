'use client';

import { useTranslations } from 'next-intl';

export default function Facility() {
  const t = useTranslations('Facility');

  return (
    <section id="facility" className="py-20 px-6 md:px-12 max-w-6xl mx-auto relative z-10 text-center">
      <h2 className="text-4xl font-extrabold mb-6 tracking-tight uppercase text-charcoal">{t('title')}</h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
        {t('subtitle')}
      </p>
      <div className="rounded-[3rem] overflow-hidden shadow-2xl relative aspect-[21/9] bg-charcoal group border-8 border-surface">
        {/* Placeholder for real facility image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop" alt="IELTS Lab Facility" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
        
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent flex flex-col justify-end items-center pb-10">
           <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full text-white font-medium border border-white/20">
             <svg className="w-5 h-5 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             {t('location')}
           </div>
        </div>
      </div>
    </section>
  );
}
