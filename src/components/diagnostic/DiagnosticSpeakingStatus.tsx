'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import type {loadDiagnosticSpeakingStatus} from '@/lib/diagnostic/speaking-service';
import {diagnosticSpeakingMessages} from '@/lib/diagnostic/speaking-messages';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
import {diagnosticRequest} from './diagnostic-request';
import styles from './diagnostic.module.css';
type View=Awaited<ReturnType<typeof loadDiagnosticSpeakingStatus>>;
export default function DiagnosticSpeakingStatus({locale,sessionId,initial}:{locale:DiagnosticLocale;sessionId:string;initial:View}){
  const m=diagnosticSpeakingMessages[locale];const [view,setView]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const endpoint=`/api/diagnostic/sessions/${sessionId}/speaking`;
  return <div className={styles.shell} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><header className={styles.header}><Link className={styles.brand} href={`/${locale}`} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={38} height={38}/>IELTS Lab</Link></header>
    <main className={styles.container}><h1 className={styles.heroTitle}>{m.title}</h1><p>{m.help}</p><section className={styles.panel}>
      <p role="status">{view.state==='COMPLETED'?m.completed:view.state==='ACTIVE'?m.active:m.notStarted}</p><p>{m.human}</p>
      <p className={styles.meta}>{m.capturePending}</p><p className={styles.meta}>{m.policy}</p>
      <button className={styles.secondary} disabled={busy} onClick={()=>{if(busy)return;setBusy(true);setError(false);void diagnosticRequest<View>(endpoint).then(setView).catch(()=>setError(true)).finally(()=>setBusy(false));}}>{m.status}</button>
      {error&&<p role="alert" className={styles.notice}>{m.error}</p>}
    </section><div className={styles.actions}><Link className={styles.secondary} href={`/${locale}/diagnostic/${sessionId}/report`}>{m.review}</Link><Link className={styles.secondary} href={`/${locale}/diagnostic`}>{m.back}</Link></div></main>
  </div>;
}
