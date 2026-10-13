import assert from 'node:assert/strict';
import { test } from 'node:test';

async function policy() {
  const file = '../../src/lib/diagnostic/readiness-policy';
  try { return await import(file); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') return null; throw e; }
}
test('extension is offered at boundary or inconsistent scores, not clear strong/weak cases', async () => {
  const m = await policy(); assert.ok(m);
  for (const [l, r, result] of [[12,12,false],[9,9,false],[5,5,false],[0,0,false],[8,8,true],[12,5,true],[6,9,true]]) {
    assert.equal(m.needsReadinessExtension(l,r), result, `${l}/${r}`);
  }
  assert.throws(() => m.needsReadinessExtension(13,9));
});
test('very weak productive evidence defeats perfect objective scores and missing speaking prevents final READY', async () => {
  const m = await policy(); assert.ok(m);
  const base={listening:12,reading:12,pathway:'ACADEMIC',targetBand:7,timeframe:'ONE_TO_THREE_MONTHS'};
  assert.equal(m.recommendReadiness({...base,writing:[2,2,2,2],speaking:[2,2,2,2]}).category, 'READY');
  assert.equal(m.recommendReadiness({...base,writing:[0,2,2,2],speaking:[2,2,2,2]}).category, 'FOUNDATION');
  assert.equal(m.recommendReadiness({...base,writing:[2,2,2,2],speaking:null}).category, 'CONDITIONAL');
  assert.equal(m.recommendReadiness({...base,pathway:'UNSURE',writing:[2,2,2,2],speaking:[2,2,2,2]}).category, 'CONDITIONAL');
});

test('extension strength uses its real denominators, not the old six-item assumptions',async()=>{
  const m=await policy();assert.ok(m);const base={listening:8,reading:8,extensionListening:4,extensionReading:4,extensionListeningMaximum:7,extensionReadingMaximum:5,writing:[2,2,2,2],speaking:[2,2,2,2],pathway:'ACADEMIC',targetBand:7,timeframe:'ONE_TO_THREE_MONTHS'};
  assert.equal(m.recommendReadiness(base).category,'CONDITIONAL');
  assert.equal(m.recommendReadiness({...base,extensionListening:5}).category,'READY');
});
test('42-minute server clock does not restart on refresh and late input cannot reopen a section', async () => {
  const m=await policy(); assert.ok(m);
  const start=new Date('2026-10-09T10:00:00Z');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:11:59Z'),false).stage,'LISTENING');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:12:00Z'),false).stage,'READING');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:26:00Z'),false).stage,'WRITING');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:42:00Z'),true).stage,'EXTENSION_LISTENING');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:46:30Z'),true).stage,'EXTENSION_READING');
  assert.equal(m.readinessStage(start,new Date('2026-10-09T10:51:00Z'),true).stage,'SUBMITTED');
});
