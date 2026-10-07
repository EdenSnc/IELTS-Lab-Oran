'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {loadDiagnosticSpeaking} from '@/lib/diagnostic/speaking-service';
import {deriveDiagnosticSpeakingWindow} from '@/lib/diagnostic/speaking-core';
import {formatDiagnosticRemaining} from '@/lib/diagnostic/session-core';
import {diagnosticSpeakingMessages} from '@/lib/diagnostic/speaking-messages';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
import {diagnosticRequest} from './diagnostic-request';
import styles from './diagnostic.module.css';
type View=Awaited<ReturnType<typeof loadDiagnosticSpeaking>>;
export default function ExaminerDiagnostic({locale,sessionId,initial}:{locale:DiagnosticLocale;sessionId:string;initial:View}){
  const m=diagnosticSpeakingMessages[locale];const [view,setView]=useState(initial),[now,setNow]=useState(Date.parse(initial.serverNow));
  const [notes,setNotes]=useState(initial.notes),[dirty,setDirty]=useState(false),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string>();
  const endpoint=`/api/diagnostic/sessions/${sessionId}/speaking/staff`;
  useEffect(()=>{const server=Date.parse(view.serverNow),anchor=performance.now();const timer=setInterval(()=>setNow(server+performance.now()-anchor),500);return()=>clearInterval(timer);},[view.serverNow]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const phase=view.startedAt?deriveDiagnosticSpeakingWindow({startedAt:new Date(view.startedAt),now:new Date(Math.max(now,Date.parse(view.startedAt)))}):null;
  const names={PART_1:m.part1,PREPARATION:m.preparation,PART_2:m.part2,PART_3:m.part3,COMPLETE:m.unfinalized};
  async function act(action:()=>Promise<void>){if(busy)return;setBusy(true);setError(undefined);try{await action();}catch(failure){setError(failure instanceof Error?failure.message:'UNKNOWN');}finally{setBusy(false);}}
  async function change(body:unknown){const next=await diagnosticRequest<View>(endpoint,{method:'POST',body:JSON.stringify(body)});setView(next);setNow(Date.parse(next.serverNow));return next;}
  return <div className={styles.shell} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><header className={styles.header}>
    <Link className={styles.brand} href={`/${locale}`} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={38} height={38}/>IELTS Lab</Link>
    {view.state==='ACTIVE'&&phase&&<span className={styles.clock} aria-live="polite">{names[phase.stage]} · <span dir="ltr">{formatDiagnosticRemaining(phase.remainingSeconds)}</span></span>}
  </header><main className={styles.container}><h1 className={styles.heroTitle}>{m.title}</h1><p>{m.help}</p><p className={styles.meta}>{m.clockHelp}</p>
    <section className={styles.panel}><p role="status">{view.state==='COMPLETED'?m.completed:view.state==='ACTIVE'?m.active:m.notStarted}</p>
      <p className={styles.meta}>{m.human}</p><p className={styles.meta}>{m.capturePending}</p>
      <div className={styles.actions}>{view.state==='NOT_STARTED'&&<button className={styles.primary} disabled={busy} onClick={()=>{void act(async()=>{await change({action:'start'});});}}>{m.start}</button>}
        <button className={styles.secondary} disabled={busy} onClick={()=>{void act(async()=>{
          const fresh=await diagnosticRequest<View>(endpoint);setNow(Date.parse(fresh.serverNow));
          // Never replace unsaved notes or silently accept another examiner's revision.
          setView(previous=>dirty?{...fresh,version:previous.version}:fresh);if(!dirty)setNotes(fresh.notes);
        });}}>{m.status}</button>
      </div>
    </section><form noValidate onSubmit={event=>{event.preventDefault();void act(async()=>{await change({action:'notes',expectedVersion:view.version,notes});setDirty(false);setSaved(true);});}}>
      <section className={styles.panel}><label className={styles.label} htmlFor="examiner-notes">{m.notes}</label><textarea className={styles.essay} id="examiner-notes" maxLength={10000} value={notes}
        disabled={busy||view.state!=='ACTIVE'} onChange={event=>{setNotes(event.target.value);setDirty(true);setSaved(false);}}/>
        {view.state==='ACTIVE'&&<div className={styles.actions}><button className={styles.primary} disabled={busy||!dirty}>{m.save}</button></div>}
        {dirty&&<p className={styles.meta}>{m.unsaved}</p>}{saved&&<p role="status">{m.saved}</p>}{view.state==='COMPLETED'&&<p>{m.readonly}</p>}
      </section>
    </form>{error&&<p role="alert" className={styles.notice}>{error==='SPEAKING_CONFLICT'?m.conflict:m.error}</p>}
    {view.state==='ACTIVE'&&phase?.stage==='COMPLETE'&&<section className={styles.panel}><p>{m.unfinalized}</p><button className={styles.primary} disabled={busy||dirty} onClick={()=>{void act(async()=>{await change({action:'finish',expectedVersion:view.version});});}}>{m.finish}</button></section>}
    <div className={styles.actions}>{view.state==='COMPLETED'&&<Link className={styles.primary} href={`/${locale}/diagnostic/staff/${sessionId}`}>{m.review}</Link>}
      <Link className={styles.secondary} href={`/${locale}/diagnostic/staff`}>{m.back}</Link></div>
  </main></div>;
}
