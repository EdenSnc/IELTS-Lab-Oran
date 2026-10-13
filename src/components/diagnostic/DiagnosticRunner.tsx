'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DiagnosticDeliverySection } from '@/lib/diagnostic/delivery-protocol';
import type { DiagnosticSessionDto } from '@/lib/diagnostic/protocol';
import { diagnosticMessages, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticAssessmentMessages } from '@/lib/diagnostic/assessment-messages';
import { diagnosticSpeakingMessages } from '@/lib/diagnostic/speaking-messages';
import { formatDiagnosticRemaining } from '@/lib/diagnostic/session-core';
import DiagnosticQuestions, { DiagnosticSource } from './DiagnosticQuestions';
import DiagnosticAudio from './DiagnosticAudio';
import DiagnosticImage from './DiagnosticImage';
import styles from './diagnostic.module.css';

export type DiagnosticSaveState = 'saved' | 'saving' | 'offline' | 'conflict';
export type DiagnosticRunnerProps = {
  locale: DiagnosticLocale;
  session: DiagnosticSessionDto;
  section: DiagnosticDeliverySection | null;
  sourceNumbers?: Record<string, number | null>;
  errorMessage?: string | null;
  onReconnect?: () => void;
  remainingSeconds: number;
  saveStates: Record<string, DiagnosticSaveState>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onReviewChange: (questionId: string, marked: boolean) => void;
  onSubmit: () => void;
  connection: 'online' | 'offline';
  blocked: boolean;
  submitting: boolean;
};

