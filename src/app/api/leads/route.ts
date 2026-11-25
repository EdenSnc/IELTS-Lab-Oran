import { createHmac, timingSafeEqual } from 'node:crypto';
import { LeadSource, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { boundedTallyAnswer } from '@/lib/leads/application';
import { directLeadSchema, invalidLeadFields, normalizeLeadPhone } from '@/lib/leads/direct-intake';
import prisma from '@/lib/prisma';
import { requireHumanRequest } from '@/lib/security/bot';
import { checkSlidingWindowRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { BodyTooLargeError, readBoundedText } from '@/lib/http/read-body';
import { logSafeError } from '@/lib/observability/safe-log';

const MAX_BODY_BYTES = 32_768;
const tallyWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  data: z.object({
    formName: z.string().trim().max(200).optional(),
    fields: z.array(z.object({
      key: z.string().optional(),
      label: z.string().optional(),
      value: z.unknown(),
    }).passthrough()).max(200),
  }).passthrough(),
}).passthrough();

interface LeadInput {
  phone: string;
  email: string | null;
  fullName: string | null;
  formName: string;
  source: LeadSource;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  externalEventId: string | null;
  scanId?: string | null;
  application: unknown | null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = (forwardedHost && forwardedHost.length > 0 ? forwardedHost : null)
    ?? request.headers.get('host')?.trim();
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function hasValidTallySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.TALLY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function fieldText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(fieldText).filter(Boolean).join(', ');
  }
  return '';
}

function parseTallyLead(payload: unknown): LeadInput | null {
  const parsed = tallyWebhookSchema.safeParse(payload);
  if (!parsed.success) return null;

  let phone: string | null = null;
  let email: string | null = null;
  let fullName: string | null = null;
  let utmSource: string | null = null;
  let utmMedium: string | null = null;
  let utmCampaign: string | null = null;
  let utmContent: string | null = null;
  const answers: Array<{ key: string | null; label: string | null; value: string | string[] }> = [];

  for (const field of parsed.data.data.fields) {
    const value = fieldText(field.value);
    const identifier = `${field.key ?? ''} ${field.label ?? ''}`.toLowerCase();
    const boundedValue = boundedTallyAnswer(field.value);

    if (boundedValue !== null) {
      answers.push({
        key: field.key?.trim().slice(0, 200) || null,
        label: field.label?.trim().slice(0, 300) || null,
        value: boundedValue,
      });
    }

    if (identifier.includes('utm_source')) utmSource = value || null;
    if (identifier.includes('utm_medium')) utmMedium = value || null;
    if (identifier.includes('utm_campaign')) utmCampaign = value || null;
    if (identifier.includes('utm_content')) utmContent = value || null;
    if (identifier.includes('email')) {
      const validEmail = z.email().safeParse(value);
      if (validEmail.success) email = validEmail.data.toLowerCase();
    }
    if (
      !fullName
      && (identifier.includes('full legal name') || identifier.includes('full name'))
      && value.length >= 2
    ) {
      fullName = value.slice(0, 120);
    }
    phone ??= normalizeLeadPhone(value);
  }

  if (!phone) return null;

  return {
    phone,
    email,
    fullName,
    formName: parsed.data.data.formName ?? 'Tally intake',
    source: LeadSource.cohort_waitlist,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    externalEventId: parsed.data.eventId,
    application: {
      schemaVersion: 1,
      source: 'tally',
      answers,
    },
  };
}

function directLead(data: z.output<typeof directLeadSchema>): LeadInput {
  return {
    phone: data.phone,
    email: data.email?.toLowerCase() ?? null,
    fullName: data.fullName ?? null,
    formName: data.formName,
    source: data.source,
    utmSource: data.utmSource ?? null,
    utmMedium: data.utmMedium ?? null,
    utmCampaign: data.utmCampaign ?? null,
    utmContent: data.utmContent ?? null,
    externalEventId: data.submissionId && data.application ? `website-application:${data.submissionId}` : null,
    scanId: data.utmSource === 'ieltslab' ? data.scanId : null,
    application: data.application ? {
      ...data.application,
      attribution: {
        ...data.application.attribution,
        utmContent: data.utmSource === 'ieltslab' ? data.utmContent ?? null : null,
      },
    } : null,
  };
}

