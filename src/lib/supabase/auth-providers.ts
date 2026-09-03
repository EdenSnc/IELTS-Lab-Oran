import 'server-only';

import { getSupabasePublicConfig } from './config';
import { logSafeError } from '@/lib/observability/safe-log';

export type EnabledAuthProviders = {
  google: boolean;
  facebook: boolean;
};

export function parseEnabledAuthProviders(payload: unknown): EnabledAuthProviders {
  if (!payload || typeof payload !== 'object') return { google: false, facebook: false };
  const external = (payload as { external?: unknown }).external;
  if (!external || typeof external !== 'object') return { google: false, facebook: false };
  const providers = external as Record<string, unknown>;
  return {
    google: providers.google === true,
    facebook: providers.facebook === true,
  };
}

export async function getEnabledAuthProviders(): Promise<EnabledAuthProviders> {
  const config = getSupabasePublicConfig();

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      logSafeError('AUTH_PROVIDER_SETTINGS_REJECTED', new Error('UPSTREAM_REJECTED'), { status: response.status });
      return { google: false, facebook: false };
    }
    return parseEnabledAuthProviders(await response.json());
  } catch (error) {
    logSafeError('AUTH_PROVIDER_SETTINGS_FETCH_FAILED', error);
    return { google: false, facebook: false };
  }
}
