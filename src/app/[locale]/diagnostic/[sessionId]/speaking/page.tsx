import {notFound} from 'next/navigation';
import DiagnosticSpeakingStatus from '@/components/diagnostic/DiagnosticSpeakingStatus';
import {requireDiagnosticPageUser} from '@/lib/diagnostic/page-auth';
import {loadDiagnosticSpeakingStatus} from '@/lib/diagnostic/speaking-service';
import {loadDiagnosticWritingConsent} from '@/lib/diagnostic/ai-consent-service';
import {DiagnosticError} from '@/lib/diagnostic/protocol';
import type {DiagnosticLocale} from '@/lib/diagnostic/messages';
export default async function DiagnosticSpeakingPage({params}:{params:Promise<{locale:string;sessionId:string}>}){
  const {locale,sessionId}=await params;if(!['en','fr','ar'].includes(locale)||!/^[0-9a-f-]{36}$/iu.test(sessionId))notFound();
  const user=await requireDiagnosticPageUser(locale as DiagnosticLocale);let initial;
  try{initial=await loadDiagnosticSpeakingStatus({sessionId,userId:user.id});}catch(error){if(error instanceof DiagnosticError&&error.status===404)notFound();throw error;}
  const initialWriting=await loadDiagnosticWritingConsent({sessionId,userId:user.id});
  return <DiagnosticSpeakingStatus locale={locale as DiagnosticLocale} sessionId={sessionId} initial={initial} initialWriting={initialWriting}/>;
}
