import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  DEVICE_COOKIE_NAME,
  deviceCookieOptions,
  enrollDeviceSlot,
  findRequestDeviceSlot,
  publicDeviceSlot,
  replaceDeviceSlot,
} from '@/lib/auth/device-slots';
import { requireRequestUser } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';

const enrollmentSchema = z.object({ label: z.string().trim().min(1).max(80).optional() });
const replacementSchema = enrollmentSchema.extend({
  slotNumber: z.number().int().min(1).max(2),
  password: z.string().min(8).max(256),
});

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const current = await findRequestDeviceSlot(request, user.id);
    const slots = await prisma.deviceSlot.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { slotNumber: 'asc' },
    });
    return noStoreJson({
      currentSlotId: current?.id ?? null,
      slots: slots.map(publicDeviceSlot),
    });
  } catch (error) {
    return apiError(error, 'DEVICE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const existing = await findRequestDeviceSlot(request, user.id);
    if (existing) return noStoreJson({ slot: publicDeviceSlot(existing) });
    const input = enrollmentSchema.parse(await request.json());
    const enrolled = await enrollDeviceSlot(user.id, input.label);
    const response = NextResponse.json(
      { slot: publicDeviceSlot(enrolled.slot) },
      { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
    response.cookies.set(DEVICE_COOKIE_NAME, enrolled.token, deviceCookieOptions());
    return response;
  } catch (error) {
    return apiError(error, 'DEVICE_ENROLLMENT_FAILED');
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    if (!user.email) throw new Error('PASSWORD_REAUTH_UNAVAILABLE');
    const input = replacementSchema.parse(await request.json());
    const config = requireSupabasePublicConfig();
    const auth = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await auth.auth.signInWithPassword({ email: user.email, password: input.password });
    if (error) return noStoreJson({ error: 'REAUTHENTICATION_FAILED' }, 401);

    const replaced = await replaceDeviceSlot(user.id, input.slotNumber, input.label);
    const response = NextResponse.json(
      { slot: publicDeviceSlot(replaced.slot) },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
    response.cookies.set(DEVICE_COOKIE_NAME, replaced.token, deviceCookieOptions());
    return response;
  } catch (error) {
    return apiError(error, 'DEVICE_REPLACEMENT_FAILED');
  }
}
