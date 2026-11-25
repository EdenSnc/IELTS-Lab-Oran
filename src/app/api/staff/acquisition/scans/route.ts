import { z } from 'zod';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, noStoreJson } from '@/lib/http/api';
import { codeSchema } from '@/lib/acquisition/validation';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requirePrivilegedRequestUser(request, ['ADMIN']);
    const query = new URL(request.url).searchParams;
    const code = codeSchema.parse(query.get('code'));
    const cursor = z.uuid().nullable().parse(query.get('before'));
    const placement = await prisma.acquisitionPlacement.findUnique({ where: { code }, select: { id: true } });
    if (!placement) return noStoreJson({ error: 'NOT_FOUND' }, 404);
    const pointer = cursor ? await prisma.acquisitionScan.findUnique({
      where: { id: cursor, placementId: placement.id }, select: { id: true, scannedAt: true },
    }) : null;
    if (cursor && !pointer) return noStoreJson({ error: 'INVALID_CURSOR' }, 400);
    const rows = await prisma.acquisitionScan.findMany({
      where: { placementId: placement.id, ...(pointer ? {
        OR: [{ scannedAt: { lt: pointer.scannedAt } }, { scannedAt: pointer.scannedAt, id: { lt: pointer.id } }],
      } : {}) },
      orderBy: [{ scannedAt: 'desc' }, { id: 'desc' }],
      take: 31,
      select: { id: true, scannedAt: true, placementLabel: true, inquiry: { select: { id: true, archivedAt: true } } },
    });
    const scans = rows.slice(0, 30);
    return noStoreJson({ scans, next: rows.length > 30 ? scans.at(-1)?.id : null });
  } catch (error) {
    return apiError(error, 'SCAN_HISTORY_FAILED');
  }
}
