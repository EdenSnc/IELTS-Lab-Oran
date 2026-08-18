# Live Speaking component

Speaking is isolated under `/speaking`; its media SDK is not imported by Listening, Reading, Writing, or the public site. The learner books a human-examiner appointment, completes a microphone-first preflight, consents to recording, and joins a two-person room. The examiner controls Parts 1–3, timing, notes, and timestamped evidence.

## Production services

- **RTC:** LiveKit. Server-generated room tokens are short-lived, room-scoped, participant-scoped, and limited to camera/microphone publication. Adaptive stream and dynacast lower video bandwidth; 360p/15fps is the default. Audio remains enabled when camera access fails.
- **Recording:** LiveKit Track Egress starts when each microphone track is published. Candidate and examiner audio are written separately through an S3-compatible private bucket. Stored video remains off by default.
- **Storage:** the existing server-only Supabase storage boundary streams private recordings with range support. No permanent public recording URL is returned.
- **Analysis:** the existing server-side generation integration receives candidate audio or a supplied transcript only after the provisional human scores are persisted. The model input deliberately excludes human scores. Output is schema-validated, evidence is checked against candidate transcript timestamps, and failures never prevent manual final scoring.
- **Database:** all tables remain in `app_private`. Next.js/Prisma is the authorization boundary. A GiST exclusion constraint is the final concurrency guard against overlapping examiner appointments.

## Setup

Supabase gives every project both a human-readable **name** (for example, `IELTS Lab Oran`) and an immutable random **project reference** (for example, the subdomain in `https://PROJECT_REF.supabase.co`). They are not expected to match. Confirm the reference shown in **Supabase Dashboard → Project Settings → General → Reference ID** matches `NEXT_PUBLIC_SUPABASE_URL` before migrating.

1. Apply the migrations under `supabase/migrations` with `supabase db push`. The configured database uses project reference `yncsiqqataiimwsjgpib`.
2. In Supabase Storage create the private bucket named by `PRIVATE_SPEAKING_RECORDING_BUCKET`. Create S3 access credentials scoped to that bucket and add the endpoint/access variables from `.env.example` to Vercel.
3. Create a LiveKit project. Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to Vercel. Configure its webhook URL as `https://YOUR_DOMAIN/api/speaking/webhooks/livekit` for room, participant, track, and egress events.
4. Add the Speaking feature/config variables and `GEMINI_SPEAKING_MODEL`. Never expose service, RTC, or S3 secrets as `NEXT_PUBLIC_*`.
5. Ensure Supabase Auth access tokens reach same-origin API calls. The client recognizes the existing Supabase browser session and the `ielts-access-token` key. `SPEAKING_DEV_AUTH_USER_ID` is accepted only outside production.
6. Create/sign in to a Supabase Auth account and ensure it has a matching active row in `app_private."User"`. Give the examiner account `TEACHER` or `ADMIN`, then open `/speaking/examiner` to publish weekly windows and date overrides. Learners need `STUDENT`.

The examiner dashboard at `/speaking/examiner` is where examiners publish recurring windows and date overrides. Each window is either online or in-centre and is divided into fixed 20-minute slots between 10:00 and 20:00; 19:40 is the final start time. The dashboard also lists upcoming/today/review/all appointments, opens the appropriate live or review screen, saves private notes, and supports cancellation. Admins can manage availability for any active examiner.

Learners choose only online/in-centre, day, and an available pooled time. Examiner records and identifiers are never returned by candidate APIs or real-time participant identities. The server privately assigns an available examiner when the learner confirms. In-centre bookings display the configured centre details and do not expose an online room.

## Lifecycle

`READY → LIVE_PART_1 → LIVE_PART_2 → LIVE_PART_3 → ENDED → AWAITING_HUMAN_SCORE → AI_PROCESSING/READY_FOR_REVIEW → FINALIZED`

The examiner may end early from any live part. A provisional four-criterion assessment is required before analysis is revealed. Publishing the final human score creates the final HUMAN grading run and only upserts the Speaking component score. Existing LRW component scores are not recalculated. Overall result release occurs only when all four stored component scores exist.

## Operational notes

- Recording consent is versioned in both `ConsentRecord` and `SpeakingSession`.
- Track webhook claiming and provider callback IDs are idempotent.
- Delayed/failed recordings remain visible while human scoring continues.
- Final diagnostic priorities are database- and API-limited to three and are selected by the human examiner; suggestions are never silently published.
- Persistent video can be added behind `SPEAKING_STORED_VIDEO_ENABLED`; it is intentionally not started in this version.
- Retention deletion is modeled/configured, but an automated purge job is not included yet.

## Manual smoke test

1. Sign in as examiner, open `/speaking/examiner`, and save a weekly window.
2. Sign in as learner, open `/speaking?attemptId=ATTEMPT_UUID`, choose online or in-centre, then choose a day and pooled slot.
3. Open the appointment, run microphone/camera/output checks, consent, and join.
4. Examiner opens `/speaking/examiner/SESSION_UUID`, starts Parts 1–3, marks evidence, and ends.
5. Confirm two private audio artifacts become `READY` in the review page.
6. Examiner locks provisional bands, runs analysis, reviews timestamped evidence, and publishes the final human score.
7. Learner calls `/api/speaking/results/ATTEMPT_UUID`; the full overall band is returned only after all four component scores exist.
