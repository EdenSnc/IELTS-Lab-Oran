import { getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import {
  COHORT_APPLICATION_DEADLINE,
  COHORT_ARTICLE_PATH,
  COHORT_FORM_URL,
  cohortLaunch,
} from '@/lib/cohort-launch';
import { buildAlternates, type Locale } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = cohortLaunch[locale];
  return {
    title: `${copy.title} | IELTS Lab Oran`,
    description: copy.desc,
    alternates: buildAlternates(locale, COHORT_ARTICLE_PATH.slice(1)),
  };
}

export default async function FirstCohortArticle() {
  const locale = (await getLocale()) as Locale;
  const copy = cohortLaunch[locale];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <article>
          <p className="mb-4 text-sm font-semibold text-crimson">{copy.category}</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-700">{copy.desc}</p>
          <div className="mt-7 rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-6">
            <p className="text-sm font-semibold text-crimson">{copy.deadlineLabel}</p>
            <time className="mt-1 block text-2xl font-extrabold text-charcoal" dateTime={COHORT_APPLICATION_DEADLINE}>
              {copy.deadline}
            </time>
          </div>
          <p className="mt-7 leading-relaxed text-gray-700">{copy.details}</p>
          <p className="mt-4 leading-relaxed text-gray-700">{copy.next}</p>
          <a href={COHORT_FORM_URL} className="mt-7 inline-flex rounded-full bg-crimson px-6 py-3 font-bold text-white hover:bg-red-800">
            {copy.apply}
          </a>
        </article>
      </main>
    </>
  );
}
