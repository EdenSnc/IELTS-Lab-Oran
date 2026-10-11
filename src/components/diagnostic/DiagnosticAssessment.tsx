'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { DiagnosticReviewDto } from '@/lib/diagnostic/writing-service';
import type { DiagnosticWritingFeedback } from '@/lib/diagnostic/writing-core';
import { diagnosticAssessmentMessages } from '@/lib/diagnostic/assessment-messages';
import {diagnosticAnalysisMessages} from '@/lib/diagnostic/analysis-messages';
import { diagnosticErrorMessage, type DiagnosticLocale } from '@/lib/diagnostic/messages';
import { diagnosticRequest } from './diagnostic-request';
import styles from './diagnostic.module.css';
import DiagnosticSpeakingAnalysis from './DiagnosticSpeakingAnalysis';

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
export default function DiagnosticAssessment({ locale, sessionId, initial }: { locale: DiagnosticLocale; sessionId: string; initial: DiagnosticReviewDto }) {
  const m = diagnosticAssessmentMessages[locale];
  const analysisMessages=diagnosticAnalysisMessages[locale];
  const [view,setView] = useState(initial); const [busy,setBusy] = useState(false);
  const [writing,setWriting] = useState<DiagnosticWritingFeedback>(initial.assessment.writing ?? {
    criteria: (['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'] as const).map(criterion => ({ criterion, observation: '', evidence: [] })), nextSteps: [], limitations: [m.shortened],
  });
  const [writingRunId,setWritingRunId] = useState<string | null>(initial.assessment.writingRunId);
  const [speakingRunId,setSpeakingRunId]=useState<string|null>(initial.assessment.speakingRunId);
  const [speakingNextSteps,setSpeakingNextSteps]=useState(initial.assessment.speaking?.nextSteps??[]);
  const [speaking,setSpeaking] = useState(initial.assessment.speaking?.observations.join('\n') ?? '');
  const [speakingLimitations,setSpeakingLimitations] = useState(initial.assessment.speaking?.limitations.join('\n') ?? '');
  const [nextSteps,setNextSteps] = useState(initial.assessment.nextSteps.join('\n'));
  const [attest,setAttest] = useState(false); const [dirty,setDirty] = useState(false);
  const [error,setError] = useState<string>(); const [saved,setSaved] = useState(false);
  const endpoint = `/api/diagnostic/sessions/${sessionId}/assessment`;
  const names = { TASK_RESPONSE: m.taskResponse, COHERENCE_COHESION: m.coherence, LEXICAL_RESOURCE: m.vocabulary, GRAMMAR: m.grammar };
  const locked = view.assessment.state !== 'DRAFT';
  function change(action: () => void) { action(); setDirty(true); setSaved(false); setAttest(false); }
  async function act(action: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(undefined);
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'UNKNOWN'); } finally { setBusy(false); }
  }
  const errorText = error === 'ASSESSMENT_CONFLICT' ? m.conflict : error === 'ASSESSMENT_INCOMPLETE' || error === 'INVALID_RESPONSE' || error === 'INVALID_REQUEST' ? m.incomplete : diagnosticErrorMessage(locale,error);
  return <div className={styles.shell} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className={styles.header}><Link className={styles.brand} href={`/${locale}`} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={38} height={38} />IELTS Lab</Link></header>
    <main className={styles.container}><h1 className={styles.heroTitle}>{m.reviewTitle}</h1><p className={styles.meta}>{m.disclaimer}</p>
      {locked && <p role="status" className={styles.notice}>{m.released}</p>}
      <div className={styles.reviewList}>{view.assessment.rawScores.map(score => <p className={styles.reviewItem} key={score.skill}>{score.skill === 'LISTENING' ? m.listening : m.reading}: <span dir="ltr">{score.rawScore} / {score.maximumRawScore}</span></p>)}</div>
      <section className={styles.panel}><h2>{m.prompt}</h2><p className={styles.source} dir="ltr" lang="en">{view.prompt}</p><h2>{m.essay}</h2><p className={`${styles.source} ${styles.plainSource}`} dir="ltr" lang="en">{view.essay}</p></section>
      {!locked&&!view.aiAvailable&&<p className={styles.meta}>{m.failed}</p>}
      {!locked && <div className={styles.actions}><button className={styles.secondary} disabled={busy||!view.aiAvailable} onClick={() => { void act(async () => {
        await diagnosticRequest(endpoint,{ method: 'POST', body: JSON.stringify({ action: 'queueWriting' }) });
        setView(await diagnosticRequest<DiagnosticReviewDto>(endpoint));
      }); }}>{m.queue}</button><button className={styles.secondary} disabled={busy} onClick={() => { void act(async () => {
        // Refresh analysis only; never silently replace unsaved examiner edits.
        const fresh = await diagnosticRequest<DiagnosticReviewDto>(endpoint);
        setView(previous => ({ ...fresh, assessment: dirty ? previous.assessment : fresh.assessment }));
      }); }}>{m.refresh}</button>
        {view.run?.state === 'SUCCEEDED' && <button className={styles.secondary} disabled={busy} onClick={() => change(() => { setWriting(view.run!.feedback!); setWritingRunId(view.run!.id); })}>{m.apply}</button>}
      </div>}
      {view.run && ['QUEUED','RUNNING'].includes(view.run.state) && <p role="status" className={styles.meta}>{m.queued}</p>}
      {view.run?.state === 'FAILED' && <p role="status" className={styles.notice}>{m.failed}</p>}
      <DiagnosticSpeakingAnalysis locale={locale} sessionId={sessionId} locked={locked} assessmentBusy={busy} onApply={(runId,feedback)=>{
        if(busy||locked)return;change(()=>{
        setSpeakingRunId(runId);setSpeaking(feedback.observations.join('\n'));setSpeakingLimitations(feedback.limitations.join('\n'));setSpeakingNextSteps(feedback.nextSteps);
      });}}/>
      <form noValidate onSubmit={event => { event.preventDefault(); void act(async () => {
        const value = await diagnosticRequest<DiagnosticReviewDto['assessment']>(endpoint,{ method: 'POST', body: JSON.stringify({ action: 'save', expectedVersion: view.assessment.version,
          writing, writingRunId,speakingRunId, speaking: speaking.trim() ? { observations: lines(speaking), nextSteps: speakingNextSteps, limitations: lines(speakingLimitations) } : null, nextSteps: lines(nextSteps) }) });
        setView(previous => ({ ...previous, assessment: value })); setDirty(false); setSaved(true);
      }); }}>
        <fieldset className={styles.fieldset} disabled={busy || locked}><section className={styles.panel}><h2>{m.writing}</h2>
          {writing.criteria.map((item,index) => <div className={styles.feedbackItem} key={item.criterion}>
            <label className={styles.label} htmlFor={`criterion-${item.criterion}`}>{names[item.criterion]}</label>
            <textarea className={styles.input} id={`criterion-${item.criterion}`} rows={3} maxLength={1200} value={item.observation} onChange={event => change(() => setWriting(previous => ({ ...previous,
              criteria: previous.criteria.map((criterion,i) => i === index ? { ...criterion, observation: event.target.value } : criterion) })))}/>
            <label className={styles.label} htmlFor={`evidence-${item.criterion}`}>{m.evidence}</label>
            <textarea className={styles.input} id={`evidence-${item.criterion}`} rows={2} maxLength={755} dir="ltr" lang="en" value={item.evidence.join('\n')} onChange={event => change(() => setWriting(previous => ({ ...previous,
              criteria: previous.criteria.map((criterion,i) => i === index ? { ...criterion, evidence: event.target.value.split('\n').filter(Boolean) } : criterion) })))}/>
          </div>)}<label className={styles.label} htmlFor="writing-limits">{m.writingLimitations}</label><textarea className={styles.input} id="writing-limits" rows={3} maxLength={6005}
            value={writing.limitations.join('\n')} onChange={event => change(() => setWriting(previous => ({ ...previous, limitations: event.target.value.split('\n') })))}/>
        </section><section className={styles.panel}><h2>{m.speaking}</h2>
          {!locked&&speakingRunId&&<><p className={styles.meta}>{analysisMessages.humanOnlyHelp}</p><div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled={busy} onClick={()=>change(()=>{
              setSpeakingRunId(null);setSpeaking('');setSpeakingLimitations('');setSpeakingNextSteps([]);
            })}>{analysisMessages.humanOnly}</button></div></>}
          <label className={styles.label} htmlFor="speaking-observations">{m.speakingObservations}</label><textarea className={styles.input} id="speaking-observations" rows={4} maxLength={9608} value={speaking} onChange={event => change(() => setSpeaking(event.target.value))}/>
          <label className={styles.label} htmlFor="speaking-limits">{m.speakingLimitations}</label><textarea className={styles.input} id="speaking-limits" rows={3} maxLength={6005} value={speakingLimitations} onChange={event => change(() => setSpeakingLimitations(event.target.value))}/>
        </section><section className={styles.panel}><label className={styles.label} htmlFor="priority-next">{m.nextSteps}</label><textarea className={styles.input} id="priority-next" rows={3} maxLength={3603} value={nextSteps} onChange={event => change(() => setNextSteps(event.target.value))}/></section>
          <div className={styles.actions}><button className={styles.primary}>{m.save}</button></div>
        </fieldset>
      </form>
      {saved && <p role="status">{m.saved}</p>}{errorText && <p role="alert" className={styles.notice}>{errorText}</p>}
      {!locked && <section className={styles.panel}><p>{m.confirmHelp}</p><label className={styles.check}><input type="checkbox" checked={attest} disabled={busy || dirty} onChange={event => setAttest(event.target.checked)}/>{m.attest}</label>
        <div className={styles.actions}><button className={styles.primary} disabled={busy || dirty || !attest} onClick={() => { void act(async () => {
          const value = await diagnosticRequest<DiagnosticReviewDto['assessment']>(endpoint,{ method: 'POST', body: JSON.stringify({ action: 'release', expectedVersion: view.assessment.version, speakingConductedInPerson: attest }) });
          setView(previous => ({ ...previous, assessment: value })); setSaved(false);
        }); }}>{m.release}</button></div>
      </section>}
    </main>
  </div>;
}
