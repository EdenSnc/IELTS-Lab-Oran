import { getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust, { ArticleBreadcrumb } from '@/components/ArticleTrust';
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

const OSR_FAQS: Record<Locale, { heading: string; items: Array<{ q: string; a: string }> }> = {
  en: {
    heading: 'Frequently Asked Questions — One Skill Retake in Algeria',
    items: [
      {
        q: 'How much does IELTS One Skill Retake cost in Algeria?',
        a: 'British Council Algeria currently lists 25,000 DA for IELTS One Skill Retake (compared with 40,000 DA for a full standard test), payable within the booking portal deadlines.',
      },
      {
        q: 'How long after my original test can I book One Skill Retake?',
        a: 'You must book and sit your single-skill retake within 60 calendar days of your original eligible computer-delivered IELTS test, and only one retake is allowed per full test.',
      },
      {
        q: 'Does IRCC accept IELTS One Skill Retake for Canada Express Entry?',
        a: 'No. Immigration, Refugees and Citizenship Canada (IRCC) explicitly refuses IELTS One Skill Retake for Express Entry profiles; you must submit a single full General Training sitting.',
      },
      {
        q: 'Does One Skill Retake extend the 2-year validity of my IELTS certificate?',
        a: 'No. Your updated Test Report Form keeps the three original module scores alongside your new retaken score, and the two-year validity period still runs from your original full test date.',
      },
    ],
  },
  fr: {
    heading: 'Questions fréquentes — One Skill Retake en Algérie',
    items: [
      {
        q: 'Quel est le prix du One Skill Retake IELTS en Algérie ?',
        a: 'Le British Council Algérie affiche actuellement un tarif de 25 000 DA pour le One Skill Retake (contre 40 000 DA pour un examen complet).',
      },
      {
        q: 'Quel est le délai pour passer le One Skill Retake ?',
        a: 'La réservation et le passage de l’épreuve choisie doivent impérativement avoir lieu dans les 60 jours suivant votre test initial sur ordinateur (une seule reprise autorisée par test complet).',
      },
      {
        q: 'Le Canada accepte-t-il le One Skill Retake pour Entrée express ?',
        a: 'Non. IRCC refuse explicitement les résultats One Skill Retake pour Entrée express ; un examen IELTS General Training complet est requis.',
      },
      {
        q: 'La reprise prolonge-t-elle la validité de 2 ans de mon certificat ?',
        a: 'Non. Le nouveau relevé combine la note reprise et vos trois notes initiales, mais la validité de deux ans reste calculée à partir de la date du premier examen.',
      },
    ],
  },
  ar: {
    heading: 'الأسئلة الشائعة حول إعادة مهارة واحدة في الجزائر',
    items: [
      {
        q: 'كم تبلغ رسوم IELTS One Skill Retake في الجزائر؟',
        a: 'يعرض المجلس الثقافي البريطاني في الجزائر رسوماً قدرها 25,000 دج لإعادة مهارة واحدة، مقارنة بـ 40,000 دج لإعادة الاختبار الكامل.',
      },
      {
        q: 'ما المهلة المتاحة لحجز وإجراء الإعادة؟',
        a: 'يجب حجز وإجراء إعادة المهارة المختارة خلال 60 يوماً من تاريخ الاختبار الأصلي المنجز على الكمبيوتر، ويُسمح بإعادة مهارة واحدة فقط لكل اختبار كامل.',
      },
      {
        q: 'هل تقبل كندا نتيجة One Skill Retake في نظام Express Entry؟',
        a: 'لا. ترفض وزارة الهجرة الكندية (IRCC) نتائج One Skill Retake صراحةً في ملفات Express Entry، وتشترط شهادة General Training كاملة من جلسة واحدة.',
      },
      {
        q: 'هل تمدد الإعادة صلاحية شهادة IELTS البالغة سنتين؟',
        a: 'لا. يجمع الكشف الجديد بين الدرجة المعادة والدرجات الثلاث الأصلية، وتبقى صلاحية السنتين محسوبة من تاريخ الاختبار الأصلي الأول.',
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const t = osrCopy[safeLocale];
  return buildArticleMetadata({
    locale: safeLocale,
    slug: OSR_SLUG,
    title: t.title,
    description: t.desc,
    publishedTime: OSR_REVIEW_DATE,
    modifiedTime: '2026-11-18',
  });
}

export default async function OneSkillRetakePage() {
  const rawLocale = await getLocale();
  const locale: Locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const t = osrCopy[locale];
  const faqBlock = OSR_FAQS[locale];
  const isRtl = locale === 'ar';
  const facts = [
    { value: t.price, label: t.priceLabel },
    { value: t.time, label: t.timeLabel },
    { value: t.attempts, label: t.attemptLabel },
  ];

  return (
    <>
      <Navbar />
      <main id="main-content" className={`mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <ArticleBreadcrumb locale={locale} title={t.title} />
          <header className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-6 sm:p-9">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-700">{t.intro}</p>
            <dl className="mt-6 grid gap-2 sm:grid-cols-3">
              {facts.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-red-100 bg-white px-4 py-3">
                  <dt className="text-sm text-gray-700">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-[#b81428]">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {t.feeNote}{' '}
              <a className="font-semibold text-[#b81428] underline" href={OSR_FEE_SOURCE}>
                {t.feeLink}
              </a>
            </p>
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
                      <span aria-hidden="true" className="text-xl leading-none text-[#b81428] transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm leading-relaxed text-gray-700">
                      <p>{detail}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <a className="font-semibold text-[#b81428] underline" href={rule.source}>{t.source}</a>
                        {'extra' in rule && <a className="font-semibold text-[#b81428] underline" href={rule.extra}>{t.extraSource}</a>}
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
                  <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 font-bold text-[#b81428]">{index + 1}</span>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">{t.centre}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="font-semibold text-[#b81428] underline" href={OSR_CENTRE_SOURCE}>{t.centreLink}</a>
              <a className="font-semibold text-[#b81428] underline" href={t.bookingSource}>{t.bookingLink}</a>
            </div>
          </section>

          <section aria-labelledby="results" className="mt-8 border-t border-gray-200 pt-6">
            <h2 id="results" className="text-xl font-extrabold text-charcoal">{t.resultsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{t.results}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a className="font-semibold text-[#b81428] underline" href={OSR_RESULTS_SOURCE}>{t.resultsLink}</a>
              <Link className="font-semibold text-[#b81428] underline" href="/articles/how-to-register-algeria">{t.related}</Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-charcoal mb-5">{faqBlock.heading}</h2>
            <div className="space-y-4">
              {faqBlock.items.map((item) => (
                <div key={item.q} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-charcoal">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                inLanguage: locale,
                mainEntity: faqBlock.items.map((item) => ({
                  '@type': 'Question',
                  name: item.q,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a,
                  },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />

          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug={OSR_SLUG}
              title={t.title}
              description={t.desc}
              publishedAt={OSR_REVIEW_DATE}
              reviewedAt="2026-11-18"
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
