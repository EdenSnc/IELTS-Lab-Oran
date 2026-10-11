/** Transport only; callers must authenticate and load verified private bytes. */
export function diagnosticRecordingAudioResponse(bytes:Uint8Array,range:string|null){
 const headers=new Headers({'Content-Type':'audio/wav','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
 let start=0,end=bytes.length-1;
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/u.exec(range);
  const suffix=match&&!match[1]?Number(match[2]):null;
  start=suffix!==null?Math.max(0,bytes.length-suffix):Number(match?.[1]);
  end=suffix!==null?bytes.length-1:Math.min(match?.[2]?Number(match[2]):bytes.length-1,bytes.length-1);
  if(!match||(!match[1]&&!match[2])||(suffix!==null&&(!Number.isSafeInteger(suffix)||suffix<=0))
    ||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length){
    headers.set('Content-Range',`bytes */${bytes.length}`);headers.set('Content-Length','0');return new Response(null,{status:416,headers});
  }
  headers.set('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
 }
 // Explicit streaming avoids Vercel's buffered-response limit for a full
 // seven-minute WAV. Backpressure bounds each emitted chunk to 64 KiB.
 let offset=start;
 const body=new ReadableStream<Uint8Array>({pull(controller){
  if(offset>end){controller.close();return;}
  const next=Math.min(offset+65536,end+1);controller.enqueue(bytes.subarray(offset,next));offset=next;
 },cancel(){offset=end+1;}});
 return new Response(body,{status:range?206:200,headers});
}
