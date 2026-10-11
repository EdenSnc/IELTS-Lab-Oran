// Focused mounted-component regressions. Actual React, Next Image/Link, CSS
// modules and diagnostic components; only same-origin HTTP transport is doubled.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../../',import.meta.url));
const label=process.argv.includes('--red')?'red':process.argv.includes('--green')?'green':'check';
const artifacts=path.join(tmpdir(),'ieltslab-diagnostic-assessment-state');
await mkdir(artifacts,{recursive:true});
const {chromium}=await import(pathToFileURL('C:/Users/Admin/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs').href);
const sessionId='11111111-1111-4111-8111-111111111111',speakingRunId='22222222-2222-4222-8222-222222222222';
const writingRunId='33333333-3333-4333-8333-333333333333';
const writing={criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,
  observation:`Existing human Writing ${criterion}.`,evidence:['Synthetic submitted response.']})),
  nextSteps:['Preserve this human Writing next step.'],limitations:['Shortened Task 2 diagnostic.']};
const assessment={state:'DRAFT',version:3,rawScores:[{skill:'LISTENING',rawScore:18,maximumRawScore:20,answered:20},
  {skill:'READING',rawScore:11,maximumRawScore:13,answered:13}],writing,speaking:{observations:['Existing human Speaking observation.'],
    nextSteps:['Existing human Speaking next step.'],limitations:['Short in-person sample.']},nextSteps:['Preserve this whole-diagnostic priority.'],
  writingRunId,speakingRunId:null,releasedAt:null,expiresAt:null};
const initial={assessment,prompt:'Synthetic Task 2 prompt for mounted UI regression.',essay:'Synthetic submitted response.',aiAvailable:true,
  run:{id:writingRunId,state:'SUCCEEDED',feedback:writing,model:'synthetic-transport-only',promptVersion:'diagnostic-writing-feedback-v1',errorCode:null}};
const analysis={available:true,recordingId:'44444444-4444-4444-8444-444444444444',run:{id:speakingRunId,state:'SUCCEEDED',version:1,
  model:'synthetic-transport-only',errorCode:null,reviewed:true,output:{segments:[{speaker:'CANDIDATE',startMs:0,endMs:1000,text:'Synthetic speech.',confidence:0.9}],
    criteria:['FLUENCY_COHERENCE','LEXICAL_RESOURCE','GRAMMAR','PRONUNCIATION'].map(criterion=>({criterion,
      observation:`Synthetic AI ${criterion} draft.`,insufficientEvidence:false,evidence:[{segmentIndex:0,startMs:0,endMs:1000,
        quotation:'Synthetic speech.',basis:criterion==='PRONUNCIATION'?'AUDIO':'TRANSCRIPT'}]})),
    priorities:['Synthetic AI Speaking next step.'],limitations:['Synthetic AI source limitation.'],
    audioQuality:{speechPresent:true,discontinuity:false,unreliableAttribution:false}}}};
