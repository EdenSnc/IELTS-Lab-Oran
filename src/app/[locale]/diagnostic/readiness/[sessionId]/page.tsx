import { notFound } from 'next/navigation';
import { ReadinessRunner } from '@/components/diagnostic/ReadinessCandidate';
import { loadReadiness } from '@/lib/diagnostic/readiness-service';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
import { z } from 'zod';
import { DiagnosticError } from '@/lib/diagnostic/protocol';
export default async function Page({params}:{params:Promise<{locale:string;sessionId:string}>}){const {locale,sessionId}=await params;if(!['en','fr','ar'].includes(locale)||!z.uuid().safeParse(sessionId).success)notFound();const user=await requireDiagnosticPageUser(locale as DiagnosticLocale);let initial;try{initial=await loadReadiness({userId:user.id,sessionId});}catch(error){if(error instanceof DiagnosticError&&error.status===404)notFound();throw error;}return <ReadinessRunner locale={locale as DiagnosticLocale} initial={initial}/>;}
