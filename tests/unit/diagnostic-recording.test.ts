import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeDiagnosticWav,parseDiagnosticWav,joinDiagnosticWav } from '../../src/lib/diagnostic/recording-core';

test('diagnostic PCM capture measures actual samples and rejects disguised/corrupt/oversized audio',()=>{
  const samples=new Float32Array(16000).fill(0.25);
  const wav=encodeDiagnosticWav(samples);
  assert.equal(wav.length,32044);assert.equal(parseDiagnosticWav(wav).durationMs,1000);
  const rate=wav.slice();new DataView(rate.buffer).setUint32(24,48000,true);
  assert.throws(()=>parseDiagnosticWav(rate),/INVALID_DIAGNOSTIC_AUDIO/u);
  const channels=wav.slice();new DataView(channels.buffer).setUint16(22,2,true);
  assert.throws(()=>parseDiagnosticWav(channels),/INVALID_DIAGNOSTIC_AUDIO/u);
  assert.throws(()=>parseDiagnosticWav(wav.subarray(0,wav.length-1)),/INVALID_DIAGNOSTIC_AUDIO/u);
  assert.throws(()=>parseDiagnosticWav(new TextEncoder().encode('<svg>not audio</svg>')),/INVALID_DIAGNOSTIC_AUDIO/u);
  assert.throws(()=>parseDiagnosticWav(encodeDiagnosticWav(new Float32Array(80001))),/INVALID_DIAGNOSTIC_AUDIO/u);
});
test('final diagnostic WAV joins intact ordered sample payloads, not container headers',()=>{
  const first=encodeDiagnosticWav(new Float32Array(16000).fill(0.5));
  const second=encodeDiagnosticWav(new Float32Array(32000).fill(-0.5));
  const result=joinDiagnosticWav([first,second]);
  assert.equal(parseDiagnosticWav(result,{maxDurationMs:420000}).durationMs,3000);
  assert.equal(result.length,96044);
  assert.equal(new DataView(result.buffer).getInt16(44,true),16383);
  assert.equal(new DataView(result.buffer).getInt16(32044,true),-16384);
  assert.throws(()=>joinDiagnosticWav([]),/INVALID_DIAGNOSTIC_AUDIO/u);
});
