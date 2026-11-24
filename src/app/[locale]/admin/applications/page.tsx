import Link from 'next/link';
import AdminNav from '@/components/acquisition/AdminNav';
import { codeSchema } from '@/lib/acquisition/validation';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { applicationSchema } from '@/lib/leads/application';
import { availabilityCopy, formatAvailabilityHour, weekdays } from '@/lib/leads/availability';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Applications | IELTS Lab Oran', robots: { index: false, follow: false } };

const pageSize = 25;
const purposeLabels = { higher_education: 'Higher education', immigration: 'Immigration', career: 'Work', other: 'Other' };
const received = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Algiers' });

function readApplication(message: string) {
  try {
    const parsed = applicationSchema.safeParse(JSON.parse(message));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export default async function ApplicationsPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ placement?: string; page?: string }>;
}) {
  const { locale } = await params;
  const base = `/${locale}/admin/applications`;
  await requireStaffPageAal2(['ADMIN'], base);
  const query = await searchParams;
  const code = codeSchema.safeParse(query.placement).data;
  const page = /^\d{1,4}$/.test(query.page ?? '') ? Math.max(1, Number(query.page)) : 1;
  const where = code ? { message: { contains: `"utmContent":"${code}"` } } : undefined;
  const [rows, placements] = await Promise.all([
    prisma.inquiry.findMany({
      where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize + 1,
      select: { id: true, message: true, createdAt: true, prospect: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.acquisitionPlacement.findMany({ select: { code: true, label: true } }),
  ]);
  const labelByCode = new Map(placements.map((placement) => [placement.code, placement.label]));
  const schedule = availabilityCopy.en;
  const pageLink = (n: number) => `${base}?${new URLSearchParams({ page: String(n), ...(code ? { placement: code } : {}) })}`;
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
      <AdminNav active="applications" locale={locale} />
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Applications</h1>
        <p className="mt-1 text-sm text-gray-600">{schedule.timezone}</p>
      </header>
      {code && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
          <span>Poster <strong>{labelByCode.get(code) ?? code}</strong></span>
          <Link href={base} className="inline-flex min-h-11 items-center font-semibold text-crimson underline">Clear filter</Link>
        </div>
      )}
      {rows.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-5 text-gray-600">No applications here yet.</p>}
      <div className="grid gap-2">
        {rows.slice(0, pageSize).map(({ id, message, createdAt, prospect }) => {
          const application = readApplication(message);
          const availability = application?.availability;
          const attribution = application?.attribution.utmContent;
          const poster = attribution ? labelByCode.get(attribution) : undefined;
          return (
            <details key={id} className="rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-4 py-3">
                <span className="font-bold">{prospect.name || prospect.phone}</span>
                <span className="ms-2 text-sm text-gray-600">{received.format(createdAt)}</span>
                {poster && <span className="ms-2 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-crimson">{poster}</span>}
              </summary>
              <div className="space-y-3 border-t border-gray-100 px-4 py-4 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <a href={`tel:${prospect.phone}`} dir="ltr" className="font-semibold text-crimson underline">{prospect.phone}</a>
                  {prospect.email && <span className="break-all">{prospect.email}</span>}
                </div>
                <div>
                  <h2 className="font-semibold">{schedule.title}</h2>
                  {!availability ? <p className="text-gray-600">Availability was not collected for this application.</p>
                    : availability.mode === 'flexible' ? <p>Flexible schedule</p>
                    : <ul className="mt-1 flex flex-wrap gap-2">{availability.windows.map((slot, index) => (
                      <li key={index} className="rounded bg-gray-100 px-2 py-1">
                        {schedule.days[weekdays.indexOf(slot.day)]} {formatAvailabilityHour(slot.startHour)}–{formatAvailabilityHour(slot.endHour)}
                      </li>
                    ))}</ul>}
                </div>
                {application && (
                  <dl className="grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
                    <div><dt className="font-semibold">Goal</dt><dd>{purposeLabels[application.purpose]} · {application.targetCountry} · Band {application.targetBand}</dd></div>
                    <div><dt className="font-semibold">Exam date</dt><dd>{application.bookedExamDate ?? application.targetExamDate}</dd></div>
                    <div><dt className="font-semibold">English level</dt><dd>{application.englishLevel} · {application.challengingModules.join(', ')}</dd></div>
                    {application.universityAdmission != null && <div><dt className="font-semibold">University admission</dt><dd>{application.universityAdmission ? 'Yes' : 'No'}</dd></div>}
                    <div className="sm:col-span-2"><dt className="font-semibold">Notes</dt><dd className="whitespace-pre-wrap break-words">{application.urgencyAndObstacles}</dd></div>
                  </dl>
                )}
                {!application && <p className="whitespace-pre-wrap break-words text-gray-700">{message}</p>}
              </div>
            </details>
          );
        })}
      </div>
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-crimson" aria-label="Application pages">
        {page > 1 && <Link className="inline-flex min-h-11 items-center underline" href={pageLink(page - 1)}>Previous page</Link>}
        {rows.length > pageSize && <Link className="inline-flex min-h-11 items-center underline" href={pageLink(page + 1)}>Next page</Link>}
      </nav>
    </main>
  );
}
