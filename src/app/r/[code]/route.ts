import { NextResponse } from 'next/server';
import { ACQUISITION_REDIRECT_HEADERS, codeSchema, destinationForPlacement, isKnownCrawler } from '@/lib/acquisition/validation';
import { publicAcquisitionOrigin } from '@/lib/acquisition/public-link';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!codeSchema.safeParse(code).success) return new Response('Not found', { status: 404 });
  const placement = await prisma.acquisitionPlacement.findUnique({ where: { code }, include: { campaign: true } });
  if (!placement?.active) return new Response('Not found', { status: 404 });
  let path: string;
  try {
    path = destinationForPlacement(placement.destination, placement.campaign.slug, placement.medium, code);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  // Aggregate requests only. Known crawler requests are excluded; other bots may remain.
  // A scan never establishes a distinct visitor or physical poster presence.
  if (!isKnownCrawler(request.headers.get('user-agent') ?? '')) {
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
  }
  const target = /^https?:\/\//i.test(path) ? new URL(path) : new URL(path, publicAcquisitionOrigin());
  return NextResponse.redirect(target, { status: 302, headers: ACQUISITION_REDIRECT_HEADERS });
}
