import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDiagnosticSpeakingWindow, diagnosticRecordingEligibility } from '../../src/lib/diagnostic/speaking-core';
test('in-person Speaking has fixed 120/60/90/150-second boundaries across refreshes',()=>{
  const startedAt=new Date('2026-10-07T10:00:00.000Z');
  for(const [elapsed,stage,remaining] of [[0,'PART_1',120],[119999,'PART_1',1],[120000,'PREPARATION',60],[179999,'PREPARATION',1],
    [180000,'PART_2',90],[269999,'PART_2',1],[270000,'PART_3',150],[419999,'PART_3',1],[420000,'COMPLETE',0]] as const){
    const result=deriveDiagnosticSpeakingWindow({startedAt,now:new Date(startedAt.getTime()+elapsed)});
    assert.equal(result.stage,stage);assert.equal(result.remainingSeconds,remaining);
    assert.equal(result.deadline.toISOString(),'2026-10-07T10:07:00.000Z');
  }
  assert.throws(()=>deriveDiagnosticSpeakingWindow({startedAt,now:new Date(startedAt.getTime()-1)}));
  assert.throws(()=>deriveDiagnosticSpeakingWindow({startedAt:new Date(NaN),now:new Date()}));
});
test('human-only assessment needs no recording consent and minor/unknown-age capture is denied',()=>{
  assert.deepEqual(diagnosticRecordingEligibility({adultAttested:false,recordingConsented:false,aiConsented:false}),{canRecord:false,canAnalyse:false});
  assert.equal(diagnosticRecordingEligibility({adultAttested:false,recordingConsented:true,aiConsented:true}).canRecord,false);
  assert.equal(diagnosticRecordingEligibility({adultAttested:true,recordingConsented:false,aiConsented:true}).canAnalyse,false);
  assert.deepEqual(diagnosticRecordingEligibility({adultAttested:true,recordingConsented:true,aiConsented:true}),{canRecord:true,canAnalyse:true});
});
