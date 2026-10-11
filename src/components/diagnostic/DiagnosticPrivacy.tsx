'use client';
import{useState}from'react';
import type{loadDiagnosticSpeakingStatus}from'@/lib/diagnostic/speaking-service';
import type{loadDiagnosticWritingConsent}from'@/lib/diagnostic/ai-consent-service';
import type{DiagnosticLocale}from'@/lib/diagnostic/messages';
import{diagnosticSpeakingMessages}from'@/lib/diagnostic/speaking-messages';
import{diagnosticPrivacyMessages}from'@/lib/diagnostic/privacy-messages';
import{diagnosticRequest}from'./diagnostic-request';
import styles from'./diagnostic.module.css';
type Speaking=Awaited<ReturnType<typeof loadDiagnosticSpeakingStatus>>;
type Writing=Awaited<ReturnType<typeof loadDiagnosticWritingConsent>>;
export default function DiagnosticPrivacy({locale,sessionId,initialSpeaking,initialWriting,onSpeakingChange}:{locale:DiagnosticLocale;sessionId:string;initialSpeaking:Speaking;initialWriting:Writing;onSpeakingChange:(value:Speaking)=>void}){
 const m=diagnosticSpeakingMessages[locale],p=diagnosticPrivacyMessages[locale];
 const[speaking,setSpeaking]=useState(initialSpeaking),[writing,setWriting]=useState(initialWriting),[busy,setBusy]=useState(false),[saved,setSaved]=useState<'speaking'|'writing'>(),[error,setError]=useState(false);
 async function save(kind:'speaking'|'writing'){
  if(busy)return;setBusy(true);setSaved(undefined);setError(false);
  try{if(kind==='speaking'){
   const value=await diagnosticRequest<Speaking>(`/api/diagnostic/sessions/${sessionId}/speaking`,{method:'POST',body:JSON.stringify({adultAttested:speaking.adultAttested,recordingConsented:speaking.recordingConsented,aiConsented:speaking.aiConsented})});
   setSpeaking(value);onSpeakingChange(value);
  }else setWriting(await diagnosticRequest<Writing>(`/api/diagnostic/sessions/${sessionId}/consent`,{method:'POST',body:JSON.stringify({adultAttested:writing.adultAttested,accepted:writing.accepted})}));
  setSaved(kind);
  }catch{setError(true);}finally{setBusy(false);}
 }
 return<>
  <form noValidate onSubmit={event=>{event.preventDefault();void save('speaking');}}><section className={styles.panel}><h2>{m.consentTitle}</h2><p className={styles.meta}>{m.policy}</p><p className={styles.meta}>{p.provider}</p>
   <label className={styles.option}><input type="checkbox" checked={speaking.adultAttested} disabled={busy||!!speaking.privacyRevokedAt}
    onChange={event=>{setSaved(undefined);setSpeaking(value=>({...value,adultAttested:event.target.checked,...(!event.target.checked?{recordingConsented:false,aiConsented:false}:{})}));}}/><span>{m.adult}</span></label>
   <label className={styles.option}><input type="checkbox" checked={speaking.recordingConsented} disabled={busy||!!speaking.privacyRevokedAt||(!speaking.captureAvailable&&!speaking.recordingConsented)||!speaking.adultAttested}
    onChange={event=>{setSaved(undefined);setSpeaking(value=>({...value,recordingConsented:event.target.checked,...(!event.target.checked?{aiConsented:false}:{})}));}}/><span>{m.recording}</span></label>
   <label className={styles.option}><input type="checkbox" checked={speaking.aiConsented} disabled={busy||!!speaking.privacyRevokedAt||(!speaking.aiAvailable&&!speaking.aiConsented)||!speaking.recordingConsented}
    onChange={event=>{setSaved(undefined);setSpeaking(value=>({...value,aiConsented:event.target.checked}));}}/><span>{m.ai}</span></label>
   {speaking.privacyRevokedAt?<p>{p.withdrawn}</p>:<button className={styles.secondary} disabled={busy}>{m.saveConsent}</button>}
   {saved==='speaking'&&<p role="status">{m.consentSaved}</p>}
  </section></form>
  <form noValidate onSubmit={event=>{event.preventDefault();void save('writing');}}><section className={styles.panel}><h2>{p.writingTitle}</h2><p>{p.help}</p><p className={styles.meta}>{p.provider}</p>
   {!writing.available&&<p className={styles.meta}>{p.unavailable}</p>}
   <label className={styles.option}><input type="checkbox" checked={writing.adultAttested} disabled={busy||!!writing.revokedAt}
    onChange={event=>{setSaved(undefined);setWriting(value=>({...value,adultAttested:event.target.checked,...(!event.target.checked?{accepted:false}:{})}));}}/><span>{p.adult}</span></label>
   <label className={styles.option}><input type="checkbox" checked={writing.accepted} disabled={busy||!!writing.revokedAt||(!writing.available&&!writing.accepted)||!writing.adultAttested}
    onChange={event=>{setSaved(undefined);setWriting(value=>({...value,accepted:event.target.checked}));}}/><span>{p.writing}</span></label>
   {writing.revokedAt?<p>{p.withdrawn}</p>:<button className={styles.secondary} disabled={busy}>{p.save}</button>}
   {saved==='writing'&&<p role="status">{p.saved}</p>}
  </section></form>
  {error&&<p role="alert" className={styles.notice}>{m.error}</p>}
 </>;
}
