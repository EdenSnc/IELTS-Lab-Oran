import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import AcquisitionDashboard from '@/components/acquisition/AcquisitionDashboard';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { publicAcquisitionLink } from '@/lib/acquisition/public-link';
import { isFirstPartyDestination } from '@/lib/acquisition/validation';
import { applicationSchema } from '@/lib/leads/application';
import { availabilityCopy, formatAvailabilityHour, weekdays } from '@/lib/leads/availability';
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
  const actor = await requireStaffPageAal2(['CONTENT_REVIEWER', 'ADMIN']);
  if (actor.role !== 'ADMIN' && actor.role !== 'CONTENT_REVIEWER') notFound();

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
  const [leadCounts, requestCounts, applications] = await Promise.all([
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
    actor.role === 'ADMIN' ? prisma.inquiry.findMany({
      where: { message: { startsWith: '{"schemaVersion":3,' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['prospectId'],
      take: 100,
      select: {
        id: true,
        message: true,
        prospect: { select: { name: true, phone: true } },
      },
    }) : [],
  ]);
  const leadsByCode = new Map(leadCounts.map((row) => [row.utmContent, row._count._all]));
  const requestsByPlacement = new Map(requestCounts.map((row) => [row.placementId, row._sum.requests ?? 0]));
  const cards = await Promise.all(campaigns.map(async (campaign) => ({
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    placements: await Promise.all(campaign.placements.map(async (placement) => {
      const url = publicAcquisitionLink(placement.code);
      return {
        id: placement.id,
        code: placement.code,
        label: placement.label,
        medium: placement.medium,
        destination: placement.destination,
        active: placement.active,
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

  const scheduleCopy = availabilityCopy[locale === 'fr' || locale === 'ar' ? locale : 'en'];
  const placementByCode = new Map(placements.map((placement) => [placement.code, placement.label]));
  const scheduleRows = applications.flatMap(({ id, message, prospect }) => {
    try {
      const application = applicationSchema.safeParse(JSON.parse(message));
      if (!application.success || !application.data.availability) return [];
      const code = application.data.attribution.utmContent;
      return [{
        id,
        prospect,
        availability: application.data.availability,
        placement: code ? placementByCode.get(code) : undefined,
      }];
    } catch {
      return [];
    }
  });

  return (
    <>
      {actor.role === 'ADMIN' && (
        <details id="weekly-availability" className="mx-auto my-6 w-full max-w-6xl rounded-xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">
            {scheduleCopy.title} ({scheduleRows.length})
          </summary>
          <p className="mt-2 text-sm text-gray-600">{scheduleCopy.timezone}</p>
          {scheduleRows.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {scheduleRows.map(({ id, prospect, availability, placement }) => (
                <li key={id} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold">{prospect.name || prospect.phone}</p>
                  {prospect.name && <p className="text-sm text-gray-600" dir="ltr">{prospect.phone}</p>}
                  <p className="mt-2 text-sm">
                    {availability.mode === 'flexible' ? scheduleCopy.flexible : availability.windows.map((window) =>
                      `${scheduleCopy.days[weekdays.indexOf(window.day)]} ${formatAvailabilityHour(window.startHour)}–${formatAvailabilityHour(window.endHour)}`
                    ).join(' · ')}
                  </p>
                  {placement && <p className="mt-2 text-xs text-gray-600">{placement}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              {locale === 'fr' ? 'Les disponibilités des nouvelles candidatures web apparaîtront ici.' : locale === 'ar' ? 'ستظهر أوقات التفرّغ الواردة من الطلبات الجديدة عبر الموقع هنا.' : 'Availability from new website applications will appear here.'}
            </p>
          )}
        </details>
      )}
      <AcquisitionDashboard locale={locale} campaigns={cards} />
    </>
  );
}
