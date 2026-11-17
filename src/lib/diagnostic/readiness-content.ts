import 'server-only';
import { createHash } from 'node:crypto';
import authored from './readiness-pack.json';
import type { ReadinessPart } from './readiness-types';

export type PrivateReadinessItem = ReadinessPart['items'][number] & { answers: string[]; evidence: string; rationale: string;
  sourceRef?: { assessmentId:string;dataHash:string;answerKeyFile:string;answerKeyHash:string;sourceNumber:number;responseIdentifier:string;contentRevisionId:number;keyAnswers:string[];sourceGroupType:string } };
export type PrivateReadinessPart = Omit<ReadinessPart, 'items'> & { script?: string; audioSource?:{filename:string;sha256:string;deliveredSha256:string;conversion:string};items: PrivateReadinessItem[] };
export type ReadinessPack = Omit<typeof authored, 'parts'> & { parts: PrivateReadinessPart[] };
const pack = authored as ReadinessPack;
function stableJson(value: unknown): string {
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(stableJson).join(',')}]`;
  const record=value as Record<string,unknown>;
  return `{${Object.keys(record).sort().map(k=>`${JSON.stringify(k)}:${stableJson(record[k])}`).join(',')}}`;
}
export function hashReadinessContent(value: unknown) {return createHash('sha256').update(stableJson(value)).digest('hex');}

const normalise = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('en-GB').replace(/\s+/gu, ' ');
export function loadReadinessPack(): ReadinessPack { return structuredClone(pack); }

/** Explicit allowlist, not a spread followed by deleting known secret fields. */
export function candidateReadinessPart(id: string, source: ReadinessPack = pack): ReadinessPart {
  const part = source.parts.find(p => p.id === id);
  if (!part) throw new Error('READINESS_PART_NOT_FOUND');
  return { id: part.id, title: part.title, skill: part.skill, phase: part.phase, pathway: part.pathway,
    instructions: part.instructions, ...(part.text ? { text: part.text } : {}), ...(part.audio ? { audio: `/${part.audio}`,audioSeconds:part.audioSeconds } : {}),
    items: part.items.map(q => ({ id: q.id, number: q.number, type: q.type, prompt: q.prompt,
      ...(q.instructions?{instructions:q.instructions}:{}), ...(q.options ? { options: structuredClone(q.options) } : {}), ...(q.maxWords ? { maxWords: q.maxWords } : {}) })) };
}

export function auditReadinessPack(source: ReadinessPack): string[] {
  const issues: string[] = []; const ids = new Set<string>();
  for (const part of source.parts) {
    const evidenceSource = normalise(part.script ?? part.text ?? '');
    if (!evidenceSource) issues.push(`${part.id}: no source evidence`);
    if (part.skill === 'LISTENING' && (!part.script || !part.audio)) issues.push(`${part.id}: incomplete audio`);
    const first = part.items[0]?.number;
    for (const [index, q] of part.items.entries()) {
      if (ids.has(q.id) || q.number !== first + index) issues.push(`${q.id}: duplicate/misnumbered`); ids.add(q.id);
      if (!q.prompt || !q.rationale || !q.evidence || !evidenceSource.includes(normalise(q.evidence))) issues.push(`${q.id}: unsupported evidence`);
      if (!q.answers.length || new Set(q.answers.map(normalise)).size !== q.answers.length) issues.push(`${q.id}: invalid alternatives`);
      if (q.type === 'CHOICE' && (!q.options || q.answers.length !== 1 || !Object.hasOwn(q.options, q.answers[0]))) issues.push(`${q.id}: ambiguous choice`);
      if(q.sourceRef){
        if(!/^[a-f0-9]{64}$/u.test(q.sourceRef.dataHash)||!/^[a-f0-9]{64}$/u.test(q.sourceRef.answerKeyHash)
          ||JSON.stringify(q.answers)!==JSON.stringify(q.sourceRef.keyAnswers))issues.push(`${q.id}: official key/provenance mismatch`);
      }else if (q.type === 'TEXT' && q.answers.some(a => !evidenceSource.normalize('NFD').replace(/\p{M}/gu, '').includes(normalise(a).normalize('NFD').replace(/\p{M}/gu, '')) && !/^\d+(?:th|st|nd|rd|[.:]\d+)?$/u.test(a))) issues.push(`${q.id}: completion not in source`);
      if (/lorem ipsum|coming soon|placeholder|synthetic|add questions later/iu.test(q.prompt)) issues.push(`${q.id}: unfinished content`);
    }
  }
  for(const pathway of ['ACADEMIC','GENERAL_TRAINING'])for(const skill of ['LISTENING','READING'])for(const phase of ['CORE','EXTENSION']){
    const numbers=source.parts.filter(p=>p.skill===skill&&p.phase===phase&&(p.pathway==='BOTH'||p.pathway===pathway)).flatMap(p=>p.items.map(q=>q.number));
    const first=phase==='CORE'?1:13;
    if(!numbers.length||numbers.some((n,i)=>n!==first+i))issues.push(`${pathway}/${skill}/${phase}: broken group numbering`);
  }
  return issues;
}

export function scoreReadinessPart(id: string, responses: Record<string, string>, source: ReadinessPack = pack) {
  const part = source.parts.find(p => p.id === id); if (!part) throw new Error('READINESS_PART_NOT_FOUND');
  const marks = part.items.map(q => ({ id: q.id, correct: q.answers.some(a => normalise(a) === normalise(responses[q.id] ?? '')) }));
  return { score: marks.filter(m => m.correct).length, maximum: part.items.length, answered: part.items.filter(q => (responses[q.id] ?? '').trim()).length };
}
