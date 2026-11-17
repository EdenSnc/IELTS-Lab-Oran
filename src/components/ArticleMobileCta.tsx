'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { COURSE_PRICE_DZD } from '@/lib/seo';

const COPY = {
  en: {
    subtitle: `${COURSE_PRICE_DZD.toLocaleString('en-US')} DA · first cohort`,
    cta: 'APPLY NOW',
  },
  fr: {
    subtitle: `${COURSE_PRICE_DZD.toLocaleString('fr-FR')} DA · premier groupe`,
    cta: 'POSTULER',
  },
  ar: {
    subtitle: `${COURSE_PRICE_DZD.toLocaleString('en-US')} دج · المجموعة الأولى`,
    cta: 'سجّل الآن',
  },
} as const;

export default function ArticleMobileCta() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const copy = COPY[locale];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div>
        <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
        <div className="text-xs text-crimson font-semibold">{copy.subtitle}</div>
      </div>
      <Link
        href="/#intake"
        className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform"
      >
        {copy.cta}
      </Link>
    </div>
  );
}
