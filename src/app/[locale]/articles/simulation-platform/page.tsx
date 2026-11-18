import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { CANONICAL_ORIGIN, Locale } from '@/lib/seo';

const COPY: Record<
  Locale,
  {
    metaTitle: string;
    metaDesc: string;
    badge: string;
    title: string;
    date: string;
    description: string;
    whatToDo: string;
    bullets: Array<[string, string]>;
    ctaTitle: string;
    ctaDesc: string;
    mockBtn: string;
    sampleBtn: string;
    cohortLink: string;
  }
> = {
  en: {
    metaTitle: 'IELTS Simulation Platform Now Live | IELTS Lab Oran',
    metaDesc:
      'Our computer-delivered IELTS Academic mock test (3,900 DZD via Chargily Pay) and free 5-question Reading sample are now live for Algerian candidates.',
    badge: 'Platform Live',
    title: 'IELTS Lab Oran Simulation Platform Update',
    date: 'Updated 18 November 2026',
    description:
      'Our computer-delivered IELTS Academic simulation platform is now live. Algerian candidates can test the split-screen Reading interface for free or unlock a full timed Listening, Reading, and Writing mock test payable in DZD.',
    whatToDo: 'Available Right Now',
    bullets: [
      ['Free 5-Question Reading Sample', 'Launch a 10-minute computer Academic Reading sample immediately in your browser—no account or card required.'],
      ['Full Online Academic Mock Test (3,900 DZD)', 'Practise Listening, Reading, and Writing in one timed computer flow via Chargily Pay (CIB & Edahabia) with 30-day stored results.'],
      ['In-Person 8-Seat Oran Cohort', 'Pair digital practice with direct Writing and Speaking feedback in Bir El Djir, Oran.'],
    ],
    ctaTitle: 'Start Computer-Delivered IELTS Practice',
    ctaDesc: 'Choose between the full Academic Mock Test page or launch the free Reading sample right away.',
    mockBtn: 'Open Online Mock Test Page',
    sampleBtn: 'Try Free Reading Sample',
    cohortLink: 'Or apply for the in-person Oran cohort →',
  },
  fr: {
    metaTitle: 'Plateforme de Simulation IELTS en Ligne | IELTS Lab Oran',
    metaDesc:
      'Notre test blanc IELTS Academic sur ordinateur (3 900 DZD via Chargily Pay) et notre échantillon Reading gratuit sont désormais disponibles en Algérie.',
    badge: 'Plateforme disponible',
    title: 'Mise à jour de la plateforme de simulation IELTS Lab Oran',
    date: 'Mis à jour le 18 novembre 2026',
    description:
      'Notre plateforme de simulation IELTS Academic sur ordinateur est désormais active. Vous pouvez tester gratuitement l’interface Reading en écran partagé ou passer un test blanc complet chronométré payable en dinars.',
    whatToDo: 'Disponible dès maintenant',
    bullets: [
      ['Échantillon Reading gratuit (5 questions)', 'Testez en 10 minutes l’écran partagé, le surlignage et le chronomètre directement dans votre navigateur sans compte.'],
      ['Test blanc Academic complet (3 900 DZD)', 'Passez Listening, Reading et Writing dans un flux chronométré via Chargily Pay (CIB / Edahabia) avec résultats conservés 30 jours.'],
      ['Cohorte présentielle de 8 places à Oran', 'Complétez votre pratique numérique par un suivi individuel à Bir El Djir, Oran.'],
    ],
    ctaTitle: 'Commencer votre entraînement sur ordinateur',
    ctaDesc: 'Découvrez les détails du test blanc complet ou lancez immédiatement l’extrait gratuit.',
    mockBtn: 'Voir le test blanc en ligne',
    sampleBtn: 'Lancer l’échantillon gratuit',
    cohortLink: 'Ou candidater au groupe présentiel à Oran →',
  },
  ar: {
    metaTitle: 'منصة محاكاة اختبار IELTS متاحة الآن | IELTS Lab Oran',
    metaDesc:
      'منصة اختبار IELTS Academic التجريبي على الكمبيوتر (3,900 دج عبر Chargily Pay) وعينة القراءة المجانية متاحتان الآن للمرشحين في الجزائر.',
    badge: 'المنصة متاحة الآن',
    title: 'تحديث منصة المحاكاة الرقمية IELTS Lab Oran',
    date: 'تحديث 18 نوفمبر 2026',
    description:
      'منصة محاكاة اختبار IELTS Academic على الكمبيوتر أصبحت متاحة الآن. يمكن للمرشحين في الجزائر تجربة واجهة القراءة المجانية فوراً أو اجتياز اختبار تجريبي كامل محدد بالوقت بالدينار الجزائري.',
    whatToDo: 'ما يمكنك استخدامه الآن',
    bullets: [
      ['عينة قراءة مجانية (5 أسئلة)', 'جرّب الشاشة المقسمة وأدوات التظليل والمؤقت لمدة 10 دقائق مباشرة دون الحاجة لإنشاء حساب.'],
      ['اختبار Academic تجريبي كامل (3,900 دج)', 'تدرّب على الاستماع والقراءة والكتابة في جلسة موقوتة عبر Chargily Pay (الذهبية وCIB) مع حفظ النتائج لمدة 30 يوماً.'],
      ['دورة حضورية مصغرة في وهران (8 مقاعد)', 'اجمع بين التدريب الرقمي والمتابعة الفردية للكتابة والمحادثة في بئر الجير، وهران.'],
    ],
    ctaTitle: 'ابدأ التدريب على الكمبيوتر الآن',
    ctaDesc: 'استعرض تفاصيل الاختبار التجريبي الكامل أو افتح عينة القراءة المجانية مباشرة.',
    mockBtn: 'صفحة الاختبار التجريبي الكامل',
    sampleBtn: 'جرّب عينة القراءة المجانية',
    cohortLink: 'أو قدّم للدورة الحضورية في وهران ←',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = COPY[safeLocale];
  return {
    metadataBase: new URL(CANONICAL_ORIGIN),
    title: c.metaTitle,
    description: c.metaDesc,
    alternates: { canonical: null, languages: {} },
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: true },
  };
}

