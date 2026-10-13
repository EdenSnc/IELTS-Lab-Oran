import{z}from'zod';
import{requirePrivilegedRequestUser}from'@/lib/auth/request-user';
import{noStoreJson}from'@/lib/http/api';
import{assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody}from'@/lib/diagnostic/http';
import{finalizeDiagnosticRecording,readDiagnosticRecording}from'@/lib/diagnostic/recording-service';
import{diagnosticRecordingAudioResponse}from'@/lib/diagnostic/recording-http';
export const runtime='nodejs';export const maxDuration=60;
type Context={params:Promise<{sessionId:string;recordingId:string}>};
export async function POST(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const params=await context.params;
 const sessionId=diagnosticIdSchema.parse(params.sessionId),recordingId=diagnosticIdSchema.parse(params.recordingId);
 const body=await parseDiagnosticBody(request,z.object({chunkCount:z.number().int().min(1).max(96)}).strict(),{maxBytes:1000});
 return noStoreJson(await finalizeDiagnosticRecording({sessionId,recordingId,actorUserId:user.id,...body}));
}catch(error){return diagnosticApiError(error);}}
export async function GET(request:Request,context:Context){try{
 const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const params=await context.params;
 const sessionId=diagnosticIdSchema.parse(params.sessionId),recordingId=diagnosticIdSchema.parse(params.recordingId);
 const bytes=await readDiagnosticRecording({sessionId,recordingId,actorUserId:user.id});
 return diagnosticRecordingAudioResponse(bytes,request.headers.get('range'));
}catch(error){return diagnosticApiError(error);}}
