import { notFound } from 'next/navigation';
import ReadinessPrint from '@/components/diagnostic/ReadinessPrint';
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{pathway?:string}>}){const {locale}=await params;const {pathway}=await searchParams;if(!['en','fr','ar'].includes(locale)||pathway&&!['ACADEMIC','GENERAL_TRAINING'].includes(pathway))notFound();return <ReadinessPrint pathway={pathway==='GENERAL_TRAINING'?'GENERAL_TRAINING':'ACADEMIC'}/>;}
