import Image from 'next/image';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import { Link } from '@/i18n/routing';
import {
  Locale,
  SITE_NAME,
  SITE_URL,
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
    eyebrow: string;
    h1: string;
    summary: string;
    entityNoteTitle: string;
    entityNoteBody: string;
    instructorTitle: string;
    instructorSubtitle: string;
    instructorBio: string[];
    credentials: Array<[string, string]>;
    trfCaption: string;
    trfAlt: string;
    philosophyTitle: string;
    pillars: Array<{ title: string; body: string }>;
    locationTitle: string;
    locationFacts: Array<[string, string]>;
    editorialTitle: string;
    editorialBody: string;
    ctaCohort: string;
    ctaMock: string;
  }
> = {
  en: {
    metaTitle: 'About IELTS Lab Oran & Amine Senouci (Band 8.0) | Oran',
    metaDesc:
      'Meet Amine Senouci (Official IELTS Band 8.0, Listening 9.0, TEFL) and discover IELTS Lab Oran in Bir El Djir (31130): 8-seat coaching & simulation.',
    breadcrumb: 'About & Instructor',
    eyebrow: 'Entity & Instructor Profile · Bir El Djir, Oran',
    h1: 'About IELTS Lab Oran & Founder Amine Senouci',
    summary:
      'IELTS Lab Oran (https://www.ieltslab.org) is an independent IELTS preparation centre in Bir El Djir, Oran (31130), Algeria, pairing small-group 8-seat coaching with a proprietary computer-delivered IELTS Academic simulation platform.',
    entityNoteTitle: 'Official Identity & Independence Notice',
    entityNoteBody:
      'IELTS Lab Oran operates exclusively at https://www.ieltslab.org in Bir El Djir, Oran, Algeria, and is completely unaffiliated with global IELTS SaaS websites on other domain extensions, as well as unaffiliated with the British Council, IDP, or Cambridge University Press & Assessment.',
    instructorTitle: 'Amine Senouci (Mr. Senouci)',
    instructorSubtitle: 'Founder & Lead IELTS Instructor',
    instructorBio: [
      'Amine Senouci founded IELTS Lab Oran to bridge a gap facing Algerian university and Express Entry candidates: while British Council Algeria transitioned exclusively to computer-delivered IELTS from 30 April 2026, most local courses still relied on crowded 20-person classrooms and photocopied paper handouts.',
      'Combining an official IELTS Overall Band 8.0 (including a perfect 9.0 in Listening, achieved December 2025), TEFL certification, three years of English teaching experience, and a background in Applied AI & Software Engineering, Mr. Senouci built IELTS Lab Oran around strict diagnostic feedback and realistic computer-interface practice.',
    ],
    credentials: [
      ['Official IELTS Score', 'Overall Band 8.0 · Listening 9.0 (December 2025)'],
      ['Teaching Qualification', 'TEFL Certified English Instructor · 3 years teaching experience'],
      ['Technical Background', 'Applied AI & Software Engineering (Creator of IELTS Lab Oran Simulator)'],
      ['Cohort Group Cap', 'Strictly 8 seats per cohort for line-by-line Writing & Speaking feedback'],
    ],
    trfCaption: 'Verified Official IELTS Test Report Form — Overall Band 8.0 & Listening 9.0',
    trfAlt: 'Official IELTS Test Report Form of Amine Senouci showing Overall Band 8.0 and Listening 9.0',
    philosophyTitle: 'How We Prepare Candidates in Oran & Across Algeria',
    pillars: [
      {
        title: '1. Computer-First Exam Habits',
        body: 'Everything from split-screen Reading navigation and highlighting to timed keyboard essay writing is trained around the digital interface used on test day.',
      },
      {
        title: '2. Official Examiner Rubric Calibration',
        body: 'Writing Task 1/2 and Speaking Parts 1–3 are diagnosed directly against published public band descriptors—no memorized templates or unrealistic band guarantees.',
      },
      {
        title: '3. Honest Screening Before You Spend 40,000 DA',
        body: 'Our intensive programme is strictly for non-beginners (CEFR B1/B2+). We help you verify which exact test version (Academic, General Training, or UKVI) your visa or university requires before you book.',
      },
    ],
    locationTitle: 'Location & Contact Details (Oran, Algeria)',
    locationFacts: [
      ['Area & Postal Code', 'Bir El Djir, Oran 31130, Algeria'],
      ['Catchment Served', 'Oran (Bir El Djir, USTO, Akid Lotfi, Canastel, Es-Senia) & Western Algeria + Online nationwide'],
      ['Phone & WhatsApp', '+213 780 34 31 03'],
      ['Email', 'ieltslab.oran@gmail.com'],
    ],
    editorialTitle: 'Editorial & Fact-Checking Policy',
    editorialBody:
      'Every Algeria IELTS guide published on ieltslab.org is researched and fact-checked by Amine Senouci against primary official sources (British Council Algeria, IELTS.org, IRCC Canada, GOV.UK, Campus France / France-Visas, and consular notices), with visible verification dates and direct outbound citations.',
    ctaCohort: 'Apply for the Oran Cohort',
    ctaMock: 'Explore Online Mock Test',
  },
  fr: {
    metaTitle: 'À propos d’IELTS Lab Oran & Amine Senouci (Band 8.0)',
    metaDesc:
      'Découvrez IELTS Lab Oran à Bir El Djir (31130) et son fondateur Amine Senouci (Band 8.0 officiel, Listening 9.0, certifié TEFL) : prépa et simulateur.',
    breadcrumb: 'À propos & Formateur',
    eyebrow: 'Profil de l’organisme & du formateur · Bir El Djir, Oran',
    h1: 'À propos d’IELTS Lab Oran et d’Amine Senouci',
    summary:
      'IELTS Lab Oran (https://www.ieltslab.org) est un centre indépendant de préparation à l’IELTS situé à Bir El Djir, Oran (31130), Algérie, alliant des cours en petit groupe de 8 places et une plateforme en ligne de simulation IELTS Academic sur ordinateur.',
    entityNoteTitle: 'Identité officielle et indépendance',
    entityNoteBody:
      'IELTS Lab Oran opère exclusivement sur https://www.ieltslab.org à Bir El Djir (Oran, Algérie) et n’a aucun lien avec les plateformes internationales utilisant d’autres extensions de domaine, ni avec le British Council, IDP ou Cambridge University Press & Assessment.',
    instructorTitle: 'Amine Senouci (Mr. Senouci)',
    instructorSubtitle: 'Fondateur & Formateur IELTS Principal',
    instructorBio: [
      'Amine Senouci a fondé IELTS Lab Oran pour répondre à un besoin concret des candidats algériens aux études et à l’Entrée express : alors que le British Council Algérie est passé à 100 % sur ordinateur dès le 30 avril 2026, la majorité des formations reposaient encore sur des classes surchargées et des polycopiés papier.',
      'Titulaire d’un score officiel IELTS Band 8.0 global (dont 9.0/9.0 en Listening, décembre 2025), certifié TEFL avec trois ans d’expérience d’enseignement et issu d’une formation en IA appliquée et Génie Logiciel, il a conçu une approche centrée sur le diagnostic individuel et la maîtrise de l’interface numérique.',
    ],
    credentials: [
      ['Score IELTS officiel', 'Band 8.0 global · 9.0 en Listening (décembre 2025)'],
      ['Qualification pédagogique', 'Instructeur d’anglais certifié TEFL · 3 ans d’expérience'],
      ['Profil technique', 'IA appliquée & Génie Logiciel (concepteur du simulateur IELTS Lab Oran)'],
      ['Effectif par cohorte', 'Strictement limité à 8 places pour un suivi individuel écrit et oral'],
    ],
    trfCaption: 'Relevé officiel IELTS Test Report Form vérifié — Band 8.0 global et 9.0 en Listening',
    trfAlt: 'Relevé officiel IELTS d’Amine Senouci affichant Band 8.0 global et 9.0 en Listening',
    philosophyTitle: 'Notre méthode de préparation à Oran et en Algérie',
    pillars: [
      {
        title: '1. Entraînement pensé pour l’ordinateur',
        body: 'Lecture en écran partagé, surlignage rapide, gestion du chronomètre et frappe structurée pour Writing Task 1 et Task 2.',
      },
      {
        title: '2. Alignement strict sur les critères officiels',
        body: 'Chaque essai et simulation orale est évalué selon les descripteurs publics officiels — sans modèles récités ni fausses promesses de score garanti.',
      },
      {
        title: '3. Orientation honnête avant de payer 40 000 DA',
        body: 'Nos cohortes s’adressent aux niveaux B1/B2 minimum. Nous vérifions avec vous le module exact (Academic, General Training ou UKVI) requis par votre université ou ambassade.',
      },
    ],
    locationTitle: 'Localisation & Coordonnées (Oran, Algérie)',
    locationFacts: [
      ['Quartier & Code postal', 'Bir El Djir, Oran 31130, Algérie'],
      ['Zone couverte', 'Oran (Bir El Djir, USTO, Akid Lotfi, Canastel, Es-Senia), Ouest algérien & en ligne partout en Algérie'],
      ['Téléphone & WhatsApp', '+213 780 34 31 03'],
      ['Adresse e-mail', 'ieltslab.oran@gmail.com'],
    ],
    editorialTitle: 'Charte éditoriale et vérification des sources',
    editorialBody:
      'Tous les guides pratiques publiés sur ieltslab.org sont rédigés et vérifiés par Amine Senouci à partir des sources institutionnelles officielles (British Council Algérie, IELTS.org, IRCC Canada, GOV.UK, France-Visas et communiqués consulaires), avec dates de révision visibles.',
    ctaCohort: 'Candidater à la cohorte d’Oran',
    ctaMock: 'Découvrir le test blanc en ligne',
  },
  ar: {
    metaTitle: 'من نحن والمدرب أمين سنوسي (Band 8.0) | IELTS Lab Oran',
    metaDesc:
      'تعرّف على مركز IELTS Lab Oran في بئر الجير، وهران (31130) ومؤسسه المدرب المعتمد أمين سنوسي (Band 8.0 رسمية، و9.0 في الاستماع): تدريب ومحاكاة رقمية.',
    breadcrumb: 'من نحن والمدرب',
    eyebrow: 'بطاقة المركز والمدرب · بئر الجير، وهران',
    h1: 'عن IELTS Lab Oran والمؤسس أمين سنوسي',
    summary:
      'مركز IELTS Lab Oran (https://www.ieltslab.org) هو جهة تحضير مستقلة لاختبار الايلتس في بئر الجير، وهران (31130)، الجزائر، يجمع بين التدريب الحضوري المصغّر (8 مقاعد فقط) ومنصة محاكاة رقمية لاختبار IELTS Academic على الكمبيوتر.',
    entityNoteTitle: 'تنويه الهوية الرسمية والاستقلالية',
    entityNoteBody:
      'يعمل مركز IELTS Lab Oran حصرياً عبر النطاق الرسمي https://www.ieltslab.org في بئر الجير بوهران، الجزائر، وهو غير تابع لأي مواقع دولية تحمل أسماء مشابهة على نطاقات أخرى، كما أنه جهة مستقلة غير تابعة للمجلس الثقافي البريطاني أو IDP أو جامعة كامبريدج.',
    instructorTitle: 'أمين سنوسي (Mr. Senouci)',
    instructorSubtitle: 'المؤسس والمدرب الرئيسي لاختبار IELTS',
    instructorBio: [
      'أسّس أمين سنوسي مركز IELTS Lab Oran لمعالجة فجوة حقيقية يواجهها الطلبة والمهنيون الجزائريون؛ إذ انتقل امتحان IELTS في الجزائر رسمياً إلى الكمبيوتر بالكامل منذ 30 أبريل 2026، بينما بقيت أغلب الدورات التقليدية تعتمد على الأقسام المزدحمة والأوراق المطبوعة.',
      'يجمع الأستاذ سنوسي بين شهادة IELTS رسمية بدرجة 8.0 إجمالية (وعلامة 9.0 الكاملة في الاستماع، ديسمبر 2025)، وشهادة تدريس الإنجليزية المعتمدة TEFL، وخبرة تدريسية تمتد لثلاث سنوات، إلى جانب خلفية أكاديمية وتقنية في الذكاء الاصطناعي التطبيقي وهندسة البرمجيات مكّنته من بناء نظام محاكاة وتشخيص دقيق.',
    ],
    credentials: [
      ['النتيجة الرسمية الموثقة', 'Band 8.0 إجمالية · 9.0 كاملة في الاستماع (ديسمبر 2025)'],
      ['التأهيل التدريسي', 'مدرب لغة إنجليزية معتمد (TEFL) · 3 سنوات خبرة تدريسية'],
      ['الخلفية التقنية', 'الذكاء الاصطناعي التطبيقي وهندسة البرمجيات (مطور منصة المحاكاة)'],
      ['حجم الأفواج الحضورية', '8 مقاعد كحد أقصى لكل دفعة لضمان تصحيح فردي للكتابة والمحادثة'],
    ],
    trfCaption: 'نسخة من شهادة نتائج IELTS الرسمية — الدرجة الإجمالية 8.0 والاستماع 9.0',
    trfAlt: 'شهادة نتائج اختبار IELTS الرسمية للأستاذ أمين سنوسي بدرجة 8.0 إجمالية و9.0 في الاستماع',
    philosophyTitle: 'ركائز منهجيتنا في وهران والجزائر',
    pillars: [
      {
        title: '1. التعود الكامل على واجهة الكمبيوتر',
        body: 'تدريب عملي على الشاشة المقسمة في القراءة، التظليل، إدارة الوقت، والكتابة المباشرة على لوحة المفاتيح كما في يوم الامتحان.',
      },
      {
        title: '2. التقييم وفق معايير المصححين الرسمية',
        body: 'تصحيح مهام الكتابة والمحادثة استناداً إلى معايير التقييم الرسمية المنشورة، بعيداً عن القوالب المحفوظة أو الوعود الوهمية بضمان النتيجة.',
      },
      {
        title: '3. توجيه صريح قبل دفع 40,000 دج',
        body: 'دوراتنا مخصصة لغير المبتدئين (مستوى B1/B2 فما فوق)، ونساعدك على التحقق من نوع الاختبار المطلوب بدقة (Academic أو General Training أو UKVI) قبل حجز الامتحان.',
      },
    ],
    locationTitle: 'الموقع وبيانات الاتصال (وهران، الجزائر)',
    locationFacts: [
      ['البلدية والرمز البريدي', 'بئر الجير، وهران 31130، الجزائر'],
      ['النطاق الجغرافي', 'وهران (بئر الجير، إيسطو، عقيد لطفي، كانستال، السانية) والغرب الجزائري، وعبر الإنترنت لكافة الولايات'],
      ['الهاتف وواتساب', '+213 780 34 31 03'],
      ['البريد الإلكتروني', 'ieltslab.oran@gmail.com'],
    ],
    editorialTitle: 'سياسة التحرير والتدقيق المعلوماتي',
    editorialBody:
      'تخضع جميع الأدلة المنشورة على موقع ieltslab.org للمراجعة والتدقيق من طرف أمين سنوسي بالرجوع المباشر إلى المصادر الرسمية (المجلس الثقافي البريطاني في الجزائر، IELTS.org، وزارة الهجرة الكندية IRCC، موقع GOV.UK، والبيانات القنصلية)، مع إظهار تاريخ التحديث والروابط المرجعية بوضوح.',
    ctaCohort: 'قدّم لدورة وهران الحضورية',
    ctaMock: 'تعرّف على الاختبار التجريبي',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  return buildWebsitePageMetadata({
    locale: safeLocale,
    path: 'about',
    title: STANDALONE_PAGE_SEO_TITLES.about[safeLocale],
    description: STANDALONE_PAGE_SEO_DESCRIPTIONS.about[safeLocale],
  });
}

export default async function AboutEntityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const c = COPY[safeLocale];
  const isRtl = safeLocale === 'ar';
  const pageUrl = localizedUrl(safeLocale, 'about');
  const organizationId = `${SITE_URL}/#organization`;
  const instructorId = `${SITE_URL}/#instructor`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${pageUrl}#aboutpage`,
        url: pageUrl,
        name: c.h1,
        description: c.metaDesc,
        inLanguage: safeLocale,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@id': organizationId },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ['en', 'fr', 'ar'],
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'EducationalOrganization',
        '@id': organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo_rounded.png`,
          width: 512,
          height: 512,
        },
        founder: { '@id': instructorId },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bir El Djir',
          addressRegion: 'Oran',
          postalCode: '31130',
          addressCountry: 'DZ',
        },
        email: 'ieltslab.oran@gmail.com',
        telephone: '+213780343103',
      },
      {
        '@type': 'Person',
        '@id': instructorId,
        name: 'Amine Senouci',
        alternateName: 'Mr. Senouci',
        url: `${pageUrl}#instructor`,
        image: `${SITE_URL}/amine.jpg`,
        jobTitle: c.instructorSubtitle,
        description: c.instructorBio[1],
        worksFor: { '@id': organizationId },
        sameAs: [
          'https://www.linkedin.com/company/ielts-lab-oran',
          'https://www.instagram.com/ieltslab.oran/',
        ],
      },
      {
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
      },
    ],
  };

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <main
        id="main-content"
        className={`mx-auto max-w-4xl px-6 pb-24 pt-32 ${isRtl ? 'font-cairo' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <Link href="/" className="hover:text-[#b81428] underline-offset-4 hover:underline">
            {SITE_NAME}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-charcoal">{c.breadcrumb}</span>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b81428]">{c.eyebrow}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-charcoal leading-tight">
            {c.h1}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-700">{c.summary}</p>
        </header>

        {/* Disambiguation Card */}
        <section className="mb-12 rounded-2xl border-s-4 border-crimson bg-white p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-charcoal">{c.entityNoteTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{c.entityNoteBody}</p>
        </section>

        {/* Instructor Section */}
        <section id="instructor" className="scroll-mt-28 rounded-[2.5rem] bg-charcoal p-8 text-white shadow-xl sm:p-12">
          <div className="grid gap-8 md:grid-cols-12 items-center">
            <div className="md:col-span-5">
              <div className="relative aspect-[3/4] w-full max-w-xs mx-auto overflow-hidden rounded-2xl border border-white/15">
                <Image
                  src="/amine.jpg"
                  alt={c.instructorTitle}
                  fill
                  sizes="(max-width: 768px) 80vw, 320px"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff7a8a]">{c.instructorSubtitle}</p>
              <h2 className="mt-2 text-3xl font-extrabold">{c.instructorTitle}</h2>
              <div className="mt-4 space-y-4 text-sm sm:text-base leading-relaxed text-gray-300">
                {c.instructorBio.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <dl className="mt-6 divide-y divide-white/10 text-sm">
                {c.credentials.map(([k, v]) => (
                  <div key={k} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <dt className="text-gray-300 font-medium">{k}</dt>
                    <dd className="font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <figure className="mt-10 rounded-2xl bg-white p-4 text-charcoal">
            <Image
              src="/ielts_cropped.png"
              alt={c.trfAlt}
              width={800}
              height={600}
              sizes="(max-width: 768px) 90vw, 768px"
              className="w-full h-auto rounded-xl object-contain"
            />
            <figcaption className="mt-3 text-center text-xs font-semibold text-gray-600">
              {c.trfCaption}
            </figcaption>
          </figure>
        </section>

        {/* Methodology Pillars */}
        <section className="mt-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal">{c.philosophyTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {c.pillars.map((p) => (
              <div key={p.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-extrabold text-charcoal">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Location & Editorial Policy */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-extrabold text-charcoal">{c.locationTitle}</h2>
            <dl className="mt-4 divide-y divide-gray-100 text-sm">
              {c.locationFacts.map(([k, v]) => (
                <div key={k} className="py-3">
                  <dt className="font-semibold text-gray-600">{k}</dt>
                  <dd className="mt-1 font-bold text-charcoal">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-[#faf9f6] p-7 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-charcoal">{c.editorialTitle}</h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-700">{c.editorialBody}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/#intake"
                className="inline-flex items-center justify-center rounded-full bg-[#c4162c] px-6 py-3 text-xs font-bold text-white transition hover:bg-red-800"
              >
                {c.ctaCohort}
              </Link>
              <Link
                href="/mock-test"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-xs font-bold text-charcoal transition hover:border-charcoal"
              >
                {c.ctaMock}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter locale={safeLocale} />
    </>
  );
}
