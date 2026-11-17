# End-to-End Verification and Surgical Repair Design

## Objective

Verify the complete IELTS Lab Oran experience across browser, API, database,
external-service boundaries, and responsive layouts. Reproduce each defect,
protect it with an executable regression test, repair the root cause, and make
only evidence-backed UI/UX improvements that preserve the established brand.

## Safety boundaries

- Use local Supabase/PostgreSQL fixtures for state-changing tests.
- Use Chargily test mode only; never initiate a real charge.
- Treat production checks as read-only unless a separately validated release is
  explicitly deployed.
- Never expose answer keys, private assets, payment secrets, service-role keys,
  recordings, or user data.
- Preserve canonical `.org` SEO behavior, locale routing, CSP/LiveKit access,
  durable scores, existing attempts, and unrelated working behavior.
- Do not change presentation merely for novelty. A UI change requires an
  observed workflow problem and responsive verification.

## Execution order

### 1. Routing and failure semantics

Correct non-localized application routing so `/sample` and privileged staff
routes reach their real route trees, while unmatched paths use Next.js global
not-found handling with HTTP 404 and `noindex`. Preserve `/ -> /en`, localized
routes, API routes, test routes, and x-default alternate headers.

Regression coverage must distinguish valid non-localized routes from unknown
routes and verify status, metadata, and redirect behavior at runtime.

### 2. Public acquisition and identity

Walk localized landing pages, articles, intake, sign-up, sign-in, email
confirmation, OAuth, password recovery, logout, onboarding, policy consent,
account status, and language transitions. Verify browser-to-Supabase-to-Prisma
identity synchronization and safe session cookies. Exercise failure states,
duplicate WhatsApp handling, incomplete onboarding, and provider availability.

### 3. Device trust and commercial access

Verify first paid-device enrollment, two-slot enforcement, recent step-up,
replacement cooldown, logout/session interaction, and clear account status.
Then exercise product discovery, one unresolved checkout, Chargily test checkout,
signed webhook replay, pending/paid/failed/refunded states, entitlement creation,
receipt access, access codes, reconciliation, and maintenance switches.

### 4. Mock-test delivery

Exercise test selection, attempt reservation/resume/release, private assets,
image preloading, Listening one-play audio, audio shutdown, Reading and Listening
selection/highlighting/notes, drag-and-drop mouse and touch behavior, Writing
input/keyboard behavior, responsive split panes, timer/cutoff, fullscreen,
autosave, refresh recovery, submission, objective scoring, Writing grading,
stored results, and explicit reset behavior.

Existing scores and answers must never be recalculated or cleared except through
the intentional reset operation.

### 5. Speaking and staff operations

Exercise learner booking using pooled available dates/slots, in-centre versus
online delivery, cancellation, consent, join timing, LiveKit authorization,
session state transitions, examiner scoring, results, recording privacy,
examiner availability bulk operations, AAL2 enforcement, and staff recovery
actions. Candidate views must never expose examiner identities.

### 6. Responsive UX, accessibility, and resilience

Test representative desktop, Android-sized, and iOS-sized viewports; keyboard,
touch, mouse, zoom, and reduced-motion paths. Inspect overflow, focus order,
labels, contrast, sticky controls, loading/empty/error states, and accidental
scroll jumps. Apply minimal brand-consistent changes only where the workflow
evidence demonstrates a defect.

### 7. Release verification

Run Prisma generation/validation, migration-from-scratch checks, lint,
typecheck, unit/certification/database/integration/smoke suites, production
build, and local production-server browser verification. Re-run a targeted
read-only production matrix for public, private, SEO, favicon, and 404 routes.
Review the complete diff for scope, secrets, security boundaries, and visible
regressions before any release action.

## Defect workflow

For each failure:

1. Record exact reproduction and failing boundary.
2. Trace the data/state path to the root cause.
3. Add the smallest behavior-level test and confirm it fails for that cause.
4. Implement one minimal repair and confirm the test passes.
5. Run adjacent regression tests and browser verification.
6. Keep the repair separate from unrelated improvements.

## Current verified baseline

- Lint and typecheck pass.
- Unit and certification suites pass with the required public environment.
- Seventeen local database workflow tests pass against local Supabase.
- Speaking domain smoke passes.
- Production exposes no 5xx across the sampled public/auth/test entry routes.
- `/sample` and `/staff/operations` currently render the global 404 UI with
  HTTP 200.
- Unknown global routes currently render the 404 UI with HTTP 200 and omit
  `noindex`; localized unknown routes correctly return HTTP 404 with `noindex`.
- The delivery-content smoke requires a populated delivery fixture unavailable
  in the current local database; the local production-env snapshot is not a
  usable database connection and will not be treated as production truth.
- Several database tests emit a `pg` concurrent-query deprecation warning; this
  requires root-cause analysis before any code change.

## Completion criteria

Every in-scope workflow has evidence at each applicable UI/API/data boundary,
every repaired defect has regression coverage, all applicable validation gates
pass, the production build succeeds, no real payment is made, and the final diff
contains no unrelated behavior or design changes.
