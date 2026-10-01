# ADR 0365 — Current 9d0a4ba Core Rollback Freeze V2 Refresh V1

Date: 2026-10-01

Status: **EXECUTED / GREEN / CURRENT-BASELINE ROLLBACK FREEZE V2 READY / NO CUSTOMER EFFECT**

## Objective

Refresh the existing Rollback Freeze V2 mechanism for the currently live Core revision `9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`, preserving all existing provider and operational authority boundaries, and complete exactly one current-baseline persistent capture before any later supervised Ana Fast Read.

ADR 0168 remains binding. This slice reuses the existing Rollback Freeze V2 implementation and does not create a new backup subsystem, lifecycle, provider registry, state machine, service, database table, migration or execution authority.

## REAL NOW

Qualified source head before deployment/execution:

- PR #369 head = `7279e643ae1ffff4357b4e2400f035a5f118563a`;
- exact-head workflows = **17/17 GREEN**, zero failures.

Current production baseline:

- Core image = `wandora/core:organization-adapter-candidate-9d0a4ba577fe`;
- Core image id = `sha256:3ae9e4eae1949cc9da7e191cea841e1564d1a1577385f994991561c49c715e7d`;
- Core revision = `9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`;
- Core healthy, restart count 0;
- exact 14-file gates-OFF Compose provenance;
- Paperclip `wandora/paperclip:v2026.916.1`, healthy;
- Messaging Gateway healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Fast Read OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway outbound OFF.

ADR 0362 remained valid historical rollback evidence for the prior `f279acc...` Core baseline but was not current for the promoted Core.

## Requalification and reuse gate

The existing Rollback Freeze V2 helper was intentionally byte-pinned to the prior f279acc Core identity, so running it unchanged would fail closed against the new live Core.

The reuse decision was to repin only the existing mechanism:

- current Core image/tag/id/revision;
- unique receipt path;
- unique rollback-root prefix;
- unique disposable restore container namespace;
- matching static verifier expectations;
- matching zero-argument wrapper helper blob pins.

The backup/restore algorithm, provider custody checks, Task Drain checks, gates-OFF checks, Paperclip/OA/Mastra checks, PostgreSQL 18.1 backup/restore proof and receipt semantics were not changed.

Second adversarial review returned `proceed_fast` for this narrow code-only repin after confirming no new capability or authority was introduced.

## Qualified source identities

Final qualified program blobs:

- helper `scripts/operations/production-rollback-freeze-v2.sh`:
  `dced46d7ac9a6b2fd2a936c2a7d0f029273c41cc`;
- managed-admin precheck wrapper:
  `a25904eb5e7018568741be0b31f59839a82e8e6a`;
- managed-admin capture wrapper:
  `41cdc1fed738deaf96e6b2dec9777d46d0eb8fb8`.

The Semantic Fast Read CI contained two distinct historical/current rollback static checks. A stale edit initially contaminated the historical ADR 0299 V1 helper qualification; the exact known-green ADR 0299 block was restored, while the ADR 0309 V2 qualification alone was updated for the current 9d0a4ba contract. The resulting source head completed 17/17 GREEN.

## Exact-byte host deployment

Staged helper/wrappers were proven to match their qualified Git blobs.

Fresh root `git hash-object --no-filters` proved the live files still contained the prior ADR 0360 bytes:

- helper `31742060143e8ff7c86a9753045400364b98c9c9`;
- precheck wrapper `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- capture wrapper `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`.

A reviewed, human-approved exact-byte installation then replaced only the three existing canonical program files:

- `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` as `root:root 0750`;
- `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` as `root:root 0755`;
- `/usr/local/sbin/wandora-rollback-freeze-v2-capture` as `root:root 0755`.

Post-install root hashes matched exactly:

- helper = `dced46d7ac9a6b2fd2a936c2a7d0f029273c41cc`;
- precheck = `a25904eb5e7018568741be0b31f59839a82e8e6a`;
- capture = `41cdc1fed738deaf96e6b2dec9777d46d0eb8fb8`.

No precheck/capture occurred during the install actions.

## Root precheck execution

Fresh preflight proved:

- current Core exact identity and 14-file provenance;
- Core/Paperclip/Gateway healthy;
- Task Drain quiescent;
- intended new receipt absent.

A fresh adversarial review returned `confirm`, and one explicit human-approved execution of:

`wandora-rollback-freeze-v2-precheck`

completed:

- exit code 0;
- no timeout;
- no stderr;
- terminal `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

Post-precheck validation proved the intended receipt was still absent and runtime remained healthy/quiescent.

The precheck was not repeated.

## Persistent capture execution

Fresh capture review returned `confirm`.

One explicit human-approved execution of:

`wandora-rollback-freeze-v2-capture`

completed exactly once:

- exit code 0;
- no timeout;
- no stderr;
- duration approximately 36.6 s;
- terminal `ROLLBACK_FREEZE_V2_OK`;
- receipt:
  `/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0364-9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb-mastra060-2e97da6d.metadata`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

No retry occurred.

## Receipt validation

Independent receipt readback proves:

- rollback root:
  `/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0364-9d0a4ba577fe-mastra060-2e97da6d-20261001T041355159374294Z`;
- Paperclip v2026.916.1 exact image/commit, healthy/restart 0;
- current Core exact image/id/revision, healthy/restart 0;
- exact 14-file Core Compose provenance;
- Messaging Gateway exact identity, healthy/restart 0;
- OA exactly `0.6.1 ready`;
- external `wandora_mastra@0.6.0` loaded/enabled at exact `2e97da6d...` path;
- retained `wandora_mastra@0.5.0` rollback package preserved;
- `semantic_fast_read_gates_off=true`;
- `custody_overlay_live=false`;
- `attestation_overlay_live=false`;
- `task_drain_quiescent=true`;
- `official_backup_created=true`;
- `official_backup_gzip_valid=true`;
- `schema_restore=true`;
- `schema_equal=true`;
- TypeSafe, wfri1, Mistral and Vigia custody recorded as metadata only;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal `ROLLBACK_FREEZE_V2_OK`.

## Post-capture runtime validation

Fresh readback after capture proves:

- Core still the same container/runtime revision, healthy/restart 0;
- Paperclip healthy and unchanged;
- Gateway healthy and unchanged;
- Task Drain remains `false / 0 / 0 / quiescent=true`;
- Core startup remains `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Gateway remains `outboundEnabled=false`;
- no custody/attestation overlay is live.

## Result

**GREEN.**

The current production Core `9d0a4ba...` now has a current-baseline Rollback Freeze V2 receipt with a verified official backup, disposable PostgreSQL 18.1 restore and normalized schema equality proof.

## Next boundary

**Semantic Fast Read — SUPERVISED RE-ATTESTATION + ONE REAL ANA READ V2.**

Concrete goal:

`Qual é o preço do produto PREMIUM PLUS?`

Exactly one real browser-triggered Fast Read is allowed in that future window. No retry or second ERP read is allowed. Fresh policy/operational qualification must immediately precede opening, and mandatory close must restore the gates-OFF 14-file baseline after success, fallback or error.

Non-essential structural preparation is out of scope.
