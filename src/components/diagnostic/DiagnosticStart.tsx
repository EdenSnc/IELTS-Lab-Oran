'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DiagnosticIntro from './DiagnosticIntro';
import type { DiagnosticInvitationDto, DiagnosticSessionDto } from '@/lib/diagnostic/protocol';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticRequest } from './diagnostic-request';

export default function DiagnosticStart({ locale, invitations }: { locale: DiagnosticLocale; invitations: DiagnosticInvitationDto[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string>();
  async function start(id: string) {
    if (busy) return;
    const prior = invitations.find(invitation => invitation.id === id)?.sessionId;
    if (prior) { router.push(`/${locale}/diagnostic/${prior}`); return; }
    setBusy(true); setErrorCode(undefined);
    try {
      const { session } = await diagnosticRequest<{ session: DiagnosticSessionDto }>('/api/diagnostic/sessions',
        { method: 'POST', body: JSON.stringify({ invitationId: id, preflightConfirmed: true }) });
      router.push(`/${locale}/diagnostic/${session.id}`);
    } catch (error) { setErrorCode(error instanceof Error ? error.message : 'UNKNOWN'); setBusy(false); }
  }
  return <DiagnosticIntro locale={locale} invitations={invitations} ready busy={busy} errorCode={errorCode} onStart={start} />;
}
