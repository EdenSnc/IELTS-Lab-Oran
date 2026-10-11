import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

async function content() {
  const modulePath = '../../src/lib/diagnostic/readiness-content';
  try { return await import(modulePath); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  }
}

test('the deliverable contains complete independent Academic and GT screens, not fixture questions', async () => {
  const contentModule = await content();
  assert.ok(contentModule, 'readiness content is missing');
  const pack = contentModule.loadReadinessPack();
  assert.deepEqual(pack.parts.map((p: { id: string; items: unknown[] }) => [p.id, p.items.length]), [
    ['listening-social', 7], ['listening-research', 5], ['reading-academic', 12], ['reading-general', 12],
    ['extension-listening', 3], ['extension-listening-sentences', 4], ['extension-academic', 5], ['extension-general', 5],
  ]);
  assert.equal(pack.writing.minWords, 160);
  assert.ok(pack.writing.prompt.length > 120);
  assert.ok(pack.speaking.longTurn.bullets.length >= 3);
  assert.ok(pack.speaking.followUp.length >= 4);
  assert.equal(contentModule.auditReadinessPack(pack).length, 0);
});

test('every objective key has traceable evidence; a wrong completion answer is caught', async () => {
  const contentModule = await content(); assert.ok(contentModule);
  const pack = structuredClone(contentModule.loadReadinessPack());
  pack.parts[0].items[0].answers = ['not in the conversation'];
  assert.ok(contentModule.auditReadinessPack(pack).some((issue: string) => issue.includes('L1')));
});

test('candidate delivery strips scripts, keys, rationales, rubric and thresholds while keeping real questions', async () => {
  const contentModule = await content(); assert.ok(contentModule);
  const dto = contentModule.candidateReadinessPart('reading-general');
  assert.equal(dto.items.length, 12);
  const json = JSON.stringify(dto);
  for (const field of ['answers', 'evidence', 'rationale', 'script', 'rubric', 'threshold']) assert.ok(!json.includes(`"${field}"`), field);
  assert.ok(dto.text.includes('Railway Season Tickets'));
});

test('all four authentic listening clips have MP3 headers and non-zero speech-length payloads', async () => {
  const contentModule = await content(); assert.ok(contentModule);
  for (const part of contentModule.loadReadinessPack().parts.filter((p: { audio?: string }) => p.audio)) {
    const file = path.join(process.cwd(), 'public', part.audio);
    assert.ok(existsSync(file), `missing ${part.audio}`);
    const bytes = readFileSync(file);
    assert.ok(bytes.toString('ascii', 0, 3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224);
    assert.ok(bytes.length > 100000);
  }
});

test('official source numbering, correction keys, spelling alternatives and table context survive adaptation', async()=>{
  const m=await content(); assert.ok(m);const pack=m.loadReadinessPack();
  const q=(id:string)=>pack.parts.flatMap((p:{items: Array<{id:string}>})=>p.items).find((q:{id:string})=>q.id===id)!;
  assert.deepEqual(q('L2').answers,['12 years','twelve years']);
  assert.equal(q('L1').sourceRef.responseIdentifier,'RESPONSE-2');
  assert.ok(q('L8').prompt.includes('First level of importance'));
  assert.ok(q('L8').prompt.includes('Personal Characteristics'));
  assert.deepEqual(q('RG10').answers,['enrolment','enrollment']);
  assert.ok(q('RG10').sourceRef.answerKeyFile.includes('sentence-completion'));
  assert.equal(q('RA10').sourceRef.responseIdentifier,'RESPONSE-6','source order is not numeric response ID order');
  assert.ok(pack.provenance.permission.includes('user-attested'));
  for(const p of pack.parts)for(const item of p.items)assert.match(item.sourceRef.dataHash,/^[a-f0-9]{64}$/);
  const publicPart=m.candidateReadinessPart('reading-academic');
  assert.ok(!JSON.stringify(publicPart).includes('sourceRef'));
  assert.equal(m.scoreReadinessPart('listening-social',{L2:'12 years',L3:'six'}).score,1);
  assert.equal(m.scoreReadinessPart('extension-general',{EG4:'hrs'}).score,1);
});

test('private frozen content hash survives PostgreSQL JSONB object-key reordering', async()=>{
  const contentModule=await content();assert.ok(contentModule);
  assert.equal(typeof contentModule.hashReadinessContent,'function');
  assert.equal(contentModule.hashReadinessContent({b:2,a:{d:4,c:3}}),contentModule.hashReadinessContent({a:{c:3,d:4},b:2}));
  assert.notEqual(contentModule.hashReadinessContent({a:3}),contentModule.hashReadinessContent({a:4}));
});

test('static speech assets are compressed for slow connections rather than shipping multi-megabyte PCM',async()=>{
 const contentModule=await content();assert.ok(contentModule);
 for(const p of contentModule.loadReadinessPack().parts.filter((p:{audio?:string})=>p.audio)){
  const bytes=readFileSync(path.join(process.cwd(),'public',p.audio));assert.ok(bytes.length<2100000,`${p.audio} is unnecessarily large`);
 }
});
