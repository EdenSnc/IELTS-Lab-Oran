import {z} from 'zod';
import {requirePrivilegedRequestUser} from '@/lib/auth/request-user';
import {noStoreJson} from '@/lib/http/api';
import {assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody} from '@/lib/diagnostic/http';
import {diagnosticSpeakerSchema} from '@/lib/diagnostic/analysis-core';
import {loadDiagnosticSpeakingReview,queueDiagnosticSpeakingAnalysis,publishDiagnosticSpeakingAnalysis,reviewDiagnosticSpeakingAnalysis} from '@/lib/diagnostic/analysis-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('queue')}).strict(),
  z.object({action:z.literal('review'),runId:z.uuid(),expectedVersion:z.number().int().nonnegative(),
    assignments:z.array(z.object({segmentIndex:z.number().int().min(0).max(299),speaker:diagnosticSpeakerSchema}).strict()).max(300)}).strict(),
]);
export async function GET(request:Request,context:Context){
  try{const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
    const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
    return noStoreJson(await loadDiagnosticSpeakingReview({sessionId,actorUserId:user.id}));
  }catch(error){return diagnosticApiError(error);}
}
export async function POST(request:Request,context:Context){
  try{assertSameOrigin(request);const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);
    const sessionId=diagnosticIdSchema.parse((await context.params).sessionId),body=await parseDiagnosticBody(request,schema,{maxBytes:24000});
    const input={sessionId,actorUserId:user.id};
    if(body.action==='review')return noStoreJson(await reviewDiagnosticSpeakingAnalysis({...input,...body}));
    const run=await queueDiagnosticSpeakingAnalysis(input);let signalPending=false;
    try{await publishDiagnosticSpeakingAnalysis(run.id);}catch{signalPending=true;}
    return noStoreJson({runId:run.id,state:run.state,signalPending},202);
  }catch(error){return diagnosticApiError(error);}
}
