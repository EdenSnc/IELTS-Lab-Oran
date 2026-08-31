import 'server-only';

import { getSupabasePublicConfig } from './config';

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
  if (!config) return { google: false, facebook: false };

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
      next: { revalidate: 300 },
    });
    if (!response.ok) return { google: false, facebook: false };
    return parseEnabledAuthProviders(await response.json());
  } catch {
    return { google: false, facebook: false };
  }
}
