'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { DiagnosticStaffOverview } from '@/lib/diagnostic/staff-service';
import { diagnosticMessages, diagnosticErrorMessage, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticRequest } from './diagnostic-request';
import { diagnosticAssessmentMessages } from '@/lib/diagnostic/assessment-messages';
import { diagnosticSpeakingMessages } from '@/lib/diagnostic/speaking-messages';
import styles from './diagnostic.module.css';

export default function DiagnosticStaff({ locale, initialOverview }: { locale: DiagnosticLocale; initialOverview: DiagnosticStaffOverview }) {
  const m = diagnosticMessages[locale];
  const [overview, setOverview] = useState(initialOverview);
  const [email, setEmail] = useState(''); const [blueprint, setBlueprint] = useState('');
  const [searched, setSearched] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>(); const [sent, setSent] = useState(false);
  const [revoking, setRevoking] = useState<string>(); const [reason, setReason] = useState('');
  async function refresh(search = false, selected = blueprint) {
    const query = new URLSearchParams(); if (search) query.set('email', email.trim()); if (selected) query.set('blueprintId', selected);
    const next = await diagnosticRequest<DiagnosticStaffOverview>(`/api/diagnostic/staff?${query}`);
    setOverview(next); if (search) setSearched(true);
  }
  async function act(action: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(undefined); setSent(false);
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'UNKNOWN'); }
    finally { setBusy(false); }
  }
  return <div className={styles.shell} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className={styles.header}><Link className={styles.brand} href={`/${locale}`} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={38} height={38} />IELTS Lab</Link></header>
    <main className={styles.container}><h1 className={styles.heroTitle}>{m.staffTitle}</h1><p className={styles.meta}>{m.staffHelp}</p>
      <section className={styles.panel}><form noValidate onSubmit={event => { event.preventDefault(); void act(() => refresh(true)); }}>
        <label className={styles.label} htmlFor="diagnostic-email">{m.email}</label><input id="diagnostic-email" className={styles.input} type="email" autoComplete="off" dir="ltr" value={email} onChange={event => { setEmail(event.target.value); setSearched(false); }} />
        <div className={styles.actions}><button className={styles.secondary} disabled={busy || !email.trim()}>{m.find}</button></div>
      </form>
        {searched && (overview.recipients[0] ? <p>{overview.recipients[0].name ?? overview.recipients[0].email}</p> : <p role="status">{m.noAccount}</p>)}
        <label className={styles.label} htmlFor="diagnostic-blueprint">{m.selectContent}</label><select className={styles.input} id="diagnostic-blueprint" value={blueprint} disabled={busy} onChange={event => {
          const selected = event.target.value; setBlueprint(selected); void act(() => refresh(searched, selected));
        }}>
          <option value="">{m.select}</option>{overview.blueprints.map(item => <option key={item.id} value={item.id}>{item.name}{item.ready === null ? '' : ` · ${item.ready ? m.contentReady : m.contentPending}`}</option>)}</select>
        {(!overview.blueprints.length || overview.blueprints.find(item => item.id === blueprint)?.ready === false) && <p className={styles.notice}>{m.notReady}</p>}
        <div className={styles.actions}><button className={styles.primary} disabled={busy || !searched || !overview.recipients.length || !overview.blueprints.some(item => item.id === blueprint && item.ready)} onClick={() => { void act(async () => {
          await diagnosticRequest('/api/diagnostic/invitations', { method: 'POST', body: JSON.stringify({ recipientId: overview.recipients[0].id, blueprintId: blueprint }) });
          await refresh(); setSearched(false); setSent(true);
        }); }}>{busy ? m.busy : m.invite}</button><code>/{locale}/diagnostic</code></div>
        {error && <p role="alert" className={styles.notice}>{diagnosticErrorMessage(locale, error)}</p>}{sent && <p role="status">{m.inviteSent}</p>}
      </section>
      <section className={styles.panel}><h2>{m.recentInvitations}</h2>{overview.invitations.map(item => <article className={styles.reviewItem} key={item.id}>
        <p>{item.recipient.name ?? item.recipient.email}</p><p className={styles.meta}>{item.session ? item.session.state === 'SUBMITTED' ? m.submittedStatus : m.used : item.revokedAt ? m.revoked : m.expires}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Africa/Algiers' }).format(new Date(item.expiresAt))}</p>
        {item.session?.state === 'SUBMITTED' && <Link className={styles.secondary} href={`/${locale}/diagnostic/staff/${item.session.id}`}>{diagnosticAssessmentMessages[locale].reviewTitle}</Link>}
        {item.session?.state === 'SUBMITTED' && <Link className={styles.secondary} href={`/${locale}/diagnostic/examiner/${item.session.id}`}>{diagnosticSpeakingMessages[locale].title}</Link>}
        {!item.session && !item.revokedAt && <button className={styles.secondary} disabled={busy} onClick={() => {
          setRevoking(item.id); setReason('');
        }}>{m.revoke}</button>}
        {revoking === item.id && <form noValidate onSubmit={event => { event.preventDefault(); void act(async () => {
          await diagnosticRequest(`/api/diagnostic/invitations/${item.id}`, { method: 'DELETE', body: JSON.stringify({ reason: reason.trim() }) });
          setRevoking(undefined); await refresh();
        }); }}><label className={styles.label} htmlFor="diagnostic-revoke-reason">{m.revokeReason}</label>
          <input id="diagnostic-revoke-reason" className={styles.input} value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} />
          <div className={styles.actions}><button className={styles.primary} disabled={busy || !reason.trim()}>{m.revoke}</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => setRevoking(undefined)}>{m.cancel}</button></div></form>}
      </article>)}</section>
    </main>
  </div>;
}
