import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {DiagnosticError} from './protocol';
export type DiagnosticRecordingStorage={assertPrivate:()=>Promise<void>;put:(key:string,bytes:Uint8Array)=>Promise<void>;get:(key:string)=>Promise<Uint8Array>;remove:(keys:string[])=>Promise<void>};
function configuration(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket=process.env.PRIVATE_DIAGNOSTIC_RECORDING_BUCKET??'private-diagnostic-recordings';
  if(!url||!key||key.length<20||!/^[-a-z0-9]{1,80}$/u.test(bucket))throw new DiagnosticError('RECORDING_UNAVAILABLE',503);
  return{client:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),bucket};
}
function validKey(key:string){if(!/^diagnostic\/[0-9a-f-]{36}\/[0-9]{1,2}\.wav$/u.test(key))throw new Error('INVALID_DIAGNOSTIC_STORAGE_KEY');return key;}
export const diagnosticRecordingStorage:DiagnosticRecordingStorage={
  async assertPrivate(){const {client,bucket}=configuration();const {data,error}=await client.storage.getBucket(bucket);
    if(error||!data||data.public)throw new DiagnosticError('RECORDING_UNAVAILABLE',503);},
  async get(key){const{client,bucket}=configuration();const{data,error}=await client.storage.from(bucket).download(validKey(key));
    if(error||!data||data.size>160044)throw new Error('DIAGNOSTIC_AUDIO_STORAGE_READ_FAILED');return new Uint8Array(await data.arrayBuffer());},
  async put(key,bytes){const{client,bucket}=configuration();const{error}=await client.storage.from(bucket).upload(validKey(key),bytes,{contentType:'audio/wav',cacheControl:'0',upsert:false});
    if(!error)return;
    // Lost successful responses/duplicate uploads may retry, but never overwrite.
    const saved=await diagnosticRecordingStorage.get(key);
    if(createHash('sha256').update(saved).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('DIAGNOSTIC_AUDIO_STORAGE_WRITE_FAILED');},
  async remove(keys){if(!keys.length)return;const{client,bucket}=configuration();const{error}=await client.storage.from(bucket).remove(keys.map(validKey));
    if(error)throw new Error('DIAGNOSTIC_AUDIO_STORAGE_DELETE_FAILED');},
};
