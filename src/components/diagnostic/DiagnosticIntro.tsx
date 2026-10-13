'use client';

import Image from 'next/image';
import Link from 'next/link';
import { readinessMessages } from '@/lib/diagnostic/readiness-messages';
import { useEffect, useRef, useState } from 'react';
import type { DiagnosticInvitationDto } from '@/lib/diagnostic/protocol';
import { diagnosticErrorMessage, diagnosticMessages, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import styles from './diagnostic.module.css';

export type DiagnosticIntroProps = {
  locale: DiagnosticLocale;
  invitations: DiagnosticInvitationDto[];
  ready: boolean;
  busy: boolean;
  errorCode?: string;
  onStart: (invitationId: string) => void;
};

export default function DiagnosticIntro({ locale, invitations, ready, busy, errorCode, onStart }: DiagnosticIntroProps) {
  const m = diagnosticMessages[locale];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tonePlayed, setTonePlayed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [toneError, setToneError] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  useEffect(() => () => {
    if (contextRef.current?.state !== 'closed') void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
  }, []);
  const selected = invitations.find((invitation) => invitation.id === selectedId)
    ?? invitations.find((invitation) => invitation.sessionId || invitation.status === 'AVAILABLE');
  const resumable = Boolean(selected?.sessionId);
  const eligible = resumable || selected?.status === 'AVAILABLE';
  const error = diagnosticErrorMessage(locale, errorCode);

  async function playTone() {
    setToneError(false); setPlaying(true); setConfirmed(false); setTonePlayed(false);
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (contextRef.current !== context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 440;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(.12, context.currentTime + .05);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + .65);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect(); gain.disconnect();
        if (contextRef.current === context) {
          contextRef.current = null; setPlaying(false); setTonePlayed(true);
        }
        if (context?.state !== 'closed') void context?.close().catch(() => {});
      };
      oscillator.start(); oscillator.stop(context.currentTime + .7);
    } catch {
      if (!context || contextRef.current === context) {
        contextRef.current = null; setPlaying(false); setToneError(true);
      }
      if (context?.state !== 'closed') void context?.close().catch(() => {});
    }
  }

  function statusLabel(invitation: DiagnosticInvitationDto) {
    if (invitation.sessionId || invitation.status === 'STARTED') return m.used;
    if (invitation.status === 'AVAILABLE') return m.available;
    if (invitation.status === 'REVOKED') return m.revoked;
    return m.expired;
  }

  return <div className={styles.shell} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className={styles.header}><div className={styles.brand} dir="ltr">
      <Image src="/ielts-lab-mark.svg" alt="" width={38} height={38} /> IELTS Lab
    </div></header>
    <main className={`${styles.container} ${styles.intro}`}>
      <div className={styles.actions}><Link className={styles.secondary} href={`/${locale}/diagnostic/readiness`}>{readinessMessages[locale].title} · 42 min · Academic / General Training</Link></div>
      <p className={styles.eyebrow}>{m.eyebrow}</p>
      <h1 className={styles.heroTitle}>{m.title}</h1>
      <p>{m.intro}</p><p className={styles.meta}>{m.conditions}</p>
      <section className={styles.panel} aria-labelledby="diagnostic-invitations">
        <h2 id="diagnostic-invitations">{m.invitations}</h2><p className={styles.meta}>{m.account}</p>
        {!invitations.length && <p>{m.noInvitations}</p>}
        {invitations.map((invitation, index) => <label key={invitation.id} className={styles.invitation}>
          <input type="radio" name="diagnostic-invitation" checked={selected?.id === invitation.id}
            disabled={busy || (!invitation.sessionId && invitation.status !== 'AVAILABLE')}
            onChange={() => setSelectedId(invitation.id)} />
          <span>{m.invitation} {index + 1} · {statusLabel(invitation)}<br />
            <span className={styles.meta}>{m.expires} <time dateTime={invitation.expiresAt}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(invitation.expiresAt))} UTC
            </time></span>
          </span>
        </label>)}
      </section>
      <section className={styles.panel} aria-labelledby="diagnostic-sound">
        <h2 id="diagnostic-sound">{m.soundTitle}</h2><p>{m.soundHelp}</p>
        <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy || playing} onClick={() => void playTone()}>
          {playing ? m.playingTone : m.playTone}
        </button></div>
        <label className={styles.check}><input type="checkbox" checked={confirmed} disabled={!tonePlayed || playing || busy}
          onChange={(event) => setConfirmed(event.target.checked)} />{m.heardTone}</label>
        {toneError && <p role="alert" className={styles.notice}>{m.toneFailed}</p>}
      </section>
      {!ready && !resumable && <p className={styles.notice}>{m.notReady}</p>}
      {error && <p role="alert" className={styles.notice}>{error}</p>}
      <div className={styles.actions}><button type="button" className={styles.primary}
        disabled={busy || (!resumable && !confirmed) || !eligible || (!ready && !resumable)}
        onClick={() => { if (selected && (resumable || confirmed) && eligible) onStart(selected.id); }}>
        {busy ? m.busy : resumable ? m.resume : m.start}
      </button></div>
    </main>
  </div>;
}
