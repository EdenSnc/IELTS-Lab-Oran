import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ACQUISITION_REDIRECT_HEADERS, codeSchema, destinationForPlacement, isKnownCrawler, isPrefetchRequest } from '@/lib/acquisition/validation';
import { publicAcquisitionOrigin } from '@/lib/acquisition/public-link';
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
  if (!isKnownCrawler(request.headers.get('user-agent') ?? '') && !isPrefetchRequest(request.headers)) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    try {
      await prisma.acquisitionDailyCount.upsert({
        where: { placementId_day: { placementId: placement.id, day } },
        create: { placementId: placement.id, day, requests: 1 },
        update: { requests: { increment: 1 } },
      });
    } catch (error) {
      console.error('Acquisition count failed', error);
    }
    try {
      const id = randomUUID();
      await prisma.acquisitionScan.create({ data: { id, placementId: placement.id, placementLabel: placement.label } });
      if (path.startsWith('/')) target.searchParams.set('il_scan', id);
    } catch (error) {
      // A failed event write must never stop the printed link from redirecting.
      console.error('Acquisition scan recording failed', error);
    }
  }
  return NextResponse.redirect(target, { status: 302, headers: ACQUISITION_REDIRECT_HEADERS });
}
