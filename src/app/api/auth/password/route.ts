import { z } from 'zod';
import { recordSignupPolicyConsents } from '@/lib/auth/account-readiness';
import { apiError, noStoreJson, verifiedRequestOrigin } from '@/lib/http/api';
import prisma from '@/lib/prisma';
import { requireHumanRequest } from '@/lib/security/bot';
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
    locale: z.enum(['ar', 'en', 'fr']),
  }).strict(),
]);

export async function POST(request: Request) {
  try {
    const requestOrigin = verifiedRequestOrigin(request);
    await requireHumanRequest();
    const input = requestSchema.parse(await request.json());
    const client = await createSupabaseServerClient();

    if (input.action === 'sign-in') {
      const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) return noStoreJson({ error: 'INVALID_CREDENTIALS' }, 401);
      return noStoreJson({ success: true });
    }

    await recordFunnelEvent({ type: 'SIGNUP_STARTED', metadata: { provider: 'email' } });

    const redirect = new URL(`/api/auth/callback?next=/${input.locale}/account`, requestOrigin);
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirect.toString(),
        data: {
          full_name: input.fullName,
          whatsapp: input.whatsapp,
          wilaya: input.wilaya,
          preferred_locale: input.preferredLocale,
        },
      },
    });
    if (error) return noStoreJson({ error: 'SIGNUP_FAILED' }, 400);
    if (data.user && (data.user.identities?.length ?? 1) > 0) {
      await prisma.user.upsert({
        where: { id: data.user.id },
        create: { id: data.user.id, email: input.email, name: input.fullName },
        update: { email: input.email, name: input.fullName },
      });
      await recordSignupPolicyConsents({
        userId: data.user.id,
        termsAccepted: input.termsAccepted,
        privacyAccepted: input.privacyAccepted,
        marketingAccepted: input.marketingAccepted,
        acceptedFrom: 'email-signup',
      });
    }
    return noStoreJson({ success: true, emailConfirmationRequired: !data.session }, 201);
  } catch (error) {
    return apiError(error, 'AUTH_REQUEST_FAILED');
  }
}
