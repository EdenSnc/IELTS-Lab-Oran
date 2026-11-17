import assert from 'node:assert/strict';
import test from 'node:test';
test('diagnostic provider requests isolate the free model and send inline audio without account/private notes',async t=>{
 process.env.DATABASE_URL??='postgresql://postgres:postgres@127.0.0.1:55322/postgres';
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
 process.env.DIAGNOSTIC_AI_ENABLED='true';process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED='true';process.env.GEMINI_API_KEY='synthetic-transport-key-only';
 process.env.GEMINI_WRITING_MODELS='legacy-model-must-not-leak';
 const original=globalThis.fetch;const requests:{url:string;body:{generationConfig?:{responseMimeType?:string};contents:{parts:unknown[]}[]}}[]=[];
 globalThis.fetch=async(input,init)=>{
  const request=new Request(input,init);requests.push({url:request.url,body:JSON.parse(await request.text())});
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{}'}],role:'model'},finishReason:'STOP'}],usageMetadata:{promptTokenCount:4,candidatesTokenCount:2},modelVersion:'synthetic-response-only'}),{headers:{'content-type':'application/json'}});
 };
 t.after(()=>{globalThis.fetch=original;for(const key of ['DIAGNOSTIC_AI_ENABLED','DIAGNOSTIC_AI_DATA_USE_APPROVED','GEMINI_API_KEY','GEMINI_WRITING_MODELS'])delete process.env[key];});
 const speaking=await import('../../src/lib/diagnostic/analysis-service');const writing=await import('../../src/lib/diagnostic/writing-service');
 await speaking.generateDiagnosticSpeakingAnalysis({audio:new Uint8Array([1,2,3]),durationMs:1000});
 await writing.generateDiagnosticWritingFeedback({prompt:'Synthetic Task 2',answer:'Synthetic response',manifestHash:'a'.repeat(64),questionId:'fixture',promptVersion:'fixture',inputHash:'b'.repeat(64),rubric:null});
 assert.equal(requests.length,2);
 for(const request of requests){assert.ok(request.url.includes('/models/gemini-3.5-flash-lite:generateContent'));assert.equal(request.body.generationConfig?.responseMimeType,'application/json');}
 const parts=requests[0].body.contents[0].parts;assert.deepEqual(parts[1],{inlineData:{mimeType:'audio/wav',data:'AQID'}});
 assert.ok(!/sessionId|actorUserId|examinerNotes|providerCheckoutId/u.test(JSON.stringify(requests[0].body)));
});
