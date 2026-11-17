// Real shipped questions, audio, app, cookies and PostgreSQL. Only identity transport is doubled.
// Run against the current production build; never uses a production database/account.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn,spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { diagnosticTestPrisma } from '../helpers/diagnostic-fixture.ts';

const db='postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const manualSmoke=process.argv.includes('--manual-smoke'),manual=manualSmoke||process.argv.includes('--manual');
process.env.TEST_DATABASE_URL=db;process.env.DATABASE_URL=db;process.env.ENCRYPTION_KEY='11'.repeat(32);
process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:55621';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='diagnostic-local-test-key-only';
process.env.SUPABASE_SERVICE_ROLE_KEY='diagnostic-storage-test-key-only';
process.env.DIAGNOSTIC_AI_ENABLED=manual?'false':'true';process.env.DIAGNOSTIC_AI_DATA_USE_APPROVED=manual?'false':'true';
if(manual){process.env.CHECKOUT_ENABLED='false';process.env.ATTEMPTS_ENABLED='false';process.env.DIAGNOSTIC_RECORDING_ENABLED='false';}
delete process.env.QSTASH_TOKEN;delete process.env.GEMINI_API_KEY;
const prisma=diagnosticTestPrisma(),ids={owner:randomUUID(),staff:randomUUID(),stranger:randomUUID()};
const {chromium}=await import(pathToFileURL(path.resolve(process.argv[2])).href);
const {provisionReadinessPack}=await import('../../src/lib/diagnostic/readiness-provision.ts');
const {inviteReadiness}=await import('../../src/lib/diagnostic/readiness-service.ts');
for(const [name,id] of Object.entries(ids))await prisma.user.create({data:{id,email:`${id}@readiness-browser.invalid`,role:name==='staff'?(manual?'TEACHER':'ADMIN'):'STUDENT'}});
await provisionReadinessPack(ids.staff,true);
await inviteReadiness({actorUserId:ids.staff,recipientId:ids.owner,cohort:'CEIL_BROWSER_QA'});
const exp=Math.floor(Date.now()/1000)+7200,identities=new Map();
for(const [name,id] of Object.entries(ids)){
 const token=[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',role:'authenticated',aal:name==='staff'?'aal2':'aal1',exp,iat:exp-7200}].map(o=>Buffer.from(JSON.stringify(o)).toString('base64url')).join('.')+'.'+Buffer.from(`qa-${name}`).toString('base64url');
 identities.set(name,{token,user:{id,aud:'authenticated',role:'authenticated',email:`${id}@readiness-browser.invalid`,app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()}});
}
const identity=createServer((req,res)=>{const u=[...identities.values()].find(v=>req.headers.authorization===`Bearer ${v.token}`);res.setHeader('Content-Type','application/json');if(req.url==='/auth/v1/user'&&u)res.end(JSON.stringify(u.user));else{res.writeHead(401);res.end('{"message":"invalid QA identity"}');}});
await new Promise((resolve,reject)=>{identity.once('error',reject);identity.listen(55621,'127.0.0.1',resolve);});
const dev=process.argv.includes('--dev');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next',dev?'dev':'start','--hostname','127.0.0.1','--port','3010'],{env:{...process.env,NODE_ENV:dev?'development':'production'},stdio:['ignore','pipe','pipe']});
const logs=[];server.stdout.on('data',d=>logs.push(String(d)));server.stderr.on('data',d=>logs.push(String(d)));
const base='http://127.0.0.1:3010',artifacts=path.resolve('.superpowers/sdd/PLAN-2026-10-06/readiness-browser');await mkdir(artifacts,{recursive:true});
let browser;const errors=[],passes=[];
const pass=name=>{passes.push(name);console.log('PASS '+name);};
async function until(check,label,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,200));}throw new Error('Timed out: '+label);}
async function readinessLayout(page){
 assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'readiness main must reflow without clipping');
 const undersized=await page.locator('header a, main nav a, main button, main input:not([type=checkbox]):not([type=radio]), main select').evaluateAll(elements=>elements.filter(el=>el.getBoundingClientRect().height>0&&el.getBoundingClientRect().height<44).map(el=>el.textContent||el.getAttribute('name')));
 assert.deepEqual(undersized,[],'visible readiness controls must have 44px targets');
 for(const panel of await page.locator('main > form, main > section:has(fieldset)').all()){
  assert.equal(await panel.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','question/intake surfaces must remain opaque');
  assert.equal(await panel.evaluate(el=>getComputedStyle(el).backdropFilter),'none','question/intake surfaces must not blur');
 }
}
async function account(name){const context=await browser.newContext({viewport:{width:1280,height:850}});const {token,user}=identities.get(name);
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'qa-refresh',token_type:'bearer',expires_at:exp,expires_in:7200,user})).toString('base64url'),domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);return context;}
async function manualWorkspace(context,staff){
 const candidate=await context.newPage(),teacher=await staff.newPage();
 candidate.on('pageerror',e=>errors.push(e.message));teacher.on('pageerror',e=>errors.push(e.message));
 await candidate.goto(base+'/en/diagnostic/readiness');await candidate.locator('input[name=name]').waitFor();
 await candidate.locator('input[name=name]').fill('Local Test Participant');await candidate.locator('input[name=phone]').fill('+213780000004');
 await teacher.goto(base+'/en/diagnostic/staff/readiness');await teacher.getByRole('heading',{name:'Teacher workspace',exact:true}).waitFor();
 async function command(value){
  const action=value.trim().toLowerCase();
  if(!['reading','writing','end','speaking-end'].includes(action)){console.log('Commands: reading | writing | end | speaking-end | quit');return;}
  const s=await prisma.diagnosticSession.findFirst({where:{userId:ids.owner}});
  if(!s){console.log('Click Start in the participant window first.');return;}
  if(action==='speaking-end'){
   const spoken=await prisma.diagnosticSpeakingSession.findUnique({where:{sessionId:s.id}});
   if(spoken?.state!=='ACTIVE'){console.log('Open Speaking in the teacher window and click Start Speaking first.');return;}
   const start=new Date(Date.now()-421000);await prisma.diagnosticSpeakingSession.update({where:{id:spoken.id},data:{startedAt:start,deadline:new Date(start.getTime()+420000)}});
   for(const page of staff.pages())if(page.url().includes(`/diagnostic/examiner/${s.id}`))await page.reload();
   console.log('Local interview clock finished. Click Complete Speaking in the examiner window.');return;
  }
  if(s.state==='SUBMITTED'){console.log('Written test is already submitted. Use the teacher window for review.');return;}
  const runtime=s.readiness;
  if(runtime.coreCompletedAt){
   const elapsed=Math.max(Date.now()-Date.parse(runtime.coreCompletedAt),action==='end'?541000:271000);
   runtime.coreCompletedAt=new Date(Date.now()-elapsed).toISOString();
   await prisma.diagnosticSession.update({where:{id:s.id},data:{readiness:runtime,deadline:new Date(Date.parse(runtime.coreCompletedAt)+540000)}});
  }else{
   const elapsed=Math.max(Date.now()-s.startedAt.getTime(),{reading:721000,writing:1561000,end:2521000}[action]);
   const startedAt=new Date(Date.now()-elapsed);
   await prisma.diagnosticSession.update({where:{id:s.id},data:{startedAt,deadline:new Date(startedAt.getTime()+3060000)}});
  }
  let response=await context.request.get(`${base}/api/diagnostic/readiness/${s.id}`);assert.equal(response.status(),200);
  if(action==='end'){
   const current=await prisma.diagnosticSession.findUniqueOrThrow({where:{id:s.id}});
   if(current.state!=='SUBMITTED'&&current.readiness.coreCompletedAt){
    const state=current.readiness;state.coreCompletedAt=new Date(Date.now()-541000).toISOString();
    await prisma.diagnosticSession.update({where:{id:s.id},data:{readiness:state,deadline:new Date(Date.parse(state.coreCompletedAt)+540000)}});
    response=await context.request.get(`${base}/api/diagnostic/readiness/${s.id}`);assert.equal(response.status(),200);
   }
  }
  await candidate.reload();await teacher.reload();console.log(`Local preview advanced: ${action}.`);
 }
 console.log(`\nPARTICIPANT WINDOW: ${base}/en/diagnostic/readiness\nTEACHER WINDOW: ${base}/en/diagnostic/staff/readiness\nAlready signed in to separate LOCAL QA accounts. No passwords or real payment/API calls.\nKeep this terminal and the opened Edge windows running. Don't enter real personal data.\nUse the participant window to start. Then terminal commands let you preview sections quickly.\nWait for Saved before advancing. These commands change ONLY this local test account's clock.\nreading = Reading; writing = Writing; end = submit; speaking-end = finish interview clock; quit = stop.\n`);
 if(manualSmoke){
  await candidate.locator('input[name=audio]').check();await candidate.locator('input[name=consent]').check();
  await candidate.getByRole('button',{name:'Start the 42-minute screen',exact:true}).click();await candidate.waitForURL(/\/readiness\/[a-f0-9-]{36}$/u);
  await command('reading');await candidate.getByRole('heading',{name:'Reading',exact:true}).waitFor();
  await command('writing');const essay=candidate.getByRole('textbox',{name:'Writing',exact:true});await until(()=>essay.isEnabled(),'manual Writing lease');
  await essay.fill('A local manual test response.');await until(async()=>await prisma.diagnosticResponse.count({where:{session:{userId:ids.owner},answer:'A local manual test response.'}})===1,'manual answer save');
  await command('end');await candidate.getByRole('heading',{name:'Saved / completed',exact:true}).waitFor();
  assert.equal((await context.request.get(base+'/api/diagnostic/readiness/staff')).status(),403);
  assert.equal(await prisma.diagnosticSession.count({where:{userId:ids.owner,state:'SUBMITTED'}}),1);
  assert.equal(await prisma.entitlement.count({where:{userId:ids.owner}}),0);
  assert.deepEqual(errors,[]);pass('interactive local workspace opens separate roles, saves real answers and safely fast-forwards sections');return;
 }
 const terminal=createInterface({input:process.stdin,output:process.stdout});let pending=Promise.resolve();
 const stop=()=>terminal.close();process.once('SIGINT',stop);browser.once('disconnected',stop);
 try{await new Promise(resolve=>{terminal.once('close',resolve);terminal.on('line',line=>{
  pending=pending.then(async()=>{if(line.trim().toLowerCase()==='quit'){stop();return;}await command(line);}).catch(error=>console.error('Local preview command failed:',error.message));
 });});await pending;}finally{process.removeListener('SIGINT',stop);browser.removeListener('disconnected',stop);terminal.close();}
}
try{
 await until(async()=>{try{return(await fetch(base+'/favicon.ico')).status===200;}catch{return false;}},'production server',60000);
 browser=await chromium.launch({headless:!manual||manualSmoke,channel:'msedge'});
 const guest=await browser.newContext();assert.equal((await guest.request.get(base+'/api/diagnostic/readiness')).status(),401);
 assert.equal((await guest.request.get(base+'/api/diagnostic/readiness/staff')).status(),401);
 const context=await account('owner'),staff=await account('staff'),stranger=await account('stranger');
 assert.equal((await context.request.get(base+'/api/diagnostic/readiness/staff')).status(),403);pass('candidate keys require staff and AAL2');
 if(manual){await manualWorkspace(context,staff);}else{
 if(!process.argv.includes('--print-only')){
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/en/diagnostic/readiness');await page.locator('input[name=name]').waitFor();
 await readinessLayout(page);await page.setViewportSize({width:360,height:800});await readinessLayout(page);
 const reference=page.locator('main nav a').first();await reference.focus();assert.ok(await reference.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>=3),'readiness reference links need visible keyboard focus');
 await page.setViewportSize({width:1280,height:850});
 await page.locator('input[name=name]').fill('Readiness Browser Participant');await page.locator('input[name=phone]').fill('+213780000004');
 await page.locator('select[name=pathway]').selectOption('GENERAL_TRAINING');await page.locator('input[name=audio]').check();await page.locator('input[name=consent]').check();
 await page.getByRole('button',{name:'Start the 42-minute screen',exact:true}).click();await page.waitForURL(/\/readiness\/[a-f0-9-]{36}$/u);
 const id=page.url().split('/').at(-1),input=page.locator('main input:not([type=radio]):not([type=checkbox])').first();
 await until(()=>input.isEnabled(),'writer lease');
 await readinessLayout(page);
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
 assert.equal(await page.locator('header').evaluate(el=>getComputedStyle(el).backdropFilter),'none','forced colors must remove readiness glass');
 await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
 pass('readiness desktop / 360px intake has solid content, 44px targets, link focus and accessible glass fallback');
 assert.equal(await prisma.diagnosticSession.count({where:{userId:ids.owner}}),1);assert.equal(await prisma.entitlement.count({where:{userId:ids.owner}}),0);
 assert.equal((await stranger.request.get(`${base}/api/diagnostic/readiness/${id}`)).status(),404);
 const payload=await (await context.request.get(`${base}/api/diagnostic/readiness/${id}`)).json();
 for(const secret of ['"keyAnswers"','"sourceRef"','"rationale"','"script"'])assert.ok(!JSON.stringify(payload).includes(secret),secret);
 pass('real invite/intake starts one free owner-scoped test without private keys');
 try{await until(()=>page.locator('audio').evaluate(a=>a.readyState>=1&&Number.isFinite(a.duration)&&a.duration>120),'real recording decode');}
 catch(e){console.error('AUDIO_EVIDENCE',await page.locator('audio').evaluate(a=>({src:a.getAttribute('src'),state:a.readyState,error:a.error?.code})));throw e;}
 await input.fill('round');await until(async()=>await prisma.diagnosticResponse.count({where:{sessionId:id,answer:'round'}})===1,'autosave to database');
 const originalStart=(await prisma.diagnosticSession.findUniqueOrThrow({where:{id}})).startedAt.getTime();
 await page.reload();await until(()=>input.isEnabled(),'reload lease');assert.equal(await input.inputValue(),'round');
 assert.equal((await prisma.diagnosticSession.findUniqueOrThrow({where:{id}})).startedAt.getTime(),originalStart);pass('real audio, autosave and reload preserve answers and clock');
 const second=await context.newPage();await second.goto(page.url());await second.getByRole('alert').filter({hasText:'another tab'}).waitFor();
 assert.equal(await second.locator('main input:not([type=radio]):not([type=checkbox])').first().isEnabled(),false);await second.close();pass('second tab cannot overwrite answers');
 await context.setOffline(true);await input.fill('offline draft');await page.waitForTimeout(1600);assert.equal(await prisma.diagnosticResponse.count({where:{sessionId:id,answer:'offline draft'}}),0);
 assert.ok((await page.locator('header').innerText()).includes('Not yet saved'));await context.setOffline(false);
 await until(async()=>await prisma.diagnosticResponse.count({where:{sessionId:id,answer:'offline draft'}})===1,'offline recovery');pass('offline edits remain visibly pending and recover on reconnect');
 const stored=await prisma.diagnosticSession.findUniqueOrThrow({where:{id}}),manifest=stored.manifest;
 // Accelerate only the test-owned database clock, not browser authorization or API state transitions.
 for(const part of manifest.pack.parts.filter(p=>p.phase==='CORE'&&(p.pathway==='BOTH'||p.pathway==='GENERAL_TRAINING')))for(const [i,q]of part.items.entries())await prisma.diagnosticResponse.update({where:{sessionId_questionId:{sessionId:id,questionId:manifest.itemIds[q.id]}},data:{answer:part.skill==='READING'&&i>=8?'wrong':q.answers[0],version:{increment:1}}});
 await context.setOffline(true);await input.fill('late offline listening draft');
 const readingStart=new Date(Date.now()-721000);await prisma.diagnosticSession.update({where:{id},data:{startedAt:readingStart,deadline:new Date(readingStart.getTime()+3060000)}});
 await context.setOffline(false);await page.getByRole('heading',{name:'Reading',exact:true}).waitFor({timeout:30000});
 await until(()=>page.locator('fieldset input[type=radio]').first().isEnabled(),'later section remains editable');
 assert.ok((await page.locator('main').innerText()).includes('They were not included in your saved answers'));
 assert.equal(await page.getByRole('textbox',{name:'L1',exact:true}).inputValue(),'late offline listening draft');
 pass('offline work past a section boundary is retained as an excluded copy, not lost or allowed to block later answers');
 await page.goto(`${base}/ar/diagnostic/readiness/${id}`);await until(()=>page.locator('main input[type=radio]').first().isEnabled(),'Arabic Reading');
 await page.setViewportSize({width:360,height:800});await readinessLayout(page);
 await page.setViewportSize({width:320,height:740});assert.equal(await page.locator('html').getAttribute('dir'),'rtl');assert.ok((await page.locator('main').innerText()).includes('Railway Season Tickets'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(artifacts,'arabic-mobile.png'),fullPage:true});pass('GT Reading is authentic; Arabic mobile reflows without horizontal overflow');
 const writingStart=new Date(Date.now()-1561000);await prisma.diagnosticSession.update({where:{id},data:{startedAt:writingStart,deadline:new Date(writingStart.getTime()+3060000)}});
 await page.goto(`${base}/en/diagnostic/readiness/${id}`);const essay=page.getByRole('textbox',{name:'Writing',exact:true});await until(()=>essay.isEnabled(),'Writing');assert.ok((await page.locator('main').innerText()).includes("people's health"));
 await essay.fill('I disagree with the statement. Better access to information and preventive care can improve health, although sedentary work creates challenges. Schools and employers can help people build sustainable habits.');
 await until(async()=>await prisma.diagnosticResponse.count({where:{sessionId:id,questionId:manifest.itemIds.W1,answer:{startsWith:'I disagree'}}})===1,'Writing save');
 await page.getByRole('button',{name:'Finish this stage',exact:true}).click();await until(()=>page.locator('main').innerText().then(t=>t.includes('Judy’s dissertation')),'extension');
 assert.equal((await prisma.diagnosticSession.findUniqueOrThrow({where:{id}})).readiness.extension,true);assert.equal(await page.locator('fieldset').count(),7);pass('borderline core adds distinct complete authentic Listening groups');
 const runtime=(await prisma.diagnosticSession.findUniqueOrThrow({where:{id}})).readiness;runtime.coreCompletedAt=new Date(Date.now()-271000).toISOString();
 await prisma.diagnosticSession.update({where:{id},data:{readiness:runtime,deadline:new Date(Date.parse(runtime.coreCompletedAt)+540000)}});
 await page.reload();await until(()=>page.locator('main input').first().isEnabled(),'extension Reading');assert.equal(await page.locator('fieldset').count(),5);
 await page.getByRole('button',{name:'Finish this stage',exact:true}).click();await page.getByRole('heading',{name:'Saved / completed',exact:true}).waitFor();
 await page.getByRole('checkbox',{name:'I confirm I am 18 or older.',exact:true}).check();
 await page.getByRole('checkbox',{name:'I agree to Google Gemini analysis of my submitted diagnostic essay.',exact:true}).check();
 await page.getByRole('button',{name:'Save Writing preferences',exact:true}).click();await page.getByRole('status').filter({hasText:'Writing preferences saved.'}).waitFor();
 const teacher=await staff.newPage();teacher.on('pageerror',e=>errors.push(e.message));await teacher.goto(`${base}/en/diagnostic/staff/readiness/${id}`);
 await teacher.getByRole('button',{name:'Request AI writing suggestions',exact:true}).waitFor();
 await teacher.setViewportSize({width:360,height:800});await readinessLayout(teacher);
 await teacher.screenshot({path:path.join(artifacts,'teacher-mobile.png'),fullPage:true});
 await teacher.setViewportSize({width:1280,height:850});
 await teacher.getByRole('button',{name:'Request AI writing suggestions',exact:true}).click();
 await until(async()=>await prisma.diagnosticWritingRun.count({where:{sessionId:id}})===1,'durable Writing run');
 const aiRun=await prisma.diagnosticWritingRun.findFirstOrThrow({where:{sessionId:id},orderBy:{createdAt:'desc'}});
 const {processDiagnosticWriting}=await import('../../src/lib/diagnostic/writing-service.ts');
 await processDiagnosticWriting(aiRun.id,async()=>({feedback:{criteria:['TASK_RESPONSE','COHERENCE_COHESION','LEXICAL_RESOURCE','GRAMMAR'].map(criterion=>({criterion,rating:1,observation:'Develop the supporting explanation.',evidence:['I disagree with the statement.']})),nextSteps:['Develop examples.'],limitations:['Shortened 16-minute sample.']},model:'qa-provider-transport-only',usage:{inputTokens:1,outputTokens:1}}));
 await teacher.getByRole('button',{name:'Check analysis status',exact:true}).click();
 await teacher.getByRole('button',{name:'Use suggestions as an editable draft',exact:true}).click();
 assert.deepEqual(await teacher.locator('fieldset select').evaluateAll(els=>els.map(e=>e.value)),['1','1','1','1']);
 await until(()=>teacher.locator('fieldset select').count().then(n=>n===4),'teacher rubric');for(const select of await teacher.locator('fieldset select').all())await select.selectOption('2');
 await teacher.getByRole('textbox',{name:'Teacher observations and next action'}).fill('The participant needs a Speaking check to confirm readiness; support the position with more developed examples.');
 await teacher.getByRole('button',{name:'Save teacher review',exact:true}).click();await until(async()=>await prisma.diagnosticAssessment.count({where:{sessionId:id,version:1}})===1,'review save');
 assert.deepEqual((await prisma.diagnosticAssessment.findUniqueOrThrow({where:{sessionId:id}})).readiness.writing,[2,2,2,2]);
 assert.equal((await prisma.diagnosticAssessment.findUniqueOrThrow({where:{sessionId:id}})).writingRunId,aiRun.id);
 pass('AI Writing draft requires participant consent; teacher edits replace its ratings before any release');
 const clock=await staff.newPage();await clock.goto(`${base}/en/diagnostic/examiner/${id}`);
 await clock.getByRole('button',{name:'Start Speaking',exact:true}).click();
 await until(async()=>await prisma.diagnosticSpeakingSession.count({where:{sessionId:id,state:'ACTIVE'}})===1,'separate human Speaking start');
 const spokenStart=new Date(Date.now()-421000);await prisma.diagnosticSpeakingSession.update({where:{sessionId:id},data:{startedAt:spokenStart,deadline:new Date(spokenStart.getTime()+420000)}});
 await clock.reload();await clock.getByRole('button',{name:'Complete Speaking',exact:true}).click();
 const reviewLink=clock.getByRole('link',{name:'Review feedback',exact:true});await reviewLink.waitFor();
 assert.equal(await reviewLink.getAttribute('href'),`/en/diagnostic/staff/readiness/${id}`);await clock.close();
 pass('separate seven-minute human Speaking flow returns to the matching readiness review, not the old assessment');
 await teacher.reload();await teacher.getByRole('button',{name:'Release result to participant',exact:true}).click();await until(async()=>await prisma.diagnosticAssessment.count({where:{sessionId:id,state:'RELEASED'}})===1,'teacher release');
 await page.reload();await page.getByRole('heading',{name:'Readiness result',exact:true}).waitFor();assert.ok((await page.locator('main').innerText()).includes('Conditional'));
 await page.setViewportSize({width:360,height:800});await readinessLayout(page);
 await page.screenshot({path:path.join(artifacts,'result-mobile.png'),fullPage:true});
 pass('Writing review reloads safely; missing Speaking stays Conditional and released owner result renders');
 }
 const packet=await staff.request.get(base+'/api/diagnostic/readiness/staff');assert.equal(packet.status(),200);
 const delivered=(await packet.json()).pack;assert.ok(delivered.provenance.sources.length===12);
 for(const [pathway,label]of [['ACADEMIC','academic'],['GENERAL_TRAINING','general-training']])for(const examiner of [false,true]){
  const print=await(examiner?staff:guest).newPage();const route=examiner?'staff/readiness':'readiness';const r=await print.goto(`${base}/en/diagnostic/${route}/print?pathway=${pathway}`);assert.equal(r.status(),200);
  const html=await print.locator('main').innerText();assert.equal(html.includes('EXAMINER ONLY'),examiner);
  const count=await print.locator('main > section').count();await print.emulateMedia({media:'print'});
  assert.equal(await print.locator('main').evaluate(el=>getComputedStyle(el).visibility),'visible','the booklet must override the global non-printable-test visibility rule');
  const file=path.join(artifacts,`${label}-${examiner?'examiner':'candidate'}.pdf`);
  await print.pdf({path:file,format:'A4',preferCSSPageSize:true,printBackground:true});
  const rendered=await pdf(await readFile(file));assert.ok(rendered.text.includes('Writing'),'PDF must contain actual questions, not blank pages');
  assert.equal(rendered.numpages,count,'physical pages must agree with the numbered booklet pages');
  await writeFile(path.join(artifacts,`${label}-${examiner?'examiner':'candidate'}-pages.json`),JSON.stringify({expectedPages:count}));await print.close();
 }pass('Academic/GT printable candidate and protected examiner booklets use the same pack');
 for(const part of delivered.parts.filter(p=>p.audio)){const r=await fetch(base+'/'+part.audio);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/audio\/mpeg/);}
 assert.deepEqual(errors,[]);pass('all real MP3 endpoints load; no browser exceptions');
 await writeFile(path.join(artifacts,'results.json'),JSON.stringify({passes,errors},null,2));
 }
}finally{
 await browser?.close();if(process.platform==='win32'&&server.pid)spawnSync('taskkill',['/PID',String(server.pid),'/T','/F']);else server.kill('SIGTERM');
 await new Promise(resolve=>identity.close(resolve));await prisma.$disconnect();await writeFile(path.join(artifacts,'server.log'),logs.join(''));
}
