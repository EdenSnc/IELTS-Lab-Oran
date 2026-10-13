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

Readiness profile 2 uses the same writing queue and consent controls, with a
separate 16-minute rubric/prompt version. Staff request suggestions at
`/[locale]/diagnostic/staff/readiness/[sessionId]`, check status, explicitly apply
the editable draft, then modify/save ratings and release. The participant grants
Writing consent on their submitted readiness page. Only teacher-approved internal
ratings are released; the AI run ID and private analysis are not learner data.

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

The default implementation is direct **post-session Gemini 3.5 Flash-Lite**:
one audio request produces a private transcript and advisory observations. No
Live API, separate transcription account or paid fallback is needed. Official
model documentation confirms audio input and structured output; Live is not
supported by this model. `DIAGNOSTIC_SPEAKING_MODEL` and
`DIAGNOSTIC_WRITING_MODEL` default to `gemini-3.5-flash-lite` and are isolated
from the ordinary mock's `GEMINI_WRITING_MODELS`. They use the existing
server-only `GEMINI_API_KEY`; do not create a second key or enable billing.
The owner's latest Flash-Lite screenshot shows approximately 15 RPM,
250k input TPM and 500 RPD. Both diagnostic queues share a conservative
10-request/minute delivery flow. Other project activity, token limits and
retries still reduce capacity; 500 RPD is not a guaranteed participant count.
Reference: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite .

Recording preflight does not start the interview or upload audio. After Start,
only acknowledged immutable PCM chunks count as saved. Closing/reloading loses
unsent in-memory audio; a contiguous acknowledged prefix can be finalized, but
capture is never restarted into the same recording. Partial audio must be
reviewed as partial evidence. Every transcript speaker assignment requires an
examiner's audio review before applying suggestions. Correcting evidence to
EXAMINER/UNCERTAIN invalidates that feedback; use human-only feedback instead.
Applying suggestions does not save or publish an assessment. Private AI output
and speaker review expire with the recording's 30-day window; released human
feedback retains its separate 90-day access window.

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
contract now also performs diagnostic retention and Speaking recovery; it contains no participant data.
Use the existing QSTASH callback/signing variables and exact destination. The
application verifies the bounded exact raw body and signature before doing work.
Do not enable capture without a successful scheduled invocation and storage retry
verification. Cleanup cancels 30-day AI data, clears private notes, expires 90-day
reports and retries deletion tombstones. Its timing never extends read access.

## Provider switch and cost controls

Readiness Writing defaults to `DIAGNOSTIC_WRITING_PROVIDER=gemini`. To switch,
set `DIAGNOSTIC_WRITING_PROVIDER=deepseek`,
`DIAGNOSTIC_DEEPSEEK_MODEL=deepseek-flash` and server-only `DEEPSEEK_API_KEY`.
Redeploy; participants must explicitly consent to DeepSeek before new requests.
Prior Google consent is not transferable. Existing Writing runs are not relabelled
as a different provider; input hashes separate providers. No automatic fallback,
new API subscription, top-up or billing activation occurs. DeepSeek is metered,
not an assured free API. A quota failure leaves human review available; configuration
and empty-balance failures stop rather than repeatedly spending requests.
Speaking audio remains Gemini: the selected DeepSeek API is not an audio
transcription replacement. Pronunciation remains an examiner rating. The older
diagnostic and commercial mock do not inherit this readiness provider switch.

One bounded request per run; successful runs are reused. Writing output is capped
at 3,000 tokens, HTTP responses at 64 KiB, provider timeout at 45 seconds. Strict
schema and exact quotation validation still run before any teacher uses the draft.
Do not reduce rubric quality by silently truncating essays or evidence. Calibrate
provider changes against teacher-reviewed examples before using them for real
participants; switching providers alone is not evidence of equivalent quality.

QStash remains the wake-up/retry transport; PostgreSQL owns durable state. Keeping
only DB rows would require another reliable scheduler/worker, retry/backoff and
monitoring. DB+cron is possible but is not a simpler like-for-like replacement here.
Upstash public pricing checked 2026-10-11 lists 1,000 delivery attempts/day free;
if this account's console says 500, operate within 500. Retries and schedules count.
Six four-hour recovery invocations/day plus two first-delivery AI jobs/participant
would allow about 247 participants/day at 500 attempts, before retries, other jobs
and Gemini limits. This is arithmetic, not guaranteed capacity. Confirm the actual
account plan; never upgrade it automatically. Official references:
https://upstash.com/pricing/qstash ,
https://api-docs.deepseek.com/quick_start/pricing/ ,
https://api-docs.deepseek.com/guides/json_mode/ .

## Environment locations

No QStash-specific environment file is required. For local work, use the existing
ignored `.env` in the checkout actually being run; standalone scripts already
using dotenv load that file. Do not overwrite another checkout's secrets or commit
them. `.env.example` is documentation, not the live credentials file. Next.js local
override files, if present, take precedence over `.env`; check those before changing
a value that appears ineffective.

For deployment, use Vercel project `ielts-lab-oran` → Settings → Environment Variables.
`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`,
`GEMINI_API_KEY` and optional `DEEPSEEK_API_KEY` are Secrets, never NEXT_PUBLIC.
Production `QSTASH_CALLBACK_BASE_URL=https://www.ieltslab.org`; Preview requires
its own accessible deployment origin and isolated database/storage. Scope Preview
diagnostic flags to `codex/short-diagnostic` while validating. A protected Preview
needs an explicitly configured delivery bypass; do not disable project protection.
Do not let Preview callbacks target Production. The integration-provided QSTASH_URL
is not the application callback origin. Development values are only needed for
real local provider tests; localhost is not publicly reachable by QStash without
a deliberately configured local development transport/tunnel.

`DIAGNOSTIC_WRITING_PROVIDER`, `DIAGNOSTIC_WRITING_MODEL`,
`DIAGNOSTIC_DEEPSEEK_MODEL`, `DIAGNOSTIC_SPEAKING_MODEL`,
`PRIVATE_DIAGNOSTIC_RECORDING_BUCKET` and QSTASH_CALLBACK_BASE_URL are Config values.
Keep `DIAGNOSTIC_AI_ENABLED`, `DIAGNOSTIC_AI_DATA_USE_APPROVED` and
`DIAGNOSTIC_RECORDING_ENABLED` false until their documented content/privacy/storage
gates pass. They are not substitutes for participant consent. Env changes require
a new deployment and local process restart; never send secrets in chat or screenshots.
