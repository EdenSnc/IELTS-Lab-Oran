import { notFound } from 'next/navigation';
import { ReadinessStart } from '@/components/diagnostic/ReadinessCandidate';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!['en','fr','ar'].includes(locale))notFound();return <ReadinessStart locale={locale as DiagnosticLocale}/>;}
