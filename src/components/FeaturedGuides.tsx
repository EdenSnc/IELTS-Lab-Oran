import { Link } from '@/i18n/routing';
import { Locale } from '@/lib/seo';

interface GuideCardItem {
  slug: string;
  tag: Record<Locale, string>;
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
}

const FEATURED_GUIDES: GuideCardItem[] = [
  {
    slug: 'how-to-register-algeria',
    tag: { en: 'Registration & Fees', fr: 'Inscription & Tarifs', ar: 'التسجيل والرسوم' },
    title: {
      en: 'How to Register & Pay for IELTS in Algeria (2026)',
      fr: 'Inscription et paiement IELTS en Algérie (2026)',
      ar: 'كيفية التسجيل ودفع رسوم IELTS في الجزائر (2026)',
    },
    summary: {
      en: '40,000 DA fee, British Council centres in Oran and Algiers, payment within 72h, and passport rules.',
      fr: 'Tarif de 40 000 DA, centres British Council à Oran et Alger, paiement sous 72 h et passeport valide.',
      ar: 'رسوم 40,000 دج، مراكز المجلس الثقافي البريطاني في وهران والجزائر، مهلة 72 ساعة، وشروط جواز السفر.',
    },
  },
  {
    slug: 'computer-vs-paper-ielts',
    tag: { en: 'Test Format', fr: 'Format du test', ar: 'صيغة الاختبار' },
    title: {
      en: 'IELTS on Computer in Algeria (Since April 2026)',
      fr: 'IELTS sur ordinateur en Algérie (depuis avril 2026)',
      ar: 'اختبار IELTS على الكمبيوتر في الجزائر (منذ أبريل 2026)',
    },
    summary: {
      en: 'Why paper delivery stopped, how screen tools work, and why results arrive in 1–2 days.',
      fr: 'Fin du format papier, outils à l’écran, éditeur Writing et résultats en 1 à 2 jours.',
      ar: 'توقف الاختبار الورقي، أدوات الشاشة، والنتائج خلال يوم إلى يومين.',
    },
  },
  {
    slug: 'free-ielts-resources-algeria',
    tag: { en: 'Official Prep', fr: 'Préparation gratuite', ar: 'تحضير مجاني' },
    title: {
      en: 'Free IELTS Prep & IELTS Ready Resources in Algeria',
      fr: 'Ressources IELTS gratuites et IELTS Ready en Algérie',
      ar: 'مصادر IELTS المجانية ومنصة IELTS Ready في الجزائر',
    },
    summary: {
      en: 'Official mock tests, IDP vs British Council prep, and IELTS Ready Premium vs free tier compared.',
      fr: 'Tests blancs officiels, comparaison IDP et British Council, et accès IELTS Ready gratuit vs Premium.',
      ar: 'اختبارات تجريبية رسمية ومقارنة IELTS Ready المجاني وPremium في الجزائر.',
    },
  },
  {
    slug: 'ielts-one-skill-retake-algeria',
    tag: { en: 'Score Recovery', fr: 'Rattrapage ciblé', ar: 'إعادة مهارة واحدة' },
    title: {
      en: 'IELTS One Skill Retake in Algeria (25,000 DA)',
      fr: 'One Skill Retake IELTS en Algérie (25 000 DA)',
      ar: 'إعادة مهارة واحدة IELTS One Skill Retake في الجزائر',
    },
    summary: {
      en: 'Retake Listening, Reading, Writing, or Speaking within 60 days instead of paying full price.',
      fr: 'Repassez une seule épreuve sous 60 jours au lieu de repasser tout l’examen.',
      ar: 'أعد اختبار مهارة واحدة خلال 60 يوماً برسوم 25,000 دج بدل إعادة الاختبار كاملاً.',
    },
  },
  {
    slug: 'academic-vs-general',
    tag: { en: 'Module Choice', fr: 'Choix du module', ar: 'تحديد النوع' },
    title: {
      en: 'IELTS Academic vs General Training + Decision Check',
      fr: 'IELTS Academic vs General Training + Test rapide',
      ar: 'الفرق بين IELTS Academic وGeneral Training',
    },
    summary: {
      en: 'Match Academic, General Training, or UKVI to your university, Express Entry, or visa target.',
      fr: 'Choisissez entre Academic, General Training ou UKVI selon vos études ou votre visa.',
      ar: 'اختر بين Academic أو General Training أو UKVI حسب هدفك للدراسة أو الهجرة.',
    },
  },
  {
    slug: 'ielts-vs-toefl-canada',
    tag: { en: 'Canada & CLB', fr: 'Canada & NCLC', ar: 'كندا وCLB' },
    title: {
      en: 'IELTS General Training for Canada Express Entry (CLB 9)',
      fr: 'IELTS General Training pour Entrée Express Canada',
      ar: 'IELTS للهجرة إلى كندا وحساب نقاط CLB',
    },
    summary: {
      en: 'Target L8 R7 W7 S7 scores, CLB equivalency lookup, and bilingual French + English CRS strategy.',
      fr: 'Visez L8 R7 W7 S7, vérifiez vos équivalences CLB et combinez anglais + français.',
      ar: 'جدول معادلة CLB التفاعلي ومتطلبات 8/7/7/7 لنظام Express Entry الكندي.',
    },
  },
];

