import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test('local Supabase signup/login maps idempotently to an unprivileged application user', {
  skip: databaseUrl && supabaseUrl && publishableKey
    ? false
    : 'local database and Supabase public auth configuration are required',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  const { requireRequestUser } = await import('../../src/lib/auth/request-user');
  const client = createClient(supabaseUrl as string, publishableKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `auth-${randomUUID()}@example.invalid`;
  const password = `Valid-${randomUUID()}-Password`;
  const signup = await client.auth.signUp({
    email,
    password,
    options: { data: { role: 'ADMIN', full_name: 'Integration Learner' } },
  });
  assert.ifError(signup.error);
  assert.ok(signup.data.session?.access_token);

  const request = new Request('http://127.0.0.1/api/account', {
    headers: { Authorization: `Bearer ${signup.data.session.access_token}` },
  });
  const mapped = await requireRequestUser(request);
  assert.equal(mapped.id, signup.data.user?.id);
  assert.equal(mapped.role, 'STUDENT', 'browser metadata must never assign a privileged role');
  assert.equal(mapped.name, 'Integration Learner');

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
