import { z } from 'zod';
import { completeAccountOnboarding } from '@/lib/auth/account-readiness';
import { syncApplicationUser, AuthError } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { normalizeE164Phone } from '@/lib/phone';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(32),
  wilaya: z.string().trim().min(2).max(80),
  preferredLocale: z.enum(['ar', 'en', 'fr']),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  marketingAccepted: z.boolean().default(false),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const whatsapp = normalizeE164Phone(input.whatsapp);
    if (!whatsapp) throw new AuthError('INVALID_WHATSAPP', 400);
    const client = await createSupabaseServerClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new AuthError('AUTH_REQUIRED', 401);
    await syncApplicationUser(data.user, { syncWhatsapp: false });
    await completeAccountOnboarding({
      ...input,
      userId: data.user.id,
      whatsapp,
      acceptedFrom: 'account-onboarding',
    });
    await client.auth.updateUser({
      data: {
        full_name: input.name,
        whatsapp,
        wilaya: input.wilaya,
        preferred_locale: input.preferredLocale,
      },
    });
    return noStoreJson({ success: true });
  } catch (error) {
    return apiError(error, 'ONBOARDING_FAILED');
  }
}
