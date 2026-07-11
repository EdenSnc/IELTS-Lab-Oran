'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { SITE_URL } from '@/lib/seo';

export default function About() {
  const t = useTranslations('About');

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#instructor`,
    "name": "Amine",
    "jobTitle": "Lead Instructor & Founder",
    "description": t('hook'),
    "knowsAbout": ["IELTS Preparation", "English Teaching", "C1/C2 Proficiency"],
    "worksFor": {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`
    }
  };

  return (
    <section id="instructor" className="w-[96%] max-w-[90rem] mx-auto bg-charcoal text-white py-24 relative overflow-hidden rounded-[2.5rem] md:rounded-[4rem] shadow-2xl my-16 md:my-24">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-crimson/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent z-10" />
              <Image 
                src="/amine.jpg" 
                alt="Amine - IELTS Instructor" 
                fill 
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              <div className="absolute bottom-6 left-6 z-20">
                <div className="inline-block bg-crimson text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-2 shadow-glow">
                  {t('subtitle')}
                </div>
                <h3 className="text-3xl font-bold text-white">Amine</h3>
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Badges */}
          <div className="lg:col-span-7 flex flex-col justify-center lg:pl-10">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              {t('title')}
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 font-medium mb-10 leading-relaxed">
              {t('hook')}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-4 mb-10">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl font-bold shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-crimson/20 flex items-center justify-center text-crimson shrink-0">
                  8.0
                </div>
                Official IELTS Band 8.0
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl font-bold shadow-sm backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  9.0
                </div>
                Perfect 9.0 in Listening
              </div>
            </div>

            {/* Pedigree & Experience */}
            <div className="space-y-6 text-gray-400 leading-relaxed font-medium">
              <div className="flex gap-4">
                <svg className="w-6 h-6 text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <p>{t('pedigree')}</p>
              </div>
              <div className="flex gap-4">
                <svg className="w-6 h-6 text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <p>{t('experience')}</p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Schema.org Person JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
    </section>
  );
}
