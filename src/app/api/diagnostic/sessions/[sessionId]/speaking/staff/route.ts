import {z} from 'zod';
import {requirePrivilegedRequestUser} from '@/lib/auth/request-user';
import {noStoreJson} from '@/lib/http/api';
import {assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody} from '@/lib/diagnostic/http';
import {loadDiagnosticSpeaking,startDiagnosticSpeaking,saveDiagnosticSpeakingNotes,finishDiagnosticSpeaking} from '@/lib/diagnostic/speaking-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
const version=z.number().int().nonnegative();
const action=z.discriminatedUnion('action',[
  z.object({action:z.literal('start')}).strict(),
  z.object({action:z.literal('notes'),expectedVersion:version,notes:z.string().max(10000)}).strict(),
  z.object({action:z.literal('finish'),expectedVersion:version}).strict(),
]);
export async function GET(request:Request,context:Context){
  try{const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
    return noStoreJson(await loadDiagnosticSpeaking({sessionId,actorUserId:user.id}));}catch(error){return diagnosticApiError(error);}
}
export async function POST(request:Request,context:Context){
  try{assertSameOrigin(request);const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
    const body=await parseDiagnosticBody(request,action,{maxBytes:41000});const input={sessionId,actorUserId:user.id};
    if(body.action==='start')return noStoreJson(await startDiagnosticSpeaking(input));
    if(body.action==='notes')return noStoreJson(await saveDiagnosticSpeakingNotes({...input,notes:body.notes,expectedVersion:body.expectedVersion}));
    return noStoreJson(await finishDiagnosticSpeaking({...input,expectedVersion:body.expectedVersion}));
  }catch(error){return diagnosticApiError(error);}
}
