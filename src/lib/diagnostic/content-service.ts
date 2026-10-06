import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hashFrozenManifestPayload, type AssemblyPart } from '@/lib/attempts/manifest-core';
import { compileDiagnosticManifest } from './compile';
import { parseDiagnosticManifestPayload, type DiagnosticManifestPayload } from './manifest';
import { diagnosticReviewSchema, type DiagnosticReview } from './policy';
import { DiagnosticError } from './protocol';

export type DiagnosticTransaction = Prisma.TransactionClient;

/** Same known SQLSTATE/backoff policy as db/concurrency's private helper, without
 * changing or entering the old engine. Never retry arbitrary application errors. */
export async function diagnosticTransaction<T>(action: (tx: DiagnosticTransaction) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry += 1) {
    try {
      return await prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 15_000,
      });
    } catch (error) {
      const known = error instanceof Prisma.PrismaClientKnownRequestError;
      const meta = known ? error.meta as { driverAdapterError?: { cause?: { originalCode?: string } } } | undefined : undefined;
      // Prisma's client engine can surface a commit conflict directly from the
      // adapter instead of wrapping it in P2034. SQLSTATE40001 guarantees rollback.
      const adapter = error as { name?: string; cause?: { originalCode?: string; kind?: string } };
      const retryable = (known && (error.code === 'P2034' || error.code === 'P2002'
        || (error.code === 'P2010' && meta?.driverAdapterError?.cause?.originalCode === '40001')))
        || (adapter?.name === 'DriverAdapterError' && adapter.cause?.originalCode === '40001'
          && adapter.cause.kind === 'TransactionWriteConflict');
      if (!retryable || retry >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (2 ** retry) + Math.floor(Math.random() * 26)));
    }
  }
}

