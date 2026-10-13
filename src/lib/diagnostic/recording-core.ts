/** Canonical, uncompressed 16 kHz mono PCM. Duration comes from samples, never
 * a browser-supplied duration, extension or MIME. No platform decoder needed. */
const RATE=16000;
export function encodeDiagnosticWav(samples:Float32Array):Uint8Array{
  const pcm=new Uint8Array(samples.length*2),view=new DataView(pcm.buffer);
  for(let i=0;i<samples.length;i++){
    const value=Number.isFinite(samples[i])?Math.max(-1,Math.min(1,samples[i])):0;
    view.setInt16(i*2,Math.trunc(value*(value<0?32768:32767)),true);
  }
  return wrapPcm(pcm);
}
function wrapPcm(pcm:Uint8Array){
  const bytes=new Uint8Array(44+pcm.length),view=new DataView(bytes.buffer);
  for(const [offset,text] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']] as const)bytes.set(new TextEncoder().encode(text),offset);
  view.setUint32(4,36+pcm.length,true);view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,RATE,true);view.setUint32(28,RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);view.setUint32(40,pcm.length,true);
  bytes.set(pcm,44);return bytes;
}
export function parseDiagnosticWav(bytes:Uint8Array,{maxDurationMs=5000}:{maxDurationMs?:number}={}){
  const fail=()=>{throw new Error('INVALID_DIAGNOSTIC_AUDIO');};
  if(bytes.length<=44||bytes.length>44+Math.floor(maxDurationMs*RATE/1000)*2)return fail();
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=(start:number,n:number)=>new TextDecoder().decode(bytes.subarray(start,start+n));
  if(text(0,4)!=='RIFF'||text(8,4)!=='WAVE'||text(12,4)!=='fmt '||text(36,4)!=='data'
    ||view.getUint32(4,true)!==bytes.length-8||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1
    ||view.getUint16(22,true)!==1||view.getUint32(24,true)!==RATE||view.getUint32(28,true)!==RATE*2
    ||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2!==0)return fail();
  const sampleCount=(bytes.length-44)/2;return{pcm:bytes.subarray(44),sampleCount,durationMs:sampleCount*1000/RATE};
}
export function joinDiagnosticWav(chunks:Uint8Array[]){
  if(chunks.length<1||chunks.length>96)throw new Error('INVALID_DIAGNOSTIC_AUDIO');
  const parsed=chunks.map(chunk=>parseDiagnosticWav(chunk));
  const samples=parsed.reduce((sum,chunk)=>sum+chunk.sampleCount,0);
  if(samples>RATE*420)throw new Error('INVALID_DIAGNOSTIC_AUDIO');
  const pcm=new Uint8Array(samples*2);let offset=0;
  for(const chunk of parsed){pcm.set(chunk.pcm,offset);offset+=chunk.pcm.length;}
  return wrapPcm(pcm);
}
