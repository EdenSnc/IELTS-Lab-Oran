import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import { Link } from '@/i18n/routing';
import {
  Locale,
  SITE_NAME,
  STANDALONE_PAGE_SEO_DESCRIPTIONS,
  STANDALONE_PAGE_SEO_TITLES,
  buildWebsitePageMetadata,
  localizedUrl,
} from '@/lib/seo';

const COPY: Record<
  Locale,
  {
    metaTitle: string;
    metaDesc: string;
    breadcrumb: string;
    updated: string;
    h1: string;
    intro: string;
    sections: Array<{ title: string; paragraphs: string[] }>;
  }
> = {
  en: {
    metaTitle: 'Terms of Service & Refund Policy | IELTS Lab Oran',
    metaDesc:
      'Terms of service, cohort application rules, online IELTS Academic mock test access (30 days), and refund policy for IELTS Lab Oran in Bir El Djir, Oran.',
    breadcrumb: 'Terms & Refund Policy',
    updated: 'Last updated: 18 November 2026',
    h1: 'Terms of Service & Refund Policy',
    intro:
      'These Terms govern your use of https://www.ieltslab.org, applications for in-person preparation cohorts in Bir El Djir, Oran, and purchases of the online IELTS Academic Mock Test.',
    sections: [
      {
        title: '1. Independent Provider Status & No Outcome Guarantee',
        paragraphs: [
          'IELTS Lab Oran is an independent exam-preparation and simulation provider in Oran, Algeria, and is not affiliated with IELTS, the British Council, IDP, or Cambridge University Press & Assessment.',
          'While our coaching and diagnostic assessments are aligned with official public band descriptors, official IELTS scores, university admissions, and visa decisions rest solely with the relevant examining and consular authorities. No preparation course can guarantee a specific band score or visa outcome.',
        ],
      },
      {
        title: '2. In-Person Cohort Applications & Enrolment (Bir El Djir, Oran)',
        paragraphs: [
          'Submitting the online application with your availability is free of charge and does not automatically reserve one of the 8 cohort seats.',
          'Enrolment is finalized only after (a) level/fit review (intermediate B1/B2+ minimum), (b) mutual confirmation of the cohort timetable, and (c) tuition payment (5,000 DA introductory classroom fee for Cohort 1; 29,500 DA standard rate from subsequent cohorts).',
        ],
      },
      {
        title: '3. Online IELTS Academic Mock Test Access Terms',
        paragraphs: [
          'Purchasing the online IELTS Academic Mock Test (3,900 DZD via Chargily Pay) grants one personal, non-transferable candidate entitlement consisting of one complete timed attempt (Listening, Reading, and Writing) and 30 days of access to view the resulting report inside your account.',
          'Candidates may not copy, record, scrape, redistribute, or share proprietary test passages, audio recordings, prompts, or account credentials.',
        ],
      },
      {
        title: '4. Refund, Cancellation & Technical Remediation Policy',
        paragraphs: [
          'Online Mock Test (Unused Entitlements & Technical Issues): If you have purchased mock-test access and have NOT started an exam attempt, you may request a full refund within 7 calendar days of purchase by emailing ieltslab.oran@gmail.com with your order reference. Once an exam attempt is started or submitted, the single-attempt assessment credit is consumed and non-refundable—except where a verified platform technical failure prevents completion or grading, in which case we issue either a free replacement attempt or a full refund.',
          'In-Person Oran Cohorts: If IELTS Lab Oran cancels or reschedules a confirmed cohort before start and the new timetable does not suit you, any tuition paid is refunded in full. Candidate withdrawal requests before cohort start are eligible for refund or transfer to the next cohort when communicated at least 72 hours prior to the first session.',
        ],
      },
      {
        title: '5. Contact & Dispute Resolution',
        paragraphs: [
          'Questions regarding orders, cohort schedules, or refund requests can be sent to ieltslab.oran@gmail.com or +213 780 34 31 03 (Bir El Djir, Oran 31130, Algeria). These terms are governed by the laws of Algeria.',
        ],
      },
    ],
  },
  fr: {
    metaTitle: 'Conditions Générales & Remboursement | IELTS Lab Oran',
    metaDesc:
      'Conditions d’utilisation, règles de candidature aux cohortes d’Oran, accès au test blanc IELTS en ligne (30 jours) et politique de remboursement.',
    breadcrumb: 'Conditions & Remboursement',
    updated: 'Dernière mise à jour : 18 novembre 2026',
    h1: 'Conditions d’Utilisation & Politique de Remboursement',
    intro:
      'Les présentes conditions encadrent l’utilisation du site https://www.ieltslab.org, les candidatures aux cohortes présentielles à Bir El Djir (Oran) et l’achat du test blanc IELTS Academic en ligne.',
    sections: [
      {
        title: '1. Indépendance & Absence de garantie de résultat officiel',
        paragraphs: [
          'IELTS Lab Oran est un organisme indépendant de préparation situé à Oran (Algérie) et n’est affilié ni à IELTS, ni au British Council, ni à IDP, ni à Cambridge University Press & Assessment.',
          'Nos formations et bilans s’appuient sur les descripteurs publics officiels, mais les scores officiels, admissions universitaires et décisions de visa relèvent exclusivement des autorités compétentes ; aucune formation sérieuse ne peut garantir un score ou un visa.',
        ],
      },
      {
        title: '2. Candidatures et inscription aux cohortes d’Oran',
        paragraphs: [
          'L’envoi de la candidature avec vos disponibilités est gratuit et ne réserve pas automatiquement l’une des 8 places du groupe.',
          'L’inscription devient définitive uniquement après validation du niveau minimum requis (B1/B2+), confirmation mutuelle de l’emploi du temps et règlement des frais (tarif de lancement de 5 000 DA en salle pour le 1er groupe ; tarif standard de 29 500 DA pour les cohortes suivantes).',
        ],
      },
      {
        title: '3. Accès au test blanc IELTS Academic en ligne',
        paragraphs: [
          'L’achat du test blanc en ligne (3 900 DZD via Chargily Pay) ouvre un droit personnel et non cessible comprenant une tentative complète chronométrée (Listening, Reading et Writing) ainsi que la consultation des résultats dans votre compte pendant 30 jours.',
          'Toute reproduction, capture, diffusion ou partage des supports d’examen, enregistrements audio ou identifiants de compte est strictement interdit.',
        ],
      },
      {
        title: '4. Politique d’annulation, de remboursement et d’incident technique',
        paragraphs: [
          'Test blanc en ligne : Tant qu’aucune tentative d’examen n’a été démarrée, vous pouvez demander un remboursement intégral dans un délai de 7 jours calendaires suivant l’achat en écrivant à ieltslab.oran@gmail.com avec votre référence de commande. Dès qu’une tentative est lancée ou soumise, le crédit d’évaluation est consommé, sauf en cas d’incident technique avéré imputable à la plateforme (auquel cas une nouvelle tentative gratuite ou un remboursement intégral est accordé).',
          'Cohortes en présentiel à Oran : Si IELTS Lab Oran annule ou décale une cohorte confirmée avant le début des cours et que le nouvel horaire ne vous convient pas, les sommes versées sont intégralement remboursées. Toute annulation par le candidat communiquée au moins 72 heures avant la première séance ouvre droit à un remboursement ou à un report sur la cohorte suivante.',
        ],
      },
      {
        title: '5. Contact et droit applicable',
        paragraphs: [
          'Pour toute question relative à une commande ou à un remboursement, contactez ieltslab.oran@gmail.com ou le +213 780 34 31 03 (Bir El Djir, Oran 31130, Algérie). Les présentes conditions sont régies par le droit algérien.',
        ],
      },
    ],
  },
  ar: {
    metaTitle: 'شروط الاستخدام وسياسة الاسترجاع | IELTS Lab Oran',
    metaDesc:
      'شروط الاستخدام، قواعد التقديم لدورات وهران الحضورية، شروط صلاحية الاختبار التجريبي عبر الإنترنت (30 يوماً)، وسياسة الاسترجاع في IELTS Lab Oran.',
    breadcrumb: 'الشروط وسياسة الاسترجاع',
    updated: 'آخر تحديث: 18 نوفمبر 2026',
    h1: 'شروط الاستخدام وسياسة الاسترجاع',
    intro:
      'تنظم هذه الشروط استخدام موقع https://www.ieltslab.org، وطلبات الترشح للدورات الحضورية في بئر الجير (وهران)، وشراء اختبار IELTS Academic التجريبي عبر الإنترنت.',
    sections: [
      {
        title: '1. الاستقلالية وعدم ضمان النتائج الرسمية أو التأشيرات',
        paragraphs: [
          'مركز IELTS Lab Oran جهة تحضير مستقلة في وهران، الجزائر، وغير تابعة لاختبار IELTS أو المجلس الثقافي البريطاني أو IDP أو جامعة كامبريدج.',
          'تُبنى تدريباتنا وتقييماتنا على المعايير العلنية الرسمية، غير أن الدرجات الرسمية وقرارات القبول الجامعي والتأشيرات تعود حصراً للجهات المختصة؛ ولا يمكن لأي دورة تحضيرية ضمان درجة محددة أو نتيجة تأشيرة.',
        ],
      },
      {
        title: '2. التقديم والتسجيل في الدورات الحضورية بوهران',
        paragraphs: [
          'إرسال طلب الالتحاق مع أوقات تفرّغك مجاني بالكامل ولا يُعد حجزاً تلقائياً لأحد المقاعد الثمانية.',
          'يتأكد التسجيل النهائي فقط بعد التحقق من ملاءمة المستوى اللغوي (B1/B2 فما فوق)، وتأكيد الجدول الزمني مع المترشح، وسداد الرسوم المقررة (5,000 دج سعر إطلاق المجموعة الأولى في قاعة التدريس؛ و29,500 دج السعر العادي للدفعات اللاحقة).',
        ],
      },
      {
        title: '3. شروط صلاحية الاختبار التجريبي عبر الإنترنت',
        paragraphs: [
          'يمنحك شراء اختبار IELTS Academic التجريبي عبر الإنترنت (3,900 دج عبر بوابة Chargily Pay) ترخيصاً شخصياً غير قابل للتحويل لإجراء محاولة كاملة واحدة محددة بالوقت (الاستماع والقراءة والكتابة)، مع إمكانية الاطلاع على النتائج المحفوظة داخل حسابك لمدة 30 يوماً.',
          'يُمنع نسخ أو تسجيل أو إعادة نشر نصوص الاختبار أو الملفات الصوتية أو مشاركة بيانات الحساب مع الغير.',
        ],
      },
      {
        title: '4. سياسة الإلغاء والاسترجاع والمعالجة التقنية',
        paragraphs: [
          'الاختبار التجريبي عبر الإنترنت: إذا لم تبدأ محاولة الاختبار بعد، يمكنك طلب استرجاع كامل للمبلغ خلال 7 أيام من تاريخ الشراء عبر مراسلة ieltslab.oran@gmail.com مرفقاً بمرجع الطلب. أما بعد بدء المحاولة أو إرسالها فيُعد رصيد التقييم مستهلكاً، باستثناء حالات الخلل التقني الموثق في المنصة حيث نمنح محاولة بديلة مجانية أو استرجاعاً كاملاً للمبلغ.',
          'الدورات الحضورية في وهران: في حال إلغاء الدورة أو تعديل جدولها قبل الانطلاق بما لا يناسب المترشح المسجّل، يُسترجع المبلغ المدفوع بالكامل. كما يحق للمترشح طلب الاسترجاع أو تحويل التسجيل للدفعة الموالية عند الإبلاغ قبل 72 ساعة على الأقل من أول حصة.',
        ],
      },
      {
        title: '5. التواصل والقانون الواجب التطبيق',
        paragraphs: [
          'لجميع طلبات الدعم أو الاسترجاع، يرجى التواصل عبر ieltslab.oran@gmail.com أو الرقم +213 780 34 31 03 (بئر الجير، وهران 31130، الجزائر). تخضع هذه الشروط للقوانين السارية في الجزائر.',
        ],
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: 'terms',
    title: STANDALONE_PAGE_SEO_TITLES.terms[safeLocale],
    description: STANDALONE_PAGE_SEO_DESCRIPTIONS.terms[safeLocale],
  });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = COPY[safeLocale];
  const isRtl = safeLocale === 'ar';
  const pageUrl = localizedUrl(safeLocale, 'terms');

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: localizedUrl(safeLocale),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: c.breadcrumb,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <main
        id="main-content"
        className={`mx-auto max-w-3xl px-6 pb-24 pt-32 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <Link href="/" className="hover:text-[#b81428] underline-offset-4 hover:underline">
            {SITE_NAME}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-charcoal">{c.breadcrumb}</span>
        </nav>

        <article className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b81428]">{c.updated}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal leading-tight">
            {c.h1}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-gray-700">{c.intro}</p>

          <div className="mt-8 space-y-8">
            {c.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-extrabold text-charcoal">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm sm:text-base leading-relaxed text-gray-700">
                  {section.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter locale={safeLocale} />
    </>
  );
}
