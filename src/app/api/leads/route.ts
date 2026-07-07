import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Algerian Mobile Regex
const phoneRegex = /^(?:\+213|0)[567]\d{8}$/;

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    let phone = '';
    let email = null;
    let utmSource = null;
    let utmMedium = null;
    let utmCampaign = null;
    let formName = 'Unknown Form';

    // Check if it's a direct JSON submission or Tally webhook payload
    if (payload && payload.phone) {
      // Direct lead submission
      phone = String(payload.phone).trim();
      email = payload.email ? String(payload.email).trim() : null;
      utmSource = payload.utmSource ? String(payload.utmSource).trim() : null;
      utmMedium = payload.utmMedium ? String(payload.utmMedium).trim() : null;
      utmCampaign = payload.utmCampaign ? String(payload.utmCampaign).trim() : null;
      formName = payload.formName ? String(payload.formName).trim() : 'Direct Lead Magnet';
    } else if (payload && payload.data && payload.data.fields) {
      // Tally webhook payload
      const fields = payload.data.fields;
      formName = payload.data.formName || 'Unknown Tally Form';

      // Extract data from fields
      for (const field of fields) {
        const val = String(field.value).trim();
        const label = String(field.label || '').toLowerCase();
        const key = String(field.key || '').toLowerCase();

        // Look for UTMs
        if (key.includes('utm_source') || label.includes('utm_source')) utmSource = val;
        if (key.includes('utm_medium') || label.includes('utm_medium')) utmMedium = val;
        if (key.includes('utm_campaign') || label.includes('utm_campaign')) utmCampaign = val;

        // Look for Email
        if (key.includes('email') || label.includes('email')) email = val;

        // Look for Phone
        if (phoneRegex.test(val)) {
          phone = val;
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    if (!phone || !phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Valid Algerian phone number not found in payload' }, { status: 422 });
    }

    // Normalize phone number to E.164 (+213...) if it starts with 0
    if (phone.startsWith('0')) {
      phone = '+213' + phone.substring(1);
    }

    // Upsert Prospect and Create Download record
    await prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.upsert({
        where: { phone },
        update: { email: email || undefined }, // Update email if provided
        create: { phone, email }
      });

      await tx.leadMagnetDownload.create({
        data: {
          prospectId: prospect.id,
          magnetName: formName,
          utmSource,
          utmMedium,
          utmCampaign,
          // Extract IP if possible from req headers (Tally doesn't usually send this securely, but X-Forwarded-For could be used if proxying, though here the webhook sender is Tally's IP, not the user's)
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
