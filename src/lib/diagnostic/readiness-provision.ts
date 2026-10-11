import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, type PartSlot } from '@prisma/client';
import { encrypt } from '@/lib/crypto';
import { loadReadinessPack, auditReadinessPack, hashReadinessContent } from './readiness-content';
import { diagnosticTransaction, type DiagnosticTransaction } from './content-service';
import { DiagnosticError } from './protocol';

export const readinessPackHash = hashReadinessContent;
export async function requireReadinessStaff(tx: DiagnosticTransaction, id: string) {
  const user=await tx.user.findUnique({where:{id},select:{role:true,status:true}});
  if (!user||user.status!=='ACTIVE'||!['ADMIN','TEACHER'].includes(user.role)) throw new DiagnosticError('STAFF_REQUIRED',403);
  return user;
}

/** Staff activation, not a fabricated human QA attestation. Network calls never enter this transaction. */
export async function provisionReadinessPack(actorUserId: string, keyReviewConfirmed: boolean) {
  if(keyReviewConfirmed!==true)throw new DiagnosticError('CONTENT_NOT_READY',409);
  const pack=loadReadinessPack(); const hash=readinessPackHash(pack);
  if (auditReadinessPack(pack).length) throw new DiagnosticError('CONTENT_INTEGRITY',409);
  const audio=await Promise.all(pack.parts.filter(p=>p.audio).map(async p=>{
    const bytes=await readFile(path.join(process.cwd(),'public',p.audio!));
    if (bytes.toString('ascii',0,3)!=='ID3'&&!(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)) throw new DiagnosticError('CONTENT_INTEGRITY',409);
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(p.audioSource&&p.audioSource.deliveredSha256!==hash)throw new DiagnosticError('CONTENT_INTEGRITY',409);
    return {key:p.audio!,bytes:bytes.length,hash};
  }));
  return diagnosticTransaction(async tx=>{
    await requireReadinessStaff(tx,actorUserId);
    const result: Array<{pathway:string;blueprintId:string;itemIds:Record<string,string>}> = [];
    const source=await tx.contentSource.upsert({where:{provider_externalId:{provider:'IDP',externalId:'owner-supplied-readiness-samples'}},update:{},
      create:{provider:'IDP',externalId:'owner-supplied-readiness-samples',name:'Official IELTS samples — IELTSLab short readiness adaptation',rightsReference:pack.provenance.permission}});
    const artifact=await tx.sourceArtifact.upsert({where:{sourceId_checksum:{sourceId:source.id,checksum:hash}},update:{},
      create:{sourceId:source.id,kind:'JSON',filename:`readiness-pack-v${pack.version}.json`,checksum:hash,metadata:{authorship:pack.authorship,provenance:pack.provenance,audit:'structural, source-key and evidence audit, not psychometric validation'}}});
    for (const pathway of ['ACADEMIC','GENERAL_TRAINING'] as const) {
      const code=`IELTSLAB_READINESS_V2_${pathway}`;
      const existing=await tx.testBlueprint.findFirst({where:{code},orderBy:{version:'desc'},include:{fixedTestVersion:{include:{sections:{include:{parts:{include:{questionGroups:{include:{questions:true}}}}}}}}}});
      if (existing?.fixedTestVersion?.contentHash===hash) {
        if (existing.status!=='PUBLISHED') throw new DiagnosticError('CONTENT_INTEGRITY',409);
        const questions=existing.fixedTestVersion.sections.flatMap(s=>s.parts.flatMap(p=>p.questionGroups.flatMap(g=>g.questions)));
        result.push({pathway,blueprintId:existing.id,itemIds:Object.fromEntries(questions.map(q=>[q.stableKey,q.id]))}); continue;
      }
      const revision=(existing?.version??1)+1;
      const test=await tx.test.upsert({where:{sourceId_externalId:{sourceId:source.id,externalId:code}},update:{},create:{sourceId:source.id,externalId:code,title:`IELTSLab readiness — ${pathway}`,variant:pathway}});
      const version=await tx.testVersion.create({data:{testId:test.id,version:revision,contentHash:hash,
        notes:'Official source groups/recordings with documented IELTSLab short-screen adaptation. Staff explicitly confirms key review; no psychometric or official-band claim.'}});
      const ids: Record<string,string>={};
      for (const [displayOrder,skill] of (['LISTENING','READING','WRITING'] as const).entries()) {
        const section=await tx.testSection.create({data:{testVersionId:version.id,skill,displayOrder:displayOrder+1,timeLimitSeconds:skill==='LISTENING'?720:skill==='READING'?840:960}});
        const parts=skill==='WRITING'?[]:pack.parts.filter(p=>p.skill===skill&&(p.pathway==='BOTH'||p.pathway===pathway));
        if(skill==='WRITING') {
          const part=await tx.testPart.create({data:{testSectionId:section.id,sourceKey:'writing',slot:'WRITING_TASK_2',title:'Readiness Writing',reviewStatus:'VERIFIED'}});
          const group=await tx.questionGroup.create({data:{testPartId:part.id,sourceKey:'writing',displayOrder:1,questionType:'WRITING_TASK_2_ESSAY',responseKind:'LONG_TEXT',scoringStrategy:'RUBRIC',maxMarks:0,minWordCount:160,reviewStatus:'VERIFIED',rawAnswerInstruction:pack.writing.instructions}});
          const question=await tx.question.create({data:{questionGroupId:group.id,stableKey:'W1',displayOrder:1,maxMarks:0,promptHtml:pack.writing.prompt}}); ids.W1=question.id;
        }
        for(const [index,p] of parts.entries()) {
          const slot=(skill==='LISTENING'?`LISTENING_PART_${index+1}`:`READING_SECTION_${index+1}`) as PartSlot;
          const part=await tx.testPart.create({data:{testSectionId:section.id,sourceKey:p.id,slot,title:p.title,reviewStatus:'VERIFIED',extractionMetadata:{phase:p.phase,pathway:p.pathway,sourceAssessments:[...new Set(p.items.map(q=>q.sourceRef?.assessmentId).filter((id):id is string=>!!id))]},instructionsHtml:p.instructions}});
          await tx.stimulus.create({data:{testPartId:part.id,sourceKey:'source',type:skill==='READING'?'READING_PASSAGE':'SHARED_CONTEXT',displayOrder:1,
            plainText:p.text??null,transcript:p.script??null,isVisibleToLearner:skill==='READING',reviewStatus:'VERIFIED'}});
          if(p.audio) {
            const a=audio.find(a=>a.key===p.audio)!;
            const asset=await tx.contentAsset.upsert({where:{storageKey:a.key},update:{},create:{sourceArtifactId:artifact.id,type:'AUDIO',storageKey:a.key,checksum:a.hash,mimeType:'audio/mpeg',byteSize:BigInt(a.bytes),durationMs:Math.round(p.audioSeconds!*1000),reviewStatus:'VERIFIED',metadata:p.audioSource??{generation:'original fallback audio'}}});
            if(asset.checksum!==a.hash)throw new DiagnosticError('CONTENT_INTEGRITY',409);
            await tx.contentAssetReference.create({data:{assetId:asset.id,testPartId:part.id}});
          }
          for(const [qi,q] of p.items.entries()) {
            const group=await tx.questionGroup.create({data:{testPartId:part.id,sourceKey:q.id,displayOrder:qi+1,questionType:q.type==='CHOICE'?'MULTIPLE_CHOICE':'SHORT_ANSWER',responseKind:q.type==='CHOICE'?'SINGLE_CHOICE':'SHORT_TEXT',scoringStrategy:'PER_ITEM_EXACT',maxMarks:1,reviewStatus:'VERIFIED',maxWords:q.maxWords,options:q.options?Object.entries(q.options).map(([label,text])=>({label,text})):Prisma.JsonNull}});
            const question=await tx.question.create({data:{questionGroupId:group.id,stableKey:q.id,displayOrder:1,sourceNumber:q.sourceRef?.sourceNumber??q.number,promptHtml:q.prompt,metadata:{nativeNumber:q.number,evidence:q.evidence,rationale:q.rationale,sourceRef:q.sourceRef??null}}}); ids[q.id]=question.id;
            await tx.answerKey.create({data:{questionGroupId:group.id,sourceArtifactId:artifact.id,sourceType:'HUMAN_VERIFIED',reviewStatus:'VERIFIED',verifiedById:actorUserId,verifiedAt:new Date(),
              encryptedPayload:encrypt(JSON.stringify({strategy:'PER_ITEM_EXACT',answersByStableKey:{[q.id]:q.answers}})),normalization:{caseSensitive:false,trimOuterWhitespace:true,collapseInternalWhitespace:true,unicodeForm:'NFKC'},sourceLocator:`${q.sourceRef?.answerKeyFile??'original fallback'} / source question ${q.sourceRef?.sourceNumber??q.number}; staff explicitly confirmed review on activation`}});
          }
        }
      }
      await tx.testVersion.update({where:{id:version.id},data:{status:'PUBLISHED',publishedAt:new Date()}});
      const blueprint=await tx.testBlueprint.create({data:{code,version:revision,name:`IELTSLab readiness: ${pathway}`,variant:pathway,status:'PUBLISHED',publishedAt:new Date(),fixedTestVersionId:version.id}});
      result.push({pathway,blueprintId:blueprint.id,itemIds:ids});
      await tx.staffActionAudit.create({data:{actorUserId,action:'READINESS_CONTENT_ACTIVATED',targetType:'TestBlueprint',targetId:blueprint.id,reason:'Staff explicitly confirmed answer-key review and activated the readiness pack',metadata:{packHash:hash,keyReviewConfirmed:true,audit:'automated source-key, evidence and structure; no psychometric validation'}}});
    }
    return result;
  });
}
