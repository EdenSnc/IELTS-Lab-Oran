import 'server-only';

import prisma from '@/lib/prisma';

export async function isAssetLinkedToAttemptContent(
  assetId: string,
  scope: { allowedPartIds: string[]; allowedGroupIds: string[] },
) {
  return prisma.contentAsset.findFirst({
    where: {
      id: assetId,
      OR: [
        { stimuli: { some: { testPartId: { in: scope.allowedPartIds } } } },
        { questionLinks: { some: { questionGroupId: { in: scope.allowedGroupIds } } } },
        { references: { some: { testPartId: { in: scope.allowedPartIds } } } },
        { references: { some: { stimulus: { testPartId: { in: scope.allowedPartIds } } } } },
        { references: { some: { questionGroupId: { in: scope.allowedGroupIds } } } },
        { references: { some: { question: { questionGroupId: { in: scope.allowedGroupIds } } } } },
      ],
    },
    select: { id: true },
  }).then(Boolean);
}

export async function isAssetLinkedToPublicDemo(assetId: string) {
  const publicVersion = { status: 'PUBLISHED' as const, test: { isPublicDemo: true } };
  return prisma.contentAsset.findFirst({
    where: {
      id: assetId,
      OR: [
        { stimuli: { some: { testPart: { testSection: { testVersion: publicVersion } } } } },
        { questionLinks: { some: { questionGroup: { testPart: { testSection: { testVersion: publicVersion } } } } } },
        { references: { some: { testPart: { testSection: { testVersion: publicVersion } } } } },
        { references: { some: { stimulus: { testPart: { testSection: { testVersion: publicVersion } } } } } },
        { references: { some: { questionGroup: { testPart: { testSection: { testVersion: publicVersion } } } } } },
        { references: { some: { question: { questionGroup: { testPart: { testSection: { testVersion: publicVersion } } } } } } },
      ],
    },
    select: { id: true },
  }).then(Boolean);
}
