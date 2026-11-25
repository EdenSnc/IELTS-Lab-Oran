import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin } from '@/lib/http/api';
import { readBoundedText } from '@/lib/http/read-body';
import { actionSchema, codeSchema, FORM_DESTINATION } from '@/lib/acquisition/validation';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requirePrivilegedRequestUser(request, ['ADMIN']);
    const code = codeSchema.safeParse(new URL(request.url).searchParams.get('code'));
    if (!code.success) return NextResponse.json({ error: 'INVALID_PLACEMENT' }, { status: 400 });
    const placement = await prisma.acquisitionPlacement.findUnique({
      where: { code: code.data },
      select: { active: true, archivedAt: true, campaign: { select: { archivedAt: true } } },
    });
    if (!placement) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ active: placement.active && !placement.archivedAt && !placement.campaign.archivedAt }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return apiError(error, 'ACQUISITION_STATUS_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    // Mutations require both staff AAL2 and a browser-origin match.
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN']);
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return NextResponse.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 415 });
    }
    const raw = await readBoundedText(request, 2048);
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
    const input = actionSchema.parse(payload);
    const result = await prisma.$transaction(async (tx) => {
      async function createCampaign(name: string, slug?: string) {
        const stem = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64).replace(/^-|-$/g, '') || 'campaign';
        const created = await tx.acquisitionCampaign.create({
          data: { name, slug: slug ?? `${stem}-${randomBytes(4).toString('hex')}` },
        });
        await tx.staffActionAudit.create({
          data: {
            actorUserId: actor.id,
            action: 'ACQUISITION_CAMPAIGN_CREATED',
            targetType: 'AcquisitionCampaign',
            targetId: created.id,
            reason: `Created acquisition campaign ${created.slug}`,
            metadata: { slug: created.slug, name: created.name },
          },
        });
        return created;
      }
      if (input.action === 'campaign') {
        await createCampaign(input.name, input.slug);
      } else if (input.action === 'delete_campaign') {
        const campaign = await tx.acquisitionCampaign.findUniqueOrThrow({
          where: { id: input.campaignId },
          select: { id: true, slug: true, archivedAt: true, _count: { select: { placements: true } } },
        });
        if (!campaign.archivedAt) throw new AuthError('ARCHIVE_CAMPAIGN_FIRST', 409);
        if (campaign._count.placements) throw new AuthError('CAMPAIGN_HAS_TRACKING_LINKS', 409);
        const { count } = await tx.acquisitionCampaign.deleteMany({ where: { id: campaign.id, archivedAt: campaign.archivedAt } });
        if (!count) throw new AuthError('CAMPAIGN_CHANGED', 409);
        await tx.staffActionAudit.create({ data: {
          actorUserId: actor.id, action: 'ACQUISITION_CAMPAIGN_DELETED', targetType: 'AcquisitionCampaign',
          targetId: campaign.id, reason: 'Deleted an archived campaign with zero tracking links', metadata: { slug: campaign.slug },
        } });
      } else if (input.action === 'update_campaign' || input.action === 'archive_campaign') {
        const { campaignId } = input;
        const updated = await tx.acquisitionCampaign.update({
          where: { id: campaignId },
          data: input.action === 'update_campaign'
            ? { name: input.name }
            : { archivedAt: input.archived ? new Date() : null, keepQrAfterArchive: input.archived },
        });
        await tx.staffActionAudit.create({ data: {
          actorUserId: actor.id, action: 'ACQUISITION_CAMPAIGN_UPDATED', targetType: 'AcquisitionCampaign',
          targetId: updated.id, reason: `Updated campaign ${updated.slug}`,
          metadata: { name: updated.name, archived: Boolean(updated.archivedAt) },
        } });
      } else if (input.action === 'placement' || input.action === 'poster_location') {
        const requestId = input.action === 'poster_location' ? input.requestId : undefined;
        const fingerprint = requestId ? createHash('sha256').update(JSON.stringify(input)).digest('hex') : undefined;
        if (requestId) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;
          const existing = await tx.acquisitionPlacement.findUnique({ where: { id: requestId }, select: { code: true } });
          if (existing) {
            const audit = await tx.staffActionAudit.findFirst({
              where: {
                action: 'ACQUISITION_PLACEMENT_CREATED', targetType: 'AcquisitionPlacement', targetId: requestId,
                metadata: { path: ['retryFingerprint'], equals: fingerprint },
              },
              select: { id: true },
            });
            if (!audit) throw new AuthError('POSTER_REQUEST_CONFLICT', 409);
            const design = input.action === 'poster_location' && input.fromDesignId
              ? await tx.posterDesign.findUnique({ where: { id: requestId, deletedAt: null }, select: { id: true } }) : null;
            return { code: existing.code, design: design?.id };
          }
        }
        const campaign = input.action === 'poster_location' && input.campaign.kind === 'new'
          ? await createCampaign(input.campaign.name)
          : await tx.acquisitionCampaign.findUniqueOrThrow({
            where: { id: input.action === 'placement' ? input.campaignId : input.campaign.kind === 'existing' ? input.campaign.id : undefined },
            select: { id: true, archivedAt: true },
          });
        if (campaign.archivedAt) throw new AuthError('CAMPAIGN_ARCHIVED', 409);
        const created = await tx.acquisitionPlacement.create({
          data: {
            ...(requestId ? { id: requestId } : {}),
            campaignId: campaign.id,
            label: input.label,
            medium: input.action === 'placement' ? input.medium : 'poster',
            destination: input.action === 'placement' ? input.destination : FORM_DESTINATION,
            code: randomBytes(9).toString('base64url'),
          },
        });
        await tx.staffActionAudit.create({
          data: {
            actorUserId: actor.id,
            action: 'ACQUISITION_PLACEMENT_CREATED',
            targetType: 'AcquisitionPlacement',
            targetId: created.id,
            reason: `Created placement ${created.code} (${created.label})`,
            metadata: {
              campaignId: created.campaignId,
              code: created.code,
              medium: created.medium,
              destination: created.destination,
              ...(fingerprint ? { retryFingerprint: fingerprint } : {}),
            },
          },
        });
        if (input.action === 'poster_location') {
          if (!input.fromDesignId) return { code: created.code };
          const design = requestId ?? randomUUID();
          const copy = await tx.$executeRaw`
            INSERT INTO app_private."PosterDesign" (
              id, "placementId", title, artwork, thumbnail, mime, width, height, x, y, size, dpi, "qrBackground", "roundQr", "updatedAt"
            )
            SELECT ${design}::uuid, ${created.id}::uuid, ${input.label.slice(0, 100)}, artwork, thumbnail, mime, width, height, x, y,
              size, dpi, "qrBackground", "roundQr", now()
            FROM app_private."PosterDesign" WHERE id = ${input.fromDesignId}::uuid AND "deletedAt" IS NULL
          `;
          if (!copy) throw new AuthError('SOURCE_POSTER_NOT_FOUND', 404);
          await tx.staffActionAudit.create({ data: {
            actorUserId: actor.id, action: 'POSTER_DUPLICATED', targetType: 'PosterDesign', targetId: design,
            reason: 'Copied artwork to a new tracking link', metadata: { fromDesignId: input.fromDesignId, code: created.code },
          } });
          return { code: created.code, design };
        }
      } else if (input.action === 'update_placement' || input.action === 'archive_placement') {
        const prior = input.action === 'update_placement' && input.label
          ? await tx.acquisitionPlacement.findUnique({ where: { id: input.placementId }, select: { label: true } }) : null;
        const updated = await tx.acquisitionPlacement.update({
          where: { id: input.placementId },
          data: input.action === 'archive_placement' ? { archivedAt: input.archived ? new Date() : null, keepQrAfterArchive: input.archived } : {
            label: input.label,
            medium: input.medium,
            destination: input.destination,
            ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
          },
        });
        await tx.staffActionAudit.create({
          data: {
            actorUserId: actor.id,
            action: 'ACQUISITION_PLACEMENT_UPDATED',
            targetType: 'AcquisitionPlacement',
            targetId: updated.id,
            reason: `Updated placement ${updated.code}`,
            metadata: {
              destination: updated.destination,
              active: updated.active,
              archived: Boolean(updated.archivedAt),
              ...(prior && prior.label !== updated.label ? { previousLabel: prior.label, label: updated.label } : {}),
            },
          },
        });
      } else {
        const inspection = await tx.acquisitionInspection.create({
          data: {
            placementId: input.placementId,
            actorId: actor.id,
            status: input.status,
            note: input.note || null,
          },
        });
        await tx.staffActionAudit.create({
          data: {
            actorUserId: actor.id,
            action: 'ACQUISITION_INSPECTION_RECORDED',
            targetType: 'AcquisitionPlacement',
            targetId: input.placementId,
            reason: `Recorded physical check (${input.status})`,
            metadata: {
              inspectionId: inspection.id,
              status: input.status,
              note: input.note || null,
            },
          },
        });
      }
    });
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'ALREADY_EXISTS' }, { status: 409 });
      }
      if (error.code === 'P2025' || error.code === 'P2003') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
    }
    return apiError(error, 'ACQUISITION_SAVE_FAILED');
  }
}
