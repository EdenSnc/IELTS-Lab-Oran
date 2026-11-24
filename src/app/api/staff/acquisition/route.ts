import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { AuthError, requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin } from '@/lib/http/api';
import { actionSchema, codeSchema } from '@/lib/acquisition/validation';
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
    if (Number(request.headers.get('content-length') ?? 0) > 2048) {
      return NextResponse.json({ error: 'BODY_TOO_LARGE' }, { status: 413 });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) {
      return NextResponse.json({ error: 'BODY_TOO_LARGE' }, { status: 413 });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
    const input = actionSchema.parse(payload);
    await prisma.$transaction(async (tx) => {
      if (input.action === 'campaign') {
        const created = await tx.acquisitionCampaign.create({
          data: { name: input.name, slug: input.slug },
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
      } else if (input.action === 'update_campaign' || input.action === 'archive_campaign') {
        const { campaignId } = input;
        const updated = await tx.acquisitionCampaign.update({
          where: { id: campaignId },
          data: input.action === 'update_campaign'
            ? { name: input.name }
            : { archivedAt: input.archived ? new Date() : null },
        });
        await tx.staffActionAudit.create({ data: {
          actorUserId: actor.id, action: 'ACQUISITION_CAMPAIGN_UPDATED', targetType: 'AcquisitionCampaign',
          targetId: updated.id, reason: `Updated campaign ${updated.slug}`,
          metadata: { name: updated.name, archived: Boolean(updated.archivedAt) },
        } });
      } else if (input.action === 'placement') {
        const campaign = await tx.acquisitionCampaign.findUniqueOrThrow({ where: { id: input.campaignId }, select: { archivedAt: true } });
        if (campaign.archivedAt) throw new AuthError('CAMPAIGN_ARCHIVED', 409);
        const created = await tx.acquisitionPlacement.create({
          data: {
            campaignId: input.campaignId,
            label: input.label,
            medium: input.medium,
            destination: input.destination,
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
            },
          },
        });
      } else if (input.action === 'update_placement' || input.action === 'archive_placement') {
        const updated = await tx.acquisitionPlacement.update({
          where: { id: input.placementId },
          data: input.action === 'archive_placement' ? { archivedAt: input.archived ? new Date() : null } : {
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
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
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
