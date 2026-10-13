'use client';
import {useEffect,useState} from 'react';
import type {DiagnosticSpeakingReviewDto} from '@/lib/diagnostic/analysis-service';
import type {DiagnosticSpeakerAssignment,DiagnosticSpeakingAnalysis as Analysis} from '@/lib/diagnostic/analysis-core';
import type {DiagnosticSpeakingFeedback} from '@/lib/diagnostic/assessment-core';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
import {diagnosticAnalysisMessages} from '@/lib/diagnostic/analysis-messages';
import {diagnosticRequest} from './diagnostic-request';
import styles from './diagnostic.module.css';
export default function DiagnosticSpeakingAnalysis({locale,sessionId,locked,assessmentBusy,onApply}:{locale:DiagnosticLocale;sessionId:string;locked:boolean;assessmentBusy:boolean;
 onApply:(runId:string,feedback:DiagnosticSpeakingFeedback,ratings?:Analysis['readinessRatings'])=>void}){
 const m=diagnosticAnalysisMessages[locale],endpoint=`/api/diagnostic/sessions/${sessionId}/speaking/analysis`;
 const[view,setView]=useState<DiagnosticSpeakingReviewDto>(),[assignments,setAssignments]=useState<DiagnosticSpeakerAssignment[]>([]);
 const[busy,setBusy]=useState(false),[checked,setChecked]=useState(false),[error,setError]=useState<string>();
 const interactionBusy=busy||assessmentBusy;
 function accept(fresh:DiagnosticSpeakingReviewDto){setView(fresh);setAssignments(fresh.run?.output?.segments.map((segment,segmentIndex)=>({segmentIndex,speaker:segment.speaker}))??[]);setChecked(false);}
 useEffect(()=>{let active=true;void diagnosticRequest<DiagnosticSpeakingReviewDto>(endpoint).then(fresh=>{if(active)accept(fresh);}).catch(()=>{if(active)setError('LOAD');});return()=>{active=false;};},[endpoint]);
 async function act(action:()=>Promise<void>){if(interactionBusy)return;setBusy(true);setError(undefined);try{await action();}catch(failure){setError(failure instanceof Error?failure.message:'UNKNOWN');}finally{setBusy(false);}}
 const run=view?.run,output=run?.output,names={FLUENCY_COHERENCE:m.fluency,LEXICAL_RESOURCE:m.lexical,GRAMMAR:m.grammar,PRONUNCIATION:m.pronunciation};
 return<section className={styles.panel}><h2>{m.title}</h2><p className={styles.meta}>{m.help}</p>
  {!view?.available&&<p className={styles.meta}>{m.unavailable}</p>}
  {!locked&&<div className={styles.actions}><button className={styles.secondary} disabled={interactionBusy||!view?.available} onClick={()=>{void act(async()=>{
   await diagnosticRequest(endpoint,{method:'POST',body:JSON.stringify({action:'queue'})});accept(await diagnosticRequest<DiagnosticSpeakingReviewDto>(endpoint));
  });}}>{m.queue}</button><button className={styles.secondary} disabled={interactionBusy} onClick={()=>{void act(async()=>accept(await diagnosticRequest<DiagnosticSpeakingReviewDto>(endpoint)));}}>{m.refresh}</button></div>}
  {run&&['QUEUED','RUNNING'].includes(run.state)&&<p role="status">{m.queued}</p>}
  {output&&<>
   {view?.recordingId&&<audio className={styles.audio} controls preload="none" aria-label={m.replay} src={`/api/diagnostic/sessions/${sessionId}/speaking/recordings/${view.recordingId}`}/>}
   <div className={styles.reviewList}>{output.segments.map((segment,index)=><div className={styles.reviewItem} key={index}>
    <label className={styles.label} htmlFor={`speaker-${index}`}>{m.speaker} {index+1} <span dir="ltr">({(segment.startMs/1000).toFixed(1)}–{(segment.endMs/1000).toFixed(1)} s)</span></label>
    <select className={styles.input} id={`speaker-${index}`} value={assignments[index]?.speaker??segment.speaker} disabled={locked||interactionBusy||run?.reviewed} onChange={event=>{
     const speaker=event.target.value as DiagnosticSpeakerAssignment['speaker'];setChecked(false);setAssignments(previous=>previous.map((item,i)=>i===index?{...item,speaker}:item));
    }}><option value="CANDIDATE">{m.candidate}</option><option value="EXAMINER">{m.examiner}</option><option value="UNCERTAIN">{m.uncertain}</option></select>
    <p className={`${styles.source} ${styles.plainSource}`} lang="en" dir="ltr">{segment.text}</p>
   </div>)}</div>
   {output.criteria.map(criterion=><div className={styles.feedbackItem} key={criterion.criterion}><h3>{names[criterion.criterion]}</h3><p>{criterion.observation}</p>
    {criterion.evidence.map((evidence,index)=><p className={styles.meta} key={index} lang="en" dir="ltr">{(evidence.startMs/1000).toFixed(1)}–{(evidence.endMs/1000).toFixed(1)} s: “{evidence.quotation}”</p>)}</div>)}
   {!locked&&<><label className={styles.check}><input type="checkbox" checked={checked} disabled={interactionBusy||run?.reviewed} onChange={event=>setChecked(event.target.checked)}/>{m.confirm}</label>
    <div className={styles.actions}><button className={styles.secondary} disabled={interactionBusy||!checked||run?.reviewed} onClick={()=>{void act(async()=>{
      await diagnosticRequest(endpoint,{method:'POST',body:JSON.stringify({action:'review',runId:run!.id,expectedVersion:run!.version,assignments})});accept(await diagnosticRequest<DiagnosticSpeakingReviewDto>(endpoint));
    });}}>{m.review}</button><button className={styles.secondary} disabled={interactionBusy||!run?.reviewed} onClick={()=>{
      if(interactionBusy||locked)return;
      onApply(run!.id,{observations:output.criteria.map(item=>item.observation),nextSteps:output.priorities,limitations:output.limitations.slice(0,5)},output.readinessRatings);
    }}>{m.apply}</button></div>
   </>}
  </>}
  {(error||run?.state==='FAILED')&&<p role="alert" className={styles.notice}>{error==='INVALID_RESPONSE'?m.invalid:m.error}</p>}
 </section>;
}
