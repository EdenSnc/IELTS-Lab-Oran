import Link from 'next/link';
import { adminNavigation } from '@/lib/admin/navigation';
import FounderQuickStart from '@/components/admin/FounderQuickStart';
import WorkspaceIcon from '@/components/admin/WorkspaceIcon';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration | IELTS Lab Oran', robots: { index: false, follow: false } };

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin`);
  const [applications, savedPosters, paymentsWithoutAccess, upcomingSpeaking] = await Promise.all([
    prisma.inquiry.count({ where: { archivedAt: null } }),
    prisma.posterDesign.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { status: 'PAID', entitlements: { none: { status: 'ACTIVE' } } } }),
    prisma.speakingAppointment.count({ where: { status: 'BOOKED', scheduledStartAt: { gte: new Date() } } }),
  ]);
  const cards = {
    applications: { count: applications, metric: 'Current submissions' },
    posters: { count: savedPosters, metric: 'Saved designs' },
    operations: { count: paymentsWithoutAccess, metric: 'Paid orders awaiting access' },
    speaking: { count: upcomingSpeaking, metric: 'Upcoming bookings' },
  };
  return (
    <div className="max-w-6xl space-y-5 sm:space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-[#eedadb] bg-gradient-to-br from-white via-white to-[#f7e9e9] p-5 sm:p-8">
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-none tracking-[-0.055em]">Founder dashboard</h1>
        <Link href={`/${locale}/admin/acquisition`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#8e1826] px-5 text-sm font-bold text-white hover:bg-[#751522]">
          <WorkspaceIcon name="posters" className="size-[18px]" /> Manage posters
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        {adminNavigation(locale, 'ADMIN').flatMap(({ id, label, href }) => {
          if (id === 'overview') return [];
          const { count, metric } = cards[id];
          return <Link key={id} href={href} className="min-w-0 rounded-[1.35rem] border border-stone-200 bg-white p-3.5 transition-colors hover:border-[#8e1826] focus-visible:outline-crimson motion-reduce:transition-none sm:p-5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#f7ecec] text-[#8e1826]"><WorkspaceIcon name={id} /></span>
            <h2 className="mt-3 break-words text-sm font-bold leading-tight sm:text-base">{label}</h2>
            <strong className="mt-3 block text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{count}</strong>
            <span className="mt-1 block text-xs font-medium leading-snug text-stone-600 sm:text-sm">{metric}</span>
          </Link>;
        })}
      </div>
      <FounderQuickStart locale={locale} />
    </div>
  );
}
