import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import PosterEditor from '@/components/acquisition/PosterEditor';
import { posterIdSchema } from '@/lib/acquisition/poster-design';
import { codeSchema } from '@/lib/acquisition/validation';
import { publicAcquisitionLink } from '@/lib/acquisition/public-link';
import { requireStaffPageAal2 } from '@/lib/auth/staff-page';
import { QUIET_MODULES } from '@/lib/acquisition/poster-artwork';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Poster editor | IELTS Lab Oran',
  alternates: { canonical: null, languages: {} },
  openGraph: null,
  robots: { index: false, follow: false },
};

export default async function PosterPage({ params, searchParams }: {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<{ design?: string }>;
}) {
  const { locale, code } = await params;
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) notFound();
  const query = await searchParams;
  const id = posterIdSchema.safeParse(query.design).data;
  if (query.design && !id) notFound();
  const path = `/${locale}/admin/acquisition/poster/${parsed.data}`;
  await requireStaffPageAal2(['ADMIN'], id ? `${path}?design=${id}` : path);
  const placement = await prisma.acquisitionPlacement.findUnique({
    where: { code: parsed.data },
    select: { id: true, code: true, label: true, active: true, archivedAt: true, campaign: { select: { archivedAt: true } } },
  });
  if (!placement) notFound();
  const design = id ? await prisma.posterDesign.findFirst({
    where: { id, placementId: placement.id, deletedAt: null },
    select: { id: true, version: true, title: true, dpi: true, x: true, y: true, size: true },
  }) : null;
  if (id && !design) notFound();

  const url = publicAcquisitionLink(placement.code);
  const options = { errorCorrectionLevel: 'M', margin: QUIET_MODULES } as const;
  const modules = QRCode.create(url, options).modules;
  const matrix = Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, col) => modules.get(row, col) ? '1' : '0').join(''));
  const preview = await QRCode.toDataURL(url, { ...options, scale: 8 });
  return <PosterEditor key={id ?? placement.code} locale={locale} design={design} placement={{
    code: placement.code, label: placement.label,
    active: placement.active && !placement.archivedAt && !placement.campaign.archivedAt, matrix, preview,
  }} />;
}
