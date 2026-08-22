# Production launch

This checklist is a release gate, not a deployment script. Supabase SQL files in
`supabase/migrations/` are the only database migration authority. Never run
`prisma db push`, `supabase db reset --linked`, or a reconstruction baseline
against a populated project.

## 1. Provider and account gates

- Use a Vercel Pro or Enterprise team for commercial production; Hobby is
  restricted to non-commercial personal use. Confirm spend limits and alerts.
- Enable MFA for the Vercel, Supabase, GitHub, Chargily, Upstash, Google AI, and
  LiveKit operator accounts. Privileged application staff access is blocked
  until a TOTP enrollment/challenge flow and server-side `aal2` enforcement are
  in service.
- In Supabase, review Security Advisor, enable SSL enforcement and appropriate
  network restrictions, configure a production SMTP provider, enable email
  confirmation, and review Auth rate limits/CAPTCHA.
- Confirm production database backup retention. Restore a fresh backup into a
  separate non-production project and run the database test suite against it.

References: [Vercel plans](https://vercel.com/docs/plans), [Vercel Hobby
restriction](https://vercel.com/docs/plans/hobby), [Supabase production
checklist](https://supabase.com/docs/guides/deployment/going-into-prod), and
[Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

## 2. Database release

1. Take and retain a fresh schema-only dump and a restorable data backup.
2. Compare `supabase migration list --linked` with `supabase/migrations/`.
3. Review every pending SQL file. The `20260813000000` reconstruction baseline
   is historical reconciliation and must already be marked applied on a live
   database that contains its schema; do not execute it over that schema.
4. Re-run `supabase db reset --local --no-seed` and
   `supabase db lint --local --schema app_private --level warning --fail-on error`.
5. Apply only reviewed pending migrations with `supabase db push --linked`.
6. Re-run `npm run test:database` against a disposable database, never against
   production.

No Phase 1-4 migration in this branch has been applied to production by this
worktree. Deploying application code before the pending migrations is unsafe.

## 3. Production environment

Set the placeholders documented in `.env.example` in Vercel Production. Keep
all values server-only except the explicitly named `NEXT_PUBLIC_*` values.

- App/database: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `DIRECT_URL`.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `PRIVATE_TEST_ASSET_BUCKET`.
- Answer keys: legacy `ENCRYPTION_KEY` while legacy rows exist, plus
  `ANSWER_KEY_ENCRYPTION_KEYS` and `ANSWER_KEY_ACTIVE_KEY_ID` for v2 writes.
- Payments: `CHARGILY_MODE=live`, `CHARGILY_SECRET_KEY`, and
  `PAYMENT_CALLBACK_BASE_URL=https://www.ieltslab.org`.
- Jobs/AI: `QSTASH_TOKEN`, both QStash signing keys,
  `QSTASH_CALLBACK_BASE_URL=https://www.ieltslab.org`, `GEMINI_API_KEY`, and the
  reviewed model/pass settings.
- Speaking: all `SPEAKING_*`, `LIVEKIT_*`, private recording bucket, and S3
  credential variables in `.env.example`. Keep stored video disabled unless the
  consent, retention, and storage policy explicitly covers it.

In Supabase Auth set Site URL to `https://www.ieltslab.org` and allow
`https://www.ieltslab.org/api/auth/callback`. Retain the exact localhost callback
needed for development. Configure the production SMTP sender and templates;
disable provider link tracking that mutates confirmation links.

## 4. External callbacks and private storage

- Chargily Pay V2: register
  `https://www.ieltslab.org/api/payments/webhooks/chargily`; perform a real
  low-value live checkout and prove one entitlement for repeated delivery of the
  same signed event. A redirect never proves payment.
- QStash: schedule a signed POST at least every five minutes to
  `/api/internal/grading/recover` with JSON
  `{"version":1,"type":"RECOVER_WRITING_GRADING"}`. Confirm current and next
  signing keys, retry behavior, and flow-control limits. QStash messages contain
  only internal IDs.
- LiveKit: register `/api/speaking/webhooks/livekit`; validate HTTPS/WSS CSP
  connectivity and raw-body webhook verification. Confirm egress writes only to
  the private recording bucket.
- Supabase Storage: create the two private buckets named by the environment.
  Do not add public read policies. Verify signed/authorized application access
  and expiry from separate learner and examiner accounts.
- Gemini: keep structured JSON output plus local schema/grounding validation.
  Candidate essays and transcripts remain untrusted prompt data.

References: [Chargily webhooks](https://dev.chargily.com/pay-v2/webhooks),
[QStash receiver verification](https://upstash.com/docs/qstash/sdks/ts/examples/receiver),
[LiveKit webhook validation](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/),
and [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

## 5. Release validation

Run from a clean commit:

```text
npm ci
npx prisma generate
npm run db:validate
npm run lint
npm run typecheck
npm test
npm run test:database
npm run test:delivery
npm run test:speaking
npm run build
npm audit --omit=dev --omit=optional
```

`test:delivery` must use the configured private certified fixture and its
answer-key encryption keys. Do not replace that gate with synthetic content.
The full development audit currently reports `GHSA-ggr8-5vv4-36mx` through the
Prisma CLI configuration dependency. The production dependency audit above is
clean; do not use the suggested forced Prisma 6 downgrade.

Before opening sales, test two real browsers/devices: enroll two slots, reject a
third, replace after the configured cooldown, create and resume an attempt,
autosave through refresh/network interruption, enforce the strict timer and one
Listening playback, submit once, preserve the stored result across refresh,
complete Writing retry/recovery, and complete Speaking booking/consent/call/
recording/human-final-score. Verify cross-user IDs return 403/404 and never leak
answer keys, examiner identity, recordings, prices, or scores.

## 6. Rollback

- Stop new checkout/attempt creation before rollback; do not revoke existing
  entitlements or recalculate stored scores.
- Roll back application deployment only to code compatible with the applied
  schema. Supabase migrations are forward-only; restore into a separate project
  before any destructive recovery decision.
- Keep `GradingRun`, `PaymentAttempt`/`PaymentEvent`, and `SpeakingRecording`
  durable rows. Re-run signed recovery/reconciliation instead of deleting jobs.
