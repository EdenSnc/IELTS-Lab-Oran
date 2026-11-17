import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readinessMarkingSchema} from '../../src/lib/diagnostic/readiness-policy';
import {DiagnosticAutosave} from '../../src/lib/diagnostic/client-core';

test('closed-section drafts are preserved as unacknowledged copies without blocking later answers',async()=>{
 const rows=['l','r'].map(questionId=>({questionId,answer:'',markedForReview:false,version:0,savedAt:null,finalizedAt:null}));
 const queue=new DiagnosticAutosave(rows);queue.edit('l',{answer:'late listening'});
 const extract=(queue as unknown as {preserveClosedDrafts:(ids:Set<string>)=>typeof rows}).preserveClosedDrafts;
 assert.equal(typeof extract,'function');const closed=extract.call(queue,new Set(['r']));
 assert.equal(closed[0].answer,'late listening');assert.equal(closed[0].savedAt,null);
 assert.equal(queue.view().responses[0].answer,'','not a false server acknowledgement');
 queue.edit('r',{answer:'current reading'});
 const sent:string[]=[];await queue.flush(async input=>{sent.push(input.questionId);return {...rows[1],...input,version:1,savedAt:new Date().toISOString()};});
 assert.deepEqual(sent,['r']);assert.equal(queue.hasPending,false);
});
test('reloaded teacher review sends only editable fields, not stored recommendation/provenance',async()=>{
 const file='../../src/lib/diagnostic/readiness-client-core';const m=await import(file).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});assert.ok(m);
 const stored={writing:[2,2,2,2],speaking:null,notes:'A clear response needs a separate Speaking review.',decision:'CONDITIONAL',overrideReason:'',recommendation:{category:'CONDITIONAL',policyVersion:1},meaning:'Internal readiness estimate'};
 const draft=m.readinessMarkingDraft(stored);
 assert.ok(readinessMarkingSchema.safeParse({...draft,expectedVersion:1,release:false}).success);
 assert.ok(!Object.hasOwn(draft,'meaning'));assert.ok(!Object.hasOwn(draft,'recommendation'));
});
