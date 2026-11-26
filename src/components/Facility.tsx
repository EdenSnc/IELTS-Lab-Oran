import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Locale } from '@/lib/seo';

import { VENUE_MAP_URL, VENUE_PLUS_CODE } from '@/lib/location';

const POSTAL_LOCATION: Record<Locale, string> = {
  en: 'Bir El Djir, Oran 31130, Algeria',
  fr: 'Bir El Djir, Oran 31130, Algérie',
  ar: 'بئر الجير، وهران 31130، الجزائر',
};

export default async function Facility() {
  const [rawLocale, t] = await Promise.all([
    getLocale(),
    getTranslations('Facility'),
  ]);
  const safeLocale: Locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';

  return (
    <section id="facility" className="py-20 px-6 md:px-12 max-w-6xl mx-auto relative z-10 text-center">
      <h2 className="text-4xl font-extrabold mb-6 tracking-tight uppercase text-charcoal">{t('title')}</h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
        {t('subtitle')}
      </p>
      <div className="rounded-[3rem] overflow-hidden shadow-2xl relative aspect-[21/9] bg-charcoal group border-8 border-surface">
        <Image
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
          alt={t('imageAlt')}
          fill
          sizes="(max-width: 768px) 92vw, (max-width: 1200px) 88vw, 1152px"
          className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/30 to-transparent flex flex-col sm:flex-row justify-end sm:items-end items-center gap-3 pb-6 sm:pb-10 px-6">
          <div className="flex items-center gap-3 bg-charcoal/75 backdrop-blur-md px-5 py-2.5 rounded-full text-white text-sm font-semibold border border-white/20">
            <svg className="w-5 h-5 text-[#ff7a8a] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span><bdi>{VENUE_PLUS_CODE}</bdi> · {POSTAL_LOCATION[safeLocale]}</span>
          </div>
          <a
            href={VENUE_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-charcoal shadow-md transition hover:bg-[#ffebee]"
          >
            {t('mapBtn')}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-600">
        {t('illustrativeNote')}
      </p>
    </section>
  );
}
