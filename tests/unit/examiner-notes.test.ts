import assert from 'node:assert/strict';
import {test} from 'node:test';
test('unsaved examiner notes survive consent updates without stranding the optimistic version',async()=>{
 const file='../../src/lib/diagnostic/examiner-notes-core';const m=await import(file).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});assert.ok(m);
 const before={notes:'Persisted notes',version:1,recordingConsented:true};
 assert.deepEqual(m.reconcileExaminerStatus(before,{notes:'Persisted notes',version:2,recordingConsented:false},true),{notes:'Persisted notes',version:2,recordingConsented:false});
 const conflict=m.reconcileExaminerStatus(before,{notes:'Another examiner edit',version:3,recordingConsented:false},true);
 assert.equal(conflict.version,1);assert.equal(conflict.notes,'Persisted notes');assert.equal(conflict.recordingConsented,false);
 assert.equal(m.reconcileExaminerStatus(conflict,{notes:'Another examiner edit',version:4,recordingConsented:false},true).version,1);
});
