import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { founderApplicationAction } from '@/lib/admin/application-record';
import { requirePrivilegedRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin } from '@/lib/http/api';
import { readBoundedText } from '@/lib/http/read-body';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePrivilegedRequestUser(request, ['ADMIN']);
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return NextResponse.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 415 });
    }
    const raw = await readBoundedText(request, 8192);
    let body: unknown;
    try { body = JSON.parse(raw); } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }
    const requestData = founderApplicationAction.parse(body);
    await prisma.$transaction(async (tx) => {
      let id: string;
      if (requestData.action === 'create') {
        const details = requestData.details;
        const contact = await tx.prospect.upsert({
          where: { phone: details.phone },
          create: { phone: details.phone, name: details.name, email: details.email },
          update: { phone: details.phone },
          select: { id: true },
        });
        const created = await tx.inquiry.create({
          data: { prospectId: contact.id, message: '{"origin":"founder"}', founderDetails: details },
          select: { id: true },
        });
        id = created.id;
      } else {
        const updated = await tx.inquiry.update({
          where: { id: requestData.id },
          data: requestData.action === 'edit'
            ? { founderDetails: requestData.details ?? Prisma.DbNull }
            : { archivedAt: requestData.archived ? new Date() : null },
          select: { id: true },
        });
        id = updated.id;
      }
      await tx.staffActionAudit.create({
        data: {
          actorUserId: actor.id, action: `FOUNDER_APPLICATION_${requestData.action.toUpperCase()}`,
          targetType: 'Inquiry', targetId: id, reason: 'Founder dashboard application action',
          metadata: requestData.action === 'archive' ? { archived: requestData.archived } : {},
        },
      });
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return apiError(error, 'APPLICATION_SAVE_FAILED');
  }
}
