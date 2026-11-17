import {encodeDiagnosticWav} from './recording-core';

export type DiagnosticRecordingStatus={id:string;state:string;chunkCount:number|null;durationMs:number|null;expiresAt:string;
  chunks:{sequence:number;state:string}[]};
type UploadTransport={upload:(sequence:number,bytes:Uint8Array)=>Promise<{sequence:number;state:string}>;
  finalize:(chunkCount:number)=>Promise<{state:string}>;cancel?:()=>void};

/** Six five-second WAVs (~960 kB) maximum. Raw audio never leaves memory except
 * via the protected upload endpoint; retries keep the same immutable sequence. */
export class DiagnosticUploadQueue{
  private entries:{sequence:number;bytes:Uint8Array}[]=[];
  private count=0;private samples=0;private acknowledged=0;
  private stopped=false;private discarded=false;private ready=false;
  private uploading:Promise<void>|null=null;private finalizing:Promise<void>|null=null;
  constructor(private readonly transport:UploadTransport){}
  snapshot(){return{pending:this.entries.length,acknowledged:this.acknowledged,chunkCount:this.count,
    stopped:this.stopped,discarded:this.discarded,ready:this.ready};}
  append(samples:Float32Array){
    if(this.stopped||this.discarded)throw new Error('CAPTURE_STOPPED');
    if(samples.length<1||samples.length>80000)throw new Error('INVALID_DIAGNOSTIC_AUDIO');
    if(this.count>=96||this.samples+samples.length>6720000)throw new Error('CAPTURE_LIMIT');
    if(this.entries.length>=6)throw new Error('UPLOAD_BUFFER_FULL');
    this.entries.push({sequence:this.count++,bytes:encodeDiagnosticWav(samples)});this.samples+=samples.length;
  }
  stop(){this.stopped=true;}
  discard(){this.discarded=true;this.stopped=true;this.entries=[];this.acknowledged=0;this.ready=false;this.transport.cancel?.();}
  retry():Promise<void>{
    if(this.discarded)return Promise.reject(new Error('RECORDING_NOT_ELIGIBLE'));
    if(this.uploading)return this.uploading;
    this.uploading=this.drain().catch(error=>{if(isDiagnosticRecordingDenied(error))this.discard();throw error;}).finally(()=>{this.uploading=null;});return this.uploading;
  }
  private async drain(){
    while(this.entries.length&&!this.discarded){
      const entry=this.entries[0],ack=await this.transport.upload(entry.sequence,entry.bytes.slice());
      if(this.discarded)return;
      if(ack.sequence!==entry.sequence||ack.state!=='STORED')throw new Error('UPLOAD_NOT_ACKNOWLEDGED');
      this.entries.shift();this.acknowledged++;
    }
  }
  async finalize():Promise<void>{
    if(this.discarded)throw new Error('RECORDING_NOT_ELIGIBLE');
    if(!this.stopped)throw new Error('CAPTURE_NOT_STOPPED');
    if(this.entries.length||this.uploading)throw new Error('UPLOAD_PENDING');
    if(this.count<1||this.acknowledged!==this.count)throw new Error('RECORDING_INCOMPLETE');
    if(this.ready)return;if(this.finalizing)return this.finalizing;
    this.finalizing=(async()=>{const result=await this.transport.finalize(this.count);
      if(this.discarded)throw new Error('RECORDING_NOT_ELIGIBLE');
      if(result.state!=='READY')throw new Error('FINALIZE_NOT_ACKNOWLEDGED');this.ready=true;
    })().catch(error=>{if(isDiagnosticRecordingDenied(error))this.discard();throw error;}).finally(()=>{this.finalizing=null;});return this.finalizing;
  }
}

export function isDiagnosticRecordingDenied(error:unknown){
  const status=typeof error==='object'&&error!==null&&'status' in error?error.status:null;
  return status===401||status===403||status===404||status===409;
}
export function diagnosticUploadTransport(endpoint:string,recordingId:string){
  const controllers=new Set<AbortController>();
  async function request<T>(url:string,init:RequestInit):Promise<T>{
    const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store',credentials:'same-origin'});
      const result=await response.json();if(!response.ok)throw Object.assign(new Error(typeof result.error==='string'?result.error:'UPLOAD_FAILED'),{status:response.status});return result as T;
    }finally{clearTimeout(timeout);controllers.delete(controller);}
  }
  return{upload:(sequence:number,bytes:Uint8Array)=>request<{sequence:number;state:string}>(`${endpoint}/${recordingId}/chunks/${sequence}`,
    {method:'PUT',headers:{'Content-Type':'audio/wav'},body:bytes.slice().buffer}),
    finalize:(chunkCount:number)=>request<{state:string}>(`${endpoint}/${recordingId}`,
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chunkCount})}),
    cancel:()=>{for(const controller of controllers)controller.abort();controllers.clear();}};
}

/** A reload has lost unsaved bytes. Never append a new capture segment or
 * overwrite a PENDING chunk whose immutable bytes are no longer available. */
