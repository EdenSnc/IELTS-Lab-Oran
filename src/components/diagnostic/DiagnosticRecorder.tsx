'use client';
import {useEffect,useRef,useState} from 'react';
import type {loadDiagnosticSpeaking} from '@/lib/diagnostic/speaking-service';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
import {diagnosticSpeakingMessages} from '@/lib/diagnostic/speaking-messages';
import {diagnosticRecordingMessages} from '@/lib/diagnostic/recording-messages';
import {DiagnosticUploadQueue,diagnosticCaptureAllowed,diagnosticCaptureDisposition,diagnosticRecordingConsentAllowed,diagnosticRecordingRecovery,diagnosticUploadTransport,
  isDiagnosticRecordingDenied,prepareDiagnosticMicrophone,type DiagnosticCapture,type DiagnosticRecordingStatus} from '@/lib/diagnostic/recording-client';
import {diagnosticRequest} from './diagnostic-request';
import styles from './diagnostic.module.css';
type View=Awaited<ReturnType<typeof loadDiagnosticSpeaking>>;
type Mode='idle'|'preparing'|'prepared'|'capturing'|'stopped'|'human'|'discarded'|'ready';
type ErrorKey='microphone'|'silent'|'revoked'|'status'|'network'|'failure'|'buffer';
type Runtime={mic?:DiagnosticCapture;queue?:DiagnosticUploadQueue;controller?:AbortController;generation:number;
  polling?:ReturnType<typeof setInterval>;probe?:ReturnType<typeof setTimeout>;retry?:ReturnType<typeof setTimeout>;
  stopping?:Promise<void>;running:boolean;prepared:boolean;pollBusy:boolean};

