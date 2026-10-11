import assert from 'node:assert/strict';
import test from 'node:test';
import {validateDiagnosticSpeakingAnalysis,reviewDiagnosticSpeakerTurns,buildDiagnosticSpeakingPrompt} from '../../src/lib/diagnostic/analysis-core';
const fixture=()=>({segments:[{speaker:'CANDIDATE',startMs:1000,endMs:6000,text:'I would choose a quiet place to study.',confidence:0.8}],
 criteria:['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'].map(criterion=>({criterion,observation:'A clearly developed response.',insufficientEvidence:false,
  evidence:[{segmentIndex:0,startMs:1000,endMs:6000,quotation:'a quiet place',basis:criterion==='PRONUNCIATION'?'AUDIO':'TRANSCRIPT'}]})),
 priorities:['Extend the supporting example.'],limitations:['Seven-minute diagnostic.'],audioQuality:{speechPresent:true,discontinuity:false,unreliableAttribution:false}});
test('Speaking AI rejects hallucinated quotes, examiner evidence, duplicate criteria and impossible audio times',()=>{
 assert.equal(validateDiagnosticSpeakingAnalysis(fixture(),{durationMs:7000,hasAudio:true}).criteria.length,4);
 const quote=fixture();quote.criteria[0].evidence[0].quotation='invented words';assert.throws(()=>validateDiagnosticSpeakingAnalysis(quote,{durationMs:7000,hasAudio:true}),/INVALID_SPEAKING_EVIDENCE/u);
 const examiner=fixture();examiner.segments[0].speaker='EXAMINER';assert.throws(()=>validateDiagnosticSpeakingAnalysis(examiner,{durationMs:7000,hasAudio:true}),/INVALID_SPEAKING_EVIDENCE/u);
 const duplicate=fixture();duplicate.criteria[3].criterion='GRAMMAR';assert.throws(()=>validateDiagnosticSpeakingAnalysis(duplicate,{durationMs:7000,hasAudio:true}),/INVALID_SPEAKING_EVIDENCE/u);
 const timing=fixture();timing.segments[0].endMs=7001;assert.throws(()=>validateDiagnosticSpeakingAnalysis(timing,{durationMs:7000,hasAudio:true}),/INVALID_SPEAKING_EVIDENCE/u);
 const band=fixture();band.criteria[0].observation='Band 8 overall';assert.throws(()=>validateDiagnosticSpeakingAnalysis(band,{durationMs:7000,hasAudio:true}),/INVALID_SPEAKING_EVIDENCE/u);
 assert.throws(()=>validateDiagnosticSpeakingAnalysis(fixture(),{durationMs:7000,hasAudio:false}),/PRONUNCIATION_REQUIRES_AUDIO/u);
});
test('speaker corrections never retain feedback grounded in reassigned examiner speech',()=>{
 const output=validateDiagnosticSpeakingAnalysis(fixture(),{durationMs:7000,hasAudio:true});
 assert.throws(()=>reviewDiagnosticSpeakerTurns(output,[{segmentIndex:0,speaker:'EXAMINER'}]),/SPEAKER_REVIEW_INVALIDATES_EVIDENCE/u);
 assert.throws(()=>reviewDiagnosticSpeakerTurns(output,[]),/INVALID_SPEAKER_REVIEW/u);
 assert.equal(reviewDiagnosticSpeakerTurns(output,[{segmentIndex:0,speaker:'CANDIDATE'}]).segments[0].speaker,'CANDIDATE');
 const prompt=buildDiagnosticSpeakingPrompt({durationMs:420000});
 assert.match(prompt.system,/untrusted/iu);assert.match(prompt.system,/not.*official/iu);assert.match(prompt.system,/fillers/iu);
});
