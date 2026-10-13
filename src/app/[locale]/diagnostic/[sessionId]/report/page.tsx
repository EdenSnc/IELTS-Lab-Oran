import { notFound } from 'next/navigation';
import DiagnosticReport from '@/components/diagnostic/DiagnosticReport';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import { loadDiagnosticReport } from '@/lib/diagnostic/assessment-service';
import { DiagnosticError } from '@/lib/diagnostic/protocol';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function DiagnosticReportPage({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, sessionId } = await params;
  if (!['en','fr','ar'].includes(locale) || !/^[0-9a-f-]{36}$/iu.test(sessionId)) notFound();
  const user = await requireDiagnosticPageUser(locale as DiagnosticLocale);
  let report;
  try { report = await loadDiagnosticReport({ sessionId, userId: user.id }); }
  catch (error) { if (error instanceof DiagnosticError && error.status === 404) notFound(); throw error; }
  return <DiagnosticReport locale={locale as DiagnosticLocale} report={report}/>;
}
