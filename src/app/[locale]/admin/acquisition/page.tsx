import type { Metadata } from 'next';
import QRCode from 'qrcode';
import AcquisitionDashboard from '@/components/acquisition/AcquisitionDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { publicAcquisitionLink } from '@/lib/acquisition/public-link';
import { isFirstPartyDestination } from '@/lib/acquisition/validation';
import prisma from '@/lib/prisma';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'Acquisition Placements | IELTS Lab Oran',
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  robots: { index: false, follow: false },
  twitter: null,
};

export default async function AcquisitionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin/acquisition`);

  const campaigns = await prisma.acquisitionCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      placements: {
        orderBy: { createdAt: 'desc' },
        include: { inspections: { orderBy: { checkedAt: 'desc' }, take: 1 } },
      },
    },
  });
  const placements = campaigns.flatMap((campaign) => campaign.placements);
  const placementIds = placements.map((placement) => placement.id);
  const codes = placements.filter((placement) => isFirstPartyDestination(placement.destination)).map((placement) => placement.code);
  const [leadCounts, requestCounts] = await Promise.all([
    codes.length ? prisma.leadMagnetDownload.groupBy({
      by: ['utmContent'],
      where: { utmSource: 'ieltslab', utmContent: { in: codes } },
      _count: { _all: true },
    }) : [],
    placementIds.length ? prisma.acquisitionDailyCount.groupBy({
      by: ['placementId'],
      where: { placementId: { in: placementIds } },
      _sum: { requests: true },
    }) : [],
  ]);
  const leadsByCode = new Map(leadCounts.map((row) => [row.utmContent, row._count._all]));
  const requestsByPlacement = new Map(requestCounts.map((row) => [row.placementId, row._sum.requests ?? 0]));
  const cards = await Promise.all(campaigns.map(async (campaign) => ({
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    archived: Boolean(campaign.archivedAt),
    placements: await Promise.all(campaign.placements.map(async (placement) => {
      const url = publicAcquisitionLink(placement.code);
      return {
        id: placement.id,
        code: placement.code,
        label: placement.label,
        medium: placement.medium,
        destination: placement.destination,
        active: placement.active,
        archived: Boolean(placement.archivedAt),
        firstParty: isFirstPartyDestination(placement.destination),
        url,
        qrDataUrl: await QRCode.toDataURL(url, { margin: 4, width: 480, errorCorrectionLevel: 'M' }),
        redirectRequests: requestsByPlacement.get(placement.id) ?? 0,
        leadSubmissions: isFirstPartyDestination(placement.destination) ? leadsByCode.get(placement.code) ?? 0 : null,
        lastInspection: placement.inspections[0] ? {
          status: placement.inspections[0].status,
          note: placement.inspections[0].note,
          checkedAt: placement.inspections[0].checkedAt.toISOString(),
        } : null,
      };
    })),
  })));

  return <AcquisitionDashboard locale={locale} campaigns={cards} />;
}
