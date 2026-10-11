import{z}from'zod';
import{requireRequestUser}from'@/lib/auth/request-user';
import{noStoreJson}from'@/lib/http/api';
import{assertSameOrigin,diagnosticApiError,diagnosticIdSchema,parseDiagnosticBody}from'@/lib/diagnostic/http';
import{loadDiagnosticWritingConsent,saveDiagnosticWritingConsent}from'@/lib/diagnostic/ai-consent-service';
export const runtime='nodejs';
type Context={params:Promise<{sessionId:string}>};
export async function GET(request:Request,context:Context){try{
 const user=await requireRequestUser(request,['STUDENT']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
 return noStoreJson(await loadDiagnosticWritingConsent({sessionId,userId:user.id}));
}catch(error){return diagnosticApiError(error);}}
export async function POST(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await requireRequestUser(request,['STUDENT']);const sessionId=diagnosticIdSchema.parse((await context.params).sessionId);
 const body=await parseDiagnosticBody(request,z.object({adultAttested:z.boolean(),accepted:z.boolean(),provider:z.enum(['gemini','deepseek']).optional()}).strict(),{maxBytes:1000});
 return noStoreJson(await saveDiagnosticWritingConsent({sessionId,userId:user.id,...body}));
}catch(error){return diagnosticApiError(error);}}
