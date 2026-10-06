import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/** Real multi-connection DB client; test-owned lifecycle, not a transaction mock. */
export function diagnosticTestPrisma() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max:4 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { disposeExternalPool:true }) });
  (globalThis as unknown as { prisma: PrismaClient }).prisma = prisma;
  return prisma;
}

/** Explicitly synthetic; restricted to the isolated local diagnostic test database. */
export async function diagnosticFixture(options: {
  noReview?: boolean; staleReview?: boolean; wrongHash?: boolean; missingKey?: boolean; unverifiedKey?: boolean;
  media?: 'missing' | 'wrongType' | 'unverified' | 'wrongHash' | 'unlinked' | 'tooLong';
  visibleMedia?: 'svg' | 'svgExtension' | 'unsafeKey';
  missingOptions?: boolean; missingPassage?: boolean; unpublished?: boolean; browserChoices?: boolean; scoringKeys?: boolean;
} = {}) {
  const url = process.env.TEST_DATABASE_URL!;
  if (new URL(url).hostname !== '127.0.0.1' || new URL(url).port !== '55322') {
    throw new Error('Synthetic diagnostic fixtures require isolated local port 55322');
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const id = randomUUID();
  const owner = randomUUID(), staff = randomUUID(), stranger = randomUUID();
  const source = randomUUID(), sourceTest = randomUUID(), version = randomUUID(), blueprint = randomUUID();
  const hash = 'a'.repeat(64);
  const visibleImageId=randomUUID(), unlinkedAssetId=randomUUID(), sourceAudioAssetId=randomUUID();
  const partIds: string[] = [], questionIds: string[] = [], assetIds: string[] = [], groupIds: string[] = [];
  try {
    await client.query('BEGIN');
    for (const [user, role] of [[owner, 'STUDENT'], [staff, 'ADMIN'], [stranger, 'STUDENT']]) {
      await client.query(`INSERT INTO app_private."User" (id,email,role,"updatedAt") VALUES ($1,$2,$3::app_private."Role",now())`, [user, `${user}@synthetic.invalid`, role]);
    }
    for(const [asset,type,key,duration] of [
      [visibleImageId,'DIAGRAM','visible.png',null],
      [unlinkedAssetId,'DIAGRAM','unlinked.png',null],
      [sourceAudioAssetId,'AUDIO','full-source.mp3',4000000],
    ]) await client.query(`INSERT INTO app_private."ContentAsset" (id,type,"storageKey",checksum,"mimeType","durationMs","reviewStatus") VALUES ($1,$2::app_private."ContentAssetType",$3,$4,$5,$6,'VERIFIED')`,[asset,type,`synthetic/${id}/${key}`,hash,type==='AUDIO'?'audio/mpeg':'image/png',duration]);
    // Build hostile visible media before publication; never bypass source immutability.
    if (options.visibleMedia) {
      const key = options.visibleMedia === 'unsafeKey' ? `synthetic/${id}/../visible.png`
        : `synthetic/${id}/${options.visibleMedia === 'svg' ? 'visible.svg' : 'visible.SVG'}`;
      await client.query(`UPDATE app_private."ContentAsset" SET "storageKey"=$2,"mimeType"=$3 WHERE id=$1`,
        [visibleImageId,key,options.visibleMedia === 'svg' ? 'image/svg+xml' : 'image/png']);
    }
    await client.query(`INSERT INTO app_private."ContentSource" (id,provider,name,"updatedAt") VALUES ($1,'OTHER',$2,now())`, [source, `SYNTHETIC diagnostic ${id}`]);
    await client.query(`INSERT INTO app_private."Test" (id,"sourceId",title,variant,"sourceYear","updatedAt") VALUES ($1,$2,'SYNTHETIC diagnostic fixture','ACADEMIC',2026,now())`, [sourceTest,source]);
    await client.query(`INSERT INTO app_private."TestVersion" (id,"testId",version,status,"contentHash","updatedAt") VALUES ($1,$2,1,'DRAFT',$3,now())`, [version,sourceTest,hash]);
    for (const [index, skill] of ['LISTENING','READING','WRITING'].entries()) {
      const section = randomUUID();
      await client.query(`INSERT INTO app_private."TestSection" (id,"testVersionId",skill,"displayOrder","timeLimitSeconds") VALUES ($1,$2,$3::app_private."Skill",$4,3600)`, [section,version,skill,index+1]);
      const slots = skill === 'LISTENING' ? ['LISTENING_PART_3','LISTENING_PART_4'] : [skill === 'READING' ? 'READING_SECTION_1':'WRITING_TASK_2'];
      for (const slot of slots) {
        const part = randomUUID(), group = randomUUID();
        partIds.push(part); groupIds.push(group);
        await client.query(`INSERT INTO app_private."TestPart" (id,"testSectionId","sourceKey",slot,"reviewStatus") VALUES ($1,$2,$3::text,$3::text::app_private."PartSlot",'VERIFIED')`,[part,section,slot]);
        let asset: string | null = null;
        if (skill === 'LISTENING' && options.media !== 'missing') {
          asset = randomUUID(); assetIds.push(asset);
          await client.query(`INSERT INTO app_private."ContentAsset" (id,type,"storageKey",checksum,"mimeType","durationMs","reviewStatus") VALUES ($1,$2::app_private."ContentAssetType",$3,$4,'audio/mpeg',$5,$6::app_private."ReviewStatus")`,[asset, options.media === 'wrongType' ? 'PHOTO':'AUDIO',`synthetic/${id}/${slot.replaceAll('_','-')}.mp3`, options.media==='wrongHash'?'b'.repeat(64):hash,options.media==='tooLong'?600000:500000,options.media==='unverified'?'PENDING_REVIEW':'VERIFIED']);
          if (options.media !== 'unlinked') await client.query(`INSERT INTO app_private."ContentAssetReference" ("assetId","testPartId") VALUES ($1,$2)`,[asset,part]);
        }
        const type = skill==='READING'?'READING_PASSAGE':skill==='LISTENING'?'SHARED_CONTEXT':'WRITING_PROMPT';
        if (!(options.missingPassage && skill==='READING')) await client.query(`INSERT INTO app_private."Stimulus" ("testPartId","sourceKey",type,"displayOrder","plainText","reviewStatus") VALUES ($1,'synthetic',$2::app_private."StimulusType",1,'SYNTHETIC source, not an official exercise','VERIFIED')`,[part,type]);
        const count = skill==='LISTENING'?10:skill==='READING'?13:1;
        const firstSourceNumber=slot==='LISTENING_PART_3'?21:slot==='LISTENING_PART_4'?31:skill==='READING'?27:1;
        const choice = (options.missingOptions && skill==='READING') || (options.browserChoices && slot==='LISTENING_PART_4');
        await client.query(`INSERT INTO app_private."QuestionGroup" (id,"testPartId","sourceKey","displayOrder","questionType","responseKind","scoringStrategy","maxMarks","reviewStatus","promptHtml") VALUES ($1,$2,'synthetic',1,$3::app_private."QuestionType",$4::app_private."ResponseKind",$5::app_private."ScoringStrategy",$6,'VERIFIED','SYNTHETIC prompt')`,[group,part,skill==='WRITING'?'WRITING_TASK_2_ESSAY':choice?'MULTIPLE_CHOICE':'SHORT_ANSWER',skill==='WRITING'?'LONG_TEXT':choice?'SINGLE_CHOICE':'SHORT_TEXT',skill==='WRITING'?'RUBRIC':'PER_ITEM_EXACT',skill==='WRITING'?0:count]);
        await client.query(`UPDATE app_private."QuestionGroup" SET "sourceNumberStart"=$2,"sourceNumberEnd"=$3,"instructionsHtml"=$4 WHERE id=$1`,[group,firstSourceNumber,firstSourceNumber+count-1,`SYNTHETIC source instructions: answer questions ${firstSourceNumber}–${firstSourceNumber+count-1}.`]);
        if (choice && !options.missingOptions) await client.query(`UPDATE app_private."QuestionGroup" SET options=$2::jsonb WHERE id=$1`,
          [group,JSON.stringify([{label:'A',text:'SYNTHETIC option A'},{label:'B',text:'SYNTHETIC option B'}])]);
        for (let i=1;i<=count;i++) {
          const question=randomUUID();questionIds.push(question);
          await client.query(`INSERT INTO app_private."Question" (id,"questionGroupId","stableKey","displayOrder","maxMarks","promptHtml","sourceNumber") VALUES ($1,$2,$3,$4,$5,'SYNTHETIC item',$6)`,[question,group,`q${i}`,i,skill==='WRITING'?0:1,firstSourceNumber+i-1]);
        }
        if(skill!=='WRITING' && !options.missingKey) {
          const payload = options.scoringKeys ? (await import('../../src/lib/crypto')).encrypt(JSON.stringify({ strategy: 'PER_ITEM_EXACT',
            answersByStableKey: Object.fromEntries(Array.from({ length: count }, (_, i) => [`q${i+1}`, ['A','B']])) })) : 'synthetic-not-used-by-delivery';
          await client.query(`INSERT INTO app_private."AnswerKey" ("questionGroupId","encryptedPayload","sourceType","reviewStatus","verifiedById","verifiedAt","updatedAt") VALUES ($1,$4,'HUMAN_VERIFIED',$3::app_private."ReviewStatus",$2,now(),now())`,[group,staff,options.unverifiedKey?'PENDING_REVIEW':'VERIFIED',payload]);
        }
        if(!options.noReview) await client.query(`INSERT INTO app_private."DiagnosticContentReview" ("testPartId","contentHash","reviewerId","reviewedAt","reviewDueAt",suitability,"audioAssetId","audioHash","audioDurationSeconds","audioBoundariesVerified") VALUES ($1,$2,$3,now()-interval '2 days',now()+interval '30 days',$4,$5,$6,$7,$8)`,[part,options.wrongHash?'b'.repeat(64):hash,staff,skill==='LISTENING'?'HARDER_LISTENING':skill==='READING'?'REPRESENTATIVE_READING':'TASK_2_DIAGNOSTIC',asset,asset?hash:null,asset?(options.media==='tooLong'?600:500):null,!!asset]);
        if(options.staleReview) await client.query(`INSERT INTO app_private."DiagnosticContentReview" ("testPartId","contentHash","reviewerId","reviewedAt","reviewDueAt",suitability) VALUES ($1,$2,$3,now()-interval '1 day',now()-interval '1 hour',$4)`,[part,hash,staff,skill==='LISTENING'?'HARDER_LISTENING':skill==='READING'?'REPRESENTATIVE_READING':'TASK_2_DIAGNOSTIC']);
      }
    }
    await client.query(`INSERT INTO app_private."Stimulus" ("testPartId","assetId","sourceKey",type,"displayOrder","plainText","reviewStatus") VALUES ($1,$2,'visible-diagram','SHARED_CONTEXT',2,'SYNTHETIC image description','VERIFIED')`,[partIds[2],visibleImageId]);
    await client.query(`INSERT INTO app_private."ContentAssetReference" ("assetId","testPartId") VALUES ($1,$2)`,[sourceAudioAssetId,partIds[0]]);
    if(!options.unpublished) await client.query(`UPDATE app_private."TestVersion" SET status='PUBLISHED',"publishedAt"=now(),"updatedAt"=now() WHERE id=$1`,[version]);
    await client.query(`INSERT INTO app_private."TestBlueprint" (id,code,version,name,variant,"fixedTestVersionId") VALUES ($1,$2,1,'SYNTHETIC diagnostic blueprint','ACADEMIC',$3)`,[blueprint,`synthetic-${id}`,version]);
    for(const [i,slot] of ['LISTENING_PART_3','LISTENING_PART_4','READING_SECTION_1','WRITING_TASK_2'].entries()) await client.query(`INSERT INTO app_private."BlueprintSlot" ("blueprintId","partSlot","displayOrder","targetMarks") VALUES ($1,$2::app_private."PartSlot",$3,$4)`,[blueprint,slot,i+1,i<2?10:i===2?13:0]);
    if(!options.unpublished) await client.query(`UPDATE app_private."TestBlueprint" SET status='PUBLISHED',"publishedAt"=now() WHERE id=$1`,[blueprint]);
    await client.query('COMMIT');
    return { owner,staff,stranger,blueprint,version,partIds,questionIds,assetIds,groupIds,visibleImageId,unlinkedAssetId,sourceAudioAssetId };
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
