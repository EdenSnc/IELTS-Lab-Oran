import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ACADEMIC_MOCK_TEST_PRODUCT } from '@/lib/commerce/catalog';

export default async function MockTestOffer() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('MockTest'),
  ]);
  const price = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: ACADEMIC_MOCK_TEST_PRODUCT.currency,
    maximumFractionDigits: 0,
  }).format(ACADEMIC_MOCK_TEST_PRODUCT.priceMinor / 100);

  return (
    <section id="mock-test" className="scroll-mt-28 px-6 pb-10 md:px-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2.5rem] bg-charcoal text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,0.8)] md:grid-cols-[1fr_auto]">
        <div className="p-8 sm:p-10 md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6679]">{t('eyebrow')}</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">{t('description')}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-white/65">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2">{t('oneAttempt')}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2">{t('storedResults', { days: ACADEMIC_MOCK_TEST_PRODUCT.accessDays })}</span>
          </div>
        </div>
        <div className="flex min-w-64 flex-col justify-center border-t border-white/10 bg-white/[0.045] p-8 md:border-l md:border-t-0 md:p-10">
          <p className="text-sm text-white/50">{t('priceLabel')}</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{price}</p>
          <Link href="/account" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-charcoal transition hover:bg-[#ffebee]">
            {t('cta')}
          </Link>
          <p className="mt-3 text-center text-xs leading-5 text-white/40">{t('secureCheckout')}</p>
        </div>
      </div>
    </section>
  );
}
