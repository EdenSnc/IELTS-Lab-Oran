import 'server-only';

import { checkBotId } from 'botid/server';
import { AuthError } from '@/lib/auth/request-user';

export async function requireHumanRequest() {
  const verification = await checkBotId();
  if (verification.isBot) throw new AuthError('ACCESS_DENIED', 403);
}
