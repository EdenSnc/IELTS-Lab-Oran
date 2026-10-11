import assert from 'node:assert/strict';
import {test} from 'node:test';

test('readiness AI uses the actual 16-minute rubric and only evidence-backed internal ratings',async()=>{
 const m=await import('../../src/lib/diagnostic/readiness-writing-core');
 const answer='I disagree. Preventive care can improve health.';
 const feedback={criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,rating:1,observation:'Develop the explanation.',evidence:['Preventive care']})),nextSteps:['Develop examples.'],limitations:['Short 16-minute response.']};
 assert.deepEqual(m.parseReadinessWritingFeedback(feedback,answer).criteria.map(c=>c.rating),[1,1,1,1]);
 assert.throws(()=>m.parseReadinessWritingFeedback({...feedback,criteria:feedback.criteria.map(c=>({...c,rating:7}))},answer));
 assert.throws(()=>m.parseReadinessWritingFeedback({...feedback,criteria:feedback.criteria.map(c=>({...c,evidence:['invented quote']}))},answer));
 assert.throws(()=>m.parseReadinessWritingFeedback({...feedback,criteria:feedback.criteria.map(c=>({...c,rating:2,evidence:[]}))},''));
 const prompt=m.buildReadinessWritingPrompt({prompt:'Discuss future health.',answer,rubric:[{id:'task',label:'Task response',foundation:'No position.',conditional:'Limited development.',ready:'Clear supported position.'}]});
 assert.equal(JSON.parse(prompt.data).timeLimitMinutes,16);
 assert.match(prompt.system,/not.*IELTS band/i);assert.match(prompt.system,/untrusted/i);
});
