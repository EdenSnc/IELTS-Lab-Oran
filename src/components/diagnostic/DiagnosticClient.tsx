'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { DiagnosticSessionDto, DiagnosticWriterDto } from '@/lib/diagnostic/protocol';
import { DIAGNOSTIC_WRITER_HEADER } from '@/lib/diagnostic/protocol';
import type { DiagnosticDeliverySection } from '@/lib/diagnostic/delivery-protocol';
import { DiagnosticAutosave } from '@/lib/diagnostic/client-core';
import { deriveDiagnosticWindow } from '@/lib/diagnostic/session-core';
import { diagnosticErrorMessage, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticRequest } from './diagnostic-request';
import DiagnosticRunner from './DiagnosticRunner';

export default function DiagnosticClient({ locale, initialSession, initialSection }: {
  locale: DiagnosticLocale; initialSession: DiagnosticSessionDto; initialSection: DiagnosticDeliverySection | null;
}) {
  const [, redraw] = useReducer(value => value + 1, 0);
  const [queue] = useState(() => new DiagnosticAutosave(initialSession.responses, redraw));
  const [session, setSession] = useState(initialSession);
  const [section, setSection] = useState(initialSection);
  const [blocked, setBlocked] = useState(initialSession.state !== 'SUBMITTED');
  const [connection, setConnection] = useState<'online' | 'offline'>('online');
  const [errorCode, setErrorCode] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef({ session: initialSession, section: initialSection,
    anchor: { server: Date.parse(initialSession.serverNow), local: 0 }, token: '', leaseUntil: 0,
    renewing: false, sending: false, loading: false, live: false, hasTab: false, nextSubmit: 0, nextContent: 0 });
  const [sourceNumbers, setSourceNumbers] = useState<Record<string, number | null>>(() => Object.fromEntries(
    (initialSection?.parts ?? []).flatMap(part => part.questionGroups.flatMap(group => group.questions.map(question => [question.id, question.sourceNumber])))));
  const root = `/api/diagnostic/sessions/${initialSession.id}`;
  const tokenKey = `diagnostic:${initialSession.id}:writer`;

  const estimatedNow = useCallback(() => ref.current.anchor.server + Math.max(0, performance.now() - ref.current.anchor.local), []);
  const absorb = useCallback((next: DiagnosticSessionDto) => {
    ref.current.session = next;
    ref.current.anchor = { server: Date.parse(next.serverNow), local: performance.now() };
    queue.reconcile(next.responses); setSession(next);
  }, [queue]);
  const recordLabels = useCallback((next: DiagnosticDeliverySection | null) => {
    const values = Object.fromEntries((next?.parts ?? []).flatMap(part => part.questionGroups.flatMap(group => group.questions.map(question => [question.id, question.sourceNumber]))));
    setSourceNumbers(previous => ({ ...previous, ...values }));
  }, []);
  const content = useCallback(async () => {
    if (ref.current.loading || !ref.current.live || performance.now() < ref.current.nextContent) return;
    ref.current.loading = true;
    ref.current.nextContent = performance.now() + 5000;
    try {
      const { section: next } = await diagnosticRequest<{ section: DiagnosticDeliverySection | null }>(`${root}/content`);
      if (!ref.current.live) return;
      ref.current.section = next; recordLabels(next); setSection(next);
    } catch (error) { if (ref.current.live) setErrorCode(error instanceof Error ? error.message : 'UNKNOWN'); }
    finally { ref.current.loading = false; }
  }, [root, recordLabels]);
  const flush = useCallback(async () => {
    if (!ref.current.live || !ref.current.hasTab || !ref.current.token || estimatedNow() >= ref.current.leaseUntil
      || ref.current.session.state === 'SUBMITTED') return;
    try {
      await queue.flush(async draft => {
        const { response } = await diagnosticRequest<{ response: DiagnosticSessionDto['responses'][number] }>(`${root}/responses`,
          { method: 'PUT', headers: { [DIAGNOSTIC_WRITER_HEADER]: ref.current.token }, body: JSON.stringify(draft) });
        return response;
      });
      if (ref.current.live) { setConnection('online'); setErrorCode(undefined); }
    } catch (error) {
      if (!ref.current.live) return;
      if (error instanceof TypeError) setConnection('offline');
      else { setErrorCode(error instanceof Error ? error.message : 'UNKNOWN'); setBlocked(true); }
    }
  }, [estimatedNow, queue, root]);
  const submit = useCallback(async (automatic = false) => {
    if (ref.current.sending || ref.current.session.state === 'SUBMITTED' || !ref.current.live) return;
    ref.current.sending = true; setSubmitting(true);
    try {
      if (!automatic) { await flush(); if (queue.hasPending) return; }
      const { session: next } = await diagnosticRequest<{ session: DiagnosticSessionDto }>(`${root}/submit`,
        { method: 'POST', headers: { [DIAGNOSTIC_WRITER_HEADER]: ref.current.token }, body: '{}' });
      if (ref.current.live) {
        absorb(next); setErrorCode(undefined); setBlocked(true);
        try { sessionStorage.removeItem(tokenKey); } catch { /* Optional tab storage must not turn a confirmed submission into an error. */ }
      }
    } catch (error) { if (ref.current.live) setErrorCode(error instanceof Error ? error.message : 'UNKNOWN'); }
    finally { ref.current.sending = false; if (ref.current.live) setSubmitting(false); }
  }, [absorb, flush, queue, root, tokenKey]);
  const reconnect = useCallback(async () => {
    if (ref.current.renewing || !ref.current.live || !ref.current.hasTab) return;
    ref.current.renewing = true;
    try {
      await flush();
      const window = deriveDiagnosticWindow({ startedAt: new Date(ref.current.session.startedAt), now: new Date(estimatedNow()) });
      if (ref.current.session.state === 'SUBMITTED') return;
      if (window.stage === 'SUBMITTED') { await submit(true); return; }
      const writer = await diagnosticRequest<DiagnosticWriterDto>(`${root}/writer`, { method: 'POST',
        body: JSON.stringify(ref.current.token ? { previousToken: ref.current.token } : {}) });
      if (!ref.current.live) return;
      ref.current.token = writer.writerToken; ref.current.leaseUntil = Date.parse(writer.expiresAt) - 500;
      try { sessionStorage.setItem(tokenKey, writer.writerToken); } catch { /* Storage is optional; server lease still protects editing. */ }
      absorb(writer.session); setBlocked(false); setConnection('online'); setErrorCode(undefined);
      await content(); await flush();
    } catch (error) {
      if (!ref.current.live) return;
      if (error instanceof TypeError) setConnection('offline');
      else { setBlocked(true); setErrorCode(error instanceof Error ? error.message : 'UNKNOWN'); }
    } finally { ref.current.renewing = false; }
  }, [absorb, content, estimatedNow, flush, root, submit, tokenKey]);

  useEffect(() => {
    const state = ref.current;
    state.live = true; state.anchor.local = performance.now();
    let active = true;
    try { state.token = sessionStorage.getItem(tokenKey) ?? ''; } catch { state.token = ''; }
    let releaseLock: (() => void) | undefined;
    let channel: BroadcastChannel | undefined;
    let channelTimer: ReturnType<typeof setTimeout> | undefined;
    const instance = crypto.randomUUID();
    // sessionStorage can be copied into a newly opened tab: don't let both reuse the same writer credential.
    const claim = () => { if (active && state.live) { state.hasTab = true; void reconnect(); } };
    if (navigator.locks) {
      // Defer until after StrictMode's setup/cleanup probe so its discarded effect
      // cannot claim the lock ahead of the live effect.
      queueMicrotask(() => {
        if (!active) return;
        void navigator.locks.request(`diagnostic:${initialSession.id}`, { ifAvailable: true }, async lock => {
          if (!lock) { if (active && state.live) { setBlocked(true); setErrorCode('WRITER_CONFLICT'); } return; }
          await new Promise<void>(resolve => { releaseLock = resolve; claim(); if (!active || !state.live) resolve(); });
        }).catch(() => { if (active) { setBlocked(true); setErrorCode('WRITER_CONFLICT'); } });
      });
    } else if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(`diagnostic:${initialSession.id}`);
      channel.onmessage = event => {
        if (event.data?.type === 'probe' && state.hasTab) channel?.postMessage({ type: 'occupied', target: event.data.instance });
        if (event.data?.type === 'occupied' && event.data.target === instance) {
          clearTimeout(channelTimer); setBlocked(true); setErrorCode('WRITER_CONFLICT');
        }
      };
      channel.postMessage({ type: 'probe', instance }); channelTimer = setTimeout(claim, 350);
    } else claim(); // Server lease and response revisions remain authoritative on older browsers.
    const tick = setInterval(() => {
      if (state.session.state === 'SUBMITTED') return;
      const window = deriveDiagnosticWindow({ startedAt: new Date(state.session.startedAt), now: new Date(Math.max(Date.parse(state.session.startedAt), estimatedNow())) });
      setSession(previous => previous.window.stage === window.stage && previous.window.remainingSeconds === window.remainingSeconds ? previous
        : { ...previous, window: { ...window, sectionDeadline: window.sectionDeadline?.toISOString() ?? null,
          absoluteDeadline: window.absoluteDeadline.toISOString() } });
      if (estimatedNow() >= state.leaseUntil) setBlocked(true);
      if (window.stage === 'SUBMITTED') {
        if (performance.now() >= state.nextSubmit) { state.nextSubmit = performance.now() + 10000; void submit(true); }
      } else if (state.section?.skill !== window.stage) void content();
    }, 250);
    const heartbeat = setInterval(() => { void reconnect(); }, 30000);
    const saving = setInterval(() => { void flush(); }, 1500);
    const online = () => { setConnection('online'); void reconnect(); };
    const offline = () => { setConnection('offline'); };
    const visible = () => { if (document.visibilityState === 'visible') void reconnect(); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (queue.hasPending) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    window.addEventListener('beforeunload', beforeUnload); document.addEventListener('visibilitychange', visible);
    return () => {
      active = false; state.live = false; state.hasTab = false; clearTimeout(channelTimer); channel?.close(); releaseLock?.();
      clearInterval(tick); clearInterval(heartbeat); clearInterval(saving);
      window.removeEventListener('online', online); window.removeEventListener('offline', offline);
      window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('visibilitychange', visible);
    };
  }, [content, estimatedNow, flush, initialSession.id, queue, reconnect, recordLabels, submit, tokenKey]);

  function edit(questionId: string, patch: { answer?: string; markedForReview?: boolean }) {
    const window = deriveDiagnosticWindow({ startedAt: new Date(session.startedAt), now: new Date(estimatedNow()) });
    if (window.stage === 'SUBMITTED' || blocked || !ref.current.hasTab || estimatedNow() >= ref.current.leaseUntil || section?.skill !== window.stage) return;
    queue.edit(questionId, patch);
  }
  const view = queue.view();
  const message = diagnosticErrorMessage(locale, errorCode);
  return <DiagnosticRunner locale={locale} session={{ ...session, responses: view.responses }} section={section}
      errorMessage={message} onReconnect={() => { void reconnect(); }}
      remainingSeconds={session.window.remainingSeconds} saveStates={view.saveStates}
      onAnswerChange={(id, answer) => edit(id, { answer })} onReviewChange={(id, markedForReview) => edit(id, { markedForReview })}
      onSubmit={() => { void submit(); }} connection={connection} blocked={blocked} submitting={submitting} sourceNumbers={sourceNumbers} />;
}
