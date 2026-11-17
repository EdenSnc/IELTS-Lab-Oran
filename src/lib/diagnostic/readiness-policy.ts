import 'server-only';
import { z } from 'zod';
import type { ReadinessPathway } from './readiness-types';
import { normalizeE164Phone } from '@/lib/phone';

/** Initial screening heuristics, not calibrated IELTS/CEFR conversion. Staff may recalibrate here. */
export const READINESS_POLICY = Object.freeze({ coreSeconds: 2520, listeningSeconds: 720, readingSeconds: 840,
  writingSeconds: 960, extensionSeconds: 540, extensionListeningSeconds: 270,
  strongMinimum: 9, weakMaximum: 5, imbalance: 4, extensionStrongMinimum: 4, policyVersion: 1 });

export const readinessIntakeSchema = z.object({
  name: z.string().trim().min(3).max(100), phone: z.string().trim().max(24).refine(v=>normalizeE164Phone(v)!==null).transform(v=>normalizeE164Phone(v)!),
  pathway: z.enum(['ACADEMIC','GENERAL_TRAINING','UNSURE']), targetBand: z.number().min(4).max(9).multipleOf(0.5),
  timeframe: z.enum(['UNDER_ONE_MONTH','ONE_TO_THREE_MONTHS','THREE_TO_SIX_MONTHS','LATER','UNSURE']),
  contactConsent: z.literal(true),
}).strict();
export type ReadinessIntake = z.infer<typeof readinessIntakeSchema>;
export const readinessMarkingSchema = z.object({ expectedVersion: z.number().int().nonnegative(),
  writing: z.array(z.number().int().min(0).max(2)).length(4),
  speaking: z.array(z.number().int().min(0).max(2)).length(4).nullable(),
  notes: z.string().trim().min(10).max(4000),
  decision: z.enum(['READY','CONDITIONAL','FOUNDATION']).nullable(),
  overrideReason: z.string().trim().max(1500), release: z.boolean(),
  writingRunId:z.uuid().nullable().optional(),
  speakingRunId:z.uuid().nullable().optional(),
}).strict();
export type ReadinessMarking = z.infer<typeof readinessMarkingSchema>;

export function needsReadinessExtension(listening: number, reading: number) {
  for (const n of [listening,reading]) if (!Number.isInteger(n) || n<0 || n>12) throw new Error('READINESS_SCORE_INVALID');
  if (listening >= READINESS_POLICY.strongMinimum && reading >= READINESS_POLICY.strongMinimum) return false;
  if (listening <= READINESS_POLICY.weakMaximum && reading <= READINESS_POLICY.weakMaximum) return false;
  return true;
}

export type ReadinessStage = 'LISTENING'|'READING'|'WRITING'|'EXTENSION_LISTENING'|'EXTENSION_READING'|'SUBMITTED';
export function readinessStage(startedAt: Date, now: Date, extension: boolean) {
  const elapsed=(now.getTime()-startedAt.getTime())/1000;
  if (!Number.isFinite(elapsed) || elapsed<0) throw new Error('READINESS_CLOCK_INVALID');
  const limits: Array<[ReadinessStage, number]> = [['LISTENING',720],['READING',1560],['WRITING',2520],
    ...(extension ? [['EXTENSION_LISTENING',2790],['EXTENSION_READING',3060]] as Array<[ReadinessStage,number]> : [])];
  const next=limits.find(([,end])=>elapsed<end);
  return { stage: next?.[0]??'SUBMITTED', remainingSeconds: next?Math.ceil(next[1]-elapsed):0,
    deadline: new Date(startedAt.getTime()+(extension?3060:2520)*1000) };
}

export function recommendReadiness(input: { listening:number; reading:number; extensionListening?:number; extensionReading?:number;extensionListeningMaximum?:number;extensionReadingMaximum?:number;
  writing: number[]; speaking:number[]|null; pathway:ReadinessPathway; targetBand:number; timeframe:string }) {
  const reasons: string[]=[];
  if (input.writing.length!==4 || input.writing.some(n=>![0,1,2].includes(n))
    || input.speaking && (input.speaking.length!==4||input.speaking.some(n=>![0,1,2].includes(n)))) throw new Error('READINESS_RATING_INVALID');
  const weakProductive=input.writing.includes(0)||!!input.speaking?.includes(0);
  const extensionStrong=(score:number|undefined,maximum:number=6)=>Number.isInteger(score)&&Number.isInteger(maximum)&&maximum>0&&score!>=0&&score!<=maximum&&score!*3>=maximum*2;
  const strongObjective=input.listening>=9 && input.reading>=9 ||
    input.listening>=6 && input.reading>=6 && extensionStrong(input.extensionListening,input.extensionListeningMaximum)&&extensionStrong(input.extensionReading,input.extensionReadingMaximum);
  const weakObjective=input.listening<=5 && input.reading<=5;
  if (weakProductive) reasons.push('PRODUCTIVE_FOUNDATION');
  if (weakObjective) reasons.push('RECEPTIVE_FOUNDATION');
  if (!input.speaking) reasons.push('SPEAKING_REVIEW_REQUIRED');
  if (input.pathway==='UNSURE') reasons.push('PATHWAY_CONFIRMATION_REQUIRED');
  if (input.targetBand>=7.5) reasons.push('HIGH_TARGET_REQUIRES_INDIVIDUAL_PLAN');
  if (input.timeframe==='UNDER_ONE_MONTH') reasons.push('SHORT_DEADLINE_REQUIRES_TEACHER_PLAN');
  const category=weakProductive||weakObjective?'FOUNDATION':strongObjective&&input.writing.every(n=>n===2)
    &&input.speaking?.every(n=>n===2)&&input.pathway!=='UNSURE'?'READY':'CONDITIONAL';
  return { category, reasons, policyVersion:READINESS_POLICY.policyVersion };
}
