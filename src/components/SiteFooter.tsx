import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Locale } from '@/lib/seo';

import { VENUE_MAP_URL, VENUE_PLUS_CODE } from '@/lib/location';

const FOOTER_COPY: Record<
  Locale,
  {
    addressLine: string;
    phoneLabel: string;
    whatsappLabel: string;
    guides: Array<[string, string]>;
    platformTitle: string;
    platformNavLabel: string;
    mockTest: string;
    freeSample: string;
    about: string;
    privacy: string;
    terms: string;
  }
> = {
  en: {
    addressLine: 'Bir El Djir, Oran 31130, Algeria',
    phoneLabel: 'Call +213 780 34 31 03',
    whatsappLabel: 'WhatsApp +213 780 34 31 03',
    guides: [
      ['IELTS Registration & 40,000 DA Fee', '/articles/how-to-register-algeria'],
      ['Computer IELTS in Algeria (2026)', '/articles/computer-vs-paper-ielts'],
      ['One Skill Retake Algeria (25,000 DA)', '/articles/ielts-one-skill-retake-algeria'],
      ['First Oran Cohort Details (5,000 DA)', '/articles/first-ielts-preparation-cohort-oran'],
      ['All 11 IELTS Algeria Guides →', '/articles'],
    ],
    platformTitle: 'Platform & Legal',
    platformNavLabel: 'Platform and legal pages',
    mockTest: 'Online Academic Mock Test',
    freeSample: 'Free Reading Sample (5 Qs)',
    about: 'About & Instructor',
    privacy: 'Privacy Policy (Law 18-07)',
    terms: 'Terms & Refund Policy',
  },
  fr: {
    addressLine: 'Bir El Djir, Oran 31130, Algérie',
    phoneLabel: 'Appeler +213 780 34 31 03',
    whatsappLabel: 'WhatsApp +213 780 34 31 03',
    guides: [
      ['Inscription IELTS & tarif 40 000 DA', '/articles/how-to-register-algeria'],
      ['IELTS sur ordinateur en Algérie', '/articles/computer-vs-paper-ielts'],
      ['One Skill Retake Algérie (25 000 DA)', '/articles/ielts-one-skill-retake-algeria'],
      ['Premier groupe à Oran (5 000 DA)', '/articles/first-ielts-preparation-cohort-oran'],
      ['Les 11 guides IELTS Algérie →', '/articles'],
    ],
    platformTitle: 'Plateforme & Mentions',
    platformNavLabel: 'Pages plateforme et informations légales',
    mockTest: 'Test blanc Academic en ligne',
    freeSample: 'Échantillon Reading gratuit',
    about: 'À propos & Formateur',
    privacy: 'Confidentialité (Loi 18-07)',
    terms: 'Conditions & Remboursement',
  },
  ar: {
    addressLine: 'بئر الجير، وهران 31130، الجزائر',
    phoneLabel: 'اتصال هاتفي: +213 780 34 31 03',
    whatsappLabel: 'واتساب: +213 780 34 31 03',
    guides: [
      ['التسجيل ورسوم IELTS بالجزائر (40,000 دج)', '/articles/how-to-register-algeria'],
      ['اختبار IELTS على الكمبيوتر بالجزائر', '/articles/computer-vs-paper-ielts'],
      ['إعادة مهارة واحدة One Skill Retake', '/articles/ielts-one-skill-retake-algeria'],
      ['تفاصيل المجموعة الأولى بوهران (5,000 دج)', '/articles/first-ielts-preparation-cohort-oran'],
      ['جميع أدلة IELTS الـ 11 ←', '/articles'],
    ],
    platformTitle: 'المنصة والشروط القانونية',
    platformNavLabel: 'صفحات المنصة والمعلومات القانونية',
    mockTest: 'اختبار IELTS التجريبي عبر الإنترنت',
    freeSample: 'عينة القراءة المجانية',
    about: 'من نحن والمدرب',
    privacy: 'سياسة الخصوصية (القانون 18-07)',
    terms: 'الشروط وسياسة الاسترجاع',
  },
};

export default async function SiteFooter({ locale: localeProp }: { locale?: Locale } = {}) {
  const resolvedLocale = localeProp ?? (await getLocale());
  const safeLocale: Locale = resolvedLocale === 'fr' || resolvedLocale === 'ar' ? resolvedLocale : 'en';
  const t = await getTranslations({ locale: safeLocale, namespace: 'Facility' });
  const copy = FOOTER_COPY[safeLocale];
  const isRtl = safeLocale === 'ar';

  return (
    <footer
      className={`border-t border-gray-200 bg-white px-6 pb-24 pt-14 md:px-12 md:pb-16 ${isRtl ? 'font-cairo' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 text-start">
          {/* Column 1: NAP & Contact */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-charcoal">{t('contact')}</h2>
            <address className="not-italic space-y-3 text-sm font-medium text-gray-700">
              <p className="flex items-start gap-2.5 text-charcoal font-semibold">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span><bdi>{VENUE_PLUS_CODE}</bdi> · {copy.addressLine}</span>
              </p>
              <p>
                <a
                  href={VENUE_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b81428] underline decoration-crimson/30 underline-offset-4 hover:decoration-crimson"
                >
                  {t('mapBtn')}
                  <span aria-hidden="true">↗</span>
                </a>
              </p>
              <a
                href="tel:+213780343103"
                className="flex items-center gap-2.5 text-gray-700 transition-colors hover:text-charcoal"
              >
                <svg className="h-5 w-5 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span dir="ltr">+213 780 34 31 03</span>
              </a>
              <a
                href="https://wa.me/213780343103"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.whatsappLabel}
                className="flex items-center gap-2.5 text-gray-700 transition-colors hover:text-emerald-700"
              >
                <svg className="h-5 w-5 shrink-0 text-emerald-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </a>
              <a
                href="mailto:ieltslab.oran@gmail.com"
                className="flex items-center gap-2.5 text-gray-700 transition-colors hover:text-[#b81428]"
              >
                <svg className="h-5 w-5 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span dir="ltr">ieltslab.oran@gmail.com</span>
              </a>
            </address>
          </div>

          {/* Column 2: Guides */}
          <nav aria-label={t('navAriaLabel')}>
            <h2 className="mb-4 text-lg font-bold text-charcoal">{t('guidesTitle')}</h2>
            <ul className="space-y-2.5">
              {copy.guides.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-medium text-gray-700 transition-colors hover:text-[#b81428]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3: Platform & Legal */}
          <nav aria-label={copy.platformNavLabel}>
            <h2 className="mb-4 text-lg font-bold text-charcoal">{copy.platformTitle}</h2>
            <ul className="space-y-2.5 text-sm font-medium text-gray-700">
              <li>
                <Link href="/mock-test" className="transition-colors hover:text-[#b81428]">
                  {copy.mockTest}
                </Link>
              </li>
              <li>
                <a href={`/sample?locale=${safeLocale}`} className="transition-colors hover:text-[#b81428]">
                  {copy.freeSample}
                </a>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-[#b81428]">
                  {copy.about}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-[#b81428]">
                  {copy.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-[#b81428]">
                  {copy.terms}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 4: Social & Disclaimer */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-charcoal">{t('social')}</h2>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61591282143384"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all hover:bg-blue-600 hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.325v21.351C0 23.403.597 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.597 1.323-1.325V1.325C24 .597 23.403 0 22.675 0z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/ieltslab.oran/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all hover:bg-pink-600 hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/ielts-lab-oran"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-all hover:bg-blue-600 hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
            <p className="mt-5 text-xs font-semibold text-gray-700">
              {t('copyright', { year: new Date().getFullYear() })}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
