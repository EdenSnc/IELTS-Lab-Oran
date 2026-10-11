import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { assertSameOrigin,parseDiagnosticBody,diagnosticApiError } from '@/lib/diagnostic/http';
import { inviteReadiness,readinessStaffView,markReadiness } from '@/lib/diagnostic/readiness-service';
import { provisionReadinessPack } from '@/lib/diagnostic/readiness-provision';
import { loadReadinessPack } from '@/lib/diagnostic/readiness-content';
import { readinessMarkingSchema } from '@/lib/diagnostic/readiness-policy';
import {queueDiagnosticWriting,publishDiagnosticWriting} from '@/lib/diagnostic/writing-service';
export const runtime='nodejs';
export async function GET(request:Request){try{const u=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
 const id=new URL(request.url).searchParams.get('sessionId');if(id)z.uuid().parse(id);
 return noStoreJson({sessions:await readinessStaffView(u.id,id??undefined),pack:id?undefined:loadReadinessPack()});}catch(e){return diagnosticApiError(e);}}
export async function POST(request:Request){try{assertSameOrigin(request);const u=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
 const body=await parseDiagnosticBody(request,z.discriminatedUnion('action',[
  z.object({action:z.literal('activate'),keyReviewConfirmed:z.literal(true)}).strict(),
  z.object({action:z.literal('invite'),email:z.email(),cohort:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/u)}).strict(),
  z.object({action:z.literal('mark'),sessionId:z.uuid(),marking:readinessMarkingSchema}).strict()
  ,z.object({action:z.literal('queueWriting'),sessionId:z.uuid()}).strict()
 ]),{maxBytes:25000});
 if(body.action==='activate')return noStoreJson({content:await provisionReadinessPack(u.id,body.keyReviewConfirmed)});
 if(body.action==='queueWriting'){
  // This endpoint only grades this profile; never dispatch an old manifest through the readiness UI.
  await readinessStaffView(u.id,body.sessionId);
  const run=await queueDiagnosticWriting({sessionId:body.sessionId,actorUserId:u.id});
  let signalPending=false;try{await publishDiagnosticWriting(run.id);}catch{signalPending=true;}
  return noStoreJson({runId:run.id,state:run.state,signalPending});
 }
 if(body.action==='mark')return noStoreJson({assessment:await markReadiness({sessionId:body.sessionId,marking:body.marking,actorUserId:u.id})});
 const recipient=await prisma.user.findFirst({where:{email:body.email.trim().toLowerCase(),role:'STUDENT',status:'ACTIVE'},select:{id:true}});
 if(!recipient)return noStoreJson({error:'NOT_FOUND'},404);
 return noStoreJson({invitation:await inviteReadiness({actorUserId:u.id,recipientId:recipient.id,cohort:body.cohort})});
 }catch(e){return diagnosticApiError(e);}}
