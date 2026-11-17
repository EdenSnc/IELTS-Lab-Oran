'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Testimonials() {
  const t = useTranslations('Testimonials');
  const [activeIndex, setActiveIndex] = useState<number | null>(1); // Default to middle testimonial
  const testimonials = t.raw('items') as Array<{
    quote: string;
    initials: string;
    name: string;
    profile: string;
  }>;

  return (
    <section 
      id="testimonials" 
      className="py-16 px-6 md:px-12 max-w-7xl mx-auto relative z-10"
      onMouseLeave={() => setActiveIndex(1)}
    >
      <h2 className="text-4xl font-extrabold text-center mb-4 tracking-tight uppercase text-charcoal">{t('title')}</h2>
      <p className="text-gray-600 text-center max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
        {t('subtitle')}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <div 
              key={index} 
              onMouseEnter={() => setActiveIndex(index)}
              className={`testimonial-card bg-surface rounded-4xl p-8 md:p-10 flex flex-col gap-6 relative border border-gray-100 overflow-hidden ${isActive ? 'active-testimonial' : ''}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none glow-bg"></div>
              <div className="text-crimson text-6xl font-serif absolute top-4 left-6 leading-none quote-mark">&quot;</div>
              <p className="font-medium leading-relaxed relative z-10 pt-4 body-text">
                {item.quote}
              </p>
              <div className="mt-auto flex items-center gap-4 pt-6 border-t border-gray-200 relative z-10 bottom-border">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 avatar">{item.initials}</div>
                <div>
                  <div className="font-bold text-sm leading-tight name-text">{item.name}</div>
                  <div className="text-xs font-medium mt-1 title-text">{item.profile}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
