# Scoring and content contract

- Published `TestVersion` rows are immutable; corrections create a new version.
- Learner clients never receive answer keys. Keys are encrypted at rest and
  decrypted only in server grading code.
- New keys use the `v2:key-id:iv:tag:ciphertext` envelope. Legacy v1 payloads
  remain readable during rotation.
- Objective scoring is a pure deterministic boundary. Per-item alternatives
  remain arrays; unordered groups accept permutations without duplicate credit.
- Listening and Reading bands come from published `BandScale` rows, not code.
- Complete mocks must certify four Listening parts/40 marks, three Reading
  parts/40 marks, two Writing tasks, three Speaking parts, and verified source
  provenance.
- Raw word-limit instructions are parsed during content validation. Ambiguous
  instructions fail closed and are never interpreted during a live attempt.

The certification suite protects 40/40, 0/40, each single-item delta,
normalisation, unordered groups, key rotation, threshold validation, and 10,000
deterministic property cases (seed `20260818`). The configured live-fixture test
derives answers at runtime and never commits private keys or answer content.
