import { getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import {
  COHORT_APPLICATION_DEADLINE,
  COHORT_ARTICLE_PATH,
  COHORT_FORM_URL,
  cohortLaunch,
  isCohortDeadlinePassed,
} from '@/lib/cohort-launch';
import { buildArticleMetadata, localizedUrl, type Locale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = cohortLaunch[locale];
  return buildArticleMetadata({
    locale,
    slug: COHORT_ARTICLE_PATH.slice('/articles/'.length),
    title: copy.title,
    description: copy.desc,
    publishedTime: '2026-11-16',
    modifiedTime: '2026-11-17',
  });
}

export default async function FirstCohortArticle() {
  const locale = (await getLocale()) as Locale;
  const copy = cohortLaunch[locale];
  const isRtl = locale === 'ar';
  const deadlinePassed = isCohortDeadlinePassed();

  return (
    <>
      <Navbar />
      <main className={`mx-auto max-w-3xl px-6 pb-32 pt-32 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <p className="mb-4 text-sm font-semibold text-crimson">{copy.category}</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-700">{copy.desc}</p>
          <div className="mt-7 rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6">
            {deadlinePassed ? (
              <>
                <p className="text-sm font-bold text-amber-800">{copy.closedTitle}</p>
                <p className="mt-2 text-base leading-relaxed text-gray-700">{copy.closedDesc}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-crimson">{copy.deadlineLabel}</p>
                <time className="mt-1 block text-2xl font-extrabold text-charcoal" dateTime={COHORT_APPLICATION_DEADLINE}>
                  {copy.deadline}
                </time>
              </>
            )}
          </div>
          <p className="mt-7 leading-relaxed text-gray-700">{copy.details}</p>
          <p className="mt-4 leading-relaxed text-gray-700">{copy.next}</p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a href={COHORT_FORM_URL} className="inline-flex rounded-full bg-crimson px-6 py-3 font-bold text-white hover:bg-red-800">
              {deadlinePassed ? copy.closedCta : copy.apply}
            </a>
            <Link href="/#intake" className="inline-flex rounded-full border border-gray-300 bg-white px-6 py-3 font-bold text-charcoal hover:border-crimson hover:text-crimson">
              {locale === 'fr' ? 'Voir les détails sur la page d’accueil' : locale === 'ar' ? 'عرض التفاصيل في الصفحة الرئيسية' : 'View details on homepage'}
            </Link>
          </div>
          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug={COHORT_ARTICLE_PATH.slice('/articles/'.length)}
              title={copy.title}
              description={copy.desc}
              publishedAt="2026-11-16"
              reviewedAt="2026-11-17"
              sources={[
                {
                  label: locale === 'fr'
                    ? 'IELTS Lab Oran : formulaire de disponibilité (Google Forms)'
                    : locale === 'ar'
                      ? 'IELTS Lab Oran: استمارة التفرغ'
                      : 'IELTS Lab Oran: availability form',
                  href: COHORT_FORM_URL,
                },
                {
                  label: locale === 'fr'
                    ? 'Programme et inscription sur place à Bir El Djir'
                    : locale === 'ar'
                      ? 'تفاصيل التسجيل والموقع في بئر الجير، وهران'
                      : 'Oran program details and intake',
                  href: localizedUrl(locale, '#intake'),
                },
              ]}
            />
          </div>
        </article>
      </main>
      <ArticleMobileCta />
    </>
  );
}
