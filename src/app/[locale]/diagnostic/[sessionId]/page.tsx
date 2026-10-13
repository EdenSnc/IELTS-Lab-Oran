import { notFound } from 'next/navigation';
import DiagnosticClient from '@/components/diagnostic/DiagnosticClient';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import { loadDiagnosticSession } from '@/lib/diagnostic/session-service';
import { loadDiagnosticDelivery } from '@/lib/diagnostic/delivery-service';
import { DiagnosticError } from '@/lib/diagnostic/protocol';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';

export default async function DiagnosticSessionPage({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, sessionId } = await params;
  if (!['en', 'fr', 'ar'].includes(locale) || !/^[0-9a-f-]{36}$/iu.test(sessionId)) notFound();
  const user = await requireDiagnosticPageUser(locale as DiagnosticLocale);
  let session;
  let section;
  try {
    const input = { sessionId, userId: user.id };
    session = await loadDiagnosticSession(input);
    section = await loadDiagnosticDelivery(input);
  } catch (error) { if (error instanceof DiagnosticError && error.status === 404) notFound(); throw error; }
  return <DiagnosticClient locale={locale as DiagnosticLocale} initialSession={session} initialSection={section} />;
}
