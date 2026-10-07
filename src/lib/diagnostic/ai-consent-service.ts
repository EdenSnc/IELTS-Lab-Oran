import 'server-only';
import{Prisma}from'@prisma/client';
import{z}from'zod';
import{diagnosticNow,diagnosticTransaction,type DiagnosticTransaction}from'./content-service';
import{DiagnosticError}from'./protocol';
export function diagnosticAiAvailable(){return process.env.DIAGNOSTIC_AI_ENABLED==='true'&&process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED==='true';}
export async function assertDiagnosticWritingAiConsent(tx:DiagnosticTransaction,sessionId:string,consentVersion?:number){
 const row=await tx.diagnosticSession.findUnique({where:{id:sessionId},select:{writingAiAdultAttested:true,writingAiConsented:true,writingConsentVersion:true,writingAiRevokedAt:true,user:{select:{status:true}}}});
 if(!row||row.user.status!=='ACTIVE'||!row.writingAiAdultAttested||!row.writingAiConsented||row.writingAiRevokedAt
  ||(consentVersion!==undefined&&row.writingConsentVersion!==consentVersion))throw new DiagnosticError('AI_CONSENT_REQUIRED',409);
 return row.writingConsentVersion;
}
async function owned(tx:DiagnosticTransaction,input:{sessionId:string;userId:string}){
 const row=await tx.diagnosticSession.findFirst({where:{id:input.sessionId,userId:input.userId,user:{status:'ACTIVE'}}});
 if(!row)throw new DiagnosticError('NOT_FOUND',404);if(row.state!=='SUBMITTED')throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);return row;
}
function dto(row:{writingAiAdultAttested:boolean;writingAiConsented:boolean;writingConsentVersion:number;writingAiRevokedAt:Date|null}){
 return{adultAttested:row.writingAiAdultAttested,accepted:row.writingAiConsented,version:row.writingConsentVersion,
  revokedAt:row.writingAiRevokedAt?.toISOString()??null,available:diagnosticAiAvailable()};
}
export async function loadDiagnosticWritingConsent(input:{sessionId:string;userId:string}){return diagnosticTransaction(async tx=>dto(await owned(tx,input)));}
export async function saveDiagnosticWritingConsent(input:{sessionId:string;userId:string;adultAttested:boolean;accepted:boolean}){
 z.object({adultAttested:z.boolean(),accepted:z.boolean()}).strict().parse({adultAttested:input.adultAttested,accepted:input.accepted});
 if(input.accepted&&!input.adultAttested)throw new DiagnosticError('AI_CONSENT_REQUIRED',400);
 return diagnosticTransaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
  const row=await owned(tx,input);if(row.writingAiConsented===input.accepted&&row.writingAiAdultAttested===input.adultAttested)return dto(row);
  if(input.accepted&&row.writingAiRevokedAt)throw new DiagnosticError('AI_CONSENT_REQUIRED',409);
  const now=await diagnosticNow(tx),revoked=row.writingAiConsented&&!input.accepted;
  const saved=await tx.diagnosticSession.update({where:{id:row.id},data:{writingAiAdultAttested:input.adultAttested,writingAiConsented:input.accepted,
   writingConsentVersion:{increment:1},...(revoked?{writingAiRevokedAt:now}:{})}});
  if(row.writingAiConsented!==input.accepted)await tx.consentRecord.create({data:{userId:input.userId,type:'AI_ASSISTED_GRADING',action:input.accepted?'ACCEPTED':'WITHDRAWN',
   policyVersion:'diagnostic-writing-v1',acceptedFrom:`diagnostic-writing:${row.id}`,createdAt:now}});
  if(revoked)await tx.diagnosticWritingRun.updateMany({where:{sessionId:row.id},data:{state:'CANCELLED',feedback:Prisma.DbNull,leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'CONSENT_WITHDRAWN'}});
  return dto(saved);
 });
}
