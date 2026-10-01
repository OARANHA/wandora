# ADR 0373 — Current 9ee338 Core Rollback Freeze V2 Requalification V1

Date: 2026-10-01

Status: **GREEN / CURRENT-BASELINE ROLLBACK FREEZE V2 READY / CORE 9ee338 ANCHORED / ALL FAST-READ + OUTBOUND EFFECT GATES OFF / NO CUSTOMER EFFECT**

## Objective

Repin, redeploy, precheck and persist the existing Rollback Freeze V2 mechanism for the production-live Core `9ee338...` baseline established by ADR 0372.

ADR 0168 remains binding. This slice reuses the existing Rollback Freeze V2 helper, wrappers, managed-admin programs and backup/restore architecture. It does not create a second backup subsystem, lifecycle authority, provider mirror, state machine, table, migration, service, scheduler or retry engine.

## REAL NOW

Repository/runtime reconciliation before effect established:

- default `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- draft PR #378 head `04c4572e148c9c383d8de7546e2ac24d5e1f8444`;
- exact code head workflows: **12/12 GREEN**;
- live/stable Core image: `wandora/core:organization-adapter-candidate-9ee338303292`;
- Core revision: `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- Core OCI/image manifest: `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- Core healthy / restart 0 / exact canonical 14-file Compose topology;
- stable selector: `WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-9ee338303292`;
- Paperclip: `wandora/paperclip:v2026.916.1`, healthy / restart 0;
- Organization Adapter: exactly one `0.6.1`, ready;
- external `wandora_mastra@0.6.0`, loaded/enabled, with `0.5.0` rollback package preserved;
- Messaging Gateway healthy / restart 0;
- Task Drain `draining=false, activeRuns=0, pendingWakes=0, quiescent=true`;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send Proposal OFF;
- Gateway outbound OFF;
- current-9ee338 rollback receipt absent before capture.

No provider/customer/VendaERP call, migration, rollout activation or outbound effect had occurred.

## Capability Authority / Reuse Gate

The existing Rollback Freeze V2 mechanism remained the correct authority boundary.

The slice reused only:

- `scripts/operations/production-rollback-freeze-v2.sh`;
- `wandora-rollback-freeze-v2-precheck`;
- `wandora-rollback-freeze-v2-capture`;
- existing managed-admin exact-program authority;
- existing Paperclip official backup path;
- existing PostgreSQL 18.1 disposable restore/schema-equality validation.

Generic root shell remained hard-denied and was not bypassed. No allowlist expansion was introduced.

## Source requalification

The helper was repinned from the historical `83baca...` baseline to the live `9ee338...` baseline.

First source commit:

`2da4e155db8559ce596a3a6a96c1653ebe0eee59` — `ops: repin rollback freeze v2 to core 9ee338`.

That commit changed only the helper and two existing wrappers. Its Semantic Fast Read CI failed deterministically because current verification surfaces still pinned the historical `83baca...` contract. No workflow was rerun blindly.

The stale verification contract was then repinned without weakening assertions:

`04c4572e148c9c383d8de7546e2ac24d5e1f8444` — `ci: repin rollback freeze v2 qualification to 9ee338`.

Exact code-head result: **12/12 workflows GREEN**.

Qualified Git blobs:

- helper: `1b26ca7ac2bd8b13d896a7440d142cb14da090a8`;
- precheck wrapper: `6000e8e5f960071d39b78765a85b0bd507fa79e8`;
- capture wrapper: `770a2853169f964146a8c33285650ffcd1489612`.

The exact three bytes were staged under:

`/opt/wandora/ops-workspace/adr0373-9ee338-rollback-freeze-v2`

and independently matched the Git blobs; all three `bash -n` checks exited 0.

## Exact-byte host deployment

Fresh root hash readback proved the live host still contained the prior baseline bytes:

- helper `83246ac1310a47c7e17a492fb76a4e4d886351e6`;
- precheck `7714454cee1c9f0cdc688655cbb3e6bc0433030a`;
- capture `ea862bb00db1c2926ce7371bb3626a52484d6052`.

An initial platform-layer block occurred before an install apply returned any execution result. The operation was **not retried blindly**. A fresh root readback proved all three live hashes were still unchanged.

Fresh one-use approvals were then prepared and explicitly approved. Direct `install` operations succeeded:

- helper installed `root:root 0750`;
- wrappers installed `root:root 0755`.

Final root `git hash-object --no-filters` readback matched all three qualified blobs exactly.

No helper mode was executed as part of deployment.

## Root precheck execution

After a fresh runtime reconciliation and second adversarial review, the dedicated zero-argument program `wandora-rollback-freeze-v2-precheck` was separately approved and executed exactly once.

Approval:

`adm_765bbe2415c0a74925686354`

Result:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- duration `14109 ms`;
- terminal marker `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

Post-precheck readback proved the future receipt still absent, Core/Paperclip/Gateway healthy with restart 0, selector unchanged and Task Drain quiescent.

## Persistent capture execution

A new decision and second adversarial review were completed before persistent capture.

The dedicated zero-argument program `wandora-rollback-freeze-v2-capture` was prepared with `timeout_ms=120000` because historical ADR 0367 evidence showed this operation can exceed 30 seconds.

Approval:

`adm_a6850035eb021f1dd4cfc10a`

The capture executed exactly once:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- duration `36975 ms`;
- terminal marker `ROLLBACK_FREEZE_V2_OK`.

No retry was required.

Canonical receipt:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0372-9ee338303292173db8e1b21bef9c8c5067c104a4-mastra060-2e97da6d.metadata`

Protected rollback root recorded by the receipt:

`/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0372-9ee338303292-mastra060-2e97da6d-20261001T141000116448565Z`

Independent receipt readback validates:

- exact Paperclip image/id/commit/Compose anchors;
- exact Core image/id/revision/14-file Compose anchors;
- Gateway healthy/restart 0;
- exactly one Organization Adapter `0.6.1 ready`;
- external `wandora_mastra@0.6.0` loaded/enabled;
- retained `wandora_mastra@0.5.0` rollback package;
- `semantic_fast_read_gates_off=true`;
- `custody_overlay_live=false`;
- `attestation_overlay_live=false`;
- `task_drain_quiescent=true`;
- `official_backup_created=true`;
- `official_backup_gzip_valid=true`;
- `schema_restore=true`;
- `schema_equal=true`;
- safe secret custody metadata only;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal marker `ROLLBACK_FREEZE_V2_OK`.

## Post-capture validation

Independent post-capture runtime readback remained GREEN:

- Core exact `9ee338...`, healthy, restart 0, exact 14-file topology;
- Paperclip `v2026.916.1`, healthy, restart 0;
- Messaging Gateway healthy, restart 0;
- Task Drain still `false / 0 / 0 / quiescent=true`;
- stable selector still points to `9ee338...`.

No Core, Paperclip or Gateway recreation was caused by the rollback capture.

## Decision

**Current 9ee338 Core Rollback Freeze V2 Requalification V1 is GREEN.**

The current production rollback authority is now the ADR 0373 receipt/root above. ADR 0367 remains valid historical rollback evidence for the prior `83baca...` baseline only.

This rollback readiness does **not** authorize Semantic Fast Read, Semantic Selector, Human Send, Gateway outbound, provider/customer/VendaERP calls, migrations or the 28PRO/Ana scoped rollout.

The next activation-oriented slice must start fresh from REAL NOW, re-read this receipt, revalidate exact current Git/CI/runtime/custody/provider state, run a new decision and second adversarial review, and obtain its own explicit approvals. Do not reuse any approval id from ADR 0373.