function isExternalEventDuplicate(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  return (Array.isArray(target) ? target.includes('externalEventId') : String(target ?? '').includes('externalEventId'))
    || error.message.includes('externalEventId');
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedText(request, MAX_BODY_BYTES);
  } catch (error) {
    return error instanceof BodyTooLargeError
      ? NextResponse.json({ error: 'Request body is too large.' }, { status: 413 })
      : NextResponse.json({ error: 'Could not read the request.' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const tallySignature = request.headers.get('tally-signature');
  let lead: LeadInput | null = null;

  if (tallySignature) {
    if (!process.env.TALLY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Tally webhook is not configured.' }, { status: 503 });
    }
    if (!hasValidTallySignature(rawBody, tallySignature)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
    }
    lead = parseTallyLead(payload);
  } else if (sameOrigin(request)) {
    const rl = checkSlidingWindowRateLimit({
      namespace: 'leads-direct',
      key: extractClientIp(request),
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again shortly.' }, { status: 429 });
    }
    try {
      await requireHumanRequest();
    } catch {
      return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
    }
    const parsed = directLeadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Check the application fields and try again.',
        fields: invalidLeadFields(parsed.error.issues),
      }, { status: 422 });
    }
    lead = directLead(parsed.data);
  } else {
    return NextResponse.json({ error: 'CROSS_ORIGIN_FORBIDDEN' }, { status: 403 });
  }

  if (!lead) {
    return NextResponse.json({ error: 'Invalid lead submission.' }, { status: 422 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // A concurrent application for the same number must reuse the contact.
      // Keep any established name and email when another enquiry arrives.
      const [prospect] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO app_private."Prospect" AS prospect ("phone", "name", "email", "updatedAt")
        VALUES (${lead.phone}, ${lead.fullName}, ${lead.email}, CURRENT_TIMESTAMP)
        ON CONFLICT ("phone") DO UPDATE SET
          "name" = COALESCE(NULLIF(prospect."name", ''), EXCLUDED."name", prospect."name"),
          "email" = COALESCE(NULLIF(prospect."email", ''), EXCLUDED."email", prospect."email"),
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id"
      `;

      await tx.leadMagnetDownload.create({
        data: {
          prospectId: prospect.id,
          magnetName: lead.formName,
          source: lead.source,
          utmSource: lead.utmSource,
          utmMedium: lead.utmMedium,
          utmCampaign: lead.utmCampaign,
          utmContent: lead.utmContent,
          externalEventId: lead.externalEventId,
        },
      });

      if (lead.application) {
        const inquiry = await tx.inquiry.create({
          data: {
            prospectId: prospect.id,
            message: JSON.stringify(lead.application),
          },
        });
        if (lead.scanId && lead.utmContent) {
          await tx.acquisitionScan.updateMany({
            where: { id: lead.scanId, placement: { code: lead.utmContent }, inquiryId: null },
            data: { inquiryId: inquiry.id },
          });
        }
      }
    });

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (lead.externalEventId && isExternalEventDuplicate(error)) {
      if (!tallySignature) {
        const original = await prisma.leadMagnetDownload.findUnique({
          where: { externalEventId: lead.externalEventId },
          select: { prospect: { select: { phone: true } } },
        });
        if (original?.prospect.phone !== lead.phone) {
          return NextResponse.json({ error: 'This submission has already been used.' }, { status: 409 });
        }
      }
      return NextResponse.json({ success: true, duplicate: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    logSafeError('LEAD_SUBMISSION_FAILED', error);
    return NextResponse.json({ error: 'Unable to save lead.' }, { status: 500 });
  }
}
