# ADR 0374 — Semantic Fast Read Scoped Rollout Activation-Oriented Preflight V1

Date: 2026-10-01

Status: **BLOCKED / FAIL-CLOSED / NO ACTIVATION / NO CUSTOMER EFFECT**

## Objective

Reconcile the exact post-ADR0373 production baseline and determine whether the first persistent scoped rollout for 28PRO / Ana / `business.products.price` is ready to enter an activation effect window.

This slice is preflight only. It does not authorize activation, overlay mounting, Core recreation, provider/customer calls, VendaERP execution, Human Send, Messaging Gateway outbound, PR merge, Connection/grant/policy mutation or rollback recapture.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## REAL NOW — Git / CI

Live Git refs were re-read rather than inferred from PR `base_sha` metadata:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 remains open / draft / unmerged at `bf5c82319f0815562d45cad90a2db0ea57b9251b`, exact head 17/17 GREEN;
- PR #377 remains open / draft / unmerged at `54b6120c81b735fd86d8e042e7bc18f0b0f96595`, latest exact-head batch 12/12 GREEN;
- PR #378 remains open / draft / unmerged at pre-documentation head `f99edc965d3aa27962f60f7f1e417c5639d126a7`, exact head 12/12 GREEN;
- no merge or unexpected branch movement was observed before this checkpoint.

The current-main convergence commits remain mechanically identified by their merge messages:

- `c78266bb08c2d903d942d0ad87d6cb03438811a4` = PR #369 head merged into live `main`;
- live Core revision `9ee338303292173db8e1b21bef9c8c5067c104a4` = PR #377 head merged into `c78266...`.

No workflow was rerun.

## REAL NOW — runtime

Fresh runtime readback established:

- Core image `wandora/core:organization-adapter-candidate-9ee338303292`;
- Core revision `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- Core OCI/image manifest `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- Core healthy / restart 0;
- stable selector still points to `wandora/core:organization-adapter-candidate-9ee338303292`;
- active Core composition remains the exact ADR0373 14-file gates-OFF topology;
- custody, attestation and scoped-rollout overlays are not active;
- Core startup reports Fast Read Execution OFF, Semantic Fast Read OFF, rollout OFF and Human Send OFF;
- the qualified `compose.semantic-fast-read.yaml` source also pins Semantic Selector OFF;
- Paperclip `wandora/paperclip:v2026.916.1`, source commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy / restart 0;
- exactly one Organization Adapter `wandora.organization-adapter-v1@0.6.1`, `ready`, `lastError=null`;
- external `wandora_mastra@0.6.0` loaded/enabled at the qualified `2e97da6d...` package;
- Messaging Gateway healthy / restart 0 and `outboundEnabled=false`;
- Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No runtime mutation was performed.

## Rollback authority

The ADR0373 receipt was re-read from:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0372-9ee338303292173db8e1b21bef9c8c5067c104a4-mastra060-2e97da6d.metadata`

and still matches the live baseline exactly.

The receipt records:

- exact Core / Paperclip / Gateway / OA / Mastra identities;
- exact Core 14-file Compose provenance;
- `official_backup_created=true`;
- `official_backup_gzip_valid=true`;
- `schema_restore=true`;
- `schema_equal=true`;
- safe metadata for TypeSafe/System One, `wfri1` and Mistral custody;
- `semantic_fast_read_gates_off=true`;
- `custody_overlay_live=false`;
- `attestation_overlay_live=false`;
- `task_drain_quiescent=true`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal `ROLLBACK_FREEZE_V2_OK`.

Protected rollback root remains the receipt-recorded ADR0373 root.

The baseline has not drifted. Do not recapture Rollback Freeze V2 for the same `9ee338...` baseline.

## Fresh canary identity evidence

The customer identifiers were not accepted only from historical ADR text.

Fresh Web access logs repeatedly show the live authenticated work path using:

- Wandora organization: `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- Wandora employee: `7b401163-8102-42db-b595-3a2017f54003`.

