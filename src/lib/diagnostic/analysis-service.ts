import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {GoogleGenAI} from '@google/genai';
import {Client} from '@upstash/qstash';
import {z} from 'zod';
import prisma from '@/lib/prisma';
import {qstashEndpoint} from '@/lib/qstash/verification';
import {assertDiagnosticExaminer,loadDiagnosticAssessment} from './assessment-service';
import {diagnosticNow,diagnosticTransaction,type DiagnosticTransaction} from './content-service';
import {diagnosticAiAvailable} from './ai-consent-service';
import {DiagnosticError} from './protocol';
import {readDiagnosticRecording} from './recording-service';
import {diagnosticRecordingStorage,type DiagnosticRecordingStorage} from './recording-storage';
import {parseDiagnosticWav} from './recording-core';
import {buildDiagnosticSpeakingPrompt,diagnosticSpeakingAnalysisSchema,validateDiagnosticSpeakingAnalysis,
  reviewDiagnosticSpeakerTurns,DIAGNOSTIC_SPEAKING_PROMPT_VERSION,type DiagnosticSpeakerAssignment} from './analysis-core';
import {READINESS_SPEAKING_PROMPT_VERSION,readinessSpeakingAnalysisSchema} from './analysis-core';
import {ensureReadinessWritingAssessment} from './readiness-service';
import type {ReadinessPack} from './readiness-content';
import {readinessPackHash} from './readiness-provision';

