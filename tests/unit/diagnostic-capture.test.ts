import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {parseDiagnosticWav} from '../../src/lib/diagnostic/recording-core';

function worklet(rate:number){
  const path=new URL('../../public/diagnostic-pcm-worklet.js',import.meta.url);
  assert.ok(existsSync(path),'PCM capture worklet must exist');
  let Processor: new()=>{port:{onmessage:(event:{data:unknown})=>void};process:(inputs:Float32Array[][])=>boolean};
  const messages:{type:string;samples?:Float32Array;peak?:number}[]=[];
  vm.runInNewContext(readFileSync(path,'utf8'),{sampleRate:rate,Float32Array,Math,
    AudioWorkletProcessor:class{port={postMessage:(data:typeof messages[number])=>messages.push(data),onmessage:()=>{}};},
    registerProcessor:(name:string,klass:typeof Processor)=>{assert.equal(name,'diagnostic-pcm');Processor=klass;}});
  const processor=new Processor!();
  const command=(data:unknown)=>processor.port.onmessage({data});
  function feed(count:number,channels=1){for(let offset=0;offset<count;offset+=128){
    const size=Math.min(128,count-offset);processor.process([Array.from({length:channels},(_,channel)=>new Float32Array(size).fill(channel?-.25:.5))]);
  }}
  return{processor,messages,command,feed};
}
for(const rate of [44100,48000])test(`actual ${rate}Hz worklet downsampling emits five-second mono chunks and exact final flush`,()=>{
  const w=worklet(rate);w.feed(rate);assert.equal(w.messages.filter(m=>m.type==='samples').length,0);
  w.command({type:'start',maxSamples:6720000});w.feed(rate*6,2);w.command({type:'stop'});
  const chunks=w.messages.filter(m=>m.type==='samples').map(m=>m.samples!);
  assert.deepEqual(chunks.map(c=>c.length),[80000,16000]);
  assert.ok(chunks.every(c=>Math.abs(c[100]-.125)<1e-5),'channels must be mixed to mono');
  assert.equal(w.messages.at(-1)?.type,'stopped');
  w.feed(rate);assert.equal(w.messages.filter(m=>m.type==='samples').length,2);
});
test('worklet safely handles absent audio, discard and the 420-second ceiling',()=>{
  const w=worklet(16000);assert.equal(w.processor.process([]),true);
  w.command({type:'start',maxSamples:99999999});w.feed(16000*421);
  assert.equal(w.messages.filter(m=>m.type==='samples').reduce((sum,m)=>sum+m.samples!.length,0),6720000);
  assert.equal(w.messages.filter(m=>m.type==='limit').length,1);
  const discarded=worklet(44100);discarded.command({type:'start'});discarded.feed(44100);discarded.command({type:'discard'});
  assert.equal(discarded.messages.filter(m=>m.type==='samples').length,0);
});
test('queue retains immutable bytes and ordered sequence after network failure, finalizes only acknowledgements',async()=>{
  const {DiagnosticUploadQueue}=await import('../../src/lib/diagnostic/recording-client');
  const calls:{sequence:number;bytes:Uint8Array}[]=[];let fails=true;const finalized:number[]=[];
  const q=new DiagnosticUploadQueue({upload:async(sequence,bytes)=>{calls.push({sequence,bytes:bytes.slice()});if(fails){fails=false;throw new Error('offline');}return{sequence,state:'STORED'};},
    finalize:async(count)=>{finalized.push(count);return{state:'READY'};}});
  const samples=new Float32Array(16000).fill(.5);q.append(samples);samples.fill(-.5);q.append(new Float32Array(16000).fill(-.25));
  await assert.rejects(q.retry(),/offline/);assert.equal(q.snapshot().pending,2);assert.equal(q.snapshot().acknowledged,0);
  await assert.rejects(q.finalize(),/CAPTURE_NOT_STOPPED/);q.stop();await assert.rejects(q.finalize(),/UPLOAD_PENDING/);
  await q.retry();assert.deepEqual(calls.map(c=>c.sequence),[0,0,1]);assert.deepEqual(calls[0].bytes,calls[1].bytes);
  assert.equal(new DataView(calls[1].bytes.buffer).getInt16(44,true),16383);assert.equal(parseDiagnosticWav(calls[2].bytes).durationMs,1000);
  await q.finalize();await q.finalize();assert.deepEqual(finalized,[2]);assert.equal(q.snapshot().ready,true);
});
test('queue bounds unsaved memory, sample total and chunks, discards denied consent even in flight',async()=>{
  const {DiagnosticUploadQueue}=await import('../../src/lib/diagnostic/recording-client');
  let resolveUpload!:(value:{sequence:number;state:string})=>void;
  const q=new DiagnosticUploadQueue({upload:()=>new Promise(resolve=>{resolveUpload=resolve;}),finalize:async()=>({state:'READY'})});
  for(let i=0;i<6;i++)q.append(new Float32Array(80000));
  assert.throws(()=>q.append(new Float32Array(1)),/UPLOAD_BUFFER_FULL/);assert.equal(q.snapshot().pending,6);
  const pending=q.retry();q.discard();resolveUpload({sequence:0,state:'STORED'});await pending;
  assert.deepEqual(q.snapshot(),{pending:0,acknowledged:0,chunkCount:6,stopped:true,discarded:true,ready:false});
  assert.throws(()=>q.append(new Float32Array(1)),/CAPTURE_STOPPED/);await assert.rejects(q.finalize(),/RECORDING_NOT_ELIGIBLE/);
  const total=new DiagnosticUploadQueue({upload:async(sequence)=>({sequence,state:'STORED'}),finalize:async()=>({state:'READY'})});
  for(let i=0;i<84;i++){total.append(new Float32Array(80000));await total.retry();}
  assert.throws(()=>total.append(new Float32Array(1)),/CAPTURE_LIMIT/);
  const chunks=new DiagnosticUploadQueue({upload:async(sequence)=>({sequence,state:'STORED'}),finalize:async()=>({state:'READY'})});
  for(let i=0;i<96;i++){chunks.append(new Float32Array(1));await chunks.retry();}assert.throws(()=>chunks.append(new Float32Array(1)),/CAPTURE_LIMIT/);
});
test('reload recovery accepts only all contiguous acknowledged chunks and never starts a new segment',async()=>{
  const {diagnosticRecordingRecovery}=await import('../../src/lib/diagnostic/recording-client');
  const base={id:'recording',state:'UPLOADING',chunkCount:null,durationMs:null,expiresAt:'2030-01-01T00:00:00Z'};
  assert.deepEqual(diagnosticRecordingRecovery({...base,chunks:[{sequence:0,state:'STORED'},{sequence:1,state:'STORED'}]}),{canCapture:false,canFinalize:true,chunkCount:2,ready:false});
  assert.equal(diagnosticRecordingRecovery({...base,chunks:[{sequence:0,state:'STORED'},{sequence:1,state:'PENDING'}]}).canFinalize,false);
  assert.equal(diagnosticRecordingRecovery({...base,chunks:[{sequence:1,state:'STORED'}]}).canFinalize,false);
  assert.equal(diagnosticRecordingRecovery({...base,chunks:[]}).canCapture,false);
  assert.equal(diagnosticRecordingRecovery(null).canCapture,true);
});
test('microphone preflight does not capture or upload, uses static worklet and closes all resources',async()=>{
  const {prepareDiagnosticMicrophone}=await import('../../src/lib/diagnostic/recording-client');
  const original=Object.getOwnPropertyDescriptors(globalThis);const events:string[]=[];let permissionDenied=false;
  const tracks=[{onended:null,stop:()=>events.push('track-stop')}];let node:{port:{onmessage:((event:{data:unknown})=>void)|null;postMessage:(data:{type:string})=>void}};
  const install=(name:string,value:unknown)=>Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  install('isSecureContext',true);install('navigator',{mediaDevices:{getUserMedia:async()=>{events.push('permission');if(permissionDenied)throw new Error('denied');return{getTracks:()=>tracks};}}});
  install('AudioContext',class{state='running';destination={};audioWorklet={addModule:async(url:string)=>{events.push(url);}};
    resume=async()=>{};close=async()=>{events.push('context-close');};createMediaStreamSource=()=>({connect:()=>{},disconnect:()=>events.push('source-close')});});
  install('AudioWorkletNode',class{port={onmessage:null as ((event:{data:unknown})=>void)|null,postMessage:(data:{type:string})=>{
    events.push(data.type);if(data.type==='stop')this.port.onmessage?.({data:{type:'stopped'}});}};
    constructor(){node={port:this.port};}connect(){}disconnect(){events.push('node-close');}});
  try{
    let captured=0;const mic=await prepareDiagnosticMicrophone({onSamples:()=>{captured++;},onActivity:()=>{},onLimit:()=>{},onFailure:()=>{}});
    assert.deepEqual(events,['permission','/diagnostic-pcm-worklet.js']);assert.equal(captured,0);
    mic.start(16000);node!.port.onmessage!({data:{type:'samples',samples:new Float32Array(16000)}});assert.equal(captured,1);
    await mic.stop();assert.ok(events.includes('track-stop'));assert.ok(events.includes('context-close'));
    const second=await prepareDiagnosticMicrophone({onSamples:()=>{},onActivity:()=>{},onLimit:()=>{},onFailure:()=>{}});second.discard();assert.equal(events.filter(e=>e==='track-stop').length,2);
    permissionDenied=true;await assert.rejects(prepareDiagnosticMicrophone({onSamples:()=>{},onActivity:()=>{},onLimit:()=>{},onFailure:()=>{}}),/denied/);
    permissionDenied=false;const controller=new AbortController();controller.abort();
    await assert.rejects(prepareDiagnosticMicrophone({onSamples:()=>{},onActivity:()=>{},onLimit:()=>{},onFailure:()=>{}},controller.signal),/CAPTURE_CANCELLED/);
  }finally{for(const name of ['isSecureContext','navigator','AudioContext','AudioWorkletNode']){if(original[name])Object.defineProperty(globalThis,name,original[name]);else Reflect.deleteProperty(globalThis,name);}}
});
test('capture permission requires confirmed adult consent, server availability, active deadline and no withdrawal',async()=>{
  const {diagnosticCaptureAllowed}=await import('../../src/lib/diagnostic/recording-client');
  const state={state:'ACTIVE',adultAttested:true,recordingConsented:true,privacyRevokedAt:null,captureAvailable:true,
    eligibility:{canRecord:true},deadline:'2026-10-07T10:07:00Z'};
  assert.equal(diagnosticCaptureAllowed(state,Date.parse('2026-10-07T10:06:59Z')),true);
  assert.equal(diagnosticCaptureAllowed(state,Date.parse(state.deadline)),false);
  for(const patch of [{adultAttested:false},{recordingConsented:false},{privacyRevokedAt:'2026-10-07T10:00:00Z'},{captureAvailable:false},{eligibility:{canRecord:false}},{state:'COMPLETED'}]){
    assert.equal(diagnosticCaptureAllowed({...state,...patch},Date.parse('2026-10-07T10:01:00Z')),false);
  }
  assert.equal(diagnosticCaptureAllowed({...state,state:'NOT_STARTED',deadline:null},0,true),true);
  assert.equal(diagnosticCaptureAllowed({...state,state:'NOT_STARTED',deadline:null},0),false);
});
test('permission errors are never retryable and discard unacknowledged audio',async()=>{
  const {DiagnosticUploadQueue}=await import('../../src/lib/diagnostic/recording-client');
  const q=new DiagnosticUploadQueue({upload:async()=>{throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:409});},finalize:async()=>({state:'READY'})});
  q.append(new Float32Array(16000));await assert.rejects(q.retry(),/RECORDING_NOT_ELIGIBLE/);
  assert.equal(q.snapshot().discarded,true);assert.equal(q.snapshot().pending,0);
});
test('actual recording transport uses same-origin WAV bytes and cancellation, not JSON audio',async()=>{
  const {diagnosticUploadTransport}=await import('../../src/lib/diagnostic/recording-client');
  const original=globalThis.fetch;const calls:{url:string;init:RequestInit}[]=[];
  globalThis.fetch=async(input,init)=>{calls.push({url:String(input),init:init!});return new Response(JSON.stringify(calls.length===1?{sequence:2,state:'STORED'}:{state:'READY'}),{status:200});};
  try{const transport=diagnosticUploadTransport('/api/diagnostic/sessions/id/speaking/recordings','recording');
    await transport.upload(2,new Uint8Array([1,2,3]));await transport.finalize(3);
    assert.equal(calls[0].url,'/api/diagnostic/sessions/id/speaking/recordings/recording/chunks/2');
    assert.equal(calls[0].init.credentials,'same-origin');assert.equal(new Headers(calls[0].init.headers).get('Content-Type'),'audio/wav');
    assert.deepEqual(new Uint8Array(calls[0].init.body as ArrayBuffer),new Uint8Array([1,2,3]));
    assert.equal(calls[1].init.body,'{"chunkCount":3}');transport.cancel();
  }finally{globalThis.fetch=original;}
});
test('stopped audio may be saved after the capture deadline but never after consent withdrawal or expiry',async()=>{
  const {diagnosticRecordingConsentAllowed}=await import('../../src/lib/diagnostic/recording-client');
  const state={state:'COMPLETED',adultAttested:true,recordingConsented:true,privacyRevokedAt:null,captureAvailable:true,
    eligibility:{canRecord:true},deadline:'2026-10-07T10:07:00Z'};
  assert.equal(diagnosticRecordingConsentAllowed(state,Date.parse('2026-10-07T10:08:00Z'),'2026-11-01T00:00:00Z'),true);
  assert.equal(diagnosticRecordingConsentAllowed({...state,privacyRevokedAt:'2026-10-07T10:07:00Z'},0,'2026-11-01T00:00:00Z'),false);
  assert.equal(diagnosticRecordingConsentAllowed(state,Date.parse('2026-11-01T00:00:00Z'),'2026-11-01T00:00:00Z'),false);
});
test('deadline refresh stops and flushes capture; withdrawn consent discards rather than pretending a deadline reset',async()=>{
  const {diagnosticCaptureDisposition}=await import('../../src/lib/diagnostic/recording-client');
  const state={state:'ACTIVE',adultAttested:true,recordingConsented:true,privacyRevokedAt:null,captureAvailable:true,
    eligibility:{canRecord:true},deadline:'2026-10-07T10:07:00Z'};
  assert.equal(diagnosticCaptureDisposition(state,Date.parse('2026-10-07T10:07:00Z')),'stop');
  assert.equal(diagnosticCaptureDisposition({...state,recordingConsented:false},Date.parse('2026-10-07T10:07:00Z')),'discard');
  assert.equal(diagnosticCaptureDisposition(state,Date.parse('2026-10-07T10:06:59Z')),'capture');
  assert.equal(diagnosticCaptureDisposition({...state,state:'NOT_STARTED',deadline:null},0),'preflight');
});
test('idle queue sends nothing, malformed acknowledgements cannot finalize, denied finalization discards audio',async()=>{
  const {DiagnosticUploadQueue}=await import('../../src/lib/diagnostic/recording-client');let requests=0,badAck=true;
  const q=new DiagnosticUploadQueue({upload:async(sequence)=>{requests++;return{sequence,state:badAck?'PENDING':'STORED'};},
    finalize:async()=>{throw Object.assign(new Error('RECORDING_NOT_ELIGIBLE'),{status:403});}});
  await q.retry();assert.equal(requests,0);assert.equal(q.snapshot().pending,0);
  q.append(new Float32Array(16000));await assert.rejects(q.retry(),/UPLOAD_NOT_ACKNOWLEDGED/);assert.equal(q.snapshot().acknowledged,0);
  q.stop();await assert.rejects(q.finalize(),/UPLOAD_PENDING/);badAck=false;await q.retry();
  await assert.rejects(q.finalize(),/RECORDING_NOT_ELIGIBLE/);assert.equal(q.snapshot().discarded,true);assert.equal(q.snapshot().ready,false);
});