Fresh Paperclip board reads show:

- company `28PRO`: `5d7ec217-118c-4292-8136-0a9ab16926ea`, active;
- Ana: `428b6730-3df4-4b92-b90a-a87f87c401f9`, idle, adapter `wandora_mastra`, organization chain healthy.

The intended sole rollout capability remains:

`business.products.price`

## Paperclip / provider authority evidence

Paperclip remains operational authority.

Fresh official Tool Policy list for 28PRO is empty.

A fresh non-consuming and non-auditing official Tool Policy test for:

- Ana `428b6730...`;
- Connection `8e2c23f4-73f5-444a-8647-71428819ea91`;
- tool `vendaerp_search_products`;

returned:

- decision `allow`;
- reason `allow_profile`;
- effective profile `259a5449-58ba-4d59-9774-92612e3caa91`;
- no matched policy ids;
- `auditEvent=null`.

The governed historical activity readback for the exact ADR0368 run still contains only one policy-decision event plus one successful completion event for the namespaced VendaERP read tool. This remains evidence of the previous single tool execution; it was not repeated.

## Capability Authority / Reuse Gate

The answers are unchanged and now revalidated against current state:

1. Lifecycle: **Paperclip-owned**.
2. Run/task execution: **Paperclip-owned**, with Mastra as replaceable runtime implementation.
3. Connection / grant / effective profile / Tool Policy / Tool Gateway: **Paperclip-owned**.
4. Product-semantic rollout admission by exact organization + employee + BusinessCapability: **Wandora-owned**, already implemented by ADR0369.
5. Model/selector implementation: existing TypeSafe/JEV + Mistral provider boundaries; no new provider subsystem.
6. Secret custody: existing file-backed custody and managed-admin metadata capability; no new secret manager.
7. Rollback: existing Rollback Freeze V2; no new backup subsystem.
8. Durable rollout state: no new table/migration/state machine justified for the initial canary; deployment configuration remains sufficient.

No new registry, lifecycle, Connection mirror, grant mirror, retry engine, orchestration layer or provider mirror is authorized.

## Qualified deployment contract

The qualified persistent rollout overlay source is:

`infra/stacks/core/compose.semantic-fast-read-rollout.yaml`

Git blob at this checkpoint:

`b58c6a91fe1dbbabd047bdf13189ccd90c5c24d9`

It:

- enables Fast Read Execution;
- enables Semantic Fast Read;
- enables Semantic Selector;
- keeps Human Send OFF;
- requires exact rollout target pairs;
- requires an explicit BusinessCapability allowlist;
- adds no image, build, port, network, volume or secret.

The separate custody overlay remains:

`infra/stacks/core/compose.semantic-fast-read-custody.yaml`

Git blob:

`f0f97b3ba07914f2c588dea75d6bb52ec3397416`

The intended future canary values remain exactly:

`WANDORA_SEMANTIC_FAST_READ_ROLLOUT_TARGETS=7a531811-9fea-4395-b0b2-2e2b0fce0570:7b401163-8102-42db-b595-3a2017f54003`

`WANDORA_SEMANTIC_FAST_READ_ROLLOUT_CAPABILITIES=business.products.price`

## Gaps

The preflight does not authorize activation because three effect-adjacent proofs are still missing.

### 1. Persistent rollout overlay live-host identity is not proven

The active Core composition proves the rollout overlay is not live.

The ordinary Remote-Ops read boundary does not authorize direct reads under the Core stack directory. A direct attempt against the rollout overlay returned inaccessible/nonexistent, so this preflight does **not** claim whether the file is already materialized on the host.

Do not bypass the filesystem boundary to answer this question.

Before activation, the exact qualified overlay bytes must be materialized or independently hash-attested at the canonical host path through an authorized boundary.

### 2. Fresh Paperclip operational projection is still required immediately before effect