const COPY: Record<Locale, { badge: string; title: string; subtitle: string; readMore: string; viewAll: string }> = {
  en: {
    badge: 'Oran & Algeria IELTS Knowledge Hub',
    title: 'Practical Guides for IELTS Candidates in Algeria',
    subtitle: 'Verified fees in Algerian Dinars, computer-delivered exam facts, and score tools tailored to Oran and Algerian candidates.',
    readMore: 'Read guide →',
    viewAll: 'Browse all 11 IELTS Algeria guides →',
  },
  fr: {
    badge: 'Guides pratiques IELTS Algérie & Oran',
    title: 'Ressources vérifiées pour les candidats à Oran et en Algérie',
    subtitle: 'Tarifs officiels en dinars, passage au format ordinateur, calculatrice CLB et préparation structurée.',
    readMore: 'Lire le guide →',
    viewAll: 'Voir les 11 guides IELTS Algérie →',
  },
  ar: {
    badge: 'دليل مرشحي IELTS في وهران والجزائر',
    title: 'أدلة عملية ومحدثة لاجتياز اختبار IELTS في الجزائر',
    subtitle: 'الرسوم الرسمية بالدينار الجزائري، تفاصيل الاختبار على الكمبيوتر، وحاسبة CLB لكندا.',
    readMore: 'اقرأ الدليل ←',
    viewAll: 'تصفح جميع الأدلة الـ 11 ←',
  },
};

export default function FeaturedGuides({ locale }: { locale: Locale }) {
  const safeLocale: Locale = locale in COPY ? locale : 'en';
  const copy = COPY[safeLocale];

  return (
    <section
      id="guides"
      className="py-16 md:py-24 px-6 bg-white border-t border-black/5"
      dir={safeLocale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-3 py-1 bg-crimson/10 text-[#b81428] font-bold text-xs uppercase tracking-wider rounded-full mb-3">
              {copy.badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-charcoal tracking-tight">
              {copy.title}
            </h2>
            <p className="mt-2 text-base text-gray-600 max-w-2xl leading-relaxed">
              {copy.subtitle}
            </p>
          </div>
          <Link
            href="/articles"
            className="text-sm font-bold text-[#b81428] hover:underline whitespace-nowrap shrink-0"
          >
            {copy.viewAll}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/articles/${guide.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-[#faf9f6] p-6 hover:border-crimson/40 hover:bg-white hover:shadow-md transition-all"
            >
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#b81428] mb-2">
                  {guide.tag[safeLocale]}
                </span>
                <h3 className="text-lg font-bold text-charcoal group-hover:text-[#b81428] transition-colors leading-snug mb-2">
                  {guide.title[safeLocale]}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {guide.summary[safeLocale]}
                </p>
              </div>
              <span className="text-xs font-bold text-charcoal group-hover:text-[#b81428]">
                {copy.readMore}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
