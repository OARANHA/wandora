# ADR 0362 — Post-ADR0358 Rollback Freeze V2 Persistent Capture Execution V1

Date: 2026-09-30

Status: **EXECUTED / GREEN / ROLLBACK FREEZE V2 READY / NO CUSTOMER EFFECT**

## Objective

Execute exactly once the already-qualified post-ADR0358 Rollback Freeze V2 persistent capture through the existing `wandora-managed-admin` boundary, validate the resulting receipt against the current runtime, preserve historical rollback evidence, and hard-stop before any Semantic Fast Read activation or Ana execution.

ADR 0168 remains binding. This slice reuses the existing Rollback Freeze V2 mechanism and does not create a new backup subsystem, lifecycle, state machine, provider registry, approval system, service or capability.

## REAL NOW

Fresh repository provenance before the capture decision:

- live `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `4b4864eaea8e6d0c2b0eab03ec425b0d503041f4`;
- merge ref = `074e77360401d601e643b7cdb2b9c302518329b4`;
- merge parents exactly current main + PR head;
- current PR head later completed 17/17 workflows GREEN, with no rerun;
- compare from qualified source ancestor `e8170a6adca24314854e7ee53f4cbb06591886ec` to the current head contained documentation-only changes;
- qualified helper/wrapper source blobs remained unchanged.

Fresh production readback before capture:

- seven Wandora containers running/healthy;
- Paperclip `wandora/paperclip:v2026.916.1`, healthy;
- Core `wandora/core:organization-adapter-candidate-f279acc98687`, healthy;
- Messaging Gateway healthy;
- Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- exactly one Organization Adapter `0.6.1`, `ready`, `lastError=null`;
- external `wandora_mastra@0.6.0`, `loaded=true`, `disabled=false`, exact package `2e97da6d...`;
- Core startup `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Gateway startup `outboundEnabled=false`;
- historical ADR 0356 receipt present and ending `ROLLBACK_FREEZE_V2_OK`;
- post-ADR0358 receipt absent.

Live wrapper readback remained exact:

- precheck wrapper blob `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- capture wrapper blob `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`.

The helper remained protected as `root:root 0750`; ADR 0360 already established its exact blob `31742060143e8ff7c86a9753045400364b98c9c9`. The capture wrapper itself re-hashes that protected helper as root, validates syntax and fails closed before invoking it.

ADR 0361 already executed the root precheck exactly once and returned `ROLLBACK_FREEZE_V2_PRECHECK_OK`, exit 0, no timeout. That precheck was not repeated.

## PROVEN EVIDENCE

The capture wrapper accepts zero caller arguments and executes only the canonical helper in persistent mode. The helper refuses an existing target receipt, validates Paperclip/Core/Gateway identity, OA state, current `wandora_mastra@0.6.0`, retained `wandora_mastra@0.5.0`, Task Drain, effect gates, custody metadata, Compose provenance and PostgreSQL 18.1 prerequisites before its explicit `First write begins here` boundary.

The intended receipt path before execution was:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0358-f279acc98687da894a1ce6570273b5949552a8c7-mastra060-2e97da6d.metadata`

and was proven absent.

## GAPS

No capability or architecture gap remained. The only remaining action was the separately governed one-time persistent capture itself.

## CAPABILITY AUTHORITY / REUSE GATE

Authority remains separated:

- Wandora owns the rollback-readiness semantic contract and canonical safe receipt/checkpoint;
- Remote-Ops managed-admin is the operational authority for the root execution;
- Paperclip remains authority for its database, adapter registry, operator-package tree and runtime lifecycle state;
- Mastra remains the replaceable runtime implementation behind the accepted adapter;
- provider replacement remains an adapter/binding/state migration concern, not justification to internalize provider capabilities.

No new Wandora table, migration, service, state machine, backup subsystem, rollback mechanism, approval mechanism, provider registry or runtime subsystem was created.

## DECISION

Execute exactly once:

`wandora-rollback-freeze-v2-capture`

on `wandora-managed-admin`, zero arguments, working directory `/opt/wandora/ops-workspace`.

Do not execute the helper directly. Do not rerun the root precheck. Do not authorize Semantic Fast Read, Ana, VendaERP, model/provider/customer calls, Human Send or outbound effects.

## SECOND ADVERSARIAL REVIEW

