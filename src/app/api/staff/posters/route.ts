import sharp from 'sharp';
import QRCode from 'qrcode';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { readBoundedBody, readBoundedText } from '@/lib/http/read-body';
import { checkPosterDimensions, inspectPoster, MAX_POSTER_PIXELS, QUIET_MODULES } from '@/lib/acquisition/poster-artwork';
import { fitsPosterDesign, MAX_SAVED_ARTWORK_BYTES, posterIdSchema, posterMutationSchema, posterSaveSchema } from '@/lib/acquisition/poster-design';
import { publicAcquisitionLink } from '@/lib/acquisition/public-link';
import { codeSchema } from '@/lib/acquisition/validation';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requirePrivilegedRequestUser(request, ['ADMIN']);
    const query = new URL(request.url).searchParams;
    const id = posterIdSchema.parse(query.get('id'));
    const thumbnail = query.get('thumbnail') === '1';
    const version = query.get('version');
    if (version !== null && (!/^[1-9]\d{0,9}$/.test(version) || Number(version) > 2_147_483_647)) {
      return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
    }
    const where = { id, ...(version !== null ? { version: Number(version), deletedAt: null } : {}) };
    const asset = thumbnail
      ? await prisma.posterDesign.findUnique({ where, select: { thumbnail: true } })
        .then((poster) => poster && { bytes: poster.thumbnail, mime: 'image/jpeg' })
      : await prisma.posterDesign.findUnique({ where, select: { artwork: true, mime: true } })
        .then((poster) => poster && { bytes: poster.artwork, mime: poster.mime });
    if (!asset) return noStoreJson({ error: 'POSTER_NOT_FOUND' }, 404);
    return new Response(asset.bytes, {
      headers: {
        'Content-Type': asset.mime,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return apiError(error, 'POSTER_LOAD_FAILED');
  }
}

async function prepareArtwork(file: File) {
  if (file.size > MAX_SAVED_ARTWORK_BYTES) throw new AuthError('POSTER_TOO_LARGE', 413);
  try {
    const artwork = new Uint8Array(await file.arrayBuffer());
    const { mime } = inspectPoster(artwork);
    const image = sharp(artwork, { limitInputPixels: MAX_POSTER_PIXELS, failOn: 'warning' });
    const { autoOrient } = await image.metadata();
    checkPosterDimensions(autoOrient);
    const thumbnail = await image.autoOrient().resize({ width: 280, height: 360, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer();
    return { artwork, thumbnail: new Uint8Array(thumbnail), mime, ...autoOrient };
  } catch {
    throw new AuthError('INVALID_POSTER_ARTWORK', 400);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN']);
    const contentType = request.headers.get('content-type');
    if (!contentType?.startsWith('multipart/form-data;')) {
      return noStoreJson({ error: 'INVALID_POSTER_UPLOAD' }, 400);
    }
    const bytes = await readBoundedBody(request, MAX_SAVED_ARTWORK_BYTES + 8192);
    const form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData().catch(() => null);
    if (!form) return noStoreJson({ error: 'INVALID_POSTER_UPLOAD' }, 400);
    const raw = form.get('details');
    const code = codeSchema.parse(form.get('code'));
    if (typeof raw !== 'string' || raw.length > 2048) return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
    let details: unknown;
    try { details = JSON.parse(raw); } catch { return noStoreJson({ error: 'INVALID_REQUEST' }, 400); }
    const { id, version, ...layout } = posterSaveSchema.parse(details);
    const file = form.get('artwork');
    if ((!version && !file) || typeof file === 'string') return noStoreJson({ error: 'INVALID_POSTER_ARTWORK' }, 400);
    const incoming = file ? await prepareArtwork(file) : undefined;
    const placement = await prisma.acquisitionPlacement.findUnique({ where: { code }, select: { id: true } });
    if (!placement) return noStoreJson({ error: 'PLACEMENT_NOT_FOUND' }, 404);
    const cells = QRCode.create(publicAcquisitionLink(code), { errorCorrectionLevel: 'M' }).modules.size + 2 * QUIET_MODULES;
    const saved = await prisma.$transaction(async (tx) => {
      const current = version !== undefined ? await tx.posterDesign.findUnique({
        where: { id }, select: { width: true, height: true, placementId: true, deletedAt: true },
      }) : null;
      if (version !== undefined && (!current || current.deletedAt || current.placementId !== placement.id)) {
        throw new AuthError('POSTER_NOT_FOUND', 404);
      }
      const dimensions = incoming ?? current;
      if (!dimensions || !fitsPosterDesign(dimensions, layout, cells)) throw new AuthError('INVALID_QR_PLACEMENT', 400);
      if (version !== undefined) {
        const { count } = await tx.posterDesign.updateMany({
          where: { id, version, deletedAt: null },
          data: { ...layout, ...incoming, version: { increment: 1 } },
        });
        if (!count) throw new AuthError('POSTER_CONFLICT', 409);
      } else if (incoming) {
        const { count } = await tx.posterDesign.createMany({
          data: { id, placementId: placement.id, ...incoming, ...layout, roundQr: layout.roundQr ?? true }, skipDuplicates: true,
        });
        if (!count) {
          const previous = await tx.posterDesign.findUnique({
            where: { id }, select: {
              version: true, placementId: true, deletedAt: true, artwork: true,
              title: true, x: true, y: true, size: true, dpi: true, qrBackground: true, roundQr: true,
            },
          });
          if (previous?.placementId !== placement.id || previous.version !== 1 || previous.deletedAt
            || previous.title !== layout.title || previous.x !== layout.x || previous.y !== layout.y
            || previous.size !== layout.size || previous.dpi !== layout.dpi
            || previous.qrBackground !== (layout.qrBackground ?? '#ffffff') || previous.roundQr !== (layout.roundQr ?? true)
            || !Buffer.from(previous.artwork).equals(Buffer.from(incoming.artwork))) {
            throw new AuthError('POSTER_CONFLICT', 409);
          }
          return { id, version: previous.version };
        }
      }
      await tx.staffActionAudit.create({ data: {
        actorUserId: actor.id, action: version === undefined ? 'POSTER_CREATED' : 'POSTER_UPDATED',
        targetType: 'PosterDesign', targetId: id, reason: 'Saved poster artwork and print settings',
      } });
      return { id, version: version === undefined ? 1 : version + 1 };
    });
    return noStoreJson(saved, version === undefined ? 201 : 200);
  } catch (error) {
    return apiError(error, 'POSTER_SAVE_FAILED');
  }
}

async function mutate(request: Request, permanent: boolean) {
  try {
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN']);
    const raw = await readBoundedText(request, 1024);
    let details: unknown;
    try { details = JSON.parse(raw); } catch { return noStoreJson({ error: 'INVALID_REQUEST' }, 400); }
    const { id, action, version } = posterMutationSchema.parse(details);
    if (permanent !== (action === 'purge')) return noStoreJson({ error: 'INVALID_REQUEST' }, 400);
    const trashed = action === 'trash';
    const where = { id, version, deletedAt: trashed ? null : { not: null } };
    await prisma.$transaction(async (tx) => {
      const { count } = permanent ? await tx.posterDesign.deleteMany({ where })
        : await tx.posterDesign.updateMany({
          where, data: { deletedAt: trashed ? new Date() : null, version: { increment: 1 } },
        });
      if (!count) throw new AuthError('POSTER_CONFLICT', 409);
      await tx.staffActionAudit.create({ data: {
        actorUserId: actor.id, action: `POSTER_${action.toUpperCase()}`,
        targetType: 'PosterDesign', targetId: id, reason: 'Founder poster library action',
      } });
    });
    return noStoreJson({ version: version + 1 });
  } catch (error) {
    return apiError(error, 'POSTER_CHANGE_FAILED');
  }
}

export function PATCH(request: Request) { return mutate(request, false); }
export function DELETE(request: Request) { return mutate(request, true); }
