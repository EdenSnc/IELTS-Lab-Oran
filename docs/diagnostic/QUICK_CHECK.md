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

## Double-click local test

Open `C:\Users\Admin\Documents\IELTS Lab\IELTS-Lab-Oran-diagnostic` in Explorer
and double-click **TEST-READINESS.cmd**. It checks/starts Docker and the existing
isolated test database, sets process-only QA configuration and reuses your existing
local build (or starts development if there is no build). No env commands to paste.

Two Edge windows open automatically, already signed in to separate local roles:
participant intake and teacher workspace. They are isolated browser profiles;
opening the printed URL in your normal browser does not copy their QA login.

1. In the participant window check the headphone/time and contact checkboxes, then
   click **Start the 42-minute screen**. Test actual audio and enter an answer.
2. Wait for **Saved at IELTSLab**, reload and verify the answer remains.
3. In the launcher's black terminal type `reading` and press Enter to preview Reading.
4. Type `writing` and Enter to preview Writing. Enter text and wait for Saved.
5. Type `end` and Enter to submit through the real local state machine. This skips
   local test time only; it does not modify production exam timing or invent answers.
6. In the teacher window open **Local Test Participant**. Try changing Writing
   ratings, adding notes and saving. For Speaking, follow the in-person examiner
   link and click **Start Speaking**; type `speaking-end` in the terminal to finish
   its local clock, then click **Complete Speaking** in the examiner window.
7. Return to the teacher review, set Speaking ratings and notes, save and explicitly
   release. Reload the participant window and verify only the released result appears.
8. Type `quit` and Enter in the terminal to stop both local servers and close the
   test browser. Do this before closing the terminal. Commands never move clocks
   backwards. Keep real personal data out of this local QA instance.

For the automated check from either CMD or PowerShell, run this one command:

```text
"C:\Users\Admin\Documents\IELTS Lab\IELTS-Lab-Oran-diagnostic\TEST-READINESS.cmd" -Automated
```

Because the path has spaces, wrap the script path in double quotes when running
it in CMD; in PowerShell prepend `&` to the quoted path. Double-click needs neither.

The existing harness creates isolated QA users, starts/stops its own production
server, exercises real app/content/database flows and saves screenshots/booklets
under `.superpowers/sdd/PLAN-2026-10-06/readiness-browser`. Its external identity
and AI responses are controlled doubles, not proof of real OAuth/provider delivery.
Do not deploy this test build or reuse these process-only values as real credentials.
The launcher sets test variables in its own child process and leaves `.env` and
the parent terminal unchanged. AI, real authentication/email and payments are not
live-tested by this manual workspace; human assessment remains usable. Real AI
requires the separate deployment/privacy/provider gates above.

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
