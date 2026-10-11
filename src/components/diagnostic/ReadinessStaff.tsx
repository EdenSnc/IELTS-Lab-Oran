'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
import type { readinessStaffView } from '@/lib/diagnostic/readiness-service';
import type { ReadinessPack } from '@/lib/diagnostic/readiness-content';
import { readinessMessages } from '@/lib/diagnostic/readiness-messages';
import { readinessCsv } from '@/lib/diagnostic/readiness-csv';
import { readinessMarkingDraft } from '@/lib/diagnostic/readiness-client-core';
import {diagnosticAssessmentMessages} from '@/lib/diagnostic/assessment-messages';
import DiagnosticSpeakingAnalysis from './DiagnosticSpeakingAnalysis';
import { diagnosticRequest } from './diagnostic-request';
import styles from './readiness.module.css';
type Row=Awaited<ReturnType<typeof readinessStaffView>>[number];
type Mark={writing:number[];speaking:number[]|null;notes:string;decision:string;overrideReason:string;writingRunId?:string|null;speakingRunId?:string|null};
export default function ReadinessStaff({locale,sessionId}:{locale:DiagnosticLocale;sessionId?:string}){
 const m=readinessMessages[locale];const [rows,setRows]=useState<Row[]>([]);const [pack,setPack]=useState<ReadinessPack>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [confirmed,setConfirmed]=useState(false);const [filter,setFilter]=useState('');
 const [mark,setMark]=useState<Mark>({writing:[-1,-1,-1,-1],speaking:null,notes:'',decision:'',overrideReason:''});
 const row=rows[0];const root='/api/diagnostic/readiness/staff';
 const ai=diagnosticAssessmentMessages[locale];
 async function refreshAi(){setBusy(true);setError('');try{const v=await diagnosticRequest<{sessions:Row[]}>(`${root}?sessionId=${sessionId}`);setRows(prior=>v.sessions.map(r=>({...r,assessment:prior.find(p=>p.id===r.id)?.assessment??r.assessment})));}catch{setError(m.error);}finally{setBusy(false);}}
 useEffect(()=>{let live=true;diagnosticRequest<{sessions:Row[];pack?:ReadinessPack}>(`${root}${sessionId?`?sessionId=${sessionId}`:''}`).then(v=>{if(!live)return;setRows(v.sessions);setPack(v.pack??v.sessions[0]?.pack);
   const prior=v.sessions[0]?.assessment?.readiness as Mark|null;if(sessionId&&prior)setMark(readinessMarkingDraft(prior));}).catch(()=>{if(live)setError(m.error);});return()=>{live=false;};},[sessionId,m.error]);
 async function action(body:unknown){setBusy(true);setError('');try{await diagnosticRequest(root,{method:'POST',body:JSON.stringify(body)});setConfirmed(true);if(sessionId){const v=await diagnosticRequest<{sessions:Row[]}>(`${root}?sessionId=${sessionId}`);const aiOnly=!!body&&typeof body==='object'&&'action'in body&&body.action==='queueWriting';setRows(prior=>aiOnly?v.sessions.map(r=>({...r,assessment:prior.find(p=>p.id===r.id)?.assessment??r.assessment})):v.sessions);}}catch(e){setConfirmed(false);setError(e&&typeof e==='object'&&'status'in e&&e.status===400?m.ratingHelp:m.error);}finally{setBusy(false);}}
 async function invite(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);await action({action:'invite',email:form.get('email'),cohort:form.get('cohort')});}
 function save(release:boolean){if(mark.writing.some(n=>n<0)||mark.speaking?.some(n=>n<0)){setError(m.ratingHelp);return;}void action({action:'mark',sessionId,marking:{...mark,decision:mark.decision||null,expectedVersion:row.assessment?.version??0,release}});}
 function exportCsv(){const data=rows.filter(r=>!filter||r.cohort===filter).map(r=>({...r,...r.intake,...r.scores,decision:(r.assessment?.readiness as {decision?:string}|null)?.decision}));
   const url=URL.createObjectURL(new Blob([readinessCsv(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ieltslab-readiness.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function ratings(kind:'writing'|'speaking',rubric:ReadinessPack['writing']['rubric']){const values=mark[kind];if(!values)return null;
  return rubric.map((criterion,index)=><fieldset key={criterion.id} className={styles.question}><legend className={styles.label}>{criterion.label}</legend>
   <p className={styles.meta} lang="en" dir="ltr">{criterion.foundation}<br/>{criterion.conditional}<br/>{criterion.ready}</p>
   <select className={styles.input} value={values[index]} onChange={e=>{const next=[...values];next[index]=Number(e.target.value);setMark({...mark,[kind]:next});setConfirmed(false);}}><option value={-1}>—</option>{m.ratings.map((text,i)=><option key={i} value={i}>{text}</option>)}</select></fieldset>);}
 return <div className={styles.shell} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><main className={styles.container}><h1 className={styles.heroTitle}>{m.teacher}</h1><p>{m.internal}</p>
  <nav className={styles.resources}><Link target="_blank" href={`/${locale}/diagnostic/staff/readiness/print`}>{m.keys}</Link><Link href={`/${locale}/diagnostic/staff/readiness`}>{m.teacher}</Link></nav>
  {error&&<p role="alert" className={styles.notice}>{error}</p>}{confirmed&&<p role="status">{m.confirmed}</p>}
  {!sessionId?<><form className={styles.panel} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void action({action:'activate',keyReviewConfirmed:f.get('review')==='on'});}}><label className={styles.check}><input name="review" type="checkbox" required/>{m.reviewConfirm}</label><button className={styles.primary} disabled={busy}>{m.activate}</button></form>
   <form className={styles.panel} onSubmit={e=>void invite(e)}><h2>{m.invite}</h2><label className={styles.label}>{m.email}<input className={styles.input} name="email" type="email" required/></label><label className={styles.label}>{m.cohort}<input className={styles.input} name="cohort" defaultValue="CEIL_AUTUMN_2026" pattern="[A-Za-z0-9_-]{1,80}" required/></label><button className={styles.primary} disabled={busy}>{m.invite}</button></form>
   <div className={styles.actions}><select className={styles.input} aria-label={m.cohort} value={filter} onChange={e=>setFilter(e.target.value)}><option value="">{m.cohort}</option>{[...new Set(rows.map(r=>r.cohort))].map(c=><option key={c}>{c}</option>)}</select><button className={styles.secondary} onClick={exportCsv}>{m.export}</button></div>
   {!rows.length&&<p>{m.noRows}</p>}{rows.filter(r=>!filter||r.cohort===filter).map(r=><section key={r.id} className={styles.panel}><h2><Link href={`/${locale}/diagnostic/staff/readiness/${r.id}`}>{r.intake.name}</Link></h2><p>{r.intake.phone} · {r.cohort} · {r.intake.pathway} · {r.state}</p>{r.scores&&<p>{m.listening}: {r.scores.listening}/{r.scores.listeningMaximum} · {m.reading}: {r.scores.reading}/{r.scores.readingMaximum}</p>}</section>)}
  </>:row&&pack?<><section className={styles.panel}><h2>{row.intake.name}</h2><p>{row.intake.phone} · {row.intake.pathway} · {row.intake.targetBand} · {m.times[['UNDER_ONE_MONTH','ONE_TO_THREE_MONTHS','THREE_TO_SIX_MONTHS','LATER','UNSURE'].indexOf(row.intake.timeframe)]}</p><p>{m.listening}: {row.scores?.listening}/{row.scores?.listeningMaximum} · {m.reading}: {row.scores?.reading}/{row.scores?.readingMaximum}</p>{row.extension&&<p>{m.extension}: {row.scores?.extensionListening}/{row.scores?.extensionListeningMaximum} · {row.scores?.extensionReading}/{row.scores?.extensionReadingMaximum}</p>}<p>{row.cohort} · {row.completionSeconds===null?row.state:`${Math.round(row.completionSeconds/60)} min`}</p></section>
   <section className={styles.panel}><h2>{m.writing}</h2><p lang="en" dir="ltr">{pack.writing.prompt}</p><p className={styles.plainSource} lang="en" dir="ltr">{row.writing}</p></section>
   {row.state==='SUBMITTED'&&<section className={styles.panel}>
     <p className={styles.meta}>{ai.confirmHelp}</p>{!row.writingAi.available&&<p>{ai.failed}</p>}
     <div className={styles.actions}><button className={styles.secondary} disabled={busy||!row.writingAi.available||row.assessment?.state==='RELEASED'} onClick={()=>void action({action:'queueWriting',sessionId})}>{ai.queue}</button>
       <button className={styles.secondary} disabled={busy} onClick={()=>void refreshAi()}>{ai.refresh}</button>
       {row.writingAi.run?.feedback&&row.assessment?.state!=='RELEASED'&&<button className={styles.secondary} disabled={busy} onClick={()=>{
         const run=row.writingAi.run!;const feedback=run.feedback!;
         setMark(prior=>({...prior,writing:feedback.criteria.map(c=>c.rating),writingRunId:run.id,
           notes:[...feedback.criteria.map(c=>`${c.observation}${c.evidence.length?` (${c.evidence.join('; ')})`:''}`),...feedback.nextSteps,...feedback.limitations].join('\n').slice(0,4000)}));setConfirmed(false);
       }}>{ai.apply}</button>}
       {mark.writingRunId&&row.assessment?.state!=='RELEASED'&&<button className={styles.secondary} disabled={busy} onClick={()=>{setMark(prior=>({...prior,writingRunId:null,writing:[-1,-1,-1,-1],notes:'',decision:'',overrideReason:''}));setConfirmed(false);}}>{locale==='fr'?'Reprendre une évaluation écrite humaine':locale==='ar'?'إعادة تقييم الكتابة بواسطة المدرّس':'Use human-only Writing review'}</button>}
     </div>
     {row.writingAi.run&&['QUEUED','RUNNING'].includes(row.writingAi.run.state)&&<p role="status">{ai.queued}</p>}
     {row.writingAi.run?.state==='FAILED'&&<p role="status">{ai.failed}</p>}
     {row.writingAi.run?.feedback&&<div lang="en" dir="ltr">{row.writingAi.run.feedback.criteria.map(c=><p key={c.criterion}>{c.criterion}: {c.rating}/2 — {c.observation}</p>)}</div>}
   </section>}
   <details className={styles.panel} lang="en" dir="ltr"><summary>{m.speak}</summary><p>{pack.speaking.examinerInstructions}</p><h2>Familiar questions · 2 minutes</h2><ol>{pack.speaking.familiarQuestions.map(q=><li key={q}>{q}</li>)}</ol><h2>Preparation · 1 minute / long turn · 1½ minutes</h2><p>{pack.speaking.longTurn.instruction}</p><p>{pack.speaking.longTurn.prompt}</p><ul>{pack.speaking.longTurn.bullets.map(q=><li key={q}>{q}</li>)}</ul><h2>Follow-up · 2½ minutes</h2><ol>{pack.speaking.followUp.map(q=><li key={q}>{q}</li>)}</ol></details>
   {row.state==='SUBMITTED'&&<div className={styles.actions}><Link className={styles.secondary} target="_blank" href={`/${locale}/diagnostic/examiner/${row.id}`}>{m.speak}</Link></div>}
   {row.state==='SUBMITTED'&&<div className={styles.embedded}><DiagnosticSpeakingAnalysis locale={locale} sessionId={row.id} locked={row.assessment?.state==='RELEASED'} assessmentBusy={busy} onApply={(runId,feedback,ratings)=>{
     if(busy||!ratings||row.assessment?.state==='RELEASED')return;
     setMark(prior=>({...prior,speakingRunId:runId,speaking:[ratings.FLUENCY_COHERENCE??-1,ratings.LEXICAL_RESOURCE??-1,ratings.GRAMMAR??-1,prior.speaking?.[3]??-1],
       notes:[prior.notes,...feedback.observations,...feedback.nextSteps,...feedback.limitations].filter(Boolean).join('\n').slice(0,4000)}));setConfirmed(false);
   }}/></div>}
   <form className={styles.panel} onSubmit={e=>{e.preventDefault();save(false);}}><p>{m.ratingHelp}</p>{ratings('writing',pack.writing.rubric)}
    <label className={styles.check}><input type="checkbox" checked={mark.speaking!==null} onChange={e=>{setMark({...mark,speaking:e.target.checked?[-1,-1,-1,-1]:null,speakingRunId:null});setConfirmed(false);}}/>{m.speak}</label>{mark.speaking===null?<p>{m.unassessed}</p>:ratings('speaking',pack.speaking.rubric)}
    <label className={styles.label}>{m.notes}<textarea className={styles.essay} maxLength={4000} minLength={10} value={mark.notes} onChange={e=>{setMark({...mark,notes:e.target.value});setConfirmed(false);}} required/></label>
    <label className={styles.label}>{m.decision}<select className={styles.input} value={mark.decision} onChange={e=>{setMark({...mark,decision:e.target.value});setConfirmed(false);}}><option value="">{m.automatic}</option><option value="READY">{m.ready}</option><option value="CONDITIONAL">{m.conditional}</option><option value="FOUNDATION">{m.foundation}</option></select></label>
    <label className={styles.label}>{m.override}<textarea className={styles.input} maxLength={1500} value={mark.overrideReason} onChange={e=>{setMark({...mark,overrideReason:e.target.value});setConfirmed(false);}}/></label>
    <div className={styles.actionBar}><button className={styles.primary} disabled={busy||row.state!=='SUBMITTED'||row.assessment?.state==='RELEASED'}>{m.save}</button><button type="button" className={styles.secondary} disabled={busy||row.state!=='SUBMITTED'||row.assessment?.state==='RELEASED'} onClick={()=>save(true)}>{m.release}</button></div>
   </form></>:<p>{m.loading}</p>}
 </main></div>;
}
