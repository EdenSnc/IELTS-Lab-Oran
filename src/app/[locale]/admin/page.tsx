import Link from 'next/link';
import AdminNav from '@/components/acquisition/AdminNav';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration | IELTS Lab Oran', robots: { index: false, follow: false } };

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaffPageAal2(['ADMIN'], `/${locale}/admin`);
  const [applications, activePlacements] = await Promise.all([
    prisma.inquiry.count(),
    prisma.acquisitionPlacement.count({ where: { active: true } }),
  ]);
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/${locale}/account`} className="text-sm font-semibold text-crimson underline">Your account</Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">IELTS Lab administration</h1>
      <AdminNav active="overview" locale={locale} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/${locale}/admin/applications`} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-crimson">
          <strong className="block text-3xl tabular-nums text-crimson">{applications}</strong>
          <span className="mt-1 block font-bold">Applications</span>
          <span className="text-sm text-gray-600">Applicant details, availability and poster source</span>
        </Link>
        <Link href={`/${locale}/admin/acquisition`} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-crimson">
          <strong className="block text-3xl tabular-nums text-crimson">{activePlacements}</strong>
          <span className="mt-1 block font-bold">Active tracking links</span>
          <span className="text-sm text-gray-600">Posters, QR codes, scans and inspections</span>
        </Link>
      </div>
    </main>
  );
}
