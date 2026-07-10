'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function FAQ() {
  const t = useTranslations('FAQ');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
    { q: t('q5'), a: t('a5') },
    { q: t('q6'), a: t('a6') },
    { q: t('q7'), a: t('a7') }
  ];

  return (
    <section id="faq" className="py-16 px-6 md:px-12 max-w-4xl mx-auto mb-12">
      <h2 className="text-3xl font-extrabold text-center mb-10 tracking-tight uppercase text-charcoal">{t('title')}</h2>
      <div className="flex flex-col gap-4">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-surface rounded-[2rem] border border-gray-100 overflow-hidden transition-all duration-300">
            <button 
              aria-expanded={openIndex === index}
              onClick={() => toggle(index)}
              className="w-full text-left font-bold text-lg text-charcoal flex justify-between items-center p-6 focus:outline-none focus:bg-gray-50 transition-colors"
            >
              {faq.q}
              <svg
                className={`w-5 h-5 text-crimson shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-gray-600 leading-relaxed font-medium">{faq.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Schema.org FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": f.a
              }
            }))
          })
        }}
      />
    </section>
  );
}
