import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import AcquisitionDashboard from '@/components/acquisition/AcquisitionDashboard';
import PosterLibrary from '@/components/acquisition/PosterLibrary';
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

export default async function AcquisitionPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale } = await params;
  const base = `/${locale}/admin/acquisition`;
  const { view } = await searchParams;
  const current = view === 'tracking' || view === 'trash' ? view : 'library';
  await requireStaffPageAal2(['ADMIN'], current === 'library' ? base : `${base}?view=${current}`);
  const tabs = (
    <nav aria-label="Posters workspace" className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-2xl border border-stone-200 bg-[#f0eeeb] p-1">
      {([{ key: 'library', label: 'Library' }, { key: 'tracking', label: 'Tracking' }, { key: 'trash', label: 'Trash' }] as const).map(({ key, label }) => (
        <Link key={key} href={key === 'library' ? base : `${base}?view=${key}`} aria-current={key === current ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold ${key === current
            ? 'bg-white text-charcoal shadow-sm' : 'text-stone-600 hover:text-charcoal'}`}>{label}</Link>
      ))}
    </nav>
  );
  if (current !== 'tracking') {
    const trash = current === 'trash';
    const [designs, locations] = await Promise.all([
      prisma.posterDesign.findMany({
        where: { deletedAt: trash ? { not: null } : null },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, title: true, width: true, height: true, dpi: true, version: true, placement: { select: { code: true, label: true } } },
      }),
      trash ? [] : prisma.acquisitionPlacement.findMany({
        where: { archivedAt: null, campaign: { archivedAt: null } },
        orderBy: { label: 'asc' },
        select: { code: true, label: true, campaign: { select: { name: true } } },
      }),
    ]);
    return <div className="space-y-5 sm:space-y-6">
      <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-none tracking-tight">Posters</h1>
      {tabs}
      <PosterLibrary key={current} base={base} trash={trash}
        designs={designs.map(({ placement, ...design }) => ({ ...design, code: placement.code, placement: placement.label }))}
        locations={locations.map(({ code, label, campaign }) => ({ code, label, campaign: campaign.name }))} />
    </div>;
  }

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

  return <div className="space-y-5 sm:space-y-6">
    <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-none tracking-tight">Posters</h1>
    {tabs}<AcquisitionDashboard locale={locale} campaigns={cards} />
  </div>;
}
