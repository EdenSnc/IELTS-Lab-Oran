# Quick readiness check

These routes belong to `codex/short-diagnostic`, not a claim that Production has
released the feature. The release is gated on reconciling the previously detected
live migration history mismatch; do not reset Production or mark its migrations
reverted to bypass that gate. The older paid mock remains separate.

## Check it yourself

1. On the correctly configured running diagnostic build, open
   `/en/diagnostic/staff/readiness`. Sign in as real staff and complete MFA (AAL2).
2. Review the candidate/examiner print booklets and actual audio, then use
   **Activate reviewed content** only if you approve the source questions and keys.
3. Create an invitation for an existing participant account. In a separate browser
   profile, sign in to that account and open `/en/diagnostic/readiness`.
4. Check intake, Academic/GT selection, target and contact consent. Start, enter an
   answer and wait for **Saved at IELTSLab**. Reload: the answer and original timer
   must remain. Another account must not access the copied session URL.
5. Disconnect briefly: edits must show **Not yet saved**. Reconnect and wait for
   acknowledgement. Do not close the tab before acknowledgement. Sections are
   12/14/16 minutes; extra Listening/Reading is conditional, not always appended.
6. Submit Writing. On the submitted page opt in to the displayed AI provider only
   with suitable content/terms. Refusing must retain human-only assessment.
7. Staff open the participant row, request Writing suggestions and check status.
   Apply the editable draft, change a rating, save, then release. The participant
   must not see an unreleased private AI draft.
8. For in-person Speaking, open the assigned examiner screen. Microphone preflight
   must not start the interview. Consent, Start, then use the fixed seven-minute
   sequence. AI suggests three readiness ratings; the teacher assesses pronunciation
   and checks audio/speaker attribution. Human-only assessment must still work.
9. Repeat the start/read/report screens under `/fr/` and `/ar/`, including narrow
   mobile/RTL and keyboard navigation. English IELTS stimuli deliberately stay English.

For a **quick automated rehearsal without real users, charges or AI API calls**,
the local isolated diagnostic DB must be running on port 55322. From PowerShell:

```powershell
cd "C:\Users\Admin\Documents\IELTS Lab\IELTS-Lab-Oran-diagnostic"
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55322/postgres"
$env:NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:55621"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="diagnostic-local-test-key-only"
$env:SUPABASE_SERVICE_ROLE_KEY="diagnostic-storage-test-key-only"
$env:ENCRYPTION_KEY="11" * 32
npm run build
node --conditions=react-server --import tsx tests/browser/readiness-flow.mjs "C:/Users/Admin/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs"
```

The existing harness creates isolated QA users, starts/stops its own production
server, exercises real app/content/database flows and saves screenshots/booklets
under `.superpowers/sdd/PLAN-2026-10-06/readiness-browser`. Its external identity
and AI responses are controlled doubles, not proof of real OAuth/provider delivery.
Do not deploy this test build or reuse these process-only values as real credentials.
Open a fresh PowerShell window afterwards to avoid carrying test overrides into
normal commands. The cached Playwright path is this machine's verified location;
use the installed module location if it changes.

## Verify QStash delivery, not just installation

After release gates pass, run one consented staff-requested AI job. Upstash Console
→ QStash → Logs: confirm the exact Writing/Speaking endpoint, a 2xx response and
the same run ID. The app must show a completed draft, not simply a published message.
Replay a completed message: it must be a no-op, not a second AI call/result.
Verify the signed four-hour recovery schedule from OPERATIONS.md returns 2xx;
its body contains only version/type, never essays or audio. Review retry/DLQ usage
against the account's actual 500/1,000 limit. Do not send guessed unsigned test
requests and interpret their expected 403 as a delivery failure.

## High-value AI uses, in priority order

- **Implemented:** evidence-linked Writing and post-session Speaking drafts, editable
  by a teacher. Objective answer scoring stays deterministic, not AI-based.
- **Next best:** a short study plan drawn from released weaknesses and a curated
  resource catalogue; grounded citations and bounded weekly tasks, not generic chat.
- **Useful with review:** explain an incorrect released practice answer using the
  approved key/rationale; never reveal commercial exam answers before submission.
- **Useful with boundaries:** opt-in Writing revision comparison and focused vocabulary
  exercises, labelled as practice rather than predicting an official band.
- **Staff efficiency:** draft feedback translations and intake summaries without
  changing evidence, inventing admissions decisions or sending contact details.
- **Not selected:** live AI examiner, always-on tutor, AI-generated answer keys,
  autonomous admission/payment decisions or pronunciation grades from transcripts.

Retention comes from saved progress, clear next steps and useful released feedback,
not fake streaks or intrusive notifications. The refined readiness UI uses ergonomic
grouping, generous whitespace, rounded targets, clear save/error states and optional
glass navigation with opaque reading surfaces. These are usability improvements;
an actual retention uplift requires measuring repeat use, not declaring a percentage.
