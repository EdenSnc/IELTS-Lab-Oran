# Separate diagnostic readiness

Do not enable this feature using synthetic test fixtures or unverified source
reviews. Ordinary mock/payment/Speaking settings remain unchanged.

## Private capture

`DIAGNOSTIC_RECORDING_ENABLED=false` is the safe default in every environment.
`PRIVATE_DIAGNOSTIC_RECORDING_BUCKET=private-diagnostic-recordings` names a
dedicated private Supabase bucket. No public/authenticated storage policy grants;
only the server service key and owner-scoped, staff+AAL2 application endpoints.
Do not expose service credentials or signed upload links to participants.
Creation verifies the bucket is private. Uploads use immutable, bounded PCM WAV
chunks; the application verifies the bytes, sample duration and SHA-256 again at
finalization. There is no client-controlled storage path or duration.

Before enabling capture: verify explicit adult/participant consent, local secure
microphone access, browser interruption/resume tests, private bucket access,
scheduled cleanup and real cloud deletion retries. Audio is inaccessible at its
30-day deadline even if physical deletion is temporarily unavailable. Withdrawal
blocks new access immediately and creates a deletion tombstone; delayed upload
completion cannot resurrect usable data. Check storage versioning, backups and
provider-side retention separately: application deletion is not a claim of backup
erasure. Physical iOS/Android microphone and interruption checks remain required.

## Optional AI

`DIAGNOSTIC_AI_ENABLED=false` and `DIAGNOSTIC_AI_DATA_USE_APPROVED=false` are the
defaults. Both must be true; participant adult consent is separately enforced.
The owner requires no paid API: do not enable billing, change an API project tier
or silently fall back to a paid model/provider. Free Gemini is permitted only for
material suitable for the applicable terms: Google says not to submit personal,
confidential or sensitive information. Consent is not a waiver of provider terms.
Do not treat real voices as anonymous merely because account names are omitted.
Use an examiner-checked de-identified transcript where appropriate; pronunciation
cannot be assessed from text alone. Human feedback always remains available.
Application deletion does not erase Google safety logs, training use or backups.

Checked official docs on 2026-10-07: Gemini 3.5 Transcribe (recorded files), Gemini
3.5 Transcribe Live and Gemini Live voice currently list free input/output tiers.
Transcribe file processing supports speaker diarization and timestamps; live
transcription does not. Smart transcription can remove fillers, so disable that
for assessment evidence. Exact project/model RPM, TPM and RPD must be read at
https://aistudio.google.com/rate-limit ; no universal numeric quota is guaranteed.
Post-session processing is preferred so 429s cannot interrupt the interview.

The owner's 2026-10-07 quota screenshots show Flash3.8 at5RPM/~250kTPM/20RPD;
Transcribe3.5 at3RPM/~10kTPM/~25RPD; live transcription~20kTPM; live voice~65kTPM.
Graph-derived values are approximate; missing RPM/RPD charts are not unlimited.
Seven minutes at the published Transcribe estimate25audio tokens/sec is~10,500
input tokens, potentially above that10kTPM quota. Do not assume a full-file call
will fit or that splitting eliminates the daily-request cost.

Optional competing APIs checked from official docs on2026-10-07, not integrated:
Groq Whisper free published limits20RPM/2kRPD/7200audio-sec-hour/28800audio-sec-day
(~68 seven-minute recordings/day arithmetic ceiling, excluding retries/otherwork).
Groq exposes ZDR controls to allcustomers; explicit participant consent and actual
account configuration still need verification. Whisper timestamps do not by
themselves identify candidate/examiner turns or establish pronunciation quality.
Cloudflare Workers AI has10kNeurons/day free, not10krequests; eligible models only,
and only an external inference API if chosen, never a change of application host.
Cerebras currently offers a payment-method-backed30day/$5 trial, not a renewing
free tier. OpenRouter free variants have account/provider-specific request caps.
Do not introduce all of them or route to paid variants. Quality requires real
diagnostic calibration, not a model marketing claim or transcription-only bands.
Sources: https://console.groq.com/docs/rate-limits ,
https://console.groq.com/docs/your-data ,
https://developers.cloudflare.com/workers-ai/platform/pricing/ ,
https://inference-docs.cerebras.ai/support/rate-limits .

References: https://ai.google.dev/gemini-api/terms and
https://supabase.com/docs/guides/storage/security/access-control .
No real participant information is sent by automated tests. Examiner approval
is required; no automatic publication or official/full-mock band conversion.

## Recovery and deletion schedule

After content/privacy approval, configure QStash to POST every four hours to
`https://www.ieltslab.org/api/internal/diagnostic/recover` with JSON
`{"version":1,"type":"RECOVER_DIAGNOSTIC_WRITING"}`. This existing signed wake-up
contract now also performs diagnostic retention; it contains no participant data.
Use the existing QSTASH callback/signing variables and exact destination. The
application verifies the bounded exact raw body and signature before doing work.
Do not enable capture without a successful scheduled invocation and storage retry
verification. Cleanup cancels 30-day AI data, clears private notes, expires 90-day
reports and retries deletion tombstones. Its timing never extends read access.
