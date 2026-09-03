import { pathToFileURL } from 'node:url';

export function assertDataApiRefused(status: number) {
  if (![401, 403, 404].includes(status)) {
    throw new Error(`SUPABASE_DATA_API_EXPOSURE_CHECK_FAILED:${status}`);
  }
}

export async function checkDataApiExposure() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!origin || !publishableKey) throw new Error('SUPABASE_PUBLIC_CONFIG_REQUIRED');

  const response = await fetch(new URL('/rest/v1/User?select=id&limit=1', origin), {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  assertDataApiRefused(response.status);
  console.log(`Supabase Data API refused app_private.User (${response.status}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void checkDataApiExposure().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'SUPABASE_DATA_API_EXPOSURE_CHECK_FAILED');
    process.exitCode = 1;
  });
}
