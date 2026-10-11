'use client';
import {useEffect,useState} from 'react';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
import type {loadDiagnosticWritingConsent} from '@/lib/diagnostic/ai-consent-service';
import type {loadDiagnosticSpeakingStatus} from '@/lib/diagnostic/speaking-service';
import {readinessMessages} from '@/lib/diagnostic/readiness-messages';
import {diagnosticRequest} from './diagnostic-request';
import DiagnosticPrivacy from './DiagnosticPrivacy';
import styles from './readiness.module.css';
type Consent={writing:Awaited<ReturnType<typeof loadDiagnosticWritingConsent>>;speaking:Awaited<ReturnType<typeof loadDiagnosticSpeakingStatus>>};
export default function ReadinessWritingConsent({locale,sessionId}:{locale:DiagnosticLocale;sessionId:string}){
 const [value,setValue]=useState<Consent>(),[error,setError]=useState(false);
 useEffect(()=>{let live=true;Promise.all([
   diagnosticRequest<Consent['writing']>(`/api/diagnostic/sessions/${sessionId}/consent`),
   diagnosticRequest<Consent['speaking']>(`/api/diagnostic/sessions/${sessionId}/speaking`),
 ]).then(([writing,speaking])=>{if(live)setValue({writing,speaking});}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[sessionId]);
 if(error)return <p role="alert" className={styles.notice}>{readinessMessages[locale].error}</p>;
 return value?<div className={styles.embedded}><DiagnosticPrivacy locale={locale} sessionId={sessionId} initialWriting={value.writing} initialSpeaking={value.speaking} onSpeakingChange={()=>undefined}/></div>:null;
}
