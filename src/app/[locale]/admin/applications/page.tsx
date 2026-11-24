import Link from 'next/link';
import { codeSchema } from '@/lib/acquisition/validation';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { applicationSchema } from '@/lib/leads/application';
import ApplicationsInbox, { type InboxItem } from '@/components/admin/ApplicationsInbox';
import { founderDetailsSchema } from '@/lib/admin/application-record';
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
  searchParams: Promise<{ placement?: string; page?: string; view?: string }>;
}) {
  const { locale } = await params;
  const base = `/${locale}/admin/applications`;
  await requireStaffPageAal2(['ADMIN'], base);
  const query = await searchParams;
  const code = codeSchema.safeParse(query.placement).data;
  const page = /^\d{1,4}$/.test(query.page ?? '') ? Math.max(1, Number(query.page)) : 1;
  const archived = query.view === 'archived';
  const where = { archivedAt: archived ? { not: null } : null, ...(code ? { message: { contains: `"utmContent":"${code}"` } } : {}) };
  const [rows, placements] = await Promise.all([
    prisma.inquiry.findMany({
      where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize + 1,
      select: { id: true, message: true, createdAt: true, archivedAt: true, founderDetails: true, prospect: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.acquisitionPlacement.findMany({ select: { code: true, label: true } }),
  ]);
  const labelByCode = new Map(placements.map((placement) => [placement.code, placement.label]));
  const inbox: InboxItem[] = rows.slice(0, pageSize).map(({ id, message, createdAt, archivedAt, founderDetails, prospect }) => {
    const applicant = readApplication(message);
    const details = founderDetailsSchema.safeParse(founderDetails);
    const override = details.success ? details.data : null;
    const attribution = applicant?.attribution.utmContent;
    const facts = applicant ? [
      { label: 'Goal', value: `${purposeLabels[applicant.purpose]} · ${applicant.targetCountry} · Band ${applicant.targetBand}` },
      { label: 'English level', value: applicant.englishLevel },
    ] : [];
    const exam = applicant?.bookedExamDate ?? applicant?.targetExamDate;
    if (exam) facts.push({ label: 'Exam date', value: exam });
    if (applicant?.universityAdmission != null) facts.push({ label: 'University admission', value: applicant.universityAdmission ? 'Yes' : 'No' });
    return {
      id, received: received.format(createdAt), archived: Boolean(archivedAt),
      poster: attribution ? labelByCode.get(attribution) : undefined,
      notes: applicant?.urgencyAndObstacles ?? (message.startsWith('{') ? undefined : message),
      facts,
      override,
      details: override ?? { name: prospect.name ?? '', phone: prospect.phone, email: prospect.email, notes: '', availability: applicant?.availability ?? null },
    };
  });
  const link = (options: { page?: number; archived?: boolean; code?: string }) => {
    const query = new URLSearchParams({
      ...(options.code ? { placement: options.code } : {}),
      ...(options.archived ? { view: 'archived' } : {}),
      ...(options.page ? { page: String(options.page) } : {}),
    });
    return query.size ? `${base}?${query}` : base;
  };
  return (
    <div className="max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Applications</h1>
        <nav aria-label="Application status" className="inline-flex rounded-full bg-white p-1 ring-1 ring-gray-200">
          {([false, true] as const).map((view) => (
            <Link key={String(view)} aria-current={archived === view ? 'page' : undefined} href={link({ archived: view, code })}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${archived === view ? 'bg-charcoal text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              {view ? 'Trash' : 'Current'}
            </Link>
          ))}
        </nav>
      </header>
      {code && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
          <span>Poster <strong>{labelByCode.get(code) ?? code}</strong></span>
          <Link href={link({ archived })} className="inline-flex min-h-11 items-center font-semibold text-crimson underline">Clear filter</Link>
        </div>
      )}
      <ApplicationsInbox rows={inbox} archived={archived} />
      {(page > 1 || rows.length > pageSize) && (
        <nav className="flex flex-wrap gap-4 text-sm font-semibold text-crimson" aria-label="Application pages">
          {page > 1 && <Link className="inline-flex min-h-11 items-center underline" href={link({page:page-1, archived, code})}>Previous page</Link>}
          {rows.length > pageSize && <Link className="inline-flex min-h-11 items-center underline" href={link({page:page+1, archived, code})}>Next page</Link>}
        </nav>
      )}
    </div>
  );
}