/** Clock sampled AFTER the row lock; no client timestamp ever reaches this boundary. */
export async function diagnosticNow(tx: DiagnosticTransaction): Promise<Date> {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT date_trunc('milliseconds',clock_timestamp()) AT TIME ZONE 'UTC' AS now`;
  return row.now;
}

const sourceInclude = {
  testSection: { include: { testVersion: { include: { test: true } } } },
  stimuli: { include: { asset: true }, orderBy: { displayOrder: 'asc' as const } },
  assetReferences: { include: { asset: true } },
  questionGroups: {
    include: {
      answerKey: { select: { reviewStatus: true, formatVersion: true } },
      assetLinks: { include: { asset: true } },
      questions: { orderBy: { displayOrder: 'asc' as const } },
    }, orderBy: { displayOrder: 'asc' as const },
  },
} satisfies Prisma.TestPartInclude;
export type DiagnosticSourcePart = Prisma.TestPartGetPayload<{ include: typeof sourceInclude }>;

const choices = new Set([
  'MULTIPLE_CHOICE','MATCHING','MATCHING_INFORMATION','MATCHING_HEADINGS','MATCHING_FEATURES',
  'MATCHING_SENTENCE_ENDINGS','PLAN_MAP_DIAGRAM_LABELING',
]);

function sourceReady(part: DiagnosticSourcePart): boolean {
  return part.testSection.testVersion.status === 'PUBLISHED'
    && !!part.testSection.testVersion.publishedAt && part.reviewStatus === 'VERIFIED'
    && part.stimuli.some(s => s.isVisibleToLearner && (
      part.testSection.skill === 'READING' ? s.type === 'READING_PASSAGE' && !!(s.bodyHtml || s.plainText)
        : part.testSection.skill === 'WRITING' ? s.type === 'WRITING_PROMPT' && !!(s.bodyHtml || s.plainText)
          : !!(s.bodyHtml || s.plainText || s.assetId)
    ))
    && part.stimuli.every(s => s.reviewStatus === 'VERIFIED' && (!s.asset || s.asset.reviewStatus === 'VERIFIED'))
    && part.questionGroups.every(g => (
      g.assetLinks.every(link => link.asset.reviewStatus === 'VERIFIED')
      && ((!choices.has(g.questionType) && !['SINGLE_CHOICE','MULTIPLE_CHOICE','DRAG_DROP'].includes(g.responseKind))
        || (Array.isArray(g.options) && g.options.length > 0))
      && (part.testSection.skill !== 'WRITING' || g.questionType === 'WRITING_TASK_2_ESSAY')
    ));
}

function audioValid(part: DiagnosticSourcePart, review: DiagnosticReview): boolean {
  if (part.testSection.skill !== 'LISTENING') return !review.audio;
  const audio = review.audio;
  if (!audio) return false;
  // A reference directly to THIS part is required. A whole-test/stimulus-only URL
  // cannot become bounded audio solely because its duration happens to fit.
  const linked = part.assetReferences.find(link => link.assetId === audio.assetId)?.asset
    ?? part.stimuli.find(s => s.assetId === audio.assetId)?.asset;
  if (!linked || linked.type !== 'AUDIO' || linked.reviewStatus !== 'VERIFIED'
    || linked.checksum !== audio.sha256 || !linked.mimeType.startsWith('audio/')
    || linked.durationMs !== audio.durationSeconds * 1000) return false;
  // Reject an asset explicitly linked to another part (full-test recordings).
  return !part.stimuli.some(s => s.assetId === audio.assetId
    && ((s.audioStartMs !== null && s.audioStartMs !== 0)
      || (s.audioEndMs !== null && s.audioEndMs !== linked.durationMs)));
}

async function validateAudioScope(tx: DiagnosticTransaction, part: DiagnosticSourcePart, review: DiagnosticReview): Promise<boolean> {
  if (!audioValid(part,review)) return false;
  if (!review.audio) return true;
  const id = review.audio.assetId;
  const otherReferences = await tx.contentAssetReference.count({ where: { assetId: id, OR: [
      { testPartId: { not: part.id } }, { stimulus: { testPartId: { not: part.id } } },
      { questionGroup: { testPartId: { not: part.id } } },
      { question: { questionGroup: { testPartId: { not: part.id } } } },
    ] } });
  const otherStimuli = await tx.stimulus.count({ where: { assetId: id, testPartId: { not: part.id } } });
  const otherGroups = await tx.questionAsset.count({ where: { assetId: id, questionGroup: { testPartId: { not: part.id } } } });
  return otherReferences + otherStimuli + otherGroups === 0;
}

function assemblyPart(part: DiagnosticSourcePart): AssemblyPart {
  const section = part.testSection, version = section.testVersion;
  return {
    id: part.id, testVersionId: version.id, testVersionContentHash: version.contentHash,
    testVariant: version.test.variant, sourceYear: version.test.sourceYear,
    skill: section.skill, sectionId: section.id, sectionTimeLimitSeconds: section.timeLimitSeconds,
    slot: part.slot, reviewStatus: part.reviewStatus, stimuliReady: sourceReady(part),
    assetsReady: sourceReady(part), shuffleQuestionGroups: part.shuffleQuestionGroups,
    groups: part.questionGroups.map(g => ({
      id: g.id, displayOrder: g.displayOrder, reviewStatus: g.reviewStatus,
      scoringStrategy: g.scoringStrategy, maxMarks: g.maxMarks, independent: g.independent,
      shuffleQuestions: g.shuffleQuestions, shuffleOptions: g.shuffleOptions,
      options: g.options, answerKey: g.answerKey,
      questions: g.questions.map(q => ({ id:q.id,stableKey:q.stableKey,displayOrder:q.displayOrder,maxMarks:q.maxMarks })),
    })),
  };
}

export async function compileReadyDiagnosticContent(tx: DiagnosticTransaction, input: {
  blueprintId: string; seed: string; now: Date;
}) {
  const blueprint = await tx.testBlueprint.findUnique({ where: { id: input.blueprintId }, include: { slots: true } });
  if (!blueprint) throw new DiagnosticError('CONTENT_NOT_READY',409);
  const parts = await tx.testPart.findMany({ where: {
    slot: { in: blueprint.slots.map(s => s.partSlot) },
    testSection: { testVersion: { status: 'PUBLISHED', ...(blueprint.fixedTestVersionId ? { id: blueprint.fixedTestVersionId } : {}) } },
  }, include: sourceInclude });
  const candidates: AssemblyPart[] = [], reviews: DiagnosticReview[] = [];
  try {
    for (const part of parts) {
      // Latest insertion is authoritative; ambiguous same-time reviews fail closed.
      const latest = await tx.diagnosticContentReview.findMany({ where: { testPartId: part.id },
        orderBy: [{ createdAt:'desc' },{ id:'desc' }], take:2 });
      if (!latest[0] || (latest[1] && latest[0].createdAt.getTime() === latest[1].createdAt.getTime())) continue;
      const r = latest[0];
      const review = diagnosticReviewSchema.safeParse({
        partId:r.testPartId,contentHash:r.contentHash,reviewerId:r.reviewerId,
        reviewedAt:r.reviewedAt.toISOString(),reviewDueAt:r.reviewDueAt.toISOString(),suitability:r.suitability,
        ...(r.audioAssetId ? { audio:{assetId:r.audioAssetId,sha256:r.audioHash,durationSeconds:r.audioDurationSeconds,boundariesVerified:r.audioBoundariesVerified} } : {}),
      });
      if (!review.success || !sourceReady(part) || !await validateAudioScope(tx,part,review.data)) continue;
      candidates.push(assemblyPart(part));reviews.push(review.data);
    }
    return compileDiagnosticManifest({
      blueprint: { ...blueprint, slots: blueprint.slots.map(s => ({ ...s, selectionMode:s.selectionMode })) },
      candidates,reviews,seed:input.seed,now:input.now,
    });
  } catch (error) {
    if (error instanceof DiagnosticError) throw error;
    // Validation failures become a safe readiness result, never partial consumption.
    if (error instanceof Error && (error.name === 'ZodError' || 'code' in error)) throw new DiagnosticError('CONTENT_NOT_READY',409);
    throw error;
  }
}

/** Trusted internal only: verify hash plus every source/group/question relationship.
 * Frozen review freshness is not rechecked against wall clock after start. */
export async function validateStoredDiagnosticContent(tx: DiagnosticTransaction, input: {
  blueprintId: string; manifest: unknown; manifestHash: string;
}): Promise<{ manifest: DiagnosticManifestPayload; parts: DiagnosticSourcePart[] }> {
  try {
    const manifest = parseDiagnosticManifestPayload(input.manifest);
    if (hashFrozenManifestPayload(manifest) !== input.manifestHash || manifest.blueprintId !== input.blueprintId) throw new Error('hash');
    const blueprint = await tx.testBlueprint.findUnique({ where:{id:input.blueprintId},include:{slots:true} });
    if (!blueprint || blueprint.version !== manifest.blueprintVersion || blueprint.variant !== manifest.variant
      || blueprint.slots.length !== manifest.parts.length) throw new Error('blueprint');
    const raw = await tx.testPart.findMany({where:{id:{in:manifest.parts.map(p=>p.partId)}},include:sourceInclude});
    const parts: DiagnosticSourcePart[] = [];
    for (const [i,frozen] of manifest.parts.entries()) {
      const part = raw.find(p=>p.id===frozen.partId);
      const slot = blueprint.slots.find(s=>s.partSlot===frozen.slot);
      const review=manifest.diagnostic.reviews[i];
      const recordedReview=await tx.diagnosticContentReview.findFirst({where:{
        testPartId:review.partId,contentHash:review.contentHash,reviewerId:review.reviewerId,
        reviewedAt:new Date(review.reviewedAt),reviewDueAt:new Date(review.reviewDueAt),suitability:review.suitability,
        audioAssetId:review.audio?.assetId??null,audioHash:review.audio?.sha256??null,
        audioDurationSeconds:review.audio?.durationSeconds??null,audioBoundariesVerified:!!review.audio,
      },select:{id:true}});
      if (!part || !slot || slot.selectionMode!=='WHOLE_PART' || slot.requiredCount!==1
        || !recordedReview
        || !sourceReady(part) || part.slot!==frozen.slot || part.testSection.skill!==frozen.skill
        || part.testSection.testVersionId!==frozen.testVersionId
        || part.testSection.testVersion.contentHash!==frozen.testVersionContentHash
        || (blueprint.fixedTestVersionId && blueprint.fixedTestVersionId!==frozen.testVersionId)
        || JSON.stringify(part.questionGroups.map(g=>g.id))!==JSON.stringify(frozen.groupIds)
        || !await validateAudioScope(tx,part,manifest.diagnostic.reviews[i])) throw new Error('source');
      for (const [gIndex,group] of part.questionGroups.entries()) {
        const questions=manifest.questions.filter(q=>q.partOrder===frozen.displayOrder && q.groupOrder===gIndex+1);
        if (questions.length!==group.questions.length) throw new Error('questions');
        for(const [qIndex,q] of questions.entries()) if(q.questionId!==group.questions[qIndex].id
          || q.maxMarks!==group.questions[qIndex].maxMarks
          || JSON.stringify(q.presentedOptions)!==JSON.stringify(group.options)) throw new Error('mapping');
      }
      parts.push(part);
    }
    return {manifest,parts};
  } catch (error) {
    // Unknown database errors are not disguised as content corruption.
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError) throw error;
    throw new DiagnosticError('CONTENT_INTEGRITY',409);
  }
}
