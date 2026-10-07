import{z}from'zod';
import{requirePrivilegedRequestUser}from'@/lib/auth/request-user';
import{noStoreJson}from'@/lib/http/api';
import{assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody}from'@/lib/diagnostic/http';
import{finalizeDiagnosticRecording,readDiagnosticRecording}from'@/lib/diagnostic/recording-service';
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
 const headers=new Headers({'Content-Type':'audio/wav','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Length':String(bytes.length)});
 const range=request.headers.get('range');if(!range)return new Response(new Uint8Array(bytes),{headers});
 const match=/^bytes=(\d+)-(\d*)$/u.exec(range);const start=Number(match?.[1]),end=Math.min(match?.[2]?Number(match[2]):bytes.length-1,bytes.length-1);
 if(!match||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length){headers.set('Content-Range',`bytes */${bytes.length}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});}
 headers.set('Content-Range',`bytes ${start}-${end}/${bytes.length}`);headers.set('Content-Length',String(end-start+1));
 return new Response(new Uint8Array(bytes.slice(start,end+1)),{status:206,headers});
}catch(error){return diagnosticApiError(error);}}
