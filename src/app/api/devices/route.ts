import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  DEVICE_COOKIE_NAME,
  deviceCookieOptions,
  enrollInitialDeviceSlot,
  enrollDeviceSlot,
  findRequestDeviceSlot,
  publicDeviceSlot,
  replaceDeviceSlot,
} from '@/lib/auth/device-slots';
import { AuthError, requireRequestUser, requireRequestUserWithAssurance } from '@/lib/auth/request-user';
import { apiError, assertSameOrigin, noStoreJson } from '@/lib/http/api';
import { requireHumanRequest } from '@/lib/security/bot';
import { requireSupabasePublicConfig } from '@/lib/supabase/config';

const enrollmentSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  automatic: z.boolean().optional().default(false),
}).strict();
const replacementSchema = z.object({
  slotNumber: z.number().int().min(1).max(2),
  label: z.string().trim().min(1).max(80).optional(),
  stepUp: z.discriminatedUnion('method', [
    z.object({ method: z.literal('aal2') }).strict(),
    z.object({ method: z.literal('email_otp'), token: z.string().trim().length(6) }).strict(),
  ]),
}).strict();

export async function GET(request: Request) {
  try {
    const identity = await requireRequestUserWithAssurance(request);
    const user = identity.user;
    const current = await findRequestDeviceSlot(request, user.id);
    const slots = await prisma.deviceSlot.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { slotNumber: 'asc' },
    });
    return noStoreJson({
      currentSlotId: current?.id ?? null,
      slots: slots.map(publicDeviceSlot),
      stepUpMethods: {
        emailOtp: Boolean(user.email),
        aal2: identity.currentLevel === 'aal2',
      },
    });
  } catch (error) {
    return apiError(error, 'DEVICE_LIST_FAILED');
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireHumanRequest();
    const user = await requireRequestUser(request);
    const existing = await findRequestDeviceSlot(request, user.id);
    if (existing) return noStoreJson({ slot: publicDeviceSlot(existing) });
    const input = enrollmentSchema.parse(await request.json());
    const enrolled = input.automatic
      ? await enrollInitialDeviceSlot(user.id, input.label)
      : await enrollDeviceSlot(user.id, input.label);
    if (!enrolled) return noStoreJson({ error: 'INITIAL_DEVICE_ALREADY_ASSIGNED' }, 409);
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
    const input = replacementSchema.parse(await request.json());
    if (input.stepUp.method === 'aal2') {
      const assured = await requireRequestUserWithAssurance(request);
      if (assured.user.id !== user.id || assured.currentLevel !== 'aal2') {
        throw new AuthError('MFA_AAL2_REQUIRED', 403);
      }
    } else {
      if (!user.email) throw new AuthError('EMAIL_STEP_UP_UNAVAILABLE', 409);
      const config = requireSupabasePublicConfig();
      const auth = createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await auth.auth.verifyOtp({
        email: user.email,
        token: input.stepUp.token,
        type: 'email',
      });
      if (error || data.user?.id !== user.id) throw new AuthError('REAUTHENTICATION_FAILED', 401);
    }

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