The fresh Tool Policy test is GREEN, but this session did not obtain a fresh Organization Adapter `tools.operational.read` projection proving, in one current snapshot:

- Connection active/enabled/healthy;
- organization grant active;
- installed for Ana;
- effective read-only tool eligibility;
- no write/destructive eligibility;
- `business.products.price` present in the operational capability intersection.

Historical ADR0370 evidence is insufficient as effect-adjacent authorization.

Reuse the existing provider-owned operational-read capability. Do not create a Wandora mirror.

### 3. Custody metadata must be fresh immediately before activation

ADR0373 proves safe custody metadata for TypeSafe/System One, `wfri1` and Mistral, and no custody overlay is live.

The existing managed-admin program `wandora-semantic-fast-read-custody-metadata-v1` is already authorized as the narrow metadata-only boundary. Reuse it in the effect-adjacent slice; do not create another secret readback or secret manager.

## Decision

**B — BLOCKED / FAIL-CLOSED / NO EFFECT.**

This is a narrow operational block, not an architectural redesign.

The current 9ee338 baseline, rollback, customer identity, Paperclip company/Ana identity and Tool Policy posture are GREEN. The rollout contract is qualified. However activation is not yet approval-ready because the exact host rollout-overlay identity/materialization, fresh provider operational projection and fresh custody metadata have not all been proven in the same effect-adjacent window.

Therefore:

- do not mount custody;
- do not mount rollout;
- do not recreate Core;
- do not enable any Fast Read/Semantic/Selector gate;
- do not call TypeSafe/Mistral/VendaERP;
- do not execute Ana;
- do not mutate Connection/grant/policy;
- do not enable Human Send;
- do not enable Gateway outbound;
- do not merge PR #369/#377/#378;
- do not generate a managed-admin activation approval yet.

## Second adversarial review

JEV/TypeSafe `jev-1.13.0` reviewed the proposed PREPARED/no-effect close and instead returned:

- `block = 0.63`;
- `deep_review = 0.33`;
- `proceed_fast = 0.02`;
- `split_task = 0.02`;
- confidence `0.51`.

The deterministic gaps above are sufficient to accept the fail-closed result.

## Effects accounting

Executed:

- read-only repository / PR / exact-head CI reconciliation;
- read-only runtime / Docker health / Compose provenance reconciliation;
- read-only Core/Gateway startup-log reconciliation;
- read-only Paperclip company/agent/plugin/adapter reads;
- read-only Task Drain;
- non-consuming/non-auditing Tool Policy test;
- governed historical Connection activity read;
- live rollback receipt readback;
- adversarial review;
- repository documentation only.

Not executed:

- production Compose mutation;
- overlay installation or mount;
- Core/Paperclip/Gateway recreation;
- secret-value read;
- provider/model call;
- Ana run;
- VendaERP call;
- customer effect;
- outbound effect;
- PR merge;
- rollback recapture;
- Connection/grant/policy mutation;
- managed-admin apply.

## Next boundary

Next slice:

**Semantic Fast Read Scoped Rollout Host Materialization + Immediate Effect Attestation V1 — NO CUSTOMER CALL**

It must begin fresh and remain fail-closed. Its minimum duties are:

1. re-read Git/runtime/rollback state;
2. establish the exact qualified rollout-overlay bytes at the canonical host path without activating them;
3. obtain fresh custody metadata only through the existing dedicated metadata program;
4. obtain fresh Paperclip/OA operational projection for 28PRO/Ana/Connection;
5. render the exact current 14-file baseline plus custody + rollout overlays with only the exact 28PRO/Ana target and `business.products.price`;
6. prove Human Send and Gateway outbound remain OFF;
7. perform a new decision and second adversarial review;
8. only if all checks are GREEN, prepare the one-use activation approval and stop before apply.

Do not combine host materialization/attestation with the first customer call. The first real canary request remains a later, separately bounded effect after activation itself is explicitly approved and validated.
