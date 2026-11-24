import Link from 'next/link';
import { adminNavigation } from '@/lib/admin/navigation';
import FounderQuickStart from '@/components/admin/FounderQuickStart';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration | IELTS Lab Oran', robots: { index: false, follow: false } };

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin`);
  const [applications, activePlacements, paymentsWithoutAccess, upcomingSpeaking] = await Promise.all([
    prisma.inquiry.count({ where: { archivedAt: null } }),
    prisma.acquisitionPlacement.count({ where: { active: true, archivedAt: null, campaign: { archivedAt: null } } }),
    prisma.order.count({ where: { status: 'PAID', entitlements: { none: { status: 'ACTIVE' } } } }),
    prisma.speakingAppointment.count({ where: { status: 'BOOKED', scheduledStartAt: { gte: new Date() } } }),
  ]);
  const cards = {
    applications: { count: applications, metric: 'Submissions', detail: 'Review applicant details and weekly availability.' },
    posters: { count: activePlacements, metric: 'Active links', detail: 'Track scans, edit posters and download QR codes.' },
    operations: { count: paymentsWithoutAccess, metric: 'Paid orders without active access', detail: 'Review payment issues, access codes and entitlements.' },
    speaking: { count: upcomingSpeaking, metric: 'Upcoming bookings', detail: 'Manage appointments, examiner availability and reviews.' },
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Founder dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {adminNavigation(locale, 'ADMIN').flatMap(({ id, label, href }) => {
          if (id === 'overview') return [];
          const { count, metric, detail } = cards[id];
          return <Link key={id} href={href} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 hover:border-crimson focus-visible:outline-crimson">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{label}</h2>
              <span aria-hidden="true" className="text-xl leading-none text-crimson">↗</span>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
              <strong className="text-3xl font-extrabold tabular-nums text-crimson">{count}</strong>
              <span className="text-sm font-semibold text-gray-700">{metric}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{detail}</p>
          </Link>;
        })}
      </div>
      <FounderQuickStart locale={locale} />
    </div>
  );
}
