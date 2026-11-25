import { pathToFileURL } from 'node:url';

export function assertDataApiRefused(status: number) {
  if (![401, 403, 404, 406].includes(status)) {
    throw new Error(`SUPABASE_DATA_API_EXPOSURE_CHECK_FAILED:${status}`);
  }
}

export async function checkDataApiExposure() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!origin || !publishableKey) throw new Error('SUPABASE_PUBLIC_CONFIG_REQUIRED');

  const baseHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
  const privateTables = ['User', 'Inquiry', 'Prospect', 'LeadMagnetDownload', 'SalesNote', 'PosterDesign', 'AcquisitionScan'];
  await Promise.all(privateTables.map(async (table) => {
    const target = new URL(`/rest/v1/${table}?select=id&limit=1`, origin);
    const [publicSchema, privateSchema] = await Promise.all([
      fetch(target, { headers: baseHeaders, signal: AbortSignal.timeout(10_000) }),
      fetch(target, { headers: { ...baseHeaders, 'Accept-Profile': 'app_private' }, signal: AbortSignal.timeout(10_000) }),
    ]);
    assertDataApiRefused(publicSchema.status);
    assertDataApiRefused(privateSchema.status);
    console.log(`Supabase Data API refused ${table} on public (${publicSchema.status}) and app_private (${privateSchema.status}).`);
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void checkDataApiExposure().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'SUPABASE_DATA_API_EXPOSURE_CHECK_FAILED');
    process.exitCode = 1;
  });
}
