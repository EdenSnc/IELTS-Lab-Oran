# Randomisation & Commercial Attempt Grading Contract

## Status in Batch 1 / Correction Candidate: NOT_IMPLEMENTED

Randomised test assembly and authenticated commercial attempt grading are intentionally deferred to Batch 2.

## Future Architecture Specification & Invariant Contract

When randomised test assembly is implemented, attempt evaluation must strictly adhere to the following contract:

1. **Attempt Identity & Manifest Immutability:**
   - Commercial/randomised grading must use:
     `AssessmentAttempt -> immutable AttemptManifest -> AttemptQuestion -> persisted Response -> stable Question identity -> VERIFIED AnswerKey`
   - It must **NEVER** grade a randomised attempt merely by `TestVersion + original Question.sourceNumber`.

2. **Assembly Invariants:**
   - A generated `AttemptManifest` must contain no duplicate `Question` records.
   - The candidate's `questionNumber` sequence must be contiguous with no gaps or duplicates.
   - Preserved option presentation order and option shuffle seeds must be stored immutably in `presentedOptions`.
   - `maxMarksSnapshot` must be locked at generation time.
   - Audio tracks, reading passages, and instructions must remain bound to their respective `QuestionGroup`.

3. **Determinism:**
   - Graded from the persisted `AttemptManifest`, the exact same responses must always produce identical marks and subscores.
