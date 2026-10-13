import {z} from 'zod';
import {requireRequestUser} from '@/lib/auth/request-user';
import {noStoreJson} from '@/lib/http/api';
import {assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody} from '@/lib/diagnostic/http';
import {loadDiagnosticSpeakingStatus,saveDiagnosticSpeakingConsent} from '@/lib/diagnostic/speaking-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
const consent=z.object({adultAttested:z.boolean(),recordingConsented:z.boolean(),aiConsented:z.boolean()}).strict();
export async function GET(request:Request,context:Context){
  try{const user=await requireRequestUser(request,['STUDENT']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
    return noStoreJson(await loadDiagnosticSpeakingStatus({sessionId,userId:user.id}));}catch(error){return diagnosticApiError(error);}
}
export async function POST(request:Request,context:Context){
  try{assertSameOrigin(request);const user=await requireRequestUser(request,['STUDENT']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
    const body=await parseDiagnosticBody(request,consent,{maxBytes:2000});
    return noStoreJson(await saveDiagnosticSpeakingConsent({sessionId,userId:user.id,...body}));}catch(error){return diagnosticApiError(error);}
}
