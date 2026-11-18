'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isCohortDeadlinePassed } from '@/lib/cohort-launch';
import { COURSE_PRICE_DZD, NEXT_COHORT_PRICE_DZD } from '@/lib/seo';

export default function ArticleMobileCta() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const deadlinePassed = isCohortDeadlinePassed();
  const price = deadlinePassed ? NEXT_COHORT_PRICE_DZD : COURSE_PRICE_DZD;

  const formattedNumber =
    locale === 'ar'
      ? new Intl.NumberFormat('ar-DZ').format(price)
      : locale === 'fr'
        ? new Intl.NumberFormat('fr-FR').format(price)
        : new Intl.NumberFormat('en-US').format(price);

  const copy = {
    en: {
      subtitle: deadlinePassed
        ? `${formattedNumber} DA · Oran small-group cohort`
        : `${formattedNumber} DA · first cohort`,
      cta: 'APPLY NOW',
    },
    fr: {
      subtitle: deadlinePassed
        ? `${formattedNumber} DA · cohorte d’Oran`
        : `${formattedNumber} DA · premier groupe`,
      cta: 'POSTULER',
    },
    ar: {
      subtitle: deadlinePassed
        ? `${formattedNumber} دج · دورة وهران`
        : `${formattedNumber} دج · المجموعة الأولى`,
      cta: 'سجّل الآن',
    },
  }[locale];

  return (
    <aside
      aria-label="IELTS Lab Oran"
      className="md:hidden fixed bottom-0 inset-x-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div>
        <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
        <div className="text-xs text-[#b81428] font-semibold">{copy.subtitle}</div>
      </div>
      <Link
        href="/#intake"
        className="bg-[#c4162c] text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform"
      >
        {copy.cta}
      </Link>
    </aside>
  );
}
