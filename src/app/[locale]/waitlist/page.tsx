import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { CANONICAL_ORIGIN, Locale } from '@/lib/seo';
import WaitlistUI from '@/components/WaitlistUI';

const META_COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'Join the Next Cohort Waitlist | IELTS Lab Oran',
    description:
      'Join the priority waitlist for the next 8-seat computer-based IELTS preparation cohort in Bir El Djir, Oran.',
  },
  fr: {
    title: 'Liste d’attente de la prochaine cohorte | IELTS Lab Oran',
    description:
      'Rejoignez la liste d’attente prioritaire pour le prochain groupe de 8 places de préparation IELTS sur ordinateur à Bir El Djir, Oran.',
  },
  ar: {
    title: 'قائمة انتظار الدفعة القادمة | IELTS Lab Oran',
    description:
      'انضم إلى قائمة الانتظار ذات الأولوية للدفعة القادمة (8 مقاعد) من دورة التحضير لاختبار IELTS على الكمبيوتر في بئر الجير، وهران.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const copy = META_COPY[safeLocale];
  return {
    metadataBase: new URL(CANONICAL_ORIGIN),
    title: copy.title,
    description: copy.description,
    alternates: { canonical: null, languages: {} },
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistPage() {
  const locale = await getLocale();
  return <WaitlistUI locale={locale} />;
}