const names={
  en:{apply:'Apply Speaking suggestions',reset:'Use human-only Speaking feedback',refresh:'Refresh Speaking feedback',
    observations:'Speaking observations',limitations:'Speaking limitations',save:'Save examiner feedback',saved:'Feedback saved.'},
  fr:{apply:'Appliquer les suggestions sur l’oral',reset:'Utiliser des commentaires oraux entièrement humains',refresh:'Actualiser les commentaires sur l’oral',
    observations:'Observations sur l’expression orale',limitations:'Limites de l’évaluation orale',save:'Enregistrer les commentaires',saved:'Commentaires enregistrés.'},
  ar:{apply:'تطبيق اقتراحات المحادثة',reset:'استخدام ملاحظات بشرية فقط للمحادثة',refresh:'تحديث ملاحظات المحادثة',
    observations:'ملاحظات التحدث',limitations:'حدود تقييم التحدث',save:'حفظ ملاحظات الممتحن',saved:'تم حفظ الملاحظات.'},
};
const bundle=await build({absWorkingDir:root,stdin:{contents:`import React from 'react';
  import {createRoot} from 'react-dom/client';
  import DiagnosticAssessment from './src/components/diagnostic/DiagnosticAssessment.tsx';
  createRoot(document.getElementById('root')).render(React.createElement(DiagnosticAssessment,window.__diagnosticAssessmentFixture));`,
  resolveDir:root,sourcefile:'diagnostic-assessment-state-entry.tsx',loader:'tsx'},bundle:true,write:false,
  outfile:path.join(artifacts,'app.js'),platform:'browser',format:'iife',jsx:'automatic',loader:{'.css':'local-css'},
  define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent'});
const javascript=bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents;
const css=bundle.outputFiles.find(file=>file.path.endsWith('.css')).contents;
const brand=await readFile(path.join(root,'public/ielts-lab-mark.svg'));
const server=http.createServer((request,response)=>{
  if(request.url==='/app.js'){response.setHeader('content-type','text/javascript');response.end(javascript);}
  else if(request.url==='/app.css'){response.setHeader('content-type','text/css');response.end(css);}
  else if(request.url==='/ielts-lab-mark.svg'){response.setHeader('content-type','image/svg+xml');response.end(brand);}
  else{response.setHeader('content-type','text/html');response.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js" defer></script></body></html>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[];
async function mount(locale,transport){
  const context=await browser.newContext({viewport:{width:320,height:800}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(fixture=>{window.__diagnosticAssessmentFixture=fixture;},{locale,sessionId,initial:structuredClone(initial)});
  await page.route('**/api/diagnostic/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.endsWith('/speaking/analysis')&&request.method()==='GET'){
      await route.fulfill({json:transport.invalidated?{available:false,recordingId:null,run:null}:analysis});return;
    }
    if(url.pathname.endsWith('/assessment')&&request.method()==='POST'){await transport.post(route,request.postDataJSON());return;}
    throw new Error(`Unexpected transport: ${request.method()} ${url.pathname}`);
  });
  await page.goto(origin);await page.getByRole('button',{name:names[locale].apply,exact:true}).waitFor();
  assert.equal(await page.locator('img[data-nimg]').count(),1,'Actual Next Image is mounted');
  assert.equal(await page.getByRole('link',{name:'IELTS Lab',exact:true}).getAttribute('href'),`/${locale}`);
  return{context,page,errors};
}

async function busyRegression(action){
  let begin,finish,complete;const started=new Promise(resolve=>{begin=resolve;}),hold=new Promise(resolve=>{finish=resolve;}),done=new Promise(resolve=>{complete=resolve;});
  const transport={invalidated:false,post:async(route,body)=>{
    assert.equal(body.action,action);begin();await hold;
    try{await route.fulfill({json:action==='save'?{...assessment,version:4,writing:body.writing,speaking:body.speaking,
      nextSteps:body.nextSteps,writingRunId:body.writingRunId,speakingRunId:body.speakingRunId}:
      {...assessment,state:'RELEASED',version:4,releasedAt:'2026-10-08T00:00:00.000Z',expiresAt:'2027-01-06T00:00:00.000Z'}});}finally{complete();}
  }};
  const {context,page,errors}=await mount('en',transport);
  try{
    if(action==='release')await page.getByRole('checkbox',{name:'I conducted the in-person Speaking diagnostic and reviewed all feedback.',exact:true}).check();
    await page.getByRole('button',{name:action==='save'?'Save examiner feedback':'Release participant report',exact:true}).click();await started;
    const apply=page.getByRole('button',{name:'Apply Speaking suggestions',exact:true});
    assert.equal(await apply.isDisabled(),true,`Speaking Apply must be disabled while parent ${action} is in flight`);
    assert.equal(await page.getByLabel('Speaking observations',{exact:true}).inputValue(),'Existing human Speaking observation.');
    finish();await done;
    await page.getByText(action==='save'?'Feedback saved.':'Released',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Speaking observations',{exact:true}).inputValue(),'Existing human Speaking observation.');
    assert.deepEqual(errors,[]);
  }finally{finish();await done;await page.screenshot({path:path.join(artifacts,`${label}-${action}.png`),fullPage:true});await context.close();}
}

async function humanOnlyRegression(locale){
  const posted=[];const transport={invalidated:false,post:async(route,body)=>{
    posted.push(body);
    if(transport.invalidated&&body.speakingRunId){await route.fulfill({status:400,json:{error:'INVALID_RESPONSE'}});return;}
    await route.fulfill({json:{...assessment,version:4,writing:body.writing,speaking:body.speaking,nextSteps:body.nextSteps,
      writingRunId:body.writingRunId,speakingRunId:body.speakingRunId}});
  }};
  const {context,page,errors}=await mount(locale,transport),m=names[locale];
  try{
    const humanWriting=structuredClone(writing);
    humanWriting.criteria[0].observation='Unsaved human Writing edit must survive the Speaking-only reset.';
    await page.locator('#criterion-TASK_RESPONSE').fill(humanWriting.criteria[0].observation);
    await page.getByRole('button',{name:m.apply,exact:true}).click();
    assert.match(await page.getByLabel(m.observations,{exact:true}).inputValue(),/Synthetic AI FLUENCY_COHERENCE draft/u);
    transport.invalidated=true;await page.getByRole('button',{name:m.refresh,exact:true}).click();
    await page.getByRole('button',{name:m.apply,exact:true}).waitFor({state:'detached'});
    const reset=page.getByRole('button',{name:m.reset,exact:true});
    assert.equal(await reset.count(),1,'Explicit human-only detach must remain available after the AI run is invalidated');
    await reset.click();assert.equal(await page.getByLabel(m.observations,{exact:true}).inputValue(),'');
    assert.equal(await page.getByLabel(m.limitations,{exact:true}).inputValue(),'');
    for(const criterion of humanWriting.criteria)assert.equal(await page.locator(`#criterion-${criterion.criterion}`).inputValue(),criterion.observation);
    assert.equal(await page.locator('#writing-limits').inputValue(),'Shortened Task 2 diagnostic.');
    assert.equal(await page.locator('#priority-next').inputValue(),'Preserve this whole-diagnostic priority.');
    await page.getByLabel(m.observations,{exact:true}).fill('New human-only Speaking observation after withdrawal or expiry.');
    await page.getByLabel(m.limitations,{exact:true}).fill('Human in-person observations only; source audio is unavailable.');
    await page.getByRole('button',{name:m.save,exact:true}).click();await page.getByText(m.saved,{exact:true}).waitFor();
    assert.equal(posted.length,1);assert.equal(posted[0].speakingRunId,null);assert.equal(posted[0].writingRunId,writingRunId);
    assert.deepEqual(posted[0].writing,humanWriting);assert.deepEqual(posted[0].nextSteps,['Preserve this whole-diagnostic priority.']);
    assert.deepEqual(posted[0].speaking,{observations:['New human-only Speaking observation after withdrawal or expiry.'],nextSteps:[],
      limitations:['Human in-person observations only; source audio is unavailable.']});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'320px responsive CSS remains intact');
    assert.equal(await page.locator('[lang][dir]').first().getAttribute('dir'),locale==='ar'?'rtl':'ltr');
    assert.deepEqual(errors,[]);
  }finally{await page.screenshot({path:path.join(artifacts,`${label}-human-${locale}.png`),fullPage:true});await context.close();}
}

try{
  for(const [name,run] of [['save-busy',()=>busyRegression('save')],['release-busy',()=>busyRegression('release')],
    ...['en','fr','ar'].map(locale=>[`human-only-${locale}`,()=>humanOnlyRegression(locale)])]){
    try{await run();results.push({name,passed:true});console.log(`PASS ${name}`);}
    catch(error){results.push({name,passed:false,error:error.message});console.error(`FAIL ${name}: ${error.message}`);}
  }
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await writeFile(path.join(artifacts,`${label}-result.json`),JSON.stringify({label,checks:results},null,2));}
assert.ok(results.every(result=>result.passed),`${results.filter(result=>!result.passed).length} mounted assessment regressions failed`);