type Staff={sessionId:string;actorUserId:string};
const include={speaking:{include:{examiner:true,session:{include:{user:true,assessment:true}}}}} as const;
type Recording=Prisma.DiagnosticRecordingGetPayload<{include:typeof include}>;
function promptVersion(row:Recording){return row.speaking.session.readiness!==null?READINESS_SPEAKING_PROMPT_VERSION:DIAGNOSTIC_SPEAKING_PROMPT_VERSION;}
function inputHash(row:Recording){const values=[row.id,row.checksum,row.durationMs,row.consentVersion,promptVersion(row)];if(row.speaking.session.readiness!==null)values.push(row.speaking.session.manifestHash);return createHash('sha256').update(JSON.stringify(values)).digest('hex');}
function readinessRubric(row:Recording){
  if(row.speaking.session.readiness===null)return undefined;
  const s=row.speaking.session,m=s.manifest as unknown as {profile:string;pack:ReadinessPack;packHash:string};
  if(m.profile!=='IELTSLAB_READINESS_V2'||readinessPackHash(m)!==s.manifestHash||readinessPackHash(m.pack)!==m.packHash)throw new DiagnosticError('CONTENT_INTEGRITY',409);
  return m.pack.speaking.rubric;
}
function eligible(row:Recording,actorId:string,now:Date){
  const s=row.speaking;
  if(!s.adultAttested||!s.aiConsented||!s.recordingConsented||s.privacyRevokedAt||row.consentVersion!==s.consentVersion)
    throw new DiagnosticError('AI_CONSENT_REQUIRED',409);
  if(row.state!=='READY'||!row.checksum||!row.durationMs||row.expiresAt<=now)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
  if(s.state!=='COMPLETED')throw new DiagnosticError('SPEAKING_NOT_FINISHED',409);
  if(s.examinerId!==actorId||s.examiner?.status!=='ACTIVE'||!['ADMIN','TEACHER'].includes(s.examiner.role))throw new DiagnosticError('STAFF_REQUIRED',403);
  if(s.session.user.status!=='ACTIVE')throw new DiagnosticError('ACCOUNT_UNAVAILABLE',403);
  if(s.session.state!=='SUBMITTED'||(s.session.assessment?.state!=='DRAFT'&&!(s.session.readiness!==null&&!s.session.assessment)))throw new DiagnosticError('ASSESSMENT_RELEASED',409);
}
async function lockSession(tx:DiagnosticTransaction,sessionId:string){await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${sessionId}::uuid FOR UPDATE`;}
const erased={state:'CANCELLED',output:Prisma.DbNull,review:Prisma.DbNull,reviewedAt:null,reviewedById:null,leaseOwner:null,leaseExpiresAt:null} as const;
export async function queueDiagnosticSpeakingAnalysis(input:Staff){
  if(!diagnosticAiAvailable())throw new DiagnosticError('AI_UNAVAILABLE',503);
  const target=await diagnosticTransaction(tx=>assertDiagnosticExaminer(tx,input));
  if(target.readiness!==null)await ensureReadinessWritingAssessment(input);else await loadDiagnosticAssessment(input);
  return diagnosticTransaction(async tx=>{
    await lockSession(tx,input.sessionId);await assertDiagnosticExaminer(tx,input);
    const row=await tx.diagnosticRecording.findFirst({where:{speaking:{sessionId:input.sessionId}},include});
    if(!row)throw new DiagnosticError('RECORDING_INCOMPLETE',409);
    eligible(row,input.actorUserId,await diagnosticNow(tx));
    readinessRubric(row);
    return tx.diagnosticSpeakingRun.upsert({where:{recordingId_inputHash_promptVersion:{recordingId:row.id,inputHash:inputHash(row),promptVersion:promptVersion(row)}},
      update:{},create:{recordingId:row.id,createdById:input.actorUserId,consentVersion:row.consentVersion,inputHash:inputHash(row),promptVersion:promptVersion(row)}});
  });
}
export async function loadDiagnosticSpeakingReview(input:Staff){
  await diagnosticTransaction(tx=>assertDiagnosticExaminer(tx,input));
  return diagnosticTransaction(async tx=>{
    await lockSession(tx,input.sessionId);await assertDiagnosticExaminer(tx,input);
    const row=await tx.diagnosticRecording.findFirst({where:{speaking:{sessionId:input.sessionId}},include});
    if(!row)return{available:false,recordingId:null,run:null};
    let available=false;
    try{eligible(row,input.actorUserId,await diagnosticNow(tx));available=diagnosticAiAvailable();}
    catch(error){if(!(error instanceof DiagnosticError))throw error;return{available:false,recordingId:null,run:null};}
    const run=await tx.diagnosticSpeakingRun.findFirst({where:{recordingId:row.id},orderBy:{createdAt:'desc'}});
    const output=run?.state==='SUCCEEDED'?validateDiagnosticSpeakingAnalysis(run.output,{durationMs:row.durationMs!,hasAudio:true,readiness:run.promptVersion===READINESS_SPEAKING_PROMPT_VERSION}):null;
    return{available,recordingId:row.id,run:run?{id:run.id,state:run.state,version:run.version,model:run.model,
      errorCode:run.errorCode,reviewed:!!run.reviewedAt,output:output&&run.reviewedAt?reviewDiagnosticSpeakerTurns(output,run.review as DiagnosticSpeakerAssignment[]):output}:null};
  });
}
export type DiagnosticSpeakingReviewDto=Awaited<ReturnType<typeof loadDiagnosticSpeakingReview>>;
export async function reviewDiagnosticSpeakingAnalysis(input:Staff&{runId:string;expectedVersion:number;assignments:DiagnosticSpeakerAssignment[]}){
  return diagnosticTransaction(async tx=>{
    await lockSession(tx,input.sessionId);await assertDiagnosticExaminer(tx,input);
    const run=await tx.diagnosticSpeakingRun.findUnique({where:{id:input.runId},include:{recording:{include}}});
    if(!run||run.recording.speaking.sessionId!==input.sessionId)throw new DiagnosticError('NOT_FOUND',404);
    eligible(run.recording,input.actorUserId,await diagnosticNow(tx));
    if(run.state!=='SUCCEEDED'||run.version!==input.expectedVersion)throw new DiagnosticError('ASSESSMENT_CONFLICT',409);
    try{reviewDiagnosticSpeakerTurns(validateDiagnosticSpeakingAnalysis(run.output,{durationMs:run.recording.durationMs!,hasAudio:true,readiness:run.promptVersion===READINESS_SPEAKING_PROMPT_VERSION}),input.assignments);}
    catch{throw new DiagnosticError('INVALID_RESPONSE',400);}
    const result=await tx.diagnosticSpeakingRun.update({where:{id:run.id},data:{review:input.assignments,reviewedById:input.actorUserId,reviewedAt:await diagnosticNow(tx),version:{increment:1}}});
    await tx.staffActionAudit.create({data:{actorUserId:input.actorUserId,action:'DIAGNOSTIC_SPEAKER_REVIEWED',targetType:'DiagnosticSpeakingRun',targetId:run.id,reason:'Examiner checked the audio and speaker attribution'}});
    return{version:result.version};
  });
}
export const diagnosticSpeakingJobSchema=z.object({version:z.literal(1),type:z.literal('DIAGNOSTIC_SPEAKING'),runId:z.uuid()}).strict();
type Publisher=(body:z.infer<typeof diagnosticSpeakingJobSchema>)=>Promise<unknown>;
const publishJob:Publisher=async body=>{
  if(!process.env.QSTASH_TOKEN)throw new Error('QSTASH_NOT_CONFIGURED');
  await new Client({token:process.env.QSTASH_TOKEN}).publishJSON({url:qstashEndpoint('/api/internal/diagnostic/speaking'),body,retries:5,timeout:'120s',
    deduplicationId:`diagnostic-speaking-${body.runId}-${Date.now()}`,label:['diagnostic-speaking'],
    flowControl:{key:'gemini-diagnostic',parallelism:1,rate:10,period:'1m'}});
};
export async function publishDiagnosticSpeakingAnalysis(runId:string,publish:Publisher=publishJob){
  if(!diagnosticAiAvailable())return{skipped:true};
  const run=await prisma.diagnosticSpeakingRun.findUnique({where:{id:runId},include:{recording:{include}}});
  if(!run||run.state!=='QUEUED')return{skipped:true};
  eligible(run.recording,run.createdById,new Date());
  try{await publish({version:1,type:'DIAGNOSTIC_SPEAKING',runId});
    await prisma.diagnosticSpeakingRun.updateMany({where:{id:runId,state:'QUEUED'},data:{lastEnqueuedAt:new Date(),errorCode:null}});return{skipped:false};
  }catch(error){await prisma.diagnosticSpeakingRun.updateMany({where:{id:runId,state:'QUEUED'},data:{errorCode:'SIGNAL_PUBLISH_FAILED'}});
    console.error('DIAGNOSTIC_SPEAKING_SIGNAL_FAILED',{runId});throw error;}
}
type AnalysisInput={audio:Uint8Array;durationMs:number;readinessRubric?:ReadinessPack['speaking']['rubric']};
type Generated={output:unknown;model:string;usage:{inputTokens:number;outputTokens:number}};
type Generator=(input:AnalysisInput)=>Promise<Generated>;
export const generateDiagnosticSpeakingAnalysis:Generator=async input=>{
  if(!diagnosticAiAvailable()||!process.env.GEMINI_API_KEY)throw new DiagnosticError('AI_UNAVAILABLE',503);
  const model=process.env.DIAGNOSTIC_SPEAKING_MODEL?.trim()||'gemini-3.5-flash-lite';
  const prompt=buildDiagnosticSpeakingPrompt(input);
  // Inline audio avoids a second provider file-retention lifecycle. No name,
  // account ID, examiner notes, essay, answer keys or credentials in the prompt.
  const result=await new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:90000}}).models.generateContent({model,
    contents:[{role:'user',parts:[{text:prompt.data},{inlineData:{mimeType:'audio/wav',data:Buffer.from(input.audio).toString('base64')}}]}],
    config:{systemInstruction:prompt.system,responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(input.readinessRubric?readinessSpeakingAnalysisSchema:diagnosticSpeakingAnalysisSchema),maxOutputTokens:16000}});
  let output:unknown;try{output=JSON.parse(result.text??'');}catch{throw new Error('INVALID_SPEAKING_EVIDENCE');}
  return{output,model:result.modelVersion??model,usage:{inputTokens:result.usageMetadata?.promptTokenCount??0,outputTokens:result.usageMetadata?.candidatesTokenCount??0}};
};
export async function processDiagnosticSpeakingAnalysis(runId:string,options:{storage?:DiagnosticRecordingStorage;generate?:Generator}={}){
  const leaseOwner=randomUUID();
  const claim=await diagnosticTransaction(async tx=>{
    const located=await tx.diagnosticSpeakingRun.findUnique({where:{id:runId},select:{recording:{select:{speaking:{select:{sessionId:true}}}}}});
    if(!located)return null;
    await lockSession(tx,located.recording.speaking.sessionId);
    const run=await tx.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:runId},include:{recording:{include}}}),now=await diagnosticNow(tx);
    try{eligible(run.recording,run.createdById,now);}
    catch(error){if(!(error instanceof DiagnosticError))throw error;
      const cancelled=await tx.diagnosticSpeakingRun.update({where:{id:runId},data:{...erased,completedAt:now,errorCode:error.code,version:{increment:1}}});return{run:cancelled,claimed:false,sessionId:located.recording.speaking.sessionId};}
    if(['SUCCEEDED','FAILED','CANCELLED'].includes(run.state)||!diagnosticAiAvailable()||(run.state==='RUNNING'&&run.leaseExpiresAt!>now))
      return{run,claimed:false,sessionId:located.recording.speaking.sessionId};
    if(run.attempts>=5){const failed=await tx.diagnosticSpeakingRun.update({where:{id:runId},data:{state:'FAILED',leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'RETRY_LIMIT'}});
      return{run:failed,claimed:false,sessionId:located.recording.speaking.sessionId};}
    const claimed=await tx.diagnosticSpeakingRun.update({where:{id:runId},data:{state:'RUNNING',leaseOwner,leaseExpiresAt:new Date(now.getTime()+300000),attempts:{increment:1},errorCode:null}});
    return{run:claimed,claimed:true,sessionId:located.recording.speaking.sessionId};
  });
  if(!claim)return{state:'MISSING'};if(!claim.claimed)return{state:claim.run.state};
  try{
    const bytes=await readDiagnosticRecording({sessionId:claim.sessionId,actorUserId:claim.run.createdById,recordingId:claim.run.recordingId},options.storage??diagnosticRecordingStorage);
    const parsed=parseDiagnosticWav(bytes,{maxDurationMs:420000});
    const before=await prisma.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:runId},include:{recording:{include}}});
    eligible(before.recording,before.createdById,new Date());
    if(before.inputHash!==inputHash(before.recording)||before.promptVersion!==promptVersion(before.recording)
      ||before.state!=='RUNNING'||before.leaseOwner!==leaseOwner)throw new DiagnosticError('RECORDING_NOT_ELIGIBLE',409);
    // Storage and the provider are outside all database transactions.
    // All-zero PCM is provably no signal, not an invitation for a model to
    // hallucinate speech. Nonzero audio still needs examiner verification.
    const rubric=readinessRubric(before.recording);
    const generated:Generated=parsed.pcm.every(value=>value===0)?{
      output:{segments:[],criteria:(['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'] as const).map(criterion=>({
        criterion,observation:'No audio signal was captured; there is insufficient evidence for this criterion.',insufficientEvidence:true,evidence:[]})),
        priorities:['Use the examiner’s in-person observations or collect a new diagnostic sample.'],limitations:['No audio signal.','Short diagnostic, not an official result.'],
        audioQuality:{speechPresent:false,discontinuity:false,unreliableAttribution:true},...(rubric?{readinessRatings:{FLUENCY_COHERENCE:null,LEXICAL_RESOURCE:null,GRAMMAR:null,PRONUNCIATION:null}}:{})},model:'no-signal',usage:{inputTokens:0,outputTokens:0},
    }:await(options.generate??generateDiagnosticSpeakingAnalysis)({audio:bytes,durationMs:parsed.durationMs,readinessRubric:rubric});
    const output=validateDiagnosticSpeakingAnalysis(generated.output,{durationMs:parsed.durationMs,hasAudio:true,readiness:!!rubric});
    const metadata=z.object({model:z.string().min(1).max(120),usage:z.object({inputTokens:z.number().int().nonnegative().max(10000000),outputTokens:z.number().int().nonnegative().max(10000000)}).strict()}).parse(generated);
    await diagnosticTransaction(async tx=>{
      await lockSession(tx,claim.sessionId);
      const current=await tx.diagnosticSpeakingRun.findUniqueOrThrow({where:{id:runId},include:{recording:{include}}}),now=await diagnosticNow(tx);
      if(current.state!=='RUNNING'||current.leaseOwner!==leaseOwner||current.leaseExpiresAt!<=now)return;
      try{eligible(current.recording,current.createdById,now);}catch(error){if(!(error instanceof DiagnosticError))throw error;
        await tx.diagnosticSpeakingRun.update({where:{id:runId},data:{...erased,completedAt:now,errorCode:error.code,version:{increment:1}}});return;}
      if(current.consentVersion!==current.recording.speaking.consentVersion)return;
      await tx.diagnosticSpeakingRun.update({where:{id:runId},data:{state:'SUCCEEDED',output,model:metadata.model,usage:metadata.usage,leaseOwner:null,leaseExpiresAt:null,completedAt:now}});
    });
  }catch(error){
    const privacy=error instanceof DiagnosticError&&error.code!=='AI_UNAVAILABLE';
    const permanent=privacy||(error instanceof Error&&error.message==='INVALID_SPEAKING_EVIDENCE')||error instanceof z.ZodError;
    console.error('DIAGNOSTIC_SPEAKING_RUN_FAILED',{runId,permanent});
    await prisma.diagnosticSpeakingRun.updateMany({where:{id:runId,state:'RUNNING',leaseOwner},data:{
      ...(privacy?erased:{state:permanent||claim.run.attempts>=5?'FAILED':'QUEUED',leaseOwner:null,leaseExpiresAt:null}),
      lastEnqueuedAt:null,errorCode:privacy?'CONSENT_OR_ACCESS_CHANGED':permanent?'INVALID_EVIDENCE':'AI_RETRYABLE',
      ...(permanent||claim.run.attempts>=5?{completedAt:new Date()}:{}),}});
  }
  return{state:(await prisma.diagnosticSpeakingRun.findUnique({where:{id:runId},select:{state:true}}))?.state??'MISSING'};
}
export async function recoverDiagnosticSpeakingAnalysis(publish:(runId:string)=>Promise<unknown>=publishDiagnosticSpeakingAnalysis){
  if(!diagnosticAiAvailable())return[];
  const now=new Date();
  await prisma.diagnosticSpeakingRun.updateMany({where:{state:'RUNNING',leaseExpiresAt:{lte:now}},data:{state:'QUEUED',leaseOwner:null,leaseExpiresAt:null,lastEnqueuedAt:null,errorCode:'LEASE_EXPIRED'}});
  const pending=await prisma.diagnosticSpeakingRun.findMany({where:{state:'QUEUED',OR:[{lastEnqueuedAt:null},{lastEnqueuedAt:{lt:new Date(now.getTime()-300000)}}]},take:25,orderBy:{createdAt:'asc'},select:{id:true}});
  const results:{runId:string;published:boolean}[]=[];
  for(const run of pending){try{await publish(run.id);results.push({runId:run.id,published:true});}catch{results.push({runId:run.id,published:false});}}
  return results;
}
