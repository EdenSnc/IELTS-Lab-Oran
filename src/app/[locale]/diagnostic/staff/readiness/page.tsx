import { notFound } from 'next/navigation';
import ReadinessStaff from '@/components/diagnostic/ReadinessStaff';
import { requireDiagnosticPageUser } from '@/lib/diagnostic/page-auth';
import type { DiagnosticLocale } from '@/lib/diagnostic/messages';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!['en','fr','ar'].includes(locale))notFound();await requireDiagnosticPageUser(locale as DiagnosticLocale,true);return <ReadinessStaff locale={locale as DiagnosticLocale}/>;}
