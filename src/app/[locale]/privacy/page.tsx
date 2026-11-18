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
    metaTitle: 'Privacy Policy (Algeria Law 18-07) | IELTS Lab Oran',
    metaDesc:
      'How IELTS Lab Oran collects, protects, and retains cohort application data, Chargily payment records, and 30-day mock test results under Algeria Law 18-07.',
    breadcrumb: 'Privacy Policy',
    updated: 'Last updated: 18 November 2026',
    h1: 'Privacy Policy & Personal Data Protection',
    intro:
      'IELTS Lab Oran (https://www.ieltslab.org) respects the confidentiality of candidates’ personal data in accordance with Algerian Law No. 18-07 of 10 June 2018 relating to the protection of individuals in the processing of personal data (as amended and supplemented). This policy explains clearly what data we collect, why we collect it, how long we keep it, and how to exercise your rights.',
    sections: [
      {
        title: '1. Data Controller & Contact',
        paragraphs: [
          'Personal data collected through https://www.ieltslab.org is controlled by IELTS Lab Oran (Founder: Amine Senouci), located in Bir El Djir, Oran 31130, Algeria.',
          'For any privacy question, access request, correction, or deletion request, contact us directly by email at ieltslab.oran@gmail.com or by phone/WhatsApp at +213 780 34 31 03.',
        ],
      },
      {
        title: '2. Data We Collect & Legal Purpose',
        paragraphs: [
          'Cohort Applications & Lead Forms: When you apply for an Oran cohort, join the waitlist, or request our free PDF guide, we collect your name, phone/WhatsApp number, email address, English level/target band, exam timeline, and first-party campaign attribution (such as UTM parameters or QR placement codes). We use this strictly to evaluate eligibility, coordinate class schedules, and deliver requested resources.',
          'Online Mock Test & Candidate Accounts: When you register an account to access the IELTS Academic Mock Test, we store your authentication email/WhatsApp verification status, order history, exam responses, and diagnostic scores so you can sit the timed assessment and review your results.',
          'Payments via Chargily Pay: Online DZD payments (CIB and Edahabia) are processed directly on Chargily Pay’s secure hosted checkout. IELTS Lab Oran never sees or stores your bank card number, CVV, or PIN; we receive only transaction status, order reference, and payment confirmation.',
        ],
      },
      {
        title: '3. Data Retention & 30-Day Mock Result Window',
        paragraphs: [
          'Submitted online mock test results remain accessible inside your candidate dashboard for 30 days as part of your product entitlement. Operational order and accounting records are retained only as required for customer support, fraud prevention, and legal compliance.',
          'Waitlist and cohort application records are kept for current and upcoming cohort intake cycles and are deleted promptly upon candidate request.',
        ],
      },
      {
        title: '4. Cookies, Security & Third-Party Infrastructure',
        paragraphs: [
          'We use essential session cookies (via Supabase Auth) solely to keep signed-in candidates authenticated and protect exam delivery against unauthorized sharing, alongside privacy-focused aggregate web performance metrics (@vercel/analytics and @vercel/speed-insights). We do not sell, rent, or trade personal data to advertisers.',
          'All traffic is encrypted over HTTPS (HSTS), protected by strict per-request Content Security Policy nonces, role-based access controls, and encrypted sensitive storage.',
        ],
      },
      {
        title: '5. Your Rights Under Algerian Law No. 18-07',
        paragraphs: [
          'Under Algerian Law No. 18-07, you have the right to be informed, to access your personal data, to rectify inaccurate or incomplete details, and to object to or request deletion of your personal data where applicable.',
          'To exercise any of these rights, email ieltslab.oran@gmail.com from the address associated with your application or account. We respond promptly and free of charge.',
        ],
      },
    ],
  },
  fr: {
    metaTitle: 'Politique de Confidentialité (Loi 18-07) | IELTS Lab Oran',
    metaDesc:
      'Comment IELTS Lab Oran collecte, protège et conserve vos données de candidature, paiements Chargily et résultats (30 jours) selon la loi algérienne 18-07.',
    breadcrumb: 'Politique de confidentialité',
    updated: 'Dernière mise à jour : 18 novembre 2026',
    h1: 'Politique de Confidentialité & Protection des Données',
    intro:
      'IELTS Lab Oran (https://www.ieltslab.org) s’engage à protéger les données personnelles des candidats conformément à la loi algérienne n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel (modifiée et complétée). Cette page détaille les données collectées, leurs finalités, leur durée de conservation et vos droits.',
    sections: [
      {
        title: '1. Responsable du traitement & Contact',
        paragraphs: [
          'Le traitement des données collectées sur https://www.ieltslab.org est assuré par IELTS Lab Oran (Fondateur : Amine Senouci), situé à Bir El Djir, Oran 31130, Algérie.',
          'Pour toute demande d’information, d’accès, de rectification ou de suppression, écrivez-nous à ieltslab.oran@gmail.com ou au +213 780 34 31 03.',
        ],
      },
      {
        title: '2. Données collectées et finalités',
        paragraphs: [
          'Candidatures aux cohortes et formulaires : Lorsque vous postulez à un groupe à Oran, rejoignez la liste d’attente ou demandez notre guide gratuit, nous recueillons vos nom, numéro WhatsApp/téléphone, e-mail, niveau estimé, objectif de score, échéance d’examen et paramètres d’attribution internes (UTM / QR). Ces informations servent uniquement à l’étude pédagogique de votre candidature et à l’organisation des créneaux.',
          'Comptes candidats et test blanc en ligne : Lors de la création d’un compte pour le test blanc IELTS Academic, nous enregistrons votre identifiant, vos droits d’accès, vos réponses d’examen et vos scores afin d’assurer le passage chronométré et l’affichage de votre bilan.',
          'Paiements via Chargily Pay : Les règlements en dinars (cartes CIB et Edahabia) s’effectuent exclusivement sur l’interface sécurisée de Chargily Pay. IELTS Lab Oran n’a jamais accès aux numéros de carte ni aux codes confidentiels et ne reçoit que la confirmation de transaction.',
        ],
      },
      {
        title: '3. Durée de conservation & fenêtre de 30 jours',
        paragraphs: [
          'Les résultats des tests blancs en ligne restent consultables dans votre espace candidat pendant 30 jours conformément à votre droit d’accès. Les justificatifs de commande sont conservés uniquement pour le support client et les obligations légales.',
          'Les candidatures aux cohortes et inscriptions sur liste d’attente sont conservées pour les sessions en cours ou à venir et supprimées sur simple demande.',
        ],
      },
      {
        title: '4. Cookies, sécurité et sous-traitants techniques',
        paragraphs: [
          'Nous utilisons des cookies techniques essentiels d’authentification (Supabase Auth) pour sécuriser votre session d’examen, ainsi que des mesures d’audience et de performance agrégées sans pistage publicitaire (@vercel/analytics et @vercel/speed-insights). Vos données ne sont jamais vendues ni cédées à des tiers commerciaux.',
          'Les échanges sont chiffrés via HTTPS (HSTS) et protégés par une politique stricte de sécurité du contenu (CSP à nonce unique) et un contrôle d’accès par rôle.',
        ],
      },
      {
        title: '5. Vos droits selon la loi algérienne n° 18-07',
        paragraphs: [
          'Conformément à la loi n° 18-07, vous disposez d’un droit d’information, d’accès, de rectification et d’opposition ou de suppression portant sur vos données personnelles.',
          'Pour exercer vos droits gratuitement, envoyez votre demande à ieltslab.oran@gmail.com depuis l’adresse e-mail utilisée lors de votre inscription ou candidature.',
        ],
      },
    ],
  },
  ar: {
    metaTitle: 'سياسة الخصوصية وحماية البيانات (18-07) | IELTS Lab Oran',
    metaDesc:
      'كيف يعالج مركز IELTS Lab Oran بيانات طلبات التسجيل، مدفوعات Chargily، ونتائج الاختبار التجريبي المحفوظة لمدة 30 يوماً وفق القانون الجزائري 18-07.',
    breadcrumb: 'سياسة الخصوصية',
    updated: 'آخر تحديث: 18 نوفمبر 2026',
    h1: 'سياسة الخصوصية وحماية البيانات الشخصية',
    intro:
      'يلتزم مركز IELTS Lab Oran (https://www.ieltslab.org) بحماية سرية البيانات الشخصية للمترشحين وفق أحكام القانون الجزائري رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي (المعدّل والمتمّم). توضح هذه الصفحة طبيعة البيانات المجمعة وأغراضها ومدة حفظها وحقوقك القانونية.',
    sections: [
      {
        title: '1. المسؤول عن معالجة البيانات ووسائل الاتصال',
        paragraphs: [
          'تتم معالجة البيانات المجمعة عبر الموقع الرسمي https://www.ieltslab.org من طرف مركز IELTS Lab Oran (المؤسس: أمين سنوسي)، الكائن في بئر الجير، وهران 31130، الجزائر.',
          'لأي استفسار أو طلب متعلق بالاطلاع على بياناتك أو تصحيحها أو حذفها، يرجى مراسلتنا عبر البريد الإلكتروني ieltslab.oran@gmail.com أو عبر الهاتف/واتساب: +213 780 34 31 03.',
        ],
      },
      {
        title: '2. البيانات التي نجمعها وأغراض المعالجة',
        paragraphs: [
          'طلبات الالتحاق بالدورات وقائمة الانتظار: عند تقديم طلب للانضمام إلى دورة حضورية في وهران أو قائمة الانتظار أو طلب الدليل المجاني، نجمع الاسم، رقم الهاتف/واتساب، البريد الإلكتروني، المستوى التقريبي والدرجة المستهدفة، وموعد الاختبار المخطط له. تُستخدم هذه البيانات حصرياً لدراسة ملف الترشح وتنسيق الجداول الزمنية.',
          'حسابات المنصة والاختبار التجريبي عبر الإنترنت: عند إنشاء حساب لإجراء اختبار IELTS Academic التجريبي، نحتفظ ببيانات تسجيل الدخول، سجل الطلبات، إجابات الاختبار، والتقييم التشخيصي لتمكينك من إتمام المحاكاة ومراجعة نتائجك.',
          'المدفوعات عبر بوابة Chargily Pay: تتم عمليات الدفع بالدينار الجزائري (البطاقة الذهبية وCIB) مباشرة عبر صفحة الدفع المؤمّنة الخاصة بـ Chargily Pay، ولا يطّلع مركز IELTS Lab Oran إطلاقاً على أرقام البطاقات أو الأرقام السرية، بل يتلقى فقط تأكيد حالة الدفع ومرجع الطلب.',
        ],
      },
      {
        title: '3. مدة الاحتفاظ بالبيانات وصلاحية الـ 30 يوماً',
        paragraphs: [
          'تبقى نتائج الاختبار التجريبي عبر الإنترنت متاحة للمراجعة داخل حسابك لمدة 30 يوماً وفق صلاحية المنتج المشترى، وتُحفظ سجلات المعاملات بالقدر اللازم للدعم الفني والالتزامات القانونية.',
          'تُحفظ بيانات الترشح للدورات وقوائم الانتظار لتنظيم الدفعات الحالية والقادمة، ويتم حذفها بناءً على طلب المترشح.',
        ],
      },
      {
        title: '4. ملفات تعريف الارتباط والأمن التقني',
        paragraphs: [
          'نستخدم ملفات تعريف ارتباط تقنية ضرورية فقط لتأمين جلسة تسجيل الدخول وحماية بيئة الاختبار (عبر Supabase Auth)، إلى جانب مؤشرات أداء تقنية مجمّعة لا تتضمن تتبعاً إعلانياً (@vercel/analytics و@vercel/speed-insights). لا نبيع أو نشارك بياناتك الشخصية مع أي جهات تسويقية.',
          'تُشفّر جميع الاتصالات عبر بروتوكول HTTPS (HSTS) مع سياسة أمان محتوى صارمة (CSP) وضوابط صلاحيات دقيقة.',
        ],
      },
      {
        title: '5. حقوقك بموجب القانون الجزائري رقم 18-07',
        paragraphs: [
          'يكفل لك القانون رقم 18-07 الحق في الإعلام، والولوج إلى معطياتك الشخصية، وطلب تصحيحها أو تحيينها، والاعتراض على معالجتها أو طلب حذفها ضمن الأطر القانونية.',
          'لممارسة هذه الحقوق مجاناً، أرسل طلباً إلى ieltslab.oran@gmail.com من البريد الإلكتروني المرتبط بطلبك أو حسابك.',
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
    path: 'privacy',
    title: STANDALONE_PAGE_SEO_TITLES.privacy[safeLocale],
    description: STANDALONE_PAGE_SEO_DESCRIPTIONS.privacy[safeLocale],
  });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = COPY[safeLocale];
  const isRtl = safeLocale === 'ar';
  const pageUrl = localizedUrl(safeLocale, 'privacy');

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
