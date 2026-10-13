import { notFound } from 'next/navigation';
import DiagnosticStart from '@/components/diagnostic/DiagnosticStart';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import { listDiagnosticInvitations } from '@/lib/diagnostic/invitation-service';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';

export default async function DiagnosticPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!['en', 'fr', 'ar'].includes(locale)) notFound();
  const user = await requireDiagnosticPageUser(locale as DiagnosticLocale);
  return <DiagnosticStart locale={locale as DiagnosticLocale} invitations={await listDiagnosticInvitations(user.id)} />;
}
