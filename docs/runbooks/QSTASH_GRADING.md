# QStash writing-grading runbook

## Runtime configuration

- `QSTASH_TOKEN` publishes jobs.
- `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` verify delivery during key rotation.
- `QSTASH_CALLBACK_BASE_URL` is the externally reachable application origin. Production is `https://www.ieltslab.org`.
- `GEMINI_API_KEY`, `GEMINI_WRITING_MODELS`, and `GEMINI_WRITING_PASSES` are server-only grading configuration.

Consumers are `POST /api/internal/grading/writing` and `POST /api/internal/grading/recover`. They verify the QStash signature against the exact raw body and exact destination URL before parsing. Messages contain only a version, job type, and internal grading-run ID.

## Durable state and recovery

`GradingRun` is the durable work record; QStash is delivery only. Submission commits a `QUEUED` run before publish. A publish failure leaves the run recoverable. The worker claims a bounded lease, loads authoritative database content, performs provider work outside a transaction, and commits criterion scores, canonical Writing score, provenance, and completion state together.

Schedule the recovery endpoint through QStash with the minimal body:

```json
{"version":1,"type":"RECOVER_WRITING_GRADING"}
```

A five-minute cadence is suitable for the current recovery window. Recovery returns expired `RUNNING` leases to `QUEUED` and republishes stale queued work. Duplicate or late delivery of a succeeded/superseded run is a 2xx no-op. Do not manually replay a job more frequently than the queue suppression window.

## Incident checks

1. Inspect `GradingRun.status`, `runAttempt`, lease fields, `lastEnqueuedAt`, and `lastEnqueueError`.
2. Confirm QStash destination and signing keys use the same production URL.
3. For transient provider or delivery outages, leave the run queued and invoke the signed recovery job.
4. For `FAILED`, inspect its terminal `errorCode` and immutable input/rubric identity before deciding whether a new grading run is warranted.
5. Never recalculate or overwrite an existing canonical `AttemptSkillScore`; successful duplicate workers must converge to the stored result.
