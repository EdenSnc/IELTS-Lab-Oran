import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateDiagnosticSpeakingAnalysis,buildDiagnosticSpeakingPrompt} from '../../src/lib/diagnostic/analysis-core';

test('readiness Speaking rates only supported language criteria and always reserves pronunciation for the teacher',()=>{
 const value={segments:[{speaker:'CANDIDATE',startMs:0,endMs:1000,text:'I enjoy reading.',confidence:1}],criteria:['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'].map(criterion=>({criterion,observation:'Limited short sample.',insufficientEvidence:criterion==='PRONUNCIATION',evidence:criterion==='PRONUNCIATION'?[]:[{segmentIndex:0,startMs:0,endMs:1000,quotation:'I enjoy reading.',basis:'TRANSCRIPT'}]})),priorities:['Develop the answer.'],limitations:['Short sample.'],audioQuality:{speechPresent:true,discontinuity:false,unreliableAttribution:false},readinessRatings:{FLUENCY_COHERENCE:1,LEXICAL_RESOURCE:1,GRAMMAR:1,PRONUNCIATION:null}};
 const input={durationMs:1000,hasAudio:true,readiness:true};
 assert.equal(validateDiagnosticSpeakingAnalysis(value,input).readinessRatings?.PRONUNCIATION,null);
 assert.throws(()=>validateDiagnosticSpeakingAnalysis({...value,readinessRatings:{...value.readinessRatings,PRONUNCIATION:2}},input));
 assert.throws(()=>validateDiagnosticSpeakingAnalysis({...value,audioQuality:{...value.audioQuality,unreliableAttribution:true}},input));
 assert.throws(()=>validateDiagnosticSpeakingAnalysis(value,{durationMs:1000,hasAudio:true}),'the older profile must not accept readiness ratings');
 const prompt=buildDiagnosticSpeakingPrompt({durationMs:1000,readinessRubric:[{id:'fluency',label:'Fluency',foundation:'Fragmented.',conditional:'Limited development.',ready:'Developed.'}]});
 assert.match(prompt.system,/pronunciation[\s\S]*null/i);assert.ok(JSON.parse(prompt.data).readinessRubric);
});
