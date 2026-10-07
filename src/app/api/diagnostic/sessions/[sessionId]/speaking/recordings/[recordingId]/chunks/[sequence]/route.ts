import{z}from'zod';
import{AuthError,requirePrivilegedRequestUser}from'@/lib/auth/request-user';
import{noStoreJson}from'@/lib/http/api';
import{assertSameOrigin,diagnosticApiError,diagnosticIdSchema}from'@/lib/diagnostic/http';
import{uploadDiagnosticChunk}from'@/lib/diagnostic/recording-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string;recordingId:string;sequence:string}>};
export async function PUT(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await requirePrivilegedRequestUser(request,['TEACHER','ADMIN']);const params=await context.params;
 const sessionId=diagnosticIdSchema.parse(params.sessionId),recordingId=diagnosticIdSchema.parse(params.recordingId);
 const sequence=Number(z.string().regex(/^(?:[0-9]|[1-8][0-9]|9[0-5])$/u).parse(params.sequence));
 if(!/^audio\/wav(?:\s*;|$)/iu.test(request.headers.get('content-type')??'')||!request.body)throw new AuthError('INVALID_REQUEST',400);
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>160044){await reader.cancel();throw new AuthError('INVALID_REQUEST',413);}chunks.push(value);}}finally{reader.releaseLock();}
 return noStoreJson(await uploadDiagnosticChunk({sessionId,actorUserId:user.id,recordingId,sequence,bytes:Buffer.concat(chunks)}));
}catch(error){return diagnosticApiError(error);}}
