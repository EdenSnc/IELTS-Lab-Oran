import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { AuthError, requireRequestUser } from '@/lib/auth/request-user';
import { requireHumanRequest } from '@/lib/security/bot';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireHumanRequest();
    const user = await requireRequestUser(request);
    if (!user.email) throw new AuthError('EMAIL_STEP_UP_UNAVAILABLE', 409);
    const config = requireSupabasePublicConfig();
    const client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new AuthError('STEP_UP_DELIVERY_FAILED', 503);
    return noStoreJson({ sent: true }, 202);
  } catch (error) {
    return apiError(error, 'STEP_UP_REQUEST_FAILED');
  }
}
