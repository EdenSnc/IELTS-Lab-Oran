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
    if (!request.headers.get('origin')) return NextResponse.json({ error: 'ORIGIN_REQUIRED' }, { status: 403 });
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN', 'CONTENT_REVIEWER']);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 415 });
    if (Number(request.headers.get('content-length') ?? 0) > 2048) return NextResponse.json({ error: 'BODY_TOO_LARGE' }, { status: 413 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) return NextResponse.json({ error: 'BODY_TOO_LARGE' }, { status: 413 });
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
    const input = actionSchema.parse(payload);
    if (input.action === 'campaign') {
      await prisma.acquisitionCampaign.create({ data: { name: input.name, slug: input.slug } });
    } else if (input.action === 'placement') {
      await prisma.acquisitionPlacement.create({
        data: {
          campaignId: input.campaignId,
          label: input.label,
          medium: input.medium,
          destination: input.destination,
          code: randomBytes(9).toString('base64url'),
        },
      });
    } else if (input.action === 'update_placement') {
      await prisma.acquisitionPlacement.update({
        where: { id: input.placementId },
        data: {
          destination: input.destination,
          ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
        },
      });
    } else {
      await prisma.acquisitionInspection.create({
        data: {
          placementId: input.placementId,
          actorId: actor.id,
          status: input.status,
          note: input.note || null,
        },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'ALREADY_EXISTS' }, { status: 409 });
    }
    return apiError(error, 'ACQUISITION_SAVE_FAILED');
  }
}
