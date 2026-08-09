import prisma from '@/lib/prisma';
import type {
  DeliveryOption,
  DeliveryPart,
  DeliverySkill,
  DeliveryTest,
} from './delivery-types';
import { sanitizeDeliveryHtml } from './sanitize-delivery-html';

const PART_ORDER: Record<string, number> = {
  LISTENING_PART_1: 1,
  LISTENING_PART_2: 2,
  LISTENING_PART_3: 3,
  LISTENING_PART_4: 4,
  READING_SECTION_1: 1,
  READING_SECTION_2: 2,
  READING_SECTION_3: 3,
  WRITING_TASK_1: 1,
  WRITING_TASK_2: 2,
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionsFromJson(value: unknown): DeliveryOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (
      !candidate
      || typeof candidate !== 'object'
      || typeof candidate.label !== 'string'
      || typeof candidate.text !== 'string'
    ) {
      return [];
    }
    return [{ label: candidate.label, text: candidate.text }];
  });
}

function rewriteContentAssetUrls(
  html: string | null,
  assetIdByStorageKey: Map<string, string>,
) {
  if (!html) return html;
  const rewritten = html.replace(
    /content-asset:\/\/([^"' )>]+)/g,
    (original, storageKey: string) => {
      const assetId = assetIdByStorageKey.get(storageKey);
      return assetId ? `/api/test-assets/${assetId}` : original;
    },
  );
  return sanitizeDeliveryHtml(rewritten);
}

export async function loadDeliveryTest(testId: string): Promise<DeliveryTest | null> {
  if (testId !== 'test-1' && !UUID_PATTERN.test(testId)) return null;
  const productionStatus = process.env.NODE_ENV === 'production'
    ? { status: 'PUBLISHED' as const }
    : {};
  const where = testId === 'test-1'
    ? productionStatus
    : { id: testId, ...productionStatus };

  const version = await prisma.testVersion.findFirst({
    where,
    orderBy: testId === 'test-1' ? { createdAt: 'desc' } : undefined,
    include: {
      test: { select: { title: true, variant: true } },
      sections: {
        orderBy: { displayOrder: 'asc' },
        include: {
          parts: {
            include: {
              stimuli: {
                orderBy: { displayOrder: 'asc' },
                include: { asset: { select: { id: true } } },
              },
              questionGroups: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  questions: { orderBy: { displayOrder: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!version) return null;

  const assets = await prisma.contentAsset.findMany({
    select: { id: true, storageKey: true },
  });
  const assetIdByStorageKey = new Map(
    assets.map((asset) => [asset.storageKey, asset.id]),
  );

  return {
    id: version.id,
    title: version.test.title,
    variant: version.test.variant,
    version: version.version,
    sections: version.sections.map((section) => ({
      id: section.id,
      skill: section.skill as DeliverySkill,
      displayOrder: section.displayOrder,
      timeLimitSeconds: section.timeLimitSeconds,
      parts: section.parts
        .sort((left, right) => (
          (PART_ORDER[left.slot] ?? Number.MAX_SAFE_INTEGER)
          - (PART_ORDER[right.slot] ?? Number.MAX_SAFE_INTEGER)
        ))
        .map((part): DeliveryPart => ({
          id: part.id,
          slot: part.slot,
          title: part.title,
          instructionsHtml: rewriteContentAssetUrls(
            part.instructionsHtml,
            assetIdByStorageKey,
          ),
          recommendedTimeSeconds: part.recommendedTimeSeconds,
          stimuli: part.stimuli.map((stimulus) => ({
            id: stimulus.id,
            type: stimulus.type,
            displayOrder: stimulus.displayOrder,
            title: stimulus.title,
            bodyHtml: rewriteContentAssetUrls(
              stimulus.bodyHtml,
              assetIdByStorageKey,
            ),
            plainText: stimulus.plainText,
            assetUrl: stimulus.asset ? `/api/test-assets/${stimulus.asset.id}` : null,
          })),
          questionGroups: part.questionGroups.map((group) => ({
            id: group.id,
            displayOrder: group.displayOrder,
            questionType: group.questionType,
            responseKind: group.responseKind,
            scoringStrategy: group.scoringStrategy,
            sourceNumberStart: group.sourceNumberStart,
            sourceNumberEnd: group.sourceNumberEnd,
            instructionsHtml: rewriteContentAssetUrls(
              group.instructionsHtml,
              assetIdByStorageKey,
            ),
            promptHtml: rewriteContentAssetUrls(
              group.promptHtml,
              assetIdByStorageKey,
            ),
            options: optionsFromJson(group.options),
            maxMarks: group.maxMarks,
            minWordCount: group.minWordCount,
            maxWords: group.maxWords,
            allowNumbers: group.allowNumbers,
            rawAnswerInstruction: group.rawAnswerInstruction,
            questions: group.questions.map((question) => ({
              id: question.id,
              stableKey: question.stableKey,
              sourceNumber: question.sourceNumber,
              displayOrder: question.displayOrder,
              promptHtml: rewriteContentAssetUrls(
                question.promptHtml,
                assetIdByStorageKey,
              ),
              maxMarks: question.maxMarks,
            })),
          })),
        })),
    })),
  };
}