export default function DiagnosticRecorder({locale,sessionId,view,now,busy,refresh,startSpeaking}:{locale:DiagnosticLocale;sessionId:string;
  view:View;now:number;busy:boolean;refresh:()=>Promise<View>;startSpeaking:()=>Promise<View>}){
  const m=diagnosticRecordingMessages[locale],speaking=diagnosticSpeakingMessages[locale];
  const endpoint=`/api/diagnostic/sessions/${sessionId}/speaking/recordings`;
  const [confirmed,setConfirmed]=useState(false),[mode,setMode]=useState<Mode>('idle'),[error,setError]=useState<ErrorKey>();
  const [working,setWorking]=useState(false),[recording,setRecording]=useState<DiagnosticRecordingStatus|null>(null);
  const [checked,setChecked]=useState(view.state==='NOT_STARTED'),[,update]=useState(0),[replay,setReplay]=useState(false);
  const [snapshot,setSnapshot]=useState<ReturnType<DiagnosticUploadQueue['snapshot']>>();
  const runtime=useRef<Runtime>({generation:0,running:false,prepared:false,pollBusy:false});
  const latest=useRef({view,now,refresh,startSpeaking});const mounted=useRef(false);
  useEffect(()=>{latest.current={view,now,refresh,startSpeaking};},[view,now,refresh,startSpeaking]);
  useEffect(()=>{
    mounted.current=true;const r=runtime.current;
    return()=>{mounted.current=false;r.generation++;clearInterval(r.polling);clearTimeout(r.probe);clearTimeout(r.retry);
      r.controller?.abort();r.mic?.discard();r.queue?.discard();r.mic=undefined;r.running=false;r.prepared=false;};
  },[]);
  // Only staff assigned to an ACTIVE/COMPLETED interview may read recordings.
  useEffect(()=>{
    if(checked||view.state==='NOT_STARTED')return;let cancelled=false;
    void diagnosticRequest<DiagnosticRecordingStatus|null>(endpoint).then(result=>{
      if(cancelled)return;setRecording(result);setChecked(true);
      if(result?.state==='READY')setMode('ready');
    }).catch(()=>{if(!cancelled){setError('status');setMode('human');}});
    return()=>{cancelled=true;};
  },[checked,endpoint,view.state]);

  function pulse(){if(mounted.current){setSnapshot(runtime.current.queue?.snapshot());update(value=>value+1);}}
  function discard(reason?:ErrorKey){
    const r=runtime.current;r.generation++;clearInterval(r.polling);clearTimeout(r.probe);clearTimeout(r.retry);
    r.controller?.abort();r.mic?.discard();r.queue?.discard();r.mic=undefined;r.running=false;r.prepared=false;
    if(mounted.current){setMode(reason==='revoked'||reason==='status'?'discarded':'human');setError(reason);setReplay(false);pulse();}
  }
  async function verified(preflight=false,saving=false){
    const fresh=await latest.current.refresh();
    if(!(saving?diagnosticRecordingConsentAllowed(fresh,Date.parse(fresh.serverNow)):diagnosticCaptureAllowed(fresh,Date.parse(fresh.serverNow),preflight)))throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:409});
    if(recording&&Date.parse(recording.expiresAt)<=Date.parse(fresh.serverNow))throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:409});
    return fresh;
  }
  function poll(){
    const r=runtime.current;if(r.pollBusy)return;r.pollBusy=true;const generation=r.generation;
    void latest.current.refresh().then(fresh=>{
      if(generation!==r.generation)return;
      const disposition=diagnosticCaptureDisposition(fresh,Date.parse(fresh.serverNow),recording?.expiresAt);
      if(disposition==='discard')discard('revoked');else if(disposition==='stop')void stop();
    }).catch(failure=>{if(generation===r.generation)discard(isDiagnosticRecordingDenied(failure)?'revoked':'status');})
      .finally(()=>{r.pollBusy=false;});
  }
  function beginPolling(){const r=runtime.current;clearInterval(r.polling);r.polling=setInterval(poll,5000);}
  function pump(){
    const r=runtime.current,q=r.queue;if(!q||q.snapshot().discarded)return;const generation=r.generation;
    void q.retry().then(()=>{if(generation===r.generation){pulse();setError(previous=>previous==='network'?undefined:previous);}}).catch(failure=>{
      if(generation!==r.generation)return;
      if(isDiagnosticRecordingDenied(failure)){discard('revoked');return;}
      setError('network');pulse();
      // One sequential retry attempt every two seconds while capturing; memory
      // is capped even during an outage. Explicit Retry remains after Stop.
      if(r.running&&!r.retry)r.retry=setTimeout(()=>{r.retry=undefined;pump();},2000);
    });
  }
  function stop():Promise<void>{
    const r=runtime.current;if(r.stopping)return r.stopping;
    r.running=false;r.prepared=false;clearInterval(r.polling);clearTimeout(r.probe);clearTimeout(r.retry);r.retry=undefined;
    const generation=r.generation;setMode('stopped');
    r.stopping=(async()=>{try{await r.mic?.stop();}catch{if(generation===r.generation)setError('failure');}
      finally{if(generation===r.generation){r.mic=undefined;r.queue?.stop();pulse();pump();}r.stopping=undefined;}})();return r.stopping;
  }
  async function prepare(){
    if(working||!confirmed||recording||!checked)return;setWorking(true);setError(undefined);setMode('preparing');
    const r=runtime.current;const generation=++r.generation;r.controller=new AbortController();
    try{
      await verified(true);if(generation!==r.generation)return;
      let activity=false;
      const mic=await prepareDiagnosticMicrophone({
        onActivity:()=>{activity=true;if(generation===r.generation){clearTimeout(r.probe);r.prepared=true;setMode('prepared');}},
        onSamples:samples=>{if(generation!==r.generation||!r.queue)return;
          try{r.queue.append(samples);pulse();pump();}catch(failure){setError(failure instanceof Error&&failure.message==='UPLOAD_BUFFER_FULL'?'buffer':'failure');void stop();}},
        onLimit:()=>{if(generation===r.generation)void stop();},
        onFailure:()=>{if(generation!==r.generation)return;r.running=false;r.prepared=false;r.mic=undefined;r.queue?.stop();
          clearInterval(r.polling);clearTimeout(r.probe);clearTimeout(r.retry);setMode(r.queue?'stopped':'human');setError('failure');pulse();}
      },r.controller.signal);
      if(generation!==r.generation){mic.discard();return;}r.mic=mic;beginPolling();
      if(!activity)r.probe=setTimeout(()=>{if(generation===r.generation)discard('silent');},3000);
    }catch(failure){if(generation===r.generation)discard(isDiagnosticRecordingDenied(failure)?'revoked':'microphone');}
    finally{if(mounted.current)setWorking(false);}
  }
  async function start(){
    const r=runtime.current;if(working||!confirmed||!r.prepared||!r.mic||recording)return;
    setWorking(true);setError(undefined);const generation=r.generation;
    try{
      let fresh=await verified(true);if(generation!==r.generation)return;
      if(fresh.state==='NOT_STARTED')fresh=await latest.current.startSpeaking();
      if(generation!==r.generation)return;
      if(!diagnosticCaptureAllowed(fresh,Date.parse(fresh.serverNow)))throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:409});
      const previous=await diagnosticRequest<DiagnosticRecordingStatus|null>(endpoint);
      if(generation!==r.generation)return;
      if(previous){setRecording(previous);discard();return;}
      const created=await diagnosticRequest<Omit<DiagnosticRecordingStatus,'chunks'>>(endpoint,{method:'POST',body:JSON.stringify({participantConfirmed:true})});
      if(generation!==r.generation)return;
      if(created.state!=='UPLOADING')throw new Error('RECORDING_CONFLICT');
      setRecording({...created,chunks:[]});setChecked(true);
      // Reconfirm consent after asynchronous storage/server creation; budget is
      // derived from the same server deadline, never a fresh seven minutes.
      fresh=await verified();if(generation!==r.generation)return;
      const remaining=Math.floor((Date.parse(fresh.deadline!)-Date.parse(fresh.serverNow))*16);
      if(remaining<=0)throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:409});
      r.queue=new DiagnosticUploadQueue(diagnosticUploadTransport(endpoint,created.id));r.running=true;r.prepared=false;
      r.mic.start(Math.min(6720000,remaining));setMode('capturing');beginPolling();pulse();
    }catch(failure){if(generation===r.generation)discard(isDiagnosticRecordingDenied(failure)?'revoked':'status');}
    finally{if(mounted.current)setWorking(false);}
  }
  async function retry(){
    if(working)return;setWorking(true);setError(undefined);
    try{await verified(false,true);await runtime.current.queue?.retry();pulse();}
    catch(failure){if(isDiagnosticRecordingDenied(failure))discard('revoked');else setError('network');}
    finally{if(mounted.current)setWorking(false);}
  }
  async function finish(){
    if(working||!recording)return;setWorking(true);setError(undefined);
    try{await verified(false,true);const q=runtime.current.queue;
      if(q){await q.finalize();setRecording(previous=>previous?{...previous,state:'READY',chunkCount:q.snapshot().chunkCount}:previous);}
      else{const recovery=diagnosticRecordingRecovery(recording);if(!recovery.canFinalize)throw new Error('RECORDING_INCOMPLETE');
        const ready=await diagnosticRequest<Omit<DiagnosticRecordingStatus,'chunks'>>(`${endpoint}/${recording.id}`,{method:'POST',body:JSON.stringify({chunkCount:recovery.chunkCount})});
        if(ready.state!=='READY')throw new Error('FINALIZE_NOT_ACKNOWLEDGED');setRecording({...ready,chunks:recording.chunks});}
      setMode('ready');pulse();
    }catch(failure){if(isDiagnosticRecordingDenied(failure))discard('revoked');else setError('network');}
    finally{if(mounted.current)setWorking(false);}
  }
  // Status changes cannot leave a prepared or active microphone running.
  useEffect(()=>{
    const r=runtime.current;
    if(!r.mic&&!r.queue)return;
    if(!view.adultAttested||!view.recordingConsented||view.privacyRevokedAt||!view.captureAvailable||!view.eligibility.canRecord){
      queueMicrotask(()=>discard('revoked'));return;
    }
    if(r.running&&(view.state!=='ACTIVE'||(view.deadline&&now>=Date.parse(view.deadline))))queueMicrotask(()=>{void stop();});
    if(recording&&now>=Date.parse(recording.expiresAt))queueMicrotask(()=>discard('revoked'));
    // Cleanup and status transitions intentionally use the current runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,now,recording]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{const r=runtime.current;if(r.running||r.queue?.snapshot().pending){event.preventDefault();event.returnValue='';}};
    const leave=(event:MouseEvent)=>{const target=event.target;if(!(target instanceof Element)||!target.closest('a[href]'))return;
      const r=runtime.current;if((r.running||r.queue?.snapshot().pending)&&!window.confirm(m.leave)){event.preventDefault();event.stopPropagation();}};
    const unload=()=>{const r=runtime.current;r.generation++;r.controller?.abort();r.mic?.discard();r.queue?.discard();};
    window.addEventListener('beforeunload',warn);window.addEventListener('pagehide',unload);document.addEventListener('click',leave,true);
    return()=>{window.removeEventListener('beforeunload',warn);window.removeEventListener('pagehide',unload);document.removeEventListener('click',leave,true);};
  },[m.leave]);

  const recovery=diagnosticRecordingRecovery(recording);
  const available=diagnosticCaptureAllowed(view,now,true)&&mode!=='discarded';
  const consentValid=diagnosticRecordingConsentAllowed(view,now,recording?.expiresAt);
  const canFinish=consentValid&&mode!=='capturing'&&mode!=='preparing'&&mode!=='prepared'&&mode!=='discarded'
    &&(snapshot? snapshot.stopped&&!snapshot.pending&&snapshot.acknowledged>0&&!snapshot.discarded&&!snapshot.ready:recovery.canFinalize);
  const ready=(mode==='ready'||recovery.ready)&&consentValid;
  return <section className={styles.panel} aria-label={m.title}><h2>{m.title}</h2>
    <p className={styles.meta}>{m.humanHelp}</p>
    {available&&!recording&&<label className={styles.check}><input type="checkbox" checked={confirmed} disabled={working||busy||mode==='capturing'}
      onChange={event=>{setConfirmed(event.target.checked);if(!event.target.checked)discard();}}/><span>{m.confirm}</span></label>}
    <p role="status" aria-live="polite">{mode==='preparing'?m.probe:mode==='prepared'?(view.state==='NOT_STARTED'?m.prepared:m.probe):mode==='capturing'?m.capturing:mode==='stopped'?m.stopped:ready?m.saved:m.idle}</p>
    {snapshot&&!snapshot.discarded&&<p className={styles.meta} aria-live="polite">{m.ack}: {snapshot.acknowledged} · {m.unsaved}: {snapshot.pending}</p>}
    {recording&&!snapshot&&!recovery.ready&&<><p className={styles.notice}>{m.recovery}</p>{!recovery.canFinalize&&<p>{m.unrecoverable}</p>}</>}
    {recording&&mode!=='capturing'&&<p className={styles.meta}>{m.partial}</p>}
    {error&&<p role="alert" className={styles.notice}>{m[error]}</p>}
    <div className={styles.actions}>
      {available&&!recording&&mode!=='prepared'&&mode!=='preparing'&&<button className={styles.secondary} disabled={!confirmed||working||busy||!checked} onClick={()=>{void prepare();}}>{m.prepare}</button>}
      {mode==='prepared'&&<button className={styles.primary} disabled={working||busy||!confirmed} onClick={()=>{void start();}}>{view.state==='NOT_STARTED'?m.start:m.startActive}</button>}
      {(mode==='capturing'||mode==='prepared'||mode==='preparing')&&<button className={styles.secondary} disabled={working&&mode!=='preparing'} onClick={()=>{if(mode==='capturing')void stop();else discard();}}>{m.stop}</button>}
      {mode==='stopped'&&!!snapshot?.pending&&<button className={styles.secondary} disabled={working||busy} onClick={()=>{void retry();}}>{m.retry}</button>}
      {canFinish&&<button className={styles.primary} disabled={working||busy} onClick={()=>{void finish();}}>{m.finish}</button>}
      {view.state==='NOT_STARTED'&&<button className={styles.primary} disabled={working||busy} onClick={()=>{discard();setWorking(true);
        void latest.current.startSpeaking().catch(()=>setError('status')).finally(()=>{if(mounted.current)setWorking(false);});}}>{speaking.start}</button>}
      {view.state!=='NOT_STARTED'&&!recording&&mode!=='human'&&<button className={styles.secondary} disabled={working} onClick={()=>discard()}>{m.human}</button>}
    </div>
    {ready&&recording&&<><button className={styles.secondary} onClick={()=>setReplay(value=>!value)}>{m.replay}</button>
      {replay&&<audio className={styles.audio} aria-label={m.replay} controls preload="none" src={`${endpoint}/${recording.id}`}/>}</>}
  </section>;
}
