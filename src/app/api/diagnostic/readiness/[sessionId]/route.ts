import { z } from 'zod';
import { requireRequestUser } from '@/lib/auth/request-user';
import { noStoreJson } from '@/lib/http/api';
import { assertSameOrigin,parseDiagnosticBody,diagnosticApiError,diagnosticIdSchema,responseBodySchema } from '@/lib/diagnostic/http';
import { loadReadiness,claimReadinessWriter,saveReadiness,finishReadiness } from '@/lib/diagnostic/readiness-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
export async function GET(request:Request,context:Context){try{const u=await requireRequestUser(request,['STUDENT']);const {sessionId}=await context.params;diagnosticIdSchema.parse(sessionId);
 return noStoreJson({session:await loadReadiness({sessionId,userId:u.id})});}catch(e){return diagnosticApiError(e);}}
export async function POST(request:Request,context:Context){try{assertSameOrigin(request);const u=await requireRequestUser(request,['STUDENT']);const {sessionId}=await context.params;diagnosticIdSchema.parse(sessionId);
 const token=z.string().regex(/^[A-Za-z0-9_-]{43}$/u);
 const body=await parseDiagnosticBody(request,z.discriminatedUnion('action',[
   z.object({action:z.literal('claim'),token}).strict(),z.object({action:z.literal('save'),token,...responseBodySchema.shape}).strict(),z.object({action:z.literal('finish'),token}).strict()
 ]),{maxBytes:90000});
 const input={...body,sessionId,userId:u.id};
 if(body.action==='save')return noStoreJson({response:await saveReadiness({...body,sessionId,userId:u.id})});
 return noStoreJson({session:body.action==='claim'?await claimReadinessWriter(input):await finishReadiness(input)});
 }catch(e){return diagnosticApiError(e);}}
