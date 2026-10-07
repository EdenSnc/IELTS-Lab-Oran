import 'server-only';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { Client } from '@upstash/qstash';
import { load } from 'cheerio';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { qstashEndpoint } from '@/lib/qstash/verification';
import { assertDiagnosticExaminer, loadDiagnosticAssessment } from './assessment-service';
import { diagnosticNow, diagnosticTransaction } from './content-service';
import { loadOwnedDiagnosticSource } from './session-service';
import { DiagnosticError } from './protocol';
import { assertDiagnosticWritingAiConsent,diagnosticAiAvailable } from './ai-consent-service';
import { buildDiagnosticWritingPrompt, diagnosticWritingFeedbackSchema, parseDiagnosticWritingFeedback,
  diagnosticWritingInputHash, DIAGNOSTIC_WRITING_PROMPT_VERSION } from './writing-core';

export const diagnosticWritingJobSchema = z.object({ version: z.literal(1), type: z.literal('DIAGNOSTIC_WRITING'), runId: z.uuid() }).strict();
export const diagnosticRecoveryJobSchema = z.object({ version: z.literal(1), type: z.literal('RECOVER_DIAGNOSTIC_WRITING') }).strict();

export async function loadDiagnosticWritingInput(sessionId: string) {
  const target = await prisma.diagnosticSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!target) throw new DiagnosticError('NOT_FOUND',404);
  const source = await loadOwnedDiagnosticSource({ sessionId, userId: target.userId });
  if (source.session.state !== 'SUBMITTED' || source.session.responses.some(response => !response.finalizedAt)) throw new DiagnosticError('WRITTEN_NOT_SUBMITTED',409);
  const question = source.manifest.questions.find(item => item.skill === 'WRITING')!;
  const part = source.parts.find(item => item.id === source.manifest.parts.find(item => item.skill === 'WRITING')!.partId)!;
  const stimulus = part.stimuli.find(item => item.type === 'WRITING_PROMPT' && item.isVisibleToLearner);
  const html = stimulus?.bodyHtml ?? stimulus?.plainText ?? part.questionGroups[0]?.promptHtml ?? '';
  const prompt = load(`<body>${html}</body>`)('body').text().replace(/\s+/gu,' ').trim();
  if (!prompt) throw new DiagnosticError('CONTENT_INTEGRITY',409);
  const answer = source.session.responses.find(response => response.questionId === question.questionId)!.answer;
  const input = { manifestHash: source.session.manifestHash, questionId: question.questionId, prompt, answer,
    promptVersion: DIAGNOSTIC_WRITING_PROMPT_VERSION };
  return { ...input, inputHash: diagnosticWritingInputHash(input) };
}
export async function queueDiagnosticWriting(input: { sessionId: string; actorUserId: string }) {
  if(!diagnosticAiAvailable())throw new DiagnosticError('AI_UNAVAILABLE',503);
  await loadDiagnosticAssessment(input);
  const source = await loadDiagnosticWritingInput(input.sessionId);
  return diagnosticTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticSession" WHERE id=${input.sessionId}::uuid FOR UPDATE`;
    await assertDiagnosticExaminer(tx,input);
    const consentVersion=await assertDiagnosticWritingAiConsent(tx,input.sessionId);
    const assessment = await tx.diagnosticAssessment.findUniqueOrThrow({ where: { sessionId: input.sessionId } });
    if (assessment.state !== 'DRAFT') throw new DiagnosticError('ASSESSMENT_RELEASED',409);
    return tx.diagnosticWritingRun.upsert({ where: { sessionId_inputHash_promptVersion: {
      sessionId: input.sessionId, inputHash: source.inputHash, promptVersion: source.promptVersion,
    } }, update: {}, create: { sessionId: input.sessionId, manifestHash: source.manifestHash,
      inputHash: source.inputHash, promptVersion: source.promptVersion,consentVersion } });
  });
}
export async function loadDiagnosticReview(input: { sessionId: string; actorUserId: string }) {
  const assessment = await loadDiagnosticAssessment(input);
  const writing = await loadDiagnosticWritingInput(input.sessionId);
  const consent=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:input.sessionId},select:{writingAiAdultAttested:true,writingAiConsented:true,writingAiRevokedAt:true}});
  const row = await prisma.diagnosticWritingRun.findFirst({ where: { sessionId: input.sessionId }, orderBy: { createdAt: 'desc' },
    select: { id: true, state: true, feedback: true, model: true, promptVersion: true, errorCode: true } });
  return { assessment, prompt: writing.prompt, essay: writing.answer,aiAvailable:diagnosticAiAvailable()&&consent.writingAiAdultAttested&&consent.writingAiConsented&&!consent.writingAiRevokedAt,
    run: row ? { ...row, feedback: row.state === 'SUCCEEDED' ? parseDiagnosticWritingFeedback(row.feedback,writing.answer) : null } : null };
}
export type DiagnosticReviewDto = Awaited<ReturnType<typeof loadDiagnosticReview>>;
type JobPublisher = (body: z.infer<typeof diagnosticWritingJobSchema>) => Promise<unknown>;
const publishJob: JobPublisher = async body => {
  if (!process.env.QSTASH_TOKEN) throw new Error('QSTASH_NOT_CONFIGURED');
  await new Client({ token: process.env.QSTASH_TOKEN }).publishJSON({ url: qstashEndpoint('/api/internal/diagnostic/writing'),
    body, retries: 5, timeout: '60s', deduplicationId: `diagnostic-writing-${body.runId}-${Date.now()}`, label: ['diagnostic-writing'],
    flowControl: { key: 'gemini-writing', parallelism: 2, rate: 10, period: '1m' } });
};
export async function publishDiagnosticWriting(runId: string, publish: JobPublisher = publishJob) {
  const run = await prisma.diagnosticWritingRun.findUniqueOrThrow({ where: { id: runId } });
  if (run.state !== 'QUEUED') return { skipped: true };
  if(!diagnosticAiAvailable())return{skipped:true};
  await diagnosticTransaction(tx=>assertDiagnosticWritingAiConsent(tx,run.sessionId,run.consentVersion));
  // Durable QUEUED row exists before any network call. Recovery discovers a missed publish.
  try {
    await publish({ version: 1, type: 'DIAGNOSTIC_WRITING', runId });
    await prisma.diagnosticWritingRun.updateMany({ where: { id: runId, state: 'QUEUED' }, data: { lastEnqueuedAt: new Date(), errorCode: null } });
    return { skipped: false };
  } catch (error) {
    await prisma.diagnosticWritingRun.updateMany({ where: { id: runId, state: 'QUEUED' }, data: { errorCode: 'SIGNAL_PUBLISH_FAILED' } });
    console.error('DIAGNOSTIC_WRITING_SIGNAL_FAILED', { runId });
    throw error;
  }
}
type GenerateResult = { feedback: unknown; model: string; usage: { inputTokens: number; outputTokens: number } };
type Generator = (input: Awaited<ReturnType<typeof loadDiagnosticWritingInput>>) => Promise<GenerateResult>;
const generateFeedback: Generator = async input => {
  if(!diagnosticAiAvailable())throw new DiagnosticError('AI_UNAVAILABLE',503);
  if (!process.env.GEMINI_API_KEY) throw new Error('WRITING_AI_NOT_CONFIGURED');
  // Reuse the deployed model configuration, not a second model/provider framework.
  const model = (process.env.GEMINI_WRITING_MODELS ?? 'gemini-3.5-flash-lite').split(',')[0].trim();
  if (!model) throw new Error('WRITING_AI_NOT_CONFIGURED');
  const prompt = buildDiagnosticWritingPrompt(input);
  const result = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 45_000 } }).models.generateContent({
    model, contents: [{ role: 'user', parts: [{ text: prompt.data }] }], config: {
      systemInstruction: prompt.system, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(diagnosticWritingFeedbackSchema),
      maxOutputTokens: 3000,
    },
  });
  let feedback: unknown;
  try { feedback = JSON.parse(result.text ?? ''); } catch { throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID'); }
  return { feedback, model: result.modelVersion ?? model,
    usage: { inputTokens: result.usageMetadata?.promptTokenCount ?? 0, outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0 } };
};
function blankFeedback() {
  return { criteria: ['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion => ({
    criterion, observation: 'No response was submitted; there is insufficient evidence to assess this criterion.', evidence: [],
  })), nextSteps: ['Complete a timed Task 2 response before requesting writing feedback.'], limitations: ['No submitted text.', 'Shortened 20-minute Task 2 diagnostic.'] };
}
export async function processDiagnosticWriting(runId: string, generate: Generator = generateFeedback) {
  const leaseOwner = randomUUID();
  const claim = await diagnosticTransaction(async tx => {
    await tx.$queryRaw`SELECT id FROM app_private."DiagnosticWritingRun" WHERE id=${runId}::uuid FOR UPDATE`;
    const run = await tx.diagnosticWritingRun.findUnique({ where: { id: runId }, include: { session: { include: { assessment: true } } } });
    if (!run) return null; // Delayed job after deletion is a successful no-op.
    const now = await diagnosticNow(tx);
    if (['SUCCEEDED','FAILED','CANCELLED'].includes(run.state)) return { run, claimed: false };
    if(now.getTime()>=run.createdAt.getTime()+30*86400000){
      const expired=await tx.diagnosticWritingRun.update({where:{id:runId},data:{state:'CANCELLED',feedback:Prisma.DbNull,leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'RETENTION_EXPIRED'}});
      return{run:expired,claimed:false};
    }
    if(!diagnosticAiAvailable())return{run,claimed:false};
    try{await assertDiagnosticWritingAiConsent(tx,run.sessionId,run.consentVersion);}catch{
      const cancelled=await tx.diagnosticWritingRun.update({where:{id:runId},data:{state:'CANCELLED',feedback:Prisma.DbNull,leaseOwner:null,leaseExpiresAt:null,completedAt:now,errorCode:'CONSENT_REQUIRED'}});
      return{run:cancelled,claimed:false};
    }
    if (run.session.assessment?.state !== 'DRAFT') {
      const cancelled = await tx.diagnosticWritingRun.update({ where: { id: runId }, data: {
        state: 'CANCELLED', leaseOwner: null, leaseExpiresAt: null, completedAt: now, errorCode: 'REPORT_NOT_DRAFT',
      } }); return { run: cancelled, claimed: false };
    }
    if (run.state === 'RUNNING' && run.leaseExpiresAt! > now) return { run, claimed: false };
    if (run.attempts >= 5) {
      const failed = await tx.diagnosticWritingRun.update({ where: { id: runId }, data: { state: 'FAILED', leaseOwner: null, leaseExpiresAt: null,
        completedAt: now, errorCode: 'RETRY_LIMIT' } }); return { run: failed, claimed: false };
    }
    const claimed = await tx.diagnosticWritingRun.update({ where: { id: runId }, data: { state: 'RUNNING',
      leaseOwner, leaseExpiresAt: new Date(now.getTime()+300000), attempts: { increment: 1 }, errorCode: null } });
    return { run: claimed, claimed: true };
  });
  if (!claim) return { state: 'MISSING' };
  if (!claim.claimed) return { state: claim.run.state };
  try {
    const input = await loadDiagnosticWritingInput(claim.run.sessionId);
    if (input.inputHash !== claim.run.inputHash || input.manifestHash !== claim.run.manifestHash || input.promptVersion !== claim.run.promptVersion) throw new Error('DIAGNOSTIC_WRITING_INPUT_INVALID');
    // This external call is deliberately outside every PostgreSQL transaction.
    const result = input.answer.trim() ? await generate(input) : { feedback: blankFeedback(), model: 'no-response', usage: { inputTokens: 0, outputTokens: 0 } };
    let feedback;
    try { feedback = parseDiagnosticWritingFeedback(result.feedback,input.answer); }
    catch { throw new Error('DIAGNOSTIC_WRITING_OUTPUT_INVALID'); }
    const metadata = z.object({ model: z.string().min(1).max(120), usage: z.object({ inputTokens: z.number().int().nonnegative().max(10000000),
      outputTokens: z.number().int().nonnegative().max(10000000) }).strict() }).parse({ model: result.model, usage: result.usage });
    await diagnosticTransaction(async tx => {
      const now = await diagnosticNow(tx);
      // Compare-and-set fencing prevents expired/replaced workers or a released report from changing state.
      await tx.diagnosticWritingRun.updateMany({ where: { id: runId, state: 'RUNNING', leaseOwner,
        leaseExpiresAt: { gt: now }, session: { assessment: { state: 'DRAFT' },writingAiConsented:true,writingAiAdultAttested:true,writingAiRevokedAt:null,writingConsentVersion:claim.run.consentVersion } }, data: {
        state: 'SUCCEEDED', feedback, model: metadata.model, usage: metadata.usage,
        leaseOwner: null, leaseExpiresAt: null, completedAt: now,
      } });
    });
  } catch (error) {
    const permanent = error instanceof DiagnosticError || (error instanceof Error && /^DIAGNOSTIC_WRITING_(?:INPUT|OUTPUT)_INVALID$/u.test(error.message));
    console.error('DIAGNOSTIC_WRITING_RUN_FAILED', { runId, permanent });
    await prisma.diagnosticWritingRun.updateMany({ where: { id: runId, state: 'RUNNING', leaseOwner }, data: {
      state: permanent || claim.run.attempts >= 5 ? 'FAILED' : 'QUEUED', leaseOwner: null, leaseExpiresAt: null,
      lastEnqueuedAt: null, errorCode: permanent ? 'INVALID_EVIDENCE' : 'AI_RETRYABLE',
      ...(permanent || claim.run.attempts >= 5 ? { completedAt: new Date() } : {}),
    } });
  }
  const final = await prisma.diagnosticWritingRun.findUnique({ where: { id: runId }, select: { state: true } });
  return { state: final?.state ?? 'MISSING' };
}
export async function recoverDiagnosticWriting(publish: (runId: string) => Promise<unknown> = publishDiagnosticWriting) {
  if(!diagnosticAiAvailable())return[];
  const now = new Date();
  await prisma.diagnosticWritingRun.updateMany({ where: { state: 'RUNNING', leaseExpiresAt: { lte: now } },
    data: { state: 'QUEUED', leaseOwner: null, leaseExpiresAt: null, lastEnqueuedAt: null, errorCode: 'LEASE_EXPIRED' } });
  const pending = await prisma.diagnosticWritingRun.findMany({ where: { state: 'QUEUED',
    OR: [{ lastEnqueuedAt: null }, { lastEnqueuedAt: { lt: new Date(now.getTime()-300000) } }] }, orderBy: { createdAt: 'asc' }, take: 25, select: { id: true } });
  const results: { runId: string; published: boolean }[] = [];
  for (const run of pending) {
    try { await publish(run.id); results.push({ runId: run.id, published: true }); }
    catch { results.push({ runId: run.id, published: false }); }
  }
  return results;
}
