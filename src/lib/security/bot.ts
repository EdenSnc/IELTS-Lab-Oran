import 'server-only';

import { checkBotId } from 'botid/server';
import { AuthError } from '@/lib/auth/request-user';
import { logSafeError } from '@/lib/observability/safe-log';

export async function requireHumanRequest() {
  let verification: Awaited<ReturnType<typeof checkBotId>>;
  try {
    verification = await checkBotId();
  } catch (error) {
    logSafeError('BOTID_CHECK_FAILED', error);
    throw new AuthError('BOT_CHECK_UNAVAILABLE', 503);
  }
  if (verification.isBot) throw new AuthError('ACCESS_DENIED', 403);
}
