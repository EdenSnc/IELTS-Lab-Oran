import{z}from'zod';
import{requirePrivilegedRequestUser}from'@/lib/auth/request-user';
import{noStoreJson}from'@/lib/http/api';
import{assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody}from'@/lib/diagnostic/http';
import{createDiagnosticRecording,loadDiagnosticRecording}from'@/lib/diagnostic/recording-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
export async function GET(request:Request,context:Context){try{
 const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
 return noStoreJson(await loadDiagnosticRecording({sessionId,actorUserId:user.id}));
}catch(error){return diagnosticApiError(error);}}
export async function POST(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
 const body=await parseDiagnosticBody(request,z.object({participantConfirmed:z.literal(true)}).strict(),{maxBytes:1000});
 return noStoreJson(await createDiagnosticRecording({sessionId,actorUserId:user.id,...body}));
}catch(error){return diagnosticApiError(error);}}
