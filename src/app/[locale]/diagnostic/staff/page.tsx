import { notFound } from 'next/navigation';
import DiagnosticStaff from '@/components/diagnostic/DiagnosticStaff';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import { loadDiagnosticStaffOverview } from '@/lib/diagnostic/staff-service';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function DiagnosticStaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!['en', 'fr', 'ar'].includes(locale)) notFound();
  const user = await requireDiagnosticPageUser(locale as DiagnosticLocale, true);
  return <DiagnosticStaff locale={locale as DiagnosticLocale} initialOverview={await loadDiagnosticStaffOverview(user.id)} />;
}