The first capture preparation followed a JEV guard result `confirm=0.92`, confidence `0.90`, and produced approval `adm_d2d6f18c31a906ccd8f9f102`. That ticket expired before execution and the broker rejected it as nonexistent/expired.

State-first reconciliation then proved:

- the post-ADR0358 receipt was still absent;
- the historical ADR 0356 receipt was intact;
- all seven containers remained healthy;
- Task Drain remained quiescent;
- no capture had occurred.

A fresh second guard review then returned:

- decision `confirm`;
- `confirm=0.83`;
- confidence `0.77`;
- `deny=0.10`;
- `allow=0.06`;
- `review=0.01`.

A new capture-specific approval was required.

## EXECUTION

`host_admin_prepare` produced:

`adm_f28834e7718648c65ae378e7`

for exactly:

- target `wandora-managed-admin`;
- program `wandora-rollback-freeze-v2-capture`;
- argv empty;
- cwd `/opt/wandora/ops-workspace`;
- timeout 120000 ms.

The human supplied the exact required confirmation:

`APPROVE adm_f28834e7718648c65ae378e7`

`host_admin_apply` was then called exactly once.

Result:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- `stderr` empty;
- duration `35735 ms`;
- terminal marker `ROLLBACK_FREEZE_V2_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

No timeout, disconnect or ambiguous result occurred. No retry occurred.

## VALIDATION

Independent readback of the newly published receipt proved:

- rollback root `/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0358-f279acc98687-mastra060-2e97da6d-20261001T010644333186230Z`;
- Paperclip image `wandora/paperclip:v2026.916.1`, exact image id, source commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy/restart 0;
- Core image `wandora/core:organization-adapter-candidate-f279acc98687`, exact image id, revision `f279acc98687da894a1ce6570273b5949552a8c7`, healthy/restart 0;
- Messaging Gateway exact image identity, healthy/restart 0;
- OA count 1, version `0.6.1`, status `ready`, exact package path;
- `wandora_mastra` type `wandora_mastra`, source `external`, version `0.6.0`, loaded, enabled, exact `2e97da6d...` package path;
- retained rollback adapter version `0.5.0`, exact `64795ff7...` package path, `mastra_adapter_rollback_package_preserved=true`;
- `semantic_fast_read_gates_off=true`;
- `custody_overlay_live=false`;
- `attestation_overlay_live=false`;
- `task_drain_quiescent=true`;
- `official_backup_created=true`;
- `official_backup_gzip_valid=true`;
- PostgreSQL disposable restore proof `schema_restore=true` and `schema_equal=true`;
- TypeSafe, `wfri1`, Mistral and Vigia custody recorded as metadata only;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal marker `ROLLBACK_FREEZE_V2_OK`.

The historical ADR 0356 receipt remained byte-readable and still terminated in `ROLLBACK_FREEZE_V2_OK`.

Fresh post-capture runtime reconciliation proved:

- all seven expected Wandora containers still running/healthy;
- Paperclip unchanged and healthy;
- Core unchanged and healthy;
- Gateway unchanged and healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- OA still exactly `0.6.1 ready`;
- `wandora_mastra@0.6.0` still loaded/enabled;
- Core startup still has Fast Read OFF, Semantic Fast Read OFF and Human Send OFF;
- Gateway still has outbound OFF.

The capture path itself does not execute Ana, VendaERP, TypeSafe/Mistral customer-path work, model/provider calls, Human Send or Gateway outbound. The receipt records the corresponding provider/customer/outbound effects as false.

## Result

**GREEN.** The post-ADR0358 persistent rollback capture is complete and independently validated.

`ROOT PRECHECK PREVIOUSLY GREEN = YES`

`PERSISTENT CAPTURE EXECUTED = YES`

`ROLLBACK FREEZE V2 READY = YES`

`SEMANTIC FAST READ NOT EXECUTED`

`ANA REAL READ NOT EXECUTED`

`PRODUCTION CUSTOMER EFFECT = NONE`

## Next boundary

**HARD STOP.**

The next slice is exclusively:

**Semantic Fast Read — SUPERVISED ACTIVATION + FIRST REAL ANA READ V1**

Its concrete target is to finish with one real Ana response visible to the user, not more non-essential structural preparation. Any prerequisite inserted before that demonstration must be proven as a real blocking gap.
