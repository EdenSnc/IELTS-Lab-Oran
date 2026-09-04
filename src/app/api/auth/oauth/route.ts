import { z } from 'zod';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { requireHumanRequest } from '@/lib/security/bot';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordFunnelEvent } from '@/lib/growth/funnel-events';

const requestSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  redirectTo: z.url().max(500),
  intent: z.enum(['sign-in', 'sign-up']),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireHumanRequest();
    const input = requestSchema.parse(await request.json());
    const redirect = new URL(input.redirectTo);
    if (redirect.origin !== new URL(request.url).origin || redirect.pathname !== '/api/auth/callback') {
      return noStoreJson({ error: 'INVALID_REDIRECT' }, 400);
    }
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
