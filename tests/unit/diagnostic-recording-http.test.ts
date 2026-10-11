import assert from 'node:assert/strict';
import test from 'node:test';
import {diagnosticRecordingAudioResponse} from '../../src/lib/diagnostic/recording-http';
test('full-length private PCM replay is streamed in bounded chunks, not a buffered 13 MB function payload',async()=>{
 const bytes=new Uint8Array(13440044);bytes[0]=82;bytes[bytes.length-1]=91;
 const response=diagnosticRecordingAudioResponse(bytes,null);assert.equal(response.status,200);
 assert.equal(response.headers.get('Content-Type'),'audio/wav');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const reader=response.body!.getReader();let count=0,first=-1,last=-1;
 while(true){const{done,value}=await reader.read();if(done)break;assert.ok(value.length<=65536);if(count===0)first=value[0];count+=value.length;last=value.at(-1)!;}
 assert.equal(count,13440044);assert.equal(first,82);assert.equal(last,91);
 assert.equal(response.headers.get('Content-Length'),null);
});
test('private audio byte ranges are exact, including suffix ranges; invalid requests remain 416',async()=>{
 const bytes=new Uint8Array([10,20,30,40,50]);
 const range=diagnosticRecordingAudioResponse(bytes,'bytes=1-3');assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 1-3/5');
 assert.deepEqual(new Uint8Array(await range.arrayBuffer()),new Uint8Array([20,30,40]));
 const suffix=diagnosticRecordingAudioResponse(bytes,'bytes=-2');assert.equal(suffix.status,206);assert.deepEqual(new Uint8Array(await suffix.arrayBuffer()),new Uint8Array([40,50]));
 for(const invalid of ['bytes=5-','bytes=4-2','bytes=-0','bytes=0-1,3-4','bytes=9007199254740992-'])assert.equal(diagnosticRecordingAudioResponse(bytes,invalid).status,416);
});
