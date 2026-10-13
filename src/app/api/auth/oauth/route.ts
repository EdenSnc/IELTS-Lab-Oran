import { z } from 'zod';
import { apiError, noStoreJson, verifiedRequestOrigin } from '@/lib/http/api';
import { requireHumanRequest } from '@/lib/security/bot';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordFunnelEvent } from '@/lib/growth/funnel-events';
import { diagnosticAuthReturn } from '@/lib/diagnostic/auth-return';

const requestSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  locale: z.enum(['ar', 'en', 'fr']),
  intent: z.enum(['sign-in', 'sign-up']),
  next: z.string().max(2048).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const requestOrigin = verifiedRequestOrigin(request);
    await requireHumanRequest();
    const input = requestSchema.parse(await request.json());
    const redirect = new URL(`/api/auth/callback?next=/${input.locale}/account`, requestOrigin);
    const diagnosticNext = diagnosticAuthReturn(input.next, input.locale);
    if (diagnosticNext) redirect.searchParams.set('next', diagnosticNext);
    if (input.intent === 'sign-up') {
      await recordFunnelEvent({ type: 'SIGNUP_STARTED', metadata: { provider: input.provider } });
    }
    const client = await createSupabaseServerClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: input.provider,
      options: { redirectTo: redirect.toString(), skipBrowserRedirect: true },
    });
    if (error || !data.url) return noStoreJson({ error: 'OAUTH_START_FAILED' }, 400);
    return noStoreJson({ url: data.url });
  } catch (error) {
    return apiError(error, 'OAUTH_START_FAILED');
  }
}
