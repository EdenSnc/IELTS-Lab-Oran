import 'dotenv/config';

import prisma from '../src/lib/prisma';
import { ACADEMIC_MOCK_TEST_PRODUCT as PRODUCT } from '../src/lib/commerce/catalog';
import { isCommerciallyEligiblePart } from '../src/lib/content/commercial-eligibility';

const BLUEPRINT = {
  code: 'academic-full-mock-1',
  version: 1,
  name: 'IELTS Academic Full Mock Test',
  variant: 'ACADEMIC' as const,
};

const SLOT_MARKS = [
  ['LISTENING_PART_1', 10],
  ['LISTENING_PART_2', 10],
  ['LISTENING_PART_3', 10],
  ['LISTENING_PART_4', 10],
  ['READING_SECTION_1', 13],
  ['READING_SECTION_2', 13],
  ['READING_SECTION_3', 14],
  ['WRITING_TASK_1', 0],
  ['WRITING_TASK_2', 0],
] as const;

function requestedTestVersionId() {
  const argument = process.argv.find((value) => value.startsWith('--test-version-id='));
  return argument?.slice('--test-version-id='.length) || process.env.COMMERCIAL_TEST_VERSION_ID;
}

async function resolvePublishedTestVersion() {
  const id = requestedTestVersionId();
  const candidates = await prisma.testVersion.findMany({
    where: {
      ...(id ? { id } : {}),
      status: 'PUBLISHED',
      test: { variant: 'ACADEMIC' },
    },
    select: {
      id: true,
      version: true,
      test: { select: { title: true } },
      sections: {
        select: {
          parts: {
            select: {
              slot: true,
              reviewStatus: true,
              stimuli: {
                select: {
                  isVisibleToLearner: true,
                  reviewStatus: true,
                  asset: { select: { reviewStatus: true } },
                },
              },
              questionGroups: {
                select: {
                  reviewStatus: true,
                  scoringStrategy: true,
                  maxMarks: true,
                  answerKey: { select: { reviewStatus: true, formatVersion: true } },
                  assetLinks: { select: { asset: { select: { reviewStatus: true } } } },
                  questions: { select: { stableKey: true, maxMarks: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
  });
  const expectedSlots = new Set<string>(SLOT_MARKS.map(([slot]) => slot));
  const eligible = candidates.filter((candidate) => {
    const parts = candidate.sections.flatMap((section) => section.parts);
    return parts.length === expectedSlots.size
      && parts.every((part) => expectedSlots.has(part.slot) && isCommerciallyEligiblePart(part));
  });
  if (eligible.length !== 1) {
    throw new Error(id ? 'COMMERCIAL_TEST_VERSION_NOT_ELIGIBLE' : 'COMMERCIAL_TEST_VERSION_AMBIGUOUS');
  }
  return eligible[0];
}

async function main() {
  const version = await resolvePublishedTestVersion();
  const result = await prisma.$transaction(async (transaction) => {
    let blueprint = await transaction.testBlueprint.findUnique({
      where: { code_version: { code: BLUEPRINT.code, version: BLUEPRINT.version } },
      include: { slots: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!blueprint) {
      blueprint = await transaction.testBlueprint.create({
        data: {
          ...BLUEPRINT,
          fixedTestVersionId: version.id,
          slots: {
            create: SLOT_MARKS.map(([partSlot, targetMarks], index) => ({
              partSlot,
              displayOrder: index + 1,
              requiredCount: 1,
              selectionMode: 'WHOLE_PART',
              targetMarks,
            })),
          },
        },
        include: { slots: { orderBy: { displayOrder: 'asc' } } },
      });
      blueprint = await transaction.testBlueprint.update({
        where: { id: blueprint.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
        include: { slots: { orderBy: { displayOrder: 'asc' } } },
      });
    }

    const slotsMatch = blueprint.slots.length === SLOT_MARKS.length
      && blueprint.slots.every((slot, index) => (
        slot.partSlot === SLOT_MARKS[index][0]
        && slot.targetMarks === SLOT_MARKS[index][1]
        && slot.requiredCount === 1
        && slot.selectionMode === 'WHOLE_PART'
      ));
    if (
      blueprint.status !== 'PUBLISHED'
      || blueprint.fixedTestVersionId !== version.id
      || blueprint.variant !== BLUEPRINT.variant
      || !slotsMatch
    ) throw new Error('EXISTING_BLUEPRINT_CONFIGURATION_MISMATCH');

    const existingProduct = await transaction.product.findUnique({
      where: { code: PRODUCT.code },
      include: { blueprints: true },
    });
    if (existingProduct) {
      const valuesMatch = existingProduct.tier === PRODUCT.tier
        && existingProduct.name === PRODUCT.name
        && existingProduct.priceMinor === PRODUCT.priceMinor
        && existingProduct.currency === PRODUCT.currency
        && existingProduct.accessDays === PRODUCT.accessDays
        && existingProduct.maximumAttempts === PRODUCT.maximumAttempts
        && existingProduct.active;
      if (!valuesMatch) throw new Error('EXISTING_PRODUCT_CONFIGURATION_MISMATCH');
      if (existingProduct.blueprints.length === 0) {
        await transaction.productBlueprint.create({
          data: { productId: existingProduct.id, blueprintId: blueprint.id },
        });
        existingProduct.blueprints.push({ productId: existingProduct.id, blueprintId: blueprint.id });
      }
      if (
        existingProduct.blueprints.length !== 1
        || existingProduct.blueprints[0]?.blueprintId !== blueprint.id
      ) throw new Error('EXISTING_PRODUCT_CONFIGURATION_MISMATCH');
      return { product: existingProduct, blueprint, created: false };
    }

    const product = await transaction.product.create({
      data: {
        ...PRODUCT,
        metadata: { resultsAccessDays: PRODUCT.accessDays },
        blueprints: { create: { blueprintId: blueprint.id } },
      },
      include: { blueprints: true },
    });
    return { product, blueprint, created: true };
  });

  console.log(JSON.stringify({
    created: result.created,
    productCode: result.product.code,
    priceDzd: result.product.priceMinor / 100,
    accessDays: result.product.accessDays,
    maximumAttempts: result.product.maximumAttempts,
    blueprintCode: result.blueprint.code,
    testVersion: version.version,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
