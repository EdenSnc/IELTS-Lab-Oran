import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test('local Supabase signup/login maps idempotently to an unprivileged application user', {
  skip: databaseUrl && supabaseUrl && publishableKey && serviceRoleKey
    ? false
    : 'local database and Supabase public auth configuration are required',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const { requireRequestUser } = await import('../../src/lib/auth/request-user');
  const client = createClient(supabaseUrl as string, publishableKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `auth-${randomUUID()}@example.invalid`;
  const whatsapp = `+213${Math.floor(100000000 + Math.random() * 900000000)}`;
  const password = `Valid-${randomUUID()}-Password`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', full_name: 'Integration Learner', whatsapp },
  });
  assert.ifError(created.error);
  const signup = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signup.error);
  assert.ok(signup.data.session?.access_token);

  const request = new Request('http://127.0.0.1/api/account', {
    headers: { Authorization: `Bearer ${signup.data.session.access_token}` },
  });
  const mapped = await requireRequestUser(request);
  assert.equal(mapped.id, created.data.user?.id);
  assert.equal(mapped.role, 'STUDENT', 'browser metadata must never assign a privileged role');
  assert.equal(mapped.name, 'Integration Learner');
  assert.equal(mapped.whatsapp, whatsapp);

  await client.auth.signOut();
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  assert.ok(login.data.session?.access_token);
  const mappedAgain = await requireRequestUser(new Request('http://127.0.0.1/api/account', {
    headers: { Authorization: `Bearer ${login.data.session.access_token}` },
  }));
  assert.equal(mappedAgain.id, mapped.id);
  assert.equal(mappedAgain.role, 'STUDENT');
});

test('privileged routes require both a staff role and server-derived AAL2', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { requirePrivilegedRequestUser }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/request-user'),
  ]);
  const suffix = randomUUID();
  const student = await prisma.user.create({
    data: { id: randomUUID(), email: `mfa-student-${suffix}@example.invalid`, role: 'STUDENT' },
  });
  const staff = await prisma.user.create({
    data: { id: randomUUID(), email: `mfa-staff-${suffix}@example.invalid`, role: 'TEACHER' },
  });
  const forged = new Request('http://127.0.0.1/api/speaking/availability', {
    headers: { 'x-staff-aal': 'aal2', 'x-user-role': 'ADMIN' },
  });

  try {
    process.env.SPEAKING_DEV_AUTH_USER_ID = student.id;
    process.env.STAFF_MFA_DEV_AAL2 = 'true';
    await assert.rejects(requirePrivilegedRequestUser(forged), (error: Error & { code?: string }) => (
      error.code === 'FORBIDDEN'
    ));

    process.env.SPEAKING_DEV_AUTH_USER_ID = staff.id;
    process.env.STAFF_MFA_DEV_AAL2 = 'false';
    await assert.rejects(requirePrivilegedRequestUser(forged), (error: Error & { code?: string }) => (
      error.code === 'MFA_AAL2_REQUIRED'
    ));

    process.env.STAFF_MFA_DEV_AAL2 = 'true';
    assert.equal((await requirePrivilegedRequestUser(forged)).id, staff.id);
  } finally {
    delete process.env.SPEAKING_DEV_AUTH_USER_ID;
    delete process.env.STAFF_MFA_DEV_AAL2;
  }
});

test('OAuth-only profile cannot create checkout before onboarding and current policy consent', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { completeAccountOnboarding }, { createCheckoutForProduct }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/account-readiness'),
    import('../../src/lib/payments/payment-service'),
  ]);
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `oauth-only-${randomUUID()}@example.invalid` },
  });

  await assert.rejects(
    createCheckoutForProduct({
      userId: user.id,
      productCode: 'mock-test',
      idempotencyKey: `oauth-${randomUUID()}`,
      locale: 'en',
    }),
    (error: Error & { code?: string }) => error.code === 'ONBOARDING_INCOMPLETE',
  );

  await completeAccountOnboarding({
    userId: user.id,
    name: 'OAuth Learner',
    whatsapp: `+213${Math.floor(100000000 + Math.random() * 900000000)}`,
    wilaya: '31 Oran',
    preferredLocale: 'en',
    termsAccepted: true,
    privacyAccepted: true,
    marketingAccepted: false,
    acceptedFrom: 'database-test',
  });

  const persisted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(persisted.onboardingCompletedAt instanceof Date, true);
  assert.equal(persisted.wilaya, '31 Oran');
  assert.equal(persisted.preferredLocale, 'en');
  assert.equal(await prisma.consentRecord.count({ where: { userId: user.id } }), 2);
});

test('WhatsApp uniqueness collision is explicit and never silently discarded', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { syncApplicationUser }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/request-user'),
  ]);
  const whatsapp = `+213${Math.floor(100000000 + Math.random() * 900000000)}`;
  await prisma.user.create({ data: { id: randomUUID(), whatsapp } });

  await assert.rejects(
    syncApplicationUser({
      id: randomUUID(),
      email: `collision-${randomUUID()}@example.invalid`,
      user_metadata: { whatsapp },
    } as never),
    (error: Error & { code?: string }) => error.code === 'WHATSAPP_ALREADY_IN_USE',
  );
});

test('OAuth-only user can replace a device with an AAL2 step-up and no password', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const [{ default: prisma }, { issueDeviceToken }, { PATCH }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/auth/device-slots'),
    import('../../src/app/api/devices/route'),
  ]);
  const user = await prisma.user.create({
    data: { id: randomUUID(), email: `oauth-device-${randomUUID()}@example.invalid` },
  });
  const issued = issueDeviceToken();
  await prisma.deviceSlot.create({
    data: { userId: user.id, slotNumber: 1, tokenHash: issued.tokenHash, label: 'Old browser' },
  });

  process.env.SPEAKING_DEV_AUTH_USER_ID = user.id;
  process.env.STAFF_MFA_DEV_AAL2 = 'true';
  try {
    const response = await PATCH(new Request('http://127.0.0.1/api/devices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1', Host: '127.0.0.1' },
      body: JSON.stringify({ slotNumber: 1, label: 'New browser', stepUp: { method: 'aal2' } }),
    }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).slot.label, 'New browser');
  } finally {
    delete process.env.SPEAKING_DEV_AUTH_USER_ID;
    delete process.env.STAFF_MFA_DEV_AAL2;
  }
});
