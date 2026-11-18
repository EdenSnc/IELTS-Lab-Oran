import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin } from '@/lib/http/api';
import { actionSchema } from '@/lib/acquisition/validation';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Mutations require both staff AAL2 and a browser-origin match.
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN', 'CONTENT_REVIEWER']);
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
      } else if (input.action === 'placement') {
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
      } else if (input.action === 'update_placement') {
        const updated = await tx.acquisitionPlacement.update({
          where: { id: input.placementId },
          data: {
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
