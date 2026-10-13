import { notFound } from 'next/navigation';
import DiagnosticAssessment from '@/components/diagnostic/DiagnosticAssessment';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import { loadDiagnosticReview } from '@/lib/diagnostic/writing-service';
import { DiagnosticError } from '@/lib/diagnostic/protocol';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function DiagnosticReviewPage({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, sessionId } = await params;
  if (!['en','fr','ar'].includes(locale) || !/^[0-9a-f-]{36}$/iu.test(sessionId)) notFound();
  const user = await requireDiagnosticPageUser(locale as DiagnosticLocale,true);
  let initial;
  try { initial = await loadDiagnosticReview({ sessionId, actorUserId: user.id }); }
  catch (error) { if (error instanceof DiagnosticError && error.status === 404) notFound(); throw error; }
  return <DiagnosticAssessment locale={locale as DiagnosticLocale} sessionId={sessionId} initial={initial}/>;
}
