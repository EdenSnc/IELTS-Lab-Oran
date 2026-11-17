// Reproducible conversion of the owner's supplied official QTI/PDF/audio corpus.
// Generated JSON is private server content. No network, API keys or LLM extraction.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { load } from 'cheerio';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const root=process.argv[2];if(!root)throw new Error('Pass the locally supplied ielts_offline_dashboard directory');
const ffmpeg=process.env.FFMPEG_PATH??'ffmpeg',ffprobe=process.env.FFPROBE_PATH??'ffprobe';
const clean=s=>s.replace(/-\s*\n\s*/gu,'-').replace(/\s+/gu,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourcePage='https://ielts.org/take-a-test/preparation-resources/sample-test-questions';
const configs=[
 {id:'009050e6a0',part:'listening-social',title:'Phone call about second-hand furniture',key:'ielts-listening-computer-delivered-note-completion-transcript___Answer_Key.pdf',audio:'00c61ff8-ec81-42e7-88db-9de2b41a5e4a.mp3',answers:[['round'],['12 years','twelve years'],['4','four'],['green'],['reasonable'],['1.20 metres','1.2 metres','1.20 meters','1.2 meters','1 metre 20','1 meter 20'],['lock']]},
 {id:'e0e6587c6e',part:'listening-research',title:'Research findings: learner persistence',key:'ielts-listening-computer-delivered-table-completion-transcript___Answer_key.pdf',audio:'c1fd3f0a-fc37-4758-95ab-e20ab348369b.mp3',answers:[['challenge'],['school'],['health'],['interests'],['tutor','tutors']]},
 {id:'36c8c428b5',part:'reading-academic',title:'Text A: The life and work of Marie Curie',key:'ielts-academic-reading-computer-delivered-identifying-information-true-flase-not-given-answer-key.pdf',answers:[['B'],['C'],['A']],evidence:['sole winner of the 1911 Nobel Prize for Chemistry','From childhood, Marie was remarkable for her prodigious memory','In 1891 this promise was fulfilled'],type:'TRUE / FALSE / NOT GIVEN'},
 {id:'25d2fce4d5',part:'reading-academic',title:'Text B: Older workers',key:'ielts-academic-reading-computer-delivered-multiple-choice-one-answer-answer-key.pdf',answers:[['A'],['C'],['D'],['B']],evidence:['Take away seniority-based pay scales','retain access to some of the intellectual capital','because they have to and those who continue working because they want to','70% of businesses started by people over 55 survived']},
 {id:'0f21f52c89',part:'reading-academic',title:'Text C: Plain English',key:'ielts-academic-reading-computer-delivered-summary-completion-selecting-words-from-text-answer-key.pdf',answers:[['frustration'],['first-time user'],['essential'],['special knowledge'],['legal formulations']]},
 {id:'2d1f40c85e',part:'reading-general',title:'Text A: Railway Season Tickets',key:'ielts-general-training-reading-computer-delivered-identifying-information-true-false-not-given-answer-key.pdf',answers:[['A'],['A'],['A'],['A'],['C'],['B']],evidence:['You can break your journey at any train station','make your main journey by rail','less than four times the cost of 7-day train tickets','at weekends and on Bank Holidays','children (aged 5–15)','without a photocard, and both must always be carried together'],type:'TRUE / FALSE / NOT GIVEN'},
 // The local provider key filenames are swapped. Match their contents, not labels.
 {id:'57340e03fc',part:'reading-general',title:'Text B: City Media Internships',key:'ielts-general-training-reading-computer-delivered-sentence-completion-answer-key.pdf',answers:[['experience'],['diversity'],['relocation'],['enrolment','enrollment'],['transcript'],['distance']]},
 {id:'9807aa112c',part:'extension-listening',title:'Judy’s dissertation',key:'ielts-listening-computer-delivered-multiple-choice-one-answer-Transcript_-_Answer_Key.pdf',audio:'b9380f3a-a3d9-4c3e-b297-155b473c99e1.mp3',answers:[['A'],['C'],['B']],evidence:['I was brought up there','recorded as they talked to me','filing system']},
 {id:'1276ea7c8d',part:'extension-listening-sentences',title:'Studying with the Open University',key:'ielts-listening-computer-delivered-sentence-completion-transcript___Answer_key.pdf',audio:'b3047e6b-4821-4416-98c0-eb58d344d75e.mp3',answers:[['motivation'],['time-management','time management'],['modules'],['summer school','summer schools']]},
 {id:'0d12f61f99',part:'extension-academic',title:'Dung beetles',key:'ielts-academic-reading-computer-delivered-table-completion-answer-key.pdf',answers:[['temperate'],['sub-tropical','subtropical'],['South African tunneling','South African tunnelling'],['early spring'],['two to five','2 to 5','two to 5','2 to five','two-five','2-5','two-5','2-five']]},
 {id:'0b87a234a7',part:'extension-general',title:'Accident insurance for City Media employees',key:'ielts-general-training-reading-computer-delivered-note-completion-answer-key.pdf',answers:[['unique'],['temporary'],['eligible'],['hours','hr','hrs','h','hs'],['request']]},
];
const original=JSON.parse(await readFile('src/lib/diagnostic/readiness-original-pack.json','utf8'));
const pack={...original,version:3,authorship:'Official IELTS sample passages, questions and recordings from the owner-supplied IDP/IELTS corpus; short IELTSLab administration and teacher rubrics. Not an official full IELTS test.',
 provenance:{permission:'Owner confirmed possession of permissions in this conversation; user-attested, not independently verified written licence.',sourcePage,sources:[],adaptation:'Complete source question groups retained. Native numbering and accessible table row/column labels only. Full original recordings transcoded for delivery, without cuts or replacement voices. Writing uses an official prompt with an explicitly shortened readiness response; Speaking and placement rubrics are IELTSLab-authored.'},parts:[]};
const numbering=new Map();
for(const config of configs){
 const bytes=await readFile(path.join(root,'data',config.id+'.json')),data=JSON.parse(bytes);
 const keyBytes=await readFile(path.join(root,'media/pdfs',config.key)),keyText=(await pdf(keyBytes)).text;
 const keyTail=keyText.slice(keyText.lastIndexOf('Answers'));
 const questions=data.sections.flatMap(s=>s.questions);const ordered=data.questionNumbering.scorableItems;
 if(ordered.length!==config.answers.length)throw new Error(`${config.id}: lost question group`);
 const listening=!!config.audio,extension=config.part.startsWith('extension'),pathway=/academic/.test(config.part)?'ACADEMIC':/general/.test(config.part)?'GENERAL_TRAINING':'BOTH';
 let part=pack.parts.find(p=>p.id===config.part);
 if(!part){part={id:config.part,title:config.part.startsWith('reading-')?`IELTS ${pathway==='ACADEMIC'?'Academic':'General Training'} Reading`:config.title,skill:listening?'LISTENING':'READING',phase:extension?'EXTENSION':'CORE',pathway,instructions:'Complete each group using its stated instructions. Use only the accompanying passage or recording.',items:[]};pack.parts.push(part);}
 const counterKey=`${part.skill}:${part.phase}:${part.pathway}`;const first=(numbering.get(counterKey)??(extension?12:0))+1;
 const map=new Map(ordered.map((q,i)=>[q.responseIdentifier,first+i]));numbering.set(counterKey,first+ordered.length-1);
 function asText(html){const $=load(html,{xml:true});$('textEntryInteraction').each((_,el)=>{$(el).replaceWith(`[${map.get($(el).attr('responseIdentifier'))}]`);});$('table').each((_,table)=>{$(table).replaceWith($(table).find('tr').map((_,tr)=>$(tr).children().map((_,td)=>clean($(td).text())).get().join(' | ')).get().join('\n'));});$('br').replaceWith('\n');$('p,h1,h2,h3,h4,li,tr').append('\n');return $.root().text().replace(/[\t \u00a0]+/gu,' ').replace(/\n[ \n]+/gu,'\n\n').trim();}
 const stimuli=questions.filter(q=>q.objectType==='content_question_qti2_content_block');
 const questionPaper=questions.filter(q=>q.objectType.includes('text_entry')).map(q=>asText(q.itemBody)).join('\n\n');
 const fullText=stimuli.map(q=>asText(q.itemBody)).join('\n\n');
 const promptText=`${config.title}\n${fullText}${questionPaper?'\n\nQuestions '+first+'–'+(first+ordered.length-1)+'\n'+questionPaper:''}`;
 part.text=[part.text,promptText].filter(Boolean).join('\n\n');
 let evidenceText=fullText;
 if(listening){const label=keyText.includes('Tapescript for IELTS Listening')?'Sample Listening Sentence Completion':/Recording Transcript/.test(keyText)?'Recording Transcript':'Tapescript';
  evidenceText=clean(keyText.slice(keyText.indexOf(label)+label.length,keyText.lastIndexOf('Sample Listening')));
  if(!evidenceText)throw new Error('Missing transcript');part.script=evidenceText;
  const input=path.join(root,'media',config.audio);const raw=await readFile(input);
  const output=`readiness/authentic-v3/${config.part}.mp3`;await mkdir(path.dirname(path.join('public',output)),{recursive:true});
  // Mechanical audio conversion preserves the full recording. No production side effects.
  execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',input,'-map_metadata','-1','-ar','24000','-ac','1','-b:a','64k',path.join('public',output)]);
  part.audio=output;part.audioSeconds=Number(execFileSync(ffprobe,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path.join('public',output)],{encoding:'utf8'}).trim());
  part.audioSource={filename:config.audio,sha256:sha(raw),deliveredSha256:sha(await readFile(path.join('public',output))),conversion:'Full recording; mono 24 kHz MP3 at 64 kbps, no time edits'};
 }
 pack.provenance.sources.push({assessmentId:config.id,title:data.title,dataFile:config.id+'.json',dataHash:sha(bytes),answerKeyFile:config.key,answerKeyHash:sha(keyBytes),sourcePage,...(part.audioSource?{audio:part.audioSource}:{}),association:config.id==='57340e03fc'||config.id==='0b87a234a7'?'Key PDF matched by content; source filenames are swapped':'Matched source title, complete question count, stems and answer content'});
 for(const [index,entry] of ordered.entries()){
  const question=questions.find(q=>q.contentRevisionId===entry.contentRevisionId);if(!question)throw new Error('Question revision missing');
  const $=load(question.itemBody,{xml:true});const interaction=$(`[responseIdentifier="${entry.responseIdentifier}"]`);if(interaction.length!==1)throw new Error('Ambiguous response identifier');
  const number=first+index,id=(listening?(extension?'EL':'L'):pathway==='ACADEMIC'?(extension?'EA':'RA'):(extension?'EG':'RG'))+(extension?number-12:number);
  const choice=interaction.is('choiceInteraction');let options,prompt;
  if(choice){if(interaction.attr('maxChoices')!=='1')throw new Error('Multi-select needs a different scorer');options=Object.fromEntries(interaction.find('simpleChoice').map((_,el)=>[$(el).attr('identifier'),clean($(el).text())]).get().reduce((a,v,i,all)=>i%2===0?[...a,[v,all[i+1]]]:a,[]));prompt=clean(interaction.find('prompt').text());}
  else {const clone=load(question.itemBody,{xml:true});clone('textEntryInteraction').each((_,el)=>clone(el).replaceWith(clone(el).attr('responseIdentifier')===entry.responseIdentifier?'____':`[${map.get(clone(el).attr('responseIdentifier'))}]`));
   const leaf=interaction.closest('li,p,td');const leafClone=clone('li,p,td').eq($('li,p,td').index(leaf));prompt=clean(leafClone.text());
   if(leaf.is('td')){const row=leaf.parent(),column=row.children().index(leaf);prompt=`${clean(row.children().first().text())} — ${clean(row.closest('table').find('tr').first().children().eq(column).text())}: ${prompt}`;}
   else if(leaf.is('li')){const outer=leaf.parents('ul').last();const heading=outer.prevAll('h3,h4').first().text();const parentContext=leaf.parents('li').first().clone().children('ul').remove().end().text();prompt=`${clean([heading,parentContext,prompt].filter(Boolean).join(' — '))}`;}
  }
  // The full cloze remains above the questions. Each field repeats its own complete sentence.
  if(!choice&&!interaction.closest('td').length)prompt=prompt.split(/(?<=[.!?])\s+(?=[A-Z])/u).find(s=>s.includes('____'))??prompt;
  prompt=`${config.part.startsWith('reading-')?config.title+' — ':''}${prompt}`;
  const answers=config.answers[index],keyLines=clean(keyTail),expected=(config.type?options[answers[0]]:choice?options[answers[0]]:answers[0]).replace(/[.]+$/u,'');
  // Compare actual answer PDF content before admitting a mapping. Alternatives are explicit.
  const checks=[expected,expected.replace('businesses','business'),expected.replace('school','school(s)'),expected.replace('tutor','tutor(s)'),expected.replace('time-management','time(-)management'),expected.replace('South African tunneling','South African tunneling/tunnelling'),expected.replace('two to five','two/2 to/- five/5')];
  if(!checks.some(v=>keyLines.toLowerCase().includes(v.toLowerCase())))throw new Error(`${id}: key association failed: ${expected}`);
  const probe=(config.evidence?.[index]??answers.find(a=>clean(evidenceText).toLowerCase().includes(a.toLowerCase()))??({L2:'twelve',L3:'four',L6:'1 metre 20',EA5:'two to five'})[id]);
  const evidenceSource=clean(evidenceText);const at=evidenceSource.toLowerCase().indexOf(probe?.toLowerCase()??'---');if(at<0)throw new Error(`${id}: missing evidence ${probe}`);
  const evidence=evidenceSource.slice(Math.max(0,at-60),Math.min(evidenceSource.length,at+probe.length+100));
  const words=question.customFields?.find(f=>f.name==='Item Rubric Variant')?.value?.[0];
  part.items.push({id,number,type:choice?'CHOICE':'TEXT',prompt,instructions:config.type?`Write ${config.type}; use only this text.`:choice?'Choose ONE answer.':`Complete the gaps. ${words??'Use the stated word limit'}.`,...(options?{options}:{}),...(!choice?{maxWords:/three/i.test(words)?3:/two/i.test(words)?2:1}:{}),answers,evidence,
   rationale:config.type&&answers[0]==='C'?'The passage does not establish the claim or its opposite. Do not use outside knowledge.':`The official key identifies ${choice?options[answers[0]]:answers[0]}. The quoted source evidence determines this answer; nearby figures or details are not interchangeable.`,
   sourceRef:{assessmentId:config.id,dataHash:sha(bytes),answerKeyFile:config.key,answerKeyHash:sha(keyBytes),sourceNumber:entry.orderNumber,responseIdentifier:entry.responseIdentifier,contentRevisionId:entry.contentRevisionId,keyAnswers:answers,sourceGroupType:question.customFields?.find(f=>f.name==='Item Type')?.value?.[0]??'Single choice'}});
 }
}
const writingBytes=await readFile(path.join(root,'data','655aa690bb.json'));const writingData=JSON.parse(writingBytes);
pack.writing.prompt=writingData.sections.flatMap(s=>s.questions).filter(q=>q.objectType.includes('content_block')).map(q=>{const $=load(q.itemBody,{xml:true});$('p').append('\n');return $.root().text().trim();}).join('\n').replace(/\n\s*\n/gu,'\n');
pack.writing.instructions='Write about 160–200 words in 16 minutes. This official sample prompt is being used for a shortened IELTSLab readiness response, not the full 40-minute, 250-word IELTS Writing Task 2. Explain your position, organise your ideas, support them with reasons and examples, and leave time to check. A teacher reviews your response; no automatic IELTS band is awarded.';
Object.assign(pack.writing.rubric[0],{foundation:'The position is unclear, the statement is not addressed, or ideas remain disconnected assertions.',conditional:'A relevant position is present, but explanation or examples are thin.',ready:'A clear position addresses the statement, with relevant reasoning and a developed example.'});
pack.provenance.sources.push({assessmentId:'655aa690bb',title:writingData.title,dataFile:'655aa690bb.json',dataHash:sha(writingBytes),sourcePage,association:'Unchanged official prompt; deliberately shortened readiness timing and target length, with IELTSLab teacher rubric'});
pack.scoringNotes='One mark per objective item, exact explicit alternatives after case/whitespace normalisation. Core Listening 12 and Reading 12 items. The optional extension preserves two complete Listening groups (7 items) and one Reading group (5 items); its raw totals differ and must never be compared without denominators. Initial extension/placement rules are uncalibrated screening heuristics, not official IELTS-band conversions. Writing and Speaking require teacher review; productive weakness cannot be hidden by strong objective scores.';
await writeFile('src/lib/diagnostic/readiness-pack.json',JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({version:pack.version,parts:pack.parts.map(p=>[p.id,p.items.length]),sources:pack.provenance.sources.length}));
