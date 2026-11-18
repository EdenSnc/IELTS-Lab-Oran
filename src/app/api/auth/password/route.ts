import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { recordSignupPolicyConsents } from '@/lib/auth/account-readiness';
import { AuthError } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { normalizeE164Phone } from '@/lib/phone';
import prisma from '@/lib/prisma';
import { requireHumanRequest } from '@/lib/security/bot';
import { checkSlidingWindowRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordFunnelEvent } from '@/lib/growth/funnel-events';

const emailSchema = z.email().max(320).transform((value) => value.trim().toLowerCase());
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sign-in'), email: emailSchema, password: z.string().min(1).max(256) }).strict(),
  z.object({
    action: z.literal('sign-up'),
    email: emailSchema,
    password: z.string().min(10).max(256).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
    fullName: z.string().trim().min(2).max(120),
    whatsapp: z.string().trim().min(8).max(32),
    wilaya: z.string().trim().min(2).max(80),
    preferredLocale: z.enum(['ar', 'en', 'fr']),
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
    marketingAccepted: z.boolean().default(false),
    emailRedirectTo: z.url().max(500),
  }).strict(),
]);

function isWhatsappUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return (Array.isArray(target) ? target.includes('whatsapp') : String(target ?? '').includes('whatsapp'))
    || error.message.includes('whatsapp');
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireHumanRequest();
    const input = requestSchema.parse(await request.json());
    const clientIp = extractClientIp(request);
    const client = await createSupabaseServerClient();

    if (input.action === 'sign-in') {
      const rl = checkSlidingWindowRateLimit({
        namespace: 'auth-signin',
        key: `${clientIp}:${input.email}`,
        limit: 10,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        return noStoreJson({ error: 'RATE_LIMITED' }, 429);
      }
      const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) return noStoreJson({ error: 'INVALID_CREDENTIALS' }, 401);
      return noStoreJson({ success: true });
    }

    const signupRl = checkSlidingWindowRateLimit({
      namespace: 'auth-signup',
      key: clientIp,
      limit: 6,
      windowMs: 300_000,
    });
    if (!signupRl.allowed) {
      return noStoreJson({ error: 'RATE_LIMITED' }, 429);
    }

    const whatsapp = normalizeE164Phone(input.whatsapp);
    if (!whatsapp) {
      return noStoreJson({ error: 'INVALID_WHATSAPP' }, 400);
    }

    const existingWhatsapp = await prisma.user.findUnique({
      where: { whatsapp },
      select: { id: true },
    });
    if (existingWhatsapp) {
      return noStoreJson({ error: 'WHATSAPP_ALREADY_IN_USE' }, 409);
    }

    await recordFunnelEvent({ type: 'SIGNUP_STARTED', metadata: { provider: 'email' } });

    const redirect = new URL(input.emailRedirectTo);
    if (redirect.origin !== new URL(request.url).origin || redirect.pathname !== '/api/auth/callback') {
      return noStoreJson({ error: 'INVALID_REDIRECT' }, 400);
    }
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirect.toString(),
        data: {
          full_name: input.fullName,
          whatsapp,
          wilaya: input.wilaya,
          preferred_locale: input.preferredLocale,
        },
      },
    });
    if (error) return noStoreJson({ error: 'SIGNUP_FAILED' }, 400);
    if (data.user && (data.user.identities?.length ?? 1) > 0) {
      const completedAt = new Date();
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          create: {
            id: data.user.id,
            email: input.email,
            name: input.fullName,
            whatsapp,
            wilaya: input.wilaya,
            preferredLocale: input.preferredLocale,
            onboardingCompletedAt: completedAt,
          },
          update: {
            email: input.email,
            name: input.fullName,
            whatsapp,
            wilaya: input.wilaya,
            preferredLocale: input.preferredLocale,
            onboardingCompletedAt: completedAt,
          },
        });
      } catch (upsertError) {
        if (isWhatsappUniqueError(upsertError)) {
          throw new AuthError('WHATSAPP_ALREADY_IN_USE', 409);
        }
        throw upsertError;
      }
      await recordSignupPolicyConsents({
        userId: data.user.id,
        termsAccepted: input.termsAccepted,
        privacyAccepted: input.privacyAccepted,
        marketingAccepted: input.marketingAccepted,
        acceptedFrom: 'email-signup',
      });
      await recordFunnelEvent({
        type: 'ONBOARDING_COMPLETED',
        idempotencyKey: `user:${data.user.id}:onboarding-completed`,
        userId: data.user.id,
      });
    }
    return noStoreJson({ success: true }, 201);
  } catch (error) {
    return apiError(error, 'AUTH_REQUEST_FAILED');
  }
}
