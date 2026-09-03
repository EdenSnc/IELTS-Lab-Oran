import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import prisma from '../src/lib/prisma.ts';
import { encrypt } from '../src/lib/crypto.ts';
import {
  parseStagedTestPackage,
  type StagedTestPackage,
} from '../src/lib/content/staging-schema.ts';
import { certifyCompleteMockPackage } from '../src/lib/content/content-certification.ts';
import { assertValidAssetStorageKey } from '../src/lib/content/private-asset-storage.ts';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function inferAssetType(filename: string) {
  if (filename.endsWith('.mp3')) return 'AUDIO' as const;
  if (filename.includes('128121975')) return 'MAP' as const;
  if (filename.includes('128116862')) return 'FLOWCHART' as const;
  if (filename.includes('128124906')) return 'BAR_CHART' as const;
  return 'OTHER' as const;
}

function referencedAssetIds(
  assetIdByStorageKey: Map<string, string>,
  ...htmlValues: Array<string | null | undefined>
) {
  const ids = new Set<string>();
  for (const html of htmlValues) {
    for (const match of html?.matchAll(/content-asset:\/\/([^"' )>]+)/gu) ?? []) {
      const storageKey = match[1];
      const assetId = assetIdByStorageKey.get(storageKey);
      if (!assetId) throw new Error(`Inline asset was not imported: ${storageKey}`);
      ids.add(assetId);
    }
  }
  return [...ids];
}

function packagePath(packageRoot: string, filename: string) {
  const resolved = path.resolve(packageRoot, filename);
  const relative = path.relative(packageRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Artifact escapes the content package: ${filename}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Packaged artifact is missing: ${filename}`);
  }
  return resolved;
}

async function importPackage(staged: StagedTestPackage, packageRoot: string, isPublicDemo: boolean) {
  if (!staged.source.externalId || !staged.test.externalId) {
    throw new Error('Database import requires source.externalId and test.externalId');
  }

  for (const artifact of staged.source.artifacts) {
    const filePath = packagePath(packageRoot, artifact.filename);
    const checksum = crypto
      .createHash('sha256')
      .update(fs.readFileSync(filePath))
      .digest('hex');
    if (checksum !== artifact.checksum) {
      throw new Error(`Checksum mismatch for ${artifact.filename}`);
    }
  }

  const contentHash = crypto
    .createHash('sha256')
    .update(stableStringify(staged))
    .digest('hex');

  return prisma.$transaction(async (transaction) => {
    const source = await transaction.contentSource.upsert({
      where: {
        provider_externalId: {
          provider: staged.source.provider,
          externalId: staged.source.externalId!,
        },
      },
      create: {
        provider: staged.source.provider,
        externalId: staged.source.externalId,
        name: staged.source.name,
        sourceUrl: staged.source.sourceUrl,
        sourceYear: staged.source.sourceYear,
        rightsReference: staged.source.rightsReference,
        notes: staged.source.notes,
      },
      update: {
        name: staged.source.name,
        sourceUrl: staged.source.sourceUrl,
        sourceYear: staged.source.sourceYear,
        rightsReference: staged.source.rightsReference,
        notes: staged.source.notes,
      },
    });

    for (const artifact of staged.source.artifacts) {
      await transaction.sourceArtifact.upsert({
        where: {
          sourceId_checksum: {
            sourceId: source.id,
            checksum: artifact.checksum,
          },
        },
        create: {
          sourceId: source.id,
          kind: artifact.kind,
          filename: artifact.filename,
          originalPath: artifact.originalPath,
          storageKey: artifact.filename,
          mimeType: artifact.mimeType,
          byteSize: artifact.byteSize === undefined ? undefined : BigInt(artifact.byteSize),
          checksum: artifact.checksum,
          metadata: artifact.metadata ? json(artifact.metadata) : undefined,
          capturedAt: artifact.capturedAt ? new Date(artifact.capturedAt) : undefined,
        },
        update: {
          filename: artifact.filename,
          storageKey: artifact.filename,
          mimeType: artifact.mimeType,
          byteSize: artifact.byteSize === undefined ? undefined : BigInt(artifact.byteSize),
          metadata: artifact.metadata ? json(artifact.metadata) : undefined,
          capturedAt: artifact.capturedAt ? new Date(artifact.capturedAt) : undefined,
        },
      });
    }

    const sourceArtifacts = await transaction.sourceArtifact.findMany({
      where: { sourceId: source.id },
    });
    const sourceArtifactByChecksum = new Map(
      sourceArtifacts.map((artifact) => [artifact.checksum, artifact]),
    );

    const assetIdByChecksum = new Map<string, string>();
    const assetIdByStorageKey = new Map<string, string>();
    for (const artifact of staged.source.artifacts.filter(
      (candidate) => candidate.kind === 'AUDIO' || candidate.kind === 'IMAGE',
    )) {
      const sourceArtifact = sourceArtifactByChecksum.get(artifact.checksum);
      if (!sourceArtifact) throw new Error(`Source artifact was not imported: ${artifact.filename}`);
      assertValidAssetStorageKey(artifact.filename);
      const metadata = artifact.metadata ?? {};
      const durationMs = typeof metadata.durationMs === 'number'
        ? metadata.durationMs
        : undefined;
      const asset = await transaction.contentAsset.upsert({
        where: { storageKey: artifact.filename },
        create: {
          sourceArtifactId: sourceArtifact.id,
          type: inferAssetType(artifact.filename),
          storageKey: artifact.filename,
          checksum: artifact.checksum,
          mimeType: artifact.mimeType ?? 'application/octet-stream',
          byteSize: artifact.byteSize === undefined ? undefined : BigInt(artifact.byteSize),
          durationMs,
          metadata: artifact.metadata ? json(artifact.metadata) : undefined,
          reviewStatus: artifact.reviewStatus,
        },
        update: {
          sourceArtifactId: sourceArtifact.id,
          checksum: artifact.checksum,
          mimeType: artifact.mimeType ?? 'application/octet-stream',
          byteSize: artifact.byteSize === undefined ? undefined : BigInt(artifact.byteSize),
          durationMs,
          metadata: artifact.metadata ? json(artifact.metadata) : undefined,
        },
      });
      assetIdByChecksum.set(artifact.checksum, asset.id);
      assetIdByStorageKey.set(artifact.filename, asset.id);
    }

    const test = await transaction.test.upsert({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: staged.test.externalId!,
        },
      },
      create: {
        sourceId: source.id,
        externalId: staged.test.externalId,
        title: staged.test.title,
        variant: staged.test.variant,
        sourceYear: staged.test.sourceYear,
        isPublicDemo,
      },
      update: {
        title: staged.test.title,
        variant: staged.test.variant,
        sourceYear: staged.test.sourceYear,
        ...(isPublicDemo ? { isPublicDemo: true } : {}),
      },
    });

    const imported = await transaction.testVersion.findFirst({
      where: { testId: test.id, contentHash },
      select: { id: true, version: true },
    });
    if (imported) {
      return { ...imported, contentHash, created: false };
    }

    const occupiedVersion = await transaction.testVersion.findUnique({
      where: {
        testId_version: {
          testId: test.id,
          version: staged.test.version,
        },
      },
      select: { contentHash: true },
    });
    if (occupiedVersion) {
      throw new Error(
        `Test version ${staged.test.version} already exists with different content. `
        + 'Increment staged.test.version instead of mutating an imported version.',
      );
    }

    const created = await transaction.testVersion.create({
      data: {
        testId: test.id,
        version: staged.test.version,
        status: 'DRAFT',
        contentHash,
        notes: staged.test.notes,
      },
      select: { id: true, version: true },
    });

    for (const section of staged.test.sections) {
      const sectionRecord = await transaction.testSection.create({
        data: {
          testVersionId: created.id,
          skill: section.skill,
          displayOrder: section.displayOrder,
          timeLimitSeconds: section.timeLimitSeconds,
        },
      });

      for (const part of section.parts) {
        const partRecord = await transaction.testPart.create({
          data: {
            testSectionId: sectionRecord.id,
            sourceKey: part.sourceKey,
            slot: part.slot,
            selectionGroupKey: part.selectionGroupKey,
            title: part.title,
            instructionsHtml: part.instructionsHtml,
            recommendedTimeSeconds: part.recommendedTimeSeconds,
            preparationTimeSeconds: part.preparationTimeSeconds,
            responseTimeSeconds: part.responseTimeSeconds,
            difficultyBand: part.difficultyBand,
            sourceLocator: part.sourceLocator,
            extractionMetadata: part.extractionMetadata
              ? json(part.extractionMetadata)
              : undefined,
            reviewStatus: part.reviewStatus,
            shuffleQuestionGroups: part.shuffleQuestionGroups,
          },
        });
        await transaction.contentAssetReference.createMany({
          data: referencedAssetIds(assetIdByStorageKey, part.instructionsHtml)
            .map((assetId) => ({ assetId, testPartId: partRecord.id })),
          skipDuplicates: true,
        });

        for (const stimulus of part.stimuli) {
          const assetId = stimulus.assetChecksum
            ? assetIdByChecksum.get(stimulus.assetChecksum)
            : undefined;
          if (stimulus.assetChecksum && !assetId) {
            throw new Error(`Stimulus asset was not imported: ${stimulus.assetChecksum}`);
          }
          const stimulusRecord = await transaction.stimulus.create({
            data: {
              testPartId: partRecord.id,
              sourceKey: stimulus.sourceKey,
              type: stimulus.type,
              displayOrder: stimulus.displayOrder,
              title: stimulus.title,
              bodyHtml: stimulus.bodyHtml,
              plainText: stimulus.plainText,
              transcript: stimulus.transcript,
              assetId,
              audioStartMs: stimulus.audioStartMs,
              audioEndMs: stimulus.audioEndMs,
              isVisibleToLearner: stimulus.isVisibleToLearner,
              reviewStatus: stimulus.reviewStatus,
            },
          });
          await transaction.contentAssetReference.createMany({
            data: referencedAssetIds(assetIdByStorageKey, stimulus.bodyHtml)
              .map((linkedAssetId) => ({ assetId: linkedAssetId, stimulusId: stimulusRecord.id })),
            skipDuplicates: true,
          });
        }

        for (const group of part.questionGroups) {
          const groupRecord = await transaction.questionGroup.create({
            data: {
              testPartId: partRecord.id,
              sourceKey: group.sourceKey,
              displayOrder: group.displayOrder,
              questionType: group.questionType,
              responseKind: group.responseKind,
              scoringStrategy: group.scoringStrategy,
              sourceNumberStart: group.sourceNumberStart,
              sourceNumberEnd: group.sourceNumberEnd,
              instructionsHtml: group.instructionsHtml,
              promptHtml: group.promptHtml,
              options: group.options ? json(group.options) : undefined,
              maxMarks: group.maxMarks,
              minWordCount: group.minWordCount,
              maxWords: group.maxWords,
              allowNumbers: group.allowNumbers,
              rawAnswerInstruction: group.rawAnswerInstruction,
              independent: group.independent,
              shuffleQuestions: group.shuffleQuestions,
              shuffleOptions: group.shuffleOptions,
              dependencyKey: group.dependencyKey,
              reviewStatus: group.reviewStatus,
            },
          });
          await transaction.contentAssetReference.createMany({
            data: referencedAssetIds(assetIdByStorageKey, group.instructionsHtml, group.promptHtml)
              .map((assetId) => ({ assetId, questionGroupId: groupRecord.id })),
            skipDuplicates: true,
          });

          await transaction.question.createMany({
            data: group.questions.map((question) => ({
              questionGroupId: groupRecord.id,
              stableKey: question.stableKey,
              sourceNumber: question.sourceNumber,
              displayOrder: question.displayOrder,
              promptHtml: question.promptHtml,
              responseKindOverride: question.responseKindOverride,
              maxMarks: question.maxMarks,
              metadata: question.metadata ? json(question.metadata) : undefined,
            })),
          });
          const questionRecords = await transaction.question.findMany({
            where: { questionGroupId: groupRecord.id },
            select: { id: true, stableKey: true },
          });
          const questionIdByStableKey = new Map(questionRecords.map((question) => [question.stableKey, question.id]));
          await transaction.contentAssetReference.createMany({
            data: group.questions.flatMap((question) => {
              const questionId = questionIdByStableKey.get(question.stableKey);
              if (!questionId) throw new Error(`Imported question was not found: ${question.stableKey}`);
              return referencedAssetIds(assetIdByStorageKey, question.promptHtml)
                .map((assetId) => ({ assetId, questionId }));
            }),
            skipDuplicates: true,
          });

          if (group.answerKey) {
            const sourceArtifactId = group.answerKey.sourceArtifactChecksum
              ? sourceArtifactByChecksum.get(group.answerKey.sourceArtifactChecksum)?.id
              : undefined;
            if (group.answerKey.sourceArtifactChecksum && !sourceArtifactId) {
              throw new Error(
                `Answer-key artifact was not imported: ${group.answerKey.sourceArtifactChecksum}`,
              );
            }
            const encryptedPayload = encrypt(JSON.stringify(group.answerKey.payload));
            await transaction.answerKey.create({
              data: {
                questionGroupId: groupRecord.id,
                sourceArtifactId,
                encryptedPayload,
                formatVersion: group.answerKey.formatVersion,
                sourceType: group.answerKey.sourceType,
                normalization: json(group.answerKey.normalization),
                reviewStatus: group.answerKey.reviewStatus,
                sourceLocator: group.answerKey.sourceLocator,
                verifiedAt: group.answerKey.reviewStatus === 'VERIFIED'
                  ? new Date()
                  : undefined,
              },
            });
          }

          for (const link of group.assetLinks) {
            const assetId = assetIdByChecksum.get(link.assetChecksum);
            if (!assetId) throw new Error(`Question asset was not imported: ${link.assetChecksum}`);
            await transaction.questionAsset.create({
              data: { questionGroupId: groupRecord.id, assetId, role: link.role },
            });
          }
        }
      }
    }

    return { ...created, contentHash, created: true };
  }, {
    maxWait: 20_000,
    timeout: 120_000,
  });
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error('Usage: npm run content:import -- <staged-test-package.json> [--public-demo]');
  }
  const isPublicDemo = process.argv.slice(3).includes('--public-demo');

  const filePath = path.resolve(process.cwd(), input);
  const staged = parseStagedTestPackage(
    JSON.parse(fs.readFileSync(filePath, 'utf8')),
  );
  if (process.argv.slice(3).includes('--certify-full-mock')) {
    certifyCompleteMockPackage(staged);
  }
  const result = await importPackage(staged, path.dirname(filePath), isPublicDemo);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