export default async function PlatformStatusPage() {
  const rawLocale = await getLocale();
  const safeLocale: Locale = rawLocale === 'fr' || rawLocale === 'ar' ? rawLocale : 'en';
  const isRtl = safeLocale === 'ar';
  const t = COPY[safeLocale];

  return (
    <>
      <Navbar />
      <main id="main-content" className={`pt-32 pb-24 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <article>
          <div className="mb-6 inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            {t.badge}
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-charcoal">{t.title}</h1>

          <div className="flex items-center gap-2 text-gray-600 mb-10 font-medium text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t.date}
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
            <p className="lead text-xl text-gray-700 mb-8 font-medium">{t.description}</p>

            <h2 className="text-2xl font-extrabold mt-12 mb-6 text-charcoal tracking-tight">{t.whatToDo}</h2>

            <div className="grid gap-4 my-8 not-prose">
              {t.bullets.map(([title, text], i) => (
                <div key={title} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <h3 className="font-bold text-charcoal text-lg">{title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm ms-11">{text}</p>
                </div>
              ))}
            </div>

            <div className="not-prose mt-12 bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-charcoal mb-3">{t.ctaTitle}</h2>
              <p className="text-gray-600 text-sm mb-6">{t.ctaDesc}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/mock-test"
                  className="inline-flex items-center justify-center bg-[#c4162c] text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-red-800 transition-all shadow-glow"
                >
                  {t.mockBtn}
                </Link>
                <a
                  href={`/sample?locale=${safeLocale}`}
                  className="inline-flex items-center justify-center border border-gray-300 bg-white text-charcoal px-7 py-3.5 rounded-full font-bold text-sm hover:border-charcoal transition-all"
                >
                  {t.sampleBtn}
                </a>
              </div>
              <Link href="/#intake" className="mt-5 inline-block text-xs font-bold text-[#b81428] underline underline-offset-4">
                {t.cohortLink}
              </Link>
            </div>
          </div>
        </article>
      </main>
    </>
  );
}
