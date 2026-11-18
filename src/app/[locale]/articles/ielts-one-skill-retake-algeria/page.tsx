import { getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { Link } from '@/i18n/routing';
import { buildArticleMetadata, type Locale } from '@/lib/seo';
import {
  OSR_CENTRE_SOURCE,
  OSR_FEE_SOURCE,
  OSR_REVIEW_DATE,
  OSR_RESULTS_SOURCE,
  OSR_SLUG,
  osrCopy,
  routeRules,
  type RetakeRoute,
} from '@/lib/one-skill-retake';

const statusStyle = {
  no: 'bg-red-50 text-red-800',
  yes: 'bg-emerald-50 text-emerald-800',
  conditional: 'bg-sky-50 text-sky-900',
  check: 'bg-amber-50 text-amber-900',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = osrCopy[locale];
  return buildArticleMetadata({
    locale,
    slug: OSR_SLUG,
    title: t.title,
    description: t.desc,
    publishedTime: OSR_REVIEW_DATE,
    modifiedTime: OSR_REVIEW_DATE,
  });
}

export default async function OneSkillRetakePage() {
  const locale = (await getLocale()) as Locale;
  const t = osrCopy[locale];
  const isRtl = locale === 'ar';
  const facts = [
    { value: t.price, label: t.priceLabel },
    { value: t.time, label: t.timeLabel },
    { value: t.attempts, label: t.attemptLabel },
  ];

  return (
    <>
      <Navbar />
      <main className={`mx-auto max-w-4xl px-5 pb-32 pt-28 sm:px-8 sm:pt-32 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <header className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-6 sm:p-9">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-700">{t.intro}</p>
            <dl className="mt-6 grid gap-2 sm:grid-cols-3">
              {facts.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-red-100 bg-white px-4 py-3">
                  <dt className="text-sm text-gray-700">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-crimson">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{t.feeNote} <a className="font-semibold text-crimson underline" href={OSR_FEE_SOURCE}>{t.feeLink}</a></p>
          </header>

          <section aria-labelledby="visa" className="mt-9">
            <h2 id="visa" className="text-2xl font-extrabold text-charcoal">{t.visaTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{t.visaIntro}</p>
            <div className="mt-4 grid gap-2">
              {(Object.keys(routeRules) as RetakeRoute[]).map((route) => {
                const rule = routeRules[route];
                const [title, detail] = t.routes[route];
                return (
                  <details key={route} className="group rounded-xl border border-gray-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-crimson [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1 font-semibold text-charcoal">{title}</span>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyle[rule.status]}`}>{t.status[rule.status]}</span>
                      <span aria-hidden="true" className="text-xl leading-none text-crimson transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm leading-relaxed text-gray-700">
                      <p>{detail}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <a className="font-semibold text-crimson underline" href={rule.source}>{t.source}</a>
                        {'extra' in rule && <a className="font-semibold text-crimson underline" href={rule.extra}>{t.extraSource}</a>}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="booking" className="mt-9">
            <h2 id="booking" className="text-2xl font-extrabold text-charcoal">{t.bookingTitle}</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {t.steps.map((step, index) => (
                <li key={step} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 font-bold text-crimson">{index + 1}</span>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">{t.centre}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="font-semibold text-crimson underline" href={OSR_CENTRE_SOURCE}>{t.centreLink}</a>
              <a className="font-semibold text-crimson underline" href={t.bookingSource}>{t.bookingLink}</a>
            </div>
          </section>

          <section aria-labelledby="results" className="mt-8 border-t border-gray-200 pt-6">
            <h2 id="results" className="text-xl font-extrabold text-charcoal">{t.resultsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{t.results}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="font-semibold text-crimson underline" href={OSR_RESULTS_SOURCE}>{t.resultsLink}</a>
              <Link className="font-semibold text-crimson underline" href="/articles/how-to-register-algeria">{t.related}</Link>
            </div>
          </section>
          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug={OSR_SLUG}
              title={t.title}
              description={t.desc}
              publishedAt={OSR_REVIEW_DATE}
              reviewedAt={OSR_REVIEW_DATE}
              sources={[
                { label: t.feeLink, href: OSR_FEE_SOURCE },
                { label: t.centreLink, href: OSR_CENTRE_SOURCE },
                { label: t.resultsLink, href: OSR_RESULTS_SOURCE },
              ]}
            />
          </div>
        </article>
      </main>
      <ArticleMobileCta />
    </>
  );
}
