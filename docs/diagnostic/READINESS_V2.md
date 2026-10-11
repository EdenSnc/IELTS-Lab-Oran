# Readiness diagnostic, profile 2 / content pack 3

Authority: the complete 9 October 2026 readiness mandate. The older 60-minute
Academic diagnostic remains readable; existing mock tests remain unchanged.

Core: Listening 12 minutes (12 items), Reading 14 minutes (12 items,
Academic or General Training), Writing 16 minutes (160–200 words). A borderline
profile receives a separate nine-minute extension, seven new Listening and five
new Reading items (complete official groups, with explicit score denominators).
Speaking is a separate seven-minute teacher interview.
Official passages, questions, keys and real recordings come from the owner's
already supplied offline IDP/IELTS sample corpus. Writing uses an official prompt
with explicitly shortened timing/length; Speaking and teacher rubrics are IELTSLab
authored. No official band conversion or psychometric validation claim.
The owner has confirmed permissions: record this as user-attested, not independently
verified licensing. Source JSON, answer PDF and original/delivered audio hashes are
preserved. Two GT answer PDFs have swapped filenames; association follows their
actual contents. Reproduce with scripts/import-readiness-samples.mjs and the supplied
corpus. The original pack/audio remain as a fallback, not relabelled as official.

Reuse DiagnosticInvitation, DiagnosticSession, DiagnosticResponse and
DiagnosticAssessment and existing canonical content tables. Add versioned intake,
timing and decision fields, not another commercial attempt or identity system.
Existing account-bound staff invitations remain required: this avoids a second
guest-session security boundary. Email is therefore required by existing identity
infrastructure; diagnostic intake itself asks only name, phone, pathway, target,
timeframe and contact permission. Unsure candidates receive a provisional Academic
screen and cannot receive an automatic final READY decision without pathway review.

Writing supports Gemini-assisted 0/1/2 ratings against the frozen 16-minute rubric,
using the existing durable DiagnosticWritingRun/QStash worker. Participant consent
and configured AI availability are required. Teachers explicitly apply the private
draft, edit ratings/notes, save, and release; workers never overwrite human grades.
Speaking AI supplies private, examiner-checked drafts for fluency/coherence,
vocabulary and grammar only. Unreliable/insufficient audio returns unassessed
criteria. Pronunciation is always teacher-rated in person, never inferred from
the transcript. Teachers may edit every final rating before explicit release.
Manual productive ratings and teacher decision are authoritative. Initial
objective thresholds are conservative screening heuristics, not calibrated
psychometrics. Failed/weak productive evidence prevents automatic READY. Staff
may override with a recorded reason. Cohort is a plain staff-controlled tag.

Print uses the identical pack; answer keys and examiner pack require staff/AAL2.
No cloud configuration, production database or deployment is changed until the
complete release passes validation. Preserve earlier microphone/AI WIP; AI stays off.