export default function DiagnosticRunner({ locale, session, section, sourceNumbers, errorMessage, onReconnect, remainingSeconds, saveStates, onAnswerChange, onReviewChange, onSubmit, connection, blocked, submitting }: DiagnosticRunnerProps) {
  const m = diagnosticMessages[locale];
  const [navigation, setNavigation] = useState({ sectionId: section?.id, index: 0 });
  const [confirming, setConfirming] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const groupHeading = useRef<HTMLHeadingElement | null>(null);
  const submitButton = useRef<HTMLButtonElement | null>(null);
  const confirmHeading = useRef<HTMLHeadingElement | null>(null);
  const shell = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (confirming) confirmHeading.current?.focus(); }, [confirming]);
  useEffect(() => { shell.current?.scrollTo({ top: 0 }); }, [section?.id]);
  const groups = section?.parts.flatMap((part) => part.questionGroups.map((group) => ({ part, group }))) ?? [];
  const index = navigation.sectionId === section?.id ? Math.min(navigation.index, Math.max(0, groups.length - 1)) : 0;
  const active = groups[index];
  const answers = Object.fromEntries(session.responses.map((response) => [response.questionId, response.answer]));
  const responses = Object.fromEntries(session.responses.map((response) => [response.questionId, response]));
  const unsavedIds = new Set(Object.entries(saveStates).filter(([, state]) => state !== 'saved').map(([id]) => id));
  for (const response of session.responses) {
    if (!response.savedAt && (response.answer || response.markedForReview)) unsavedIds.add(response.questionId);
  }
  const hasConflict = Object.values(saveStates).includes('conflict');
  const hasSaving = Object.values(saveStates).includes('saving');
  const received = session.state === 'SUBMITTED';
  const expired = session.window.stage === 'SUBMITTED';
  const mediaUnavailable = section?.parts.some(part => part.stimuli.some(stimulus => failedImages[stimulus.id])) ?? false;
  const readOnly = mediaUnavailable || blocked || hasConflict || submitting || received || expired || remainingSeconds <= 0 || section?.skill !== session.window.stage;
  const canSubmit = !received && !submitting && (expired || (!blocked && connection === 'online' && !hasConflict && !hasSaving && !unsavedIds.size));
  const title = session.window.stage === 'LISTENING' ? m.listening : session.window.stage === 'READING' ? m.reading : m.writing;
  const stageNumber = session.window.stage === 'LISTENING' ? 1 : session.window.stage === 'READING' ? 2 : 3;
  const globalSave = hasConflict ? m.conflict : connection === 'offline' ? m.offline : hasSaving ? m.saving
    : unsavedIds.size ? m.unacknowledged : session.responses.some((response) => response.savedAt) ? m.saved : m.noPending;

  function navigate(next: number) {
    setNavigation({ sectionId: section?.id, index: next });
    requestAnimationFrame(() => groupHeading.current?.focus());
  }
  function saveLabel(questionId: string) {
    const state = saveStates[questionId];
    if (state === 'saved' || (!state && responses[questionId]?.savedAt)) return m.saved;
    if (state === 'saving') return m.saving;
    if (state === 'offline') return m.offlineSave;
    if (state === 'conflict') return m.conflict;
    if (!responses[questionId]?.answer && !responses[questionId]?.markedForReview) return m.unanswered;
    return m.unacknowledged;
  }
  function submit() { if (canSubmit) onSubmit(); }

  return <div ref={shell} className={styles.shell} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className={styles.header}>
      <div className={styles.brand} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={34} height={34} /> IELTS Lab</div>
      {!received && <p className={styles.clock}>{m.remaining} <bdi>{formatDiagnosticRemaining(remainingSeconds)}</bdi> {m.minutes}</p>}
      <div className={styles.status} role="status" aria-live="polite"><span>{connection === 'online' ? m.online : m.offline}</span><span>{globalSave}</span></div>
    </header>
    {errorMessage && <div className={styles.recovery} role="alert"><p>{errorMessage}</p>
      <button type="button" className={styles.secondary} onClick={onReconnect}>{m.reconnect}</button></div>}
    <main className={styles.container}>
      {received ? <section className={styles.panel}><h1 className={styles.heroTitle}>{m.receipt}</h1><p>{m.receiptHelp}</p>
        {unsavedIds.size > 0 && <p role="alert" className={styles.notice}>{m.receiptPending} {m.unsaved}: {unsavedIds.size}</p>}
        <div className={styles.actions}><Link className={styles.secondary} href={`/${locale}/diagnostic/${session.id}/report`}>{diagnosticAssessmentMessages[locale].title}</Link></div>
        <div className={styles.actions}><Link className={styles.secondary} href={`/${locale}/diagnostic/${session.id}/speaking`}>{diagnosticSpeakingMessages[locale].title}</Link></div>
      </section>
        : <>
          {expired ? <section className={styles.panel}><h1 className={styles.heroTitle}>{m.timeEnded}</h1><p>{m.timeEndedHelp}</p></section> : <>
            <div className={styles.stageHeading}><p className={styles.meta}>{m.stage} {stageNumber} {m.of} 3</p><h1 className={styles.heroTitle}>{title}</h1></div>
            {blocked && <p role="alert" className={styles.notice}>{m.blocked}</p>}
            {!section || !active ? <p role="alert" className={styles.notice}>{m.unavailable}</p> : <>
              {section.skill === 'WRITING' && <p className={styles.notice}>{m.writingContext}</p>}
              {section.skill === 'LISTENING' && <DiagnosticAudio tracks={section.audioTracks} elapsedSeconds={1200 - remainingSeconds} locale={locale} enabled={!blocked && connection === 'online'} />}
              <div className={section.skill === 'READING' ? styles.split : undefined}>
                <section className={section.skill === 'READING' ? styles.passage : undefined} aria-label={section.skill === 'READING' ? m.passage : m.source}>
                  {active.part.stimuli.filter((s) => s.type !== 'AUDIO_TRACK').map((stimulus) => <div key={stimulus.id}>
                    {stimulus.title && <h2 lang="en" dir="ltr" className={styles.heading}>{stimulus.title}</h2>}
                    {stimulus.assetUrl && !stimulus.bodyHtml?.includes(stimulus.assetUrl) && <DiagnosticImage src={stimulus.assetUrl}
                      description={stimulus.title ?? stimulus.plainText ?? ''} locale={locale}
                      onAvailability={available => setFailedImages(previous => previous[stimulus.id] === !available ? previous : { ...previous, [stimulus.id]: !available })} />}
                    {stimulus.bodyHtml ? <DiagnosticSource html={stimulus.bodyHtml} /> : stimulus.plainText ? <p lang="en" dir="ltr" className={`${styles.source} ${styles.plainSource}`}>{stimulus.plainText}</p> : null}
                  </div>)}
                </section>
                <section className={styles.questionPane} aria-labelledby="diagnostic-group-heading">
                  <h2 id="diagnostic-group-heading" ref={groupHeading} tabIndex={-1} className={`${styles.heading} ${styles.focusTarget}`}>{m.group} {index + 1} {m.of} {groups.length}</h2>
                  {active.part.title && <p className={styles.source} lang="en" dir="ltr">{active.part.title}</p>}
                  <DiagnosticSource html={active.part.instructionsHtml} />
                  <DiagnosticQuestions key={active.group.id} group={active.group} answers={answers} disabled={readOnly} locale={locale} onAnswerChange={onAnswerChange} />
                  <section aria-label={m.reviews} className={styles.reviewList}>
                    {active.group.questions.map((question, qIndex) => <div key={question.id} className={styles.reviewItem}>
                      <label><input type="checkbox" disabled={readOnly} checked={responses[question.id]?.markedForReview ?? false}
                        aria-label={`${responses[question.id]?.markedForReview ? m.removeReview : m.review} · ${m.question} ${question.sourceNumber ?? qIndex + 1}`}
                        onChange={(event) => onReviewChange(question.id, event.target.checked)} />
                        {m.review} · {m.question} {question.sourceNumber ?? qIndex + 1}
                      </label><p className={styles.meta}>{saveLabel(question.id)}</p>
                    </div>)}
                  </section>
                  <nav className={styles.actions} aria-label={m.group}>
                    <button type="button" className={styles.secondary} disabled={index === 0} onClick={() => navigate(index - 1)}>{m.previous}</button>
                    <button type="button" className={styles.secondary} disabled={index >= groups.length - 1} onClick={() => navigate(index + 1)}>{m.next}</button>
                  </nav>
                </section>
              </div>
            </>}
          </>}
          <div className={styles.actions}><button ref={submitButton} type="button" className={styles.primary} disabled={submitting}
            onClick={() => setConfirming(true)}>{submitting ? m.submitting : m.submit}</button></div>
          {confirming && <section role="region" aria-labelledby="diagnostic-confirm" className={styles.confirmation}>
            <h2 id="diagnostic-confirm" tabIndex={-1} className={styles.heading} ref={confirmHeading}>{m.confirmTitle}</h2>
            <p>{m.confirmHelp}</p><p>{m.unsaved}: {unsavedIds.size}</p>
            {unsavedIds.size > 0 && <ul>{Array.from(unsavedIds).map((id) => {
              const question = groups.flatMap(({ group }) => group.questions).find((q) => q.id === id);
              return <li key={id}>{m.question} {question?.sourceNumber ?? sourceNumbers?.[id] ?? '—'} · {saveLabel(id)}</li>;
            })}</ul>}
            {!canSubmit && <p role="status" className={styles.notice}>{m.waitSave}</p>}
            <div className={styles.actions}><button type="button" className={styles.primary} disabled={!canSubmit} onClick={submit}>{submitting ? m.submitting : m.confirmSubmit}</button>
              <button type="button" className={styles.secondary} disabled={submitting} onClick={() => { setConfirming(false); requestAnimationFrame(() => submitButton.current?.focus()); }}>{m.cancel}</button></div>
          </section>}
        </>}
    </main>
  </div>;
}
