import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ACQUISITION_REDIRECT_HEADERS, codeSchema, destinationForPlacement, isKnownCrawler, isPrefetchRequest } from '@/lib/acquisition/validation';
import { publicAcquisitionOrigin } from '@/lib/acquisition/public-link';
import { logSafeError } from '@/lib/observability/safe-log';
import { checkSlidingWindowRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!codeSchema.safeParse(code).success) return new Response('Not found', { status: 404 });
  const placement = await prisma.acquisitionPlacement.findUnique({ where: { code }, include: { campaign: true } });
  if (!placement?.active || (placement.archivedAt && !placement.keepQrAfterArchive)
    || (placement.campaign.archivedAt && !placement.campaign.keepQrAfterArchive)) {
    return new Response('Not found', { status: 404, headers: ACQUISITION_REDIRECT_HEADERS });
  }
  let path: string;
  try {
    path = destinationForPlacement(placement.destination, placement.campaign.slug, placement.medium, code);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const target = /^https?:\/\//i.test(path) ? new URL(path) : new URL(path, publicAcquisitionOrigin());
  const userAgent = request.headers.get('user-agent');
  const eligible = userAgent && !isKnownCrawler(userAgent) && !isPrefetchRequest(request.headers);
  const ip = eligible ? extractClientIp(request) : '';
  const allowed = eligible
    && checkSlidingWindowRateLimit({ namespace: 'poster-scan-source', key: `${code}:${ip}`, limit: 60, windowMs: 60_000 }).allowed
    && checkSlidingWindowRateLimit({ namespace: 'poster-scan-placement', key: code, limit: 300, windowMs: 60_000 }).allowed;
  if (allowed) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    try {
      const id = randomUUID();
      // Keep the individual event and its aggregate in the same database statement.
      await prisma.$executeRaw`
        WITH recorded AS (
          INSERT INTO app_private."AcquisitionScan" (id, "placementId", "placementLabel")
          VALUES (${id}::uuid, ${placement.id}::uuid, ${placement.label})
          RETURNING "placementId"
        )
        INSERT INTO app_private."AcquisitionDailyCount" ("placementId", day, requests)
        SELECT "placementId", ${day}::date, 1 FROM recorded
        ON CONFLICT ("placementId", day) DO UPDATE
        SET requests = "AcquisitionDailyCount".requests + 1
      `;
      if (path.startsWith('/')) target.searchParams.set('il_scan', id);
    } catch (error) {
      // A failed event write must never stop the printed link from redirecting.
      logSafeError('ACQUISITION_SCAN_RECORDING_FAILED', error);
    }
  }
  return NextResponse.redirect(target, { status: 302, headers: ACQUISITION_REDIRECT_HEADERS });
}
