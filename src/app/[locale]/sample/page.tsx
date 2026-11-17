import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default async function LocalizedSampleRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = routing.locales.includes(locale as 'en' | 'fr' | 'ar') ? locale : 'en';
  redirect(`/sample?locale=${safeLocale}`);
}
