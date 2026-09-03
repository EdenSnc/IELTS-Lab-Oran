import { createHmac, timingSafeEqual } from 'node:crypto';
import { LeadSource } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applicationSchema, boundedTallyAnswer } from '@/lib/leads/application';
import prisma from '@/lib/prisma';
import { requireHumanRequest } from '@/lib/security/bot';

const MAX_BODY_BYTES = 32_768;
const phonePattern = /^(?:\+213|0)[567]\d{8}$/;
const optionalText = z.string().trim().max(200).nullish();

const directLeadSchema = z.object({
  phone: z.string().trim().min(1).max(32),
  email: z.email().max(320).nullish(),
  fullName: z.string().trim().min(2).max(120).nullish(),
  utmSource: optionalText,
  utmMedium: optionalText,
  utmCampaign: optionalText,
  formName: z.string().trim().min(1).max(200).default('Direct Submission'),
  source: z
    .enum([
      LeadSource.lead_magnet_pdf,
      LeadSource.workshop,
      LeadSource.cohort_waitlist,
      LeadSource.unknown,
    ])
    .default(LeadSource.unknown),
  application: applicationSchema.optional(),
}).strict();

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
  externalEventId: string | null;
  application: unknown | null;
}

function normalisePhone(value: string): string | null {
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (!phonePattern.test(phone)) return null;
  return phone.startsWith('0') ? `+213${phone.slice(1)}` : phone;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost ?? request.headers.get('host');
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
    phone ??= normalisePhone(value);
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
    externalEventId: parsed.data.eventId,
    application: {
      schemaVersion: 1,
      source: 'tally',
      answers,
    },
  };
}

function parseDirectLead(payload: unknown): LeadInput | null {
  const parsed = directLeadSchema.safeParse(payload);
  if (!parsed.success) return null;

  const phone = normalisePhone(parsed.data.phone);
  if (!phone) return null;

  return {
    phone,
    email: parsed.data.email?.toLowerCase() ?? null,
    fullName: parsed.data.fullName ?? null,
    formName: parsed.data.formName,
    source: parsed.data.source,
    utmSource: parsed.data.utmSource ?? null,
    utmMedium: parsed.data.utmMedium ?? null,
    utmCampaign: parsed.data.utmCampaign ?? null,
    externalEventId: null,
    application: parsed.data.application ?? null,
  };
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
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
    try {
      await requireHumanRequest();
    } catch {
      return NextResponse.json({ error: 'ACCESS_DENIED' }, { status: 403 });
    }
    lead = parseDirectLead(payload);
  }

  if (!lead) {
    return NextResponse.json({ error: 'Invalid lead submission.' }, { status: 422 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.upsert({
        where: { phone: lead.phone },
        update: { email: lead.email ?? undefined, name: lead.fullName ?? undefined },
        create: { phone: lead.phone, email: lead.email, name: lead.fullName },
      });

      await tx.leadMagnetDownload.create({
        data: {
          prospectId: prospect.id,
          magnetName: lead.formName,
          source: lead.source,
          utmSource: lead.utmSource,
          utmMedium: lead.utmMedium,
          utmCampaign: lead.utmCampaign,
          externalEventId: lead.externalEventId,
        },
      });

      if (lead.application) {
        await tx.inquiry.create({
          data: {
            prospectId: prospect.id,
            message: JSON.stringify(lead.application),
          },
        });
      }
    });

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (
      lead.externalEventId &&
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    console.error('Lead submission failed:', error);
    return NextResponse.json({ error: 'Unable to save lead.' }, { status: 500 });
  }
}
