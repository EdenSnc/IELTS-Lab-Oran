'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback,useEffect,useReducer,useRef,useState } from 'react';
import type { ReadinessDto } from '@/lib/diagnostic/readiness-service';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
import { readinessMessages } from '@/lib/diagnostic/readiness-messages';
import { DiagnosticAutosave } from '@/lib/diagnostic/client-core';
import { diagnosticRequest } from './diagnostic-request';
import DiagnosticAudio from './DiagnosticAudio';
import ReadinessWritingConsent from './ReadinessWritingConsent';
import { countDiagnosticWords } from '@/lib/diagnostic/answer-core';
import styles from './diagnostic.module.css';

function Brand(){return <div className={styles.brand} dir="ltr"><Image src="/ielts-lab-mark.svg" alt="" width={34} height={34}/> IELTS Lab</div>;}
type Invite={id:string;cohort:string|null;session:{id:string;state:string}|null};
export function ReadinessStart({locale}:{locale:DiagnosticLocale}){
 const router=useRouter();
 const m=readinessMessages[locale];const [invites,setInvites]=useState<Invite[]|null>(null);const [guest,setGuest]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;diagnosticRequest<{invitations:Invite[]}>('/api/diagnostic/readiness').then(v=>{if(live)setInvites(v.invitations);}).catch(e=>{if(live){setGuest(e?.status===401);setInvites([]);if(e?.status!==401)setError(m.error);}});return()=>{live=false;};},[m.error]);
 async function start(event:React.FormEvent<HTMLFormElement>,id:string){event.preventDefault();setBusy(true);setError('');const values=new FormData(event.currentTarget);
  try {const intake={name:String(values.get('name')),phone:String(values.get('phone')),pathway:values.get('pathway'),targetBand:Number(values.get('target')),timeframe:values.get('timeframe'),contactConsent:values.get('consent')==='on'};
   if(!values.get('audio')){setError(m.invalid);return;}
   const {session}=await diagnosticRequest<{session:ReadinessDto}>('/api/diagnostic/readiness',{method:'POST',body:JSON.stringify({invitationId:id,intake})});
   router.push(`/${locale}/diagnostic/readiness/${session.id}`);
  }catch(e){setError(e&&typeof e==='object'&&'status'in e&&e.status===400?m.invalid:m.error);}finally{setBusy(false);}}
 return <div className={styles.shell} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><header className={styles.header}><Brand/><Link href={`/${locale}`}>IELTSLab</Link></header><main className={`${styles.container} ${styles.intro}`}>
  <h1 className={styles.heroTitle}>{m.title}</h1><p>{m.intro}</p><p className={styles.meta}>{m.internal}</p><p>{m.core}</p><p>{m.speak}</p>
  <div className={styles.actions}><Link target="_blank" rel="noopener" href={`/${locale}/articles/academic-vs-general`}>{m.guide}</Link><Link target="_blank" href={`/${locale}/diagnostic/readiness/print`}>{m.print}</Link><a target="_blank" rel="noopener noreferrer" href="https://ielts.org/take-a-test/preparation-resources/sample-test-questions">{m.authentic}</a></div>
  {error&&<p role="alert" className={styles.notice}>{error}</p>}{invites===null?<p role="status">{m.loading}</p>:guest?<Link className={styles.primary} href={`/${locale}/auth/sign-in?next=${encodeURIComponent(`/${locale}/diagnostic/readiness`)}`}>{m.signin}</Link>:!invites.length?<p className={styles.notice}>{m.none}</p>:invites.map(i=>i.session?<div key={i.id} className={styles.panel}><p>{i.cohort}</p><Link className={styles.primary} href={`/${locale}/diagnostic/readiness/${i.session.id}`}>{m.resume}</Link></div>:<form key={i.id} className={styles.panel} noValidate onSubmit={e=>void start(e,i.id)}>
   <h2>{m.invitation} · {i.cohort}</h2><div className={styles.split}><label className={styles.label}>{m.name}<input className={styles.input} name="name" autoComplete="name" maxLength={100} required/></label><label className={styles.label}>{m.phone}<input className={styles.input} name="phone" type="tel" autoComplete="tel" placeholder="+213…" maxLength={24} required/></label></div>
   <label className={styles.label}>{m.pathway}<select className={styles.input} name="pathway"><option value="ACADEMIC">IELTS Academic</option><option value="GENERAL_TRAINING">IELTS General Training</option><option value="UNSURE">{m.unsure}</option></select></label>
   <div className={styles.split}><label className={styles.label}>{m.target}<select className={styles.input} name="target" defaultValue="6.5">{[4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9].map(n=><option key={n}>{n}</option>)}</select></label><label className={styles.label}>{m.timeframe}<select name="timeframe" className={styles.input}>{['UNDER_ONE_MONTH','ONE_TO_THREE_MONTHS','THREE_TO_SIX_MONTHS','LATER','UNSURE'].map((v,n)=><option key={v} value={v}>{m.times[n]}</option>)}</select></label></div>
   <label className={styles.check}><input type="checkbox" name="audio" required/>{locale==='fr'?'J’ai un casque ou des haut-parleurs qui fonctionnent et 42 à 51 minutes disponibles.':locale==='ar'?'لدي سماعات تعمل ووقت متاح من 42 إلى 51 دقيقة.':'I have working headphones or speakers and 42–51 minutes available.'}</label>
   <label className={styles.check}><input name="consent" type="checkbox" required/>{m.consent}</label><Link href={`/${locale}/privacy`} target="_blank">{m.privacy}</Link>
   <div className={styles.actions}><button disabled={busy} className={styles.primary}>{busy?m.loading:m.start}</button></div></form>)}
 </main></div>;
}

