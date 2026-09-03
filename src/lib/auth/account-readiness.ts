import 'server-only';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AuthError } from './request-user';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_REQUIRED_POLICIES,
  CURRENT_TERMS_VERSION,
} from './policy-versions';

type OnboardingInput = {
  userId: string;
  name: string;
  whatsapp: string;
  wilaya: string;
  preferredLocale: 'ar' | 'en' | 'fr';
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  acceptedFrom?: string;
};

function isWhatsappUniqueViolation(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return (Array.isArray(target) ? target.includes('whatsapp') : String(target ?? '').includes('whatsapp'))
    || error.message.includes('whatsapp');
}

export async function assertAccountReady(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });
  if (!user?.onboardingCompletedAt) throw new AuthError('ONBOARDING_INCOMPLETE', 409);

  const records = await prisma.consentRecord.findMany({
    where: {
      userId,
      OR: CURRENT_REQUIRED_POLICIES.map(({ type, version }) => ({ type, policyVersion: version })),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { type: true, action: true, policyVersion: true },
  });
  const current = new Map<string, string>();
  for (const record of records) {
    const key = `${record.type}:${record.policyVersion}`;
    if (!current.has(key)) current.set(key, record.action);
  }
  const accepted = CURRENT_REQUIRED_POLICIES.every(({ type, version }) => (
    current.get(`${type}:${version}`) === 'ACCEPTED'
  ));
  if (!accepted) throw new AuthError('POLICY_ACCEPTANCE_REQUIRED', 409);
}

export async function recordSignupPolicyConsents(input: {
  userId: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  acceptedFrom?: string;
}) {
  if (!input.termsAccepted || !input.privacyAccepted) {
    throw new AuthError('POLICY_ACCEPTANCE_REQUIRED', 400);
  }
  const records = [
    { type: 'TERMS' as const, policyVersion: CURRENT_TERMS_VERSION },
    { type: 'PRIVACY' as const, policyVersion: CURRENT_PRIVACY_VERSION },
    ...(input.marketingAccepted
      ? [{ type: 'MARKETING' as const, policyVersion: CURRENT_PRIVACY_VERSION }]
      : []),
  ];
  await prisma.consentRecord.createMany({
    data: records.map((record) => ({
      userId: input.userId,
      action: 'ACCEPTED' as const,
      acceptedFrom: input.acceptedFrom,
      ...record,
    })),
  });
}

export async function completeAccountOnboarding(input: OnboardingInput) {
  if (!input.termsAccepted || !input.privacyAccepted) {
    throw new AuthError('POLICY_ACCEPTANCE_REQUIRED', 400);
  }
  try {
    await prisma.$transaction(async (transaction) => {
      const completedAt = new Date();
      await transaction.user.update({
        where: { id: input.userId },
        data: {
          name: input.name,
          whatsapp: input.whatsapp,
          wilaya: input.wilaya,
          preferredLocale: input.preferredLocale,
          onboardingCompletedAt: completedAt,
        },
      });
      const consentRows: Prisma.ConsentRecordCreateManyInput[] = [
        {
          userId: input.userId,
          type: 'TERMS',
          action: 'ACCEPTED',
          policyVersion: CURRENT_TERMS_VERSION,
          acceptedFrom: input.acceptedFrom,
        },
        {
          userId: input.userId,
          type: 'PRIVACY',
          action: 'ACCEPTED',
          policyVersion: CURRENT_PRIVACY_VERSION,
          acceptedFrom: input.acceptedFrom,
        },
      ];
      if (input.marketingAccepted) {
        consentRows.push({
          userId: input.userId,
          type: 'MARKETING',
          action: 'ACCEPTED',
          policyVersion: CURRENT_PRIVACY_VERSION,
          acceptedFrom: input.acceptedFrom,
        });
      }
      await transaction.consentRecord.createMany({ data: consentRows });
    });
  } catch (error) {
    if (isWhatsappUniqueViolation(error)) throw new AuthError('WHATSAPP_ALREADY_IN_USE', 409);
    throw error;
  }
}
