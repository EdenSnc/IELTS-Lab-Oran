import { notFound } from 'next/navigation';
import ReadinessPrint from '@/components/diagnostic/ReadinessPrint';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{pathway?:string}>}){const {locale}=await params;const {pathway}=await searchParams;if(!['en','fr','ar'].includes(locale)||pathway&&!['ACADEMIC','GENERAL_TRAINING'].includes(pathway))notFound();await requireDiagnosticPageUser(locale as DiagnosticLocale,true);return <ReadinessPrint pathway={pathway==='GENERAL_TRAINING'?'GENERAL_TRAINING':'ACADEMIC'} examiner/>;}