export function diagnosticRecordingRecovery(recording:DiagnosticRecordingStatus|null){
  if(!recording)return{canCapture:true,canFinalize:false,chunkCount:0,ready:false};
  const chunks=recording.chunks;
  const complete=chunks.length>0&&chunks.length<=96&&chunks.every((chunk,index)=>chunk.sequence===index&&chunk.state==='STORED');
  return{canCapture:false,canFinalize:recording.state==='UPLOADING'&&complete,chunkCount:chunks.length,ready:recording.state==='READY'};
}

export type DiagnosticCaptureView={state:string;adultAttested:boolean;recordingConsented:boolean;privacyRevokedAt:string|null;
  captureAvailable:boolean;eligibility:{canRecord:boolean};deadline:string|null};
export function diagnosticRecordingConsentAllowed(view:DiagnosticCaptureView,now:number,expiresAt?:string){
  return view.adultAttested&&view.recordingConsented&&!view.privacyRevokedAt&&view.captureAvailable&&view.eligibility.canRecord
    &&['NOT_STARTED','ACTIVE','COMPLETED'].includes(view.state)&&(!expiresAt||now<Date.parse(expiresAt));
}
export function diagnosticCaptureAllowed(view:DiagnosticCaptureView,now:number,preflight=false){
  return diagnosticRecordingConsentAllowed(view,now)
    &&((preflight&&view.state==='NOT_STARTED')||(view.state==='ACTIVE'&&view.deadline!==null&&now<Date.parse(view.deadline)));
}
export function diagnosticCaptureDisposition(view:DiagnosticCaptureView,now:number,expiresAt?:string){
  if(!diagnosticRecordingConsentAllowed(view,now,expiresAt))return'discard';
  if(view.state==='NOT_STARTED')return'preflight';
  return diagnosticCaptureAllowed(view,now)?'capture':'stop';
}

export type DiagnosticCapture={start:(maxSamples:number)=>void;stop:()=>Promise<void>;discard:()=>void};
type CaptureCallbacks={onSamples:(samples:Float32Array)=>void;onActivity:()=>void;onLimit:()=>void;onFailure:()=>void};
/** Browser resources are acquired only by an explicit Prepare action. Preflight
 * samples are inspected in the worklet and are never sent to the upload queue. */
export async function prepareDiagnosticMicrophone(callbacks:CaptureCallbacks,signal?:AbortSignal):Promise<DiagnosticCapture>{
  if(signal?.aborted)throw new Error('CAPTURE_CANCELLED');
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof AudioContext==='undefined'||typeof AudioWorkletNode==='undefined')throw new Error('MICROPHONE_UNSUPPORTED');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
  let context:AudioContext|undefined,source:MediaStreamAudioSourceNode|undefined,node:AudioWorkletNode|undefined;
  let closed=false,stopResolve:(()=>void)|undefined,stopReject:((error:Error)=>void)|undefined,stopTimer:ReturnType<typeof setTimeout>|undefined;
  const cleanup=()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',cleanup);clearTimeout(stopTimer);for(const track of stream.getTracks()){track.onended=null;track.stop();}
    if(node){node.port.onmessage=null;node.onprocessorerror=null;node.disconnect();}source?.disconnect();void context?.close().catch(()=>{});};
  const failure=()=>{cleanup();stopReject?.(new Error('CAPTURE_FAILED'));callbacks.onFailure();};
  try{
    signal?.addEventListener('abort',cleanup,{once:true});if(signal?.aborted){cleanup();throw new Error('CAPTURE_CANCELLED');}
    context=new AudioContext();await context.audioWorklet.addModule('/diagnostic-pcm-worklet.js');await context.resume();
    if(closed)throw new Error('CAPTURE_CANCELLED');
    if(context.state!=='running')throw new Error('MICROPHONE_UNSUPPORTED');
    source=context.createMediaStreamSource(stream);node=new AudioWorkletNode(context,'diagnostic-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    node.port.onmessage=event=>{if(closed)return;const data=event.data;
      try{if(data.type==='samples'&&data.samples instanceof Float32Array)callbacks.onSamples(data.samples);
        else if(data.type==='activity')callbacks.onActivity();
        else if(data.type==='limit')callbacks.onLimit();
        else if(data.type==='stopped'){cleanup();stopResolve?.();}
      }catch{failure();}};
    node.onprocessorerror=failure;for(const track of stream.getTracks())track.onended=failure;
    source.connect(node);node.connect(context.destination); // Worklet output is always silence, never microphone playback.
    return{start:(maxSamples)=>{if(closed)throw new Error('CAPTURE_FAILED');node!.port.postMessage({type:'start',maxSamples});},
      stop:()=>{if(closed)return Promise.resolve();return new Promise<void>((resolve,reject)=>{stopResolve=resolve;stopReject=reject;
        stopTimer=setTimeout(failure,1500);node!.port.postMessage({type:'stop'});});},
      discard:()=>{node?.port.postMessage({type:'discard'});cleanup();stopResolve?.();}};
  }catch(error){cleanup();throw error;}
}
