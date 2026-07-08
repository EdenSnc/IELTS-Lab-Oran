import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LeadSource } from '@prisma/client';

// Algerian Mobile Regex: 05x, 06x, 07x with or without +213 prefix
const phoneRegex = /^(?:\+213|0)[567]\d{8}$/;

// Validates that a string is a member of the LeadSource enum
function toLeadSource(value: unknown): LeadSource {
  if (typeof value === 'string' && Object.values(LeadSource).includes(value as LeadSource)) {
    return value as LeadSource;
  }
  return LeadSource.unknown;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    let phone = '';
    let email: string | null = null;
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;
    let formName = 'Unknown Form';
    let source: LeadSource = LeadSource.unknown;

    // ── Direct JSON submission (our own forms) ──────────────────────────────
    if (payload && payload.phone) {
      phone      = String(payload.phone).trim();
      email      = payload.email    ? String(payload.email).trim()      : null;
      utmSource  = payload.utmSource  ? String(payload.utmSource).trim()  : null;
      utmMedium  = payload.utmMedium  ? String(payload.utmMedium).trim()  : null;
      utmCampaign= payload.utmCampaign? String(payload.utmCampaign).trim(): null;
      formName   = payload.formName   ? String(payload.formName).trim()   : 'Direct Submission';
      // Accept source from the form payload; fall back to unknown
      source     = toLeadSource(payload.source);

    // ── Tally webhook payload ───────────────────────────────────────────────
    } else if (payload && payload.data && payload.data.fields) {
      const fields = payload.data.fields;
      formName = payload.data.formName || 'Unknown Tally Form';
      // All Tally webhook submissions come from the Intake cohort application form
      source = LeadSource.cohort_waitlist;

      for (const field of fields) {
        const val   = String(field.value  ?? '').trim();
        const label = String(field.label  ?? '').toLowerCase();
        const key   = String(field.key    ?? '').toLowerCase();

        if (key.includes('utm_source')   || label.includes('utm_source'))   utmSource   = val;
        if (key.includes('utm_medium')   || label.includes('utm_medium'))   utmMedium   = val;
        if (key.includes('utm_campaign') || label.includes('utm_campaign')) utmCampaign = val;
        if (key.includes('email')        || label.includes('email'))        email       = val;
        if (phoneRegex.test(val)) phone = val;
      }
    } else {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    if (!phone || !phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Valid Algerian phone number not found in payload' },
        { status: 422 },
      );
    }

    // Normalise to E.164 (+213...)
    if (phone.startsWith('0')) {
      phone = '+213' + phone.substring(1);
    }

    // Upsert Prospect and create LeadMagnetDownload record with source tag
    await prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.upsert({
        where:  { phone },
        update: { email: email ?? undefined },
        create: { phone, email },
      });

      await tx.leadMagnetDownload.create({
        data: {
          prospectId:  prospect.id,
          magnetName:  formName,
          source,           // ← structured source tag (new field)
          utmSource,
          utmMedium,
          utmCampaign,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