export function ReadinessRunner({locale,initial}:{locale:DiagnosticLocale;initial:ReadinessDto}){
 const m=readinessMessages[locale];const [,draw]=useReducer(n=>n+1,0);const [queue]=useState(()=>new DiagnosticAutosave(initial.responses,draw));
 const [session,setSession]=useState(initial);const [error,setError]=useState('');const [blocked,setBlocked]=useState(initial.state==='ACTIVE');const [busy,setBusy]=useState(false);const [seconds,setSeconds]=useState(initial.remainingSeconds);
 const [recovery,setRecovery]=useState<ReadinessDto['responses']>([]);
 const [closedRecovered,setClosedRecovered]=useState(false);
 const ref=useRef({token:'',live:false,hasTab:false,leaseReady:false,refreshing:false,session:initial,server:Date.parse(initial.serverNow),local:0});
 const root=`/api/diagnostic/readiness/${initial.id}`;const cacheKey=`readiness:${initial.id}:pending`;const tokenKey=`readiness:${initial.id}:writer`;
 const absorb=useCallback((s:ReadinessDto)=>{ref.current.session=s;ref.current.server=Date.parse(s.serverNow);ref.current.local=performance.now();queue.reconcile(s.responses);
  const active=new Set(s.writing?[s.writing.id]:Object.values(s.itemIds));const closed=queue.preserveClosedDrafts(active).map(r=>({...r,stableKey:s.responses.find(v=>v.questionId===r.questionId)!.stableKey}));
  if(closed.length){setClosedRecovered(true);setRecovery(prior=>[...new Map([...prior,...closed].map(r=>[r.questionId,r])).values()]);}
  setSession(s);setSeconds(s.remainingSeconds);},[queue]);
 useEffect(()=>{if(closedRecovered)try{sessionStorage.setItem(`${cacheKey}:closed`,JSON.stringify(recovery));}catch{/* The displayed copy remains available without storage. */}},[cacheKey,closedRecovered,recovery]);
 const flush=useCallback(async()=>{if(!ref.current.token||!ref.current.live||!ref.current.hasTab||!ref.current.leaseReady||ref.current.session.state!=='ACTIVE')return;
  try{await queue.flush(async draft=>{const {response}=await diagnosticRequest<{response:ReadinessDto['responses'][number]}>(root,{method:'POST',body:JSON.stringify({action:'save',token:ref.current.token,...draft})});return response;});if(!queue.hasPending)try{sessionStorage.removeItem(cacheKey);}catch{}setError('');}
  catch(e){setError(e&&typeof e==='object'&&'code'in e&&/CONFLICT|SECTION/u.test(String(e.code))?m.conflict:m.error);}
 },[m.conflict,m.error,queue,root,cacheKey]);
 const refresh=useCallback(async()=>{if(ref.current.refreshing||!ref.current.live||!ref.current.hasTab)return;ref.current.refreshing=true;
  try{await flush();const {session:s}=await diagnosticRequest<{session:ReadinessDto}>(root);if(!ref.current.live)return;absorb(s);
   if(s.state==='ACTIVE'){const {session:claimed}=await diagnosticRequest<{session:ReadinessDto}>(root,{method:'POST',body:JSON.stringify({action:'claim',token:ref.current.token})});if(!ref.current.live)return;absorb(claimed);ref.current.leaseReady=true;setBlocked(false);}else setBlocked(true);
   setError('');
  }catch(e){ref.current.leaseReady=false;setBlocked(true);setError(e&&typeof e==='object'&&'code'in e&&/CONFLICT/u.test(String(e.code))?m.conflict:m.error);}finally{ref.current.refreshing=false;}
 },[absorb,flush,m.conflict,m.error,root]);
 useEffect(()=>{
  const runtime=ref.current;runtime.live=true;runtime.local=performance.now();
  try{ref.current.token=sessionStorage.getItem(tokenKey)??'';}catch{/* In-memory lease still works. */}
  if(!ref.current.token){const bytes=crypto.getRandomValues(new Uint8Array(32));ref.current.token=btoa(String.fromCharCode(...bytes)).replace(/\+/gu,'-').replace(/\//gu,'_').replace(/=+$/u,'');try{sessionStorage.setItem(tokenKey,ref.current.token);}catch{}}
  async function initialise(){
   try{const {session:fresh}=await diagnosticRequest<{session:ReadinessDto}>(root);if(!runtime.live)return;absorb(fresh);
    try{const archived=JSON.parse(sessionStorage.getItem(`${cacheKey}:closed`)??'[]') as ReadinessDto['responses'];
     if(archived.length){setRecovery(archived.filter(r=>fresh.responses.some(v=>v.questionId===r.questionId)));setClosedRecovered(true);}
     const cached=JSON.parse(sessionStorage.getItem(cacheKey)??'[]') as ReadinessDto['responses'];
     for(const draft of cached){const known=fresh.responses.find(r=>r.questionId===draft.questionId);if(!known)continue;
      if(known.version===draft.version)queue.edit(draft.questionId,{answer:draft.answer,markedForReview:draft.markedForReview});
      else if(known.answer!==draft.answer){setRecovery(cached);setError(m.conflict);setBlocked(true);return;}}
    }catch{/* Corrupt optional local cache never authorizes an answer or resets time. */}
    absorb(fresh);await refresh();
   }catch{if(runtime.live)setError(m.error);}
  }
  let releaseLock:()=>void=()=>{};
  if(navigator.locks){void navigator.locks.request(`ieltslab-readiness:${initial.id}`,{ifAvailable:true},async lock=>{
    if(!runtime.live)return;if(!lock){setError(m.conflict);setBlocked(true);return;}
    runtime.hasTab=true;await initialise();await new Promise<void>(resolve=>{releaseLock=resolve;if(!runtime.live)resolve();});
  });}else{runtime.hasTab=true;void initialise();}
  const polling=setInterval(()=>void refresh(),15000);const saving=setInterval(()=>void flush(),1000);const clock=setInterval(()=>setSeconds(Math.max(0,runtime.session.remainingSeconds-Math.floor((performance.now()-runtime.local)/1000))),1000);
  const leaving=(e:BeforeUnloadEvent)=>{if(queue.hasPending){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',leaving);
  const online=()=>void refresh();window.addEventListener('online',online);
  return()=>{runtime.live=false;runtime.hasTab=false;runtime.leaseReady=false;releaseLock();clearInterval(polling);clearInterval(saving);clearInterval(clock);window.removeEventListener('beforeunload',leaving);window.removeEventListener('online',online);};
 },[cacheKey,tokenKey,initial.id,queue,refresh,flush,m.conflict,m.error,root,absorb]);
 const view=queue.view();const pending=queue.hasPending;
 function edit(id:string,value:string){queue.edit(id,{answer:value});try{sessionStorage.setItem(cacheKey,JSON.stringify(queue.view().responses.filter(r=>queue.view().saveStates[r.questionId]&&queue.view().saveStates[r.questionId]!=='saved')));}catch{setError(m.unsaved);}}
 async function finish(){setBusy(true);try{await flush();if(queue.hasPending)return;const {session:s}=await diagnosticRequest<{session:ReadinessDto}>(root,{method:'POST',body:JSON.stringify({action:'finish',token:ref.current.token})});absorb(s);}catch{setError(m.error);}finally{setBusy(false);}}
 const disabled=blocked||busy||seconds<=0;const report=session.report as {decision:string;notes:string}|null;
 const closedHelp=locale==='fr'?'La section s’est terminée avant l’enregistrement de ces brouillons. Ils ne sont pas inclus dans vos réponses enregistrées. Vous pouvez poursuivre le test et conserver cette copie pour en parler à votre enseignant.':locale==='ar'?'انتهى القسم قبل تأكيد حفظ هذه المسودات. لم تُدرج ضمن إجاباتك المحفوظة. يمكنك متابعة الاختبار والاحتفاظ بهذه النسخة لمناقشتها مع المدرّس.':'The section ended before these drafts were acknowledged. They were not included in your saved answers. You can continue the test and keep this copy to discuss with your teacher.';
 const title=session.stage.includes('LISTENING')?m.listening:session.stage.includes('READING')?m.reading:m.writing;
 return <div className={styles.shell} lang={locale} dir={locale==='ar'?'rtl':'ltr'}><header className={styles.header}><Brand/><p className={styles.clock}>{m.remaining}: <bdi>{Math.ceil(seconds/60)}</bdi></p><p role="status">{pending||recovery.length?m.unsaved:m.saved}</p></header><main className={styles.container}>
  {error&&<div role="alert" className={styles.notice}>{error}<div className={styles.actions}><button className={styles.secondary} onClick={()=>void refresh()}>{m.retry}</button></div></div>}
  {recovery.length>0&&<section className={styles.panel}><h2>{m.unsaved}</h2>{closedRecovered&&<p>{closedHelp}</p>}{recovery.map(d=><label key={d.questionId} className={styles.label}>{initial.responses.find(r=>r.questionId===d.questionId)?.stableKey}<textarea readOnly className={styles.input} value={d.answer}/></label>)}</section>}
  {session.state==='SUBMITTED'?<><section className={styles.panel}><h1 className={styles.heroTitle}>{report?m.result:m.confirmed}</h1><p>{m.internal}</p>{report?<><h2>{report.decision==='READY'?m.ready:report.decision==='FOUNDATION'?m.foundation:m.conditional}</h2>{report.decision==='FOUNDATION'&&<p>{m.foundationHelp}</p>}<p className={styles.plainSource}>{report.notes}</p></>:<p>{m.pending}</p>}</section><ReadinessWritingConsent locale={locale} sessionId={session.id}/></>:<>
   <h1 className={styles.heroTitle}>{title}</h1><p className={styles.meta}>{m.internal}</p><p>{m.phaseWait}</p>{session.stage.startsWith('EXTENSION')&&<p className={styles.notice}>{m.extensionHelp}</p>}
   {session.parts.some(p=>p.audio)&&<DiagnosticAudio locale={locale} enabled={!blocked} elapsedSeconds={(session.stage==='EXTENSION_LISTENING'?270:720)-seconds} tracks={session.parts.map(p=>({id:p.id,url:p.audio!,durationSeconds:p.audioSeconds??0}))}/>}
   {session.parts.map(part=><section key={part.id} className={styles.panel} lang="en" dir="ltr"><h2>{part.title}</h2><p>{part.instructions}</p><div className={part.text?styles.split:undefined}>{part.text&&<div className={`${styles.passage} ${styles.plainSource}`}>{part.text}</div>}<div className={styles.questions}>{part.items.map(q=>{const id=session.itemIds[q.id];const answer=view.responses.find(r=>r.questionId===id)?.answer??'';return <fieldset key={q.id} className={styles.question} disabled={disabled}><legend className={styles.label}>{q.number}. {q.prompt}</legend>{q.instructions&&<p className={styles.meta}>{q.instructions}</p>}{q.options?Object.entries(q.options).map(([label,text])=><label key={label} className={styles.option}><input type="radio" name={q.id} value={label} checked={answer===label} onChange={()=>edit(id,label)}/><span>{label}. {text}</span></label>):<input className={styles.input} aria-label={`${q.number}. ${q.prompt}`} value={answer} maxLength={100} spellCheck={false} autoComplete="off" onChange={e=>edit(id,e.target.value)}/>}</fieldset>;})}</div></div></section>)}
   {session.writing&&<section className={styles.panel}><div lang="en" dir="ltr"><h2>{session.writing.prompt}</h2><p>{session.writing.instructions}</p></div><label className={styles.label}>{m.writing}<textarea lang="en" dir="ltr" className={styles.essay} disabled={disabled} maxLength={20000} spellCheck={false} autoComplete="off" value={view.responses.find(r=>r.questionId===session.writing!.id)?.answer??''} onChange={e=>edit(session.writing!.id,e.target.value)}/></label><p className={styles.meta}>{countDiagnosticWords(view.responses.find(r=>r.questionId===session.writing!.id)?.answer??'')} / 160–200</p></section>}
   {['WRITING','EXTENSION_READING'].includes(session.stage)&&<button className={styles.primary} disabled={disabled||pending} onClick={()=>void finish()}>{busy?m.loading:m.finish}</button>}
  </>}
 </main></div>;
}
