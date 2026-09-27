# ADR 0299 — Production Rollback Freeze + Secret Metadata Readback V1 — partial operator checkpoint

Date: 2026-09-26

Status: **PARTIAL / OPERATOR-LOCAL EXECUTION REQUIRED / NO BACKUP CREATED / NO ACTIVATION / NO CUSTOMER EFFECT**

## Context

ADR 0298 ended `BLOCKED / NO MUTATION / NO PRODUCTION EFFECT` because the immediately-pre-mutation rollback evidence required by ADR 0294 was not fresh and the secret-safe Remote-Ops boundary correctly refused direct access to Core secrets. This slice exists only to close those two gaps. It does not authorize Paperclip/Core/Organization Adapter promotion, Semantic Fast Read activation, Task Drain mutation, provider calls, customer work or outbound.

The bootstrap was reconciled against repository/GitHub/runtime evidence rather than chat history.

## REAL NOW

Repository/GitHub at the decision point:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 = open / draft / mergeable;
- PR #369 source head = `5619622bc079bb1b5019f39c5221a81bc4cdd845`;
- exact PR #369 source head = **17/17 workflows GREEN**;
- PR #370 = open / draft / mergeable at `11fd59599b21493a0fe335f4c32354989a6083a2`;
- PR #370 exact head = **4/4 workflows GREEN**.

The exact ADR 0295 Paperclip promotion unit remains available and non-expired:

- Actions artifact ID `10914008713`;
- ZIP digest `sha256:e43acc85e3f7f010b7189f11bd9c3622f9a7a9015765a50f315ca61a98c36a19`;
- exact upstream source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- expiry observed: 2026-10-03.

Fresh Paperclip read-only evidence succeeded:

- `GET http://127.0.0.1:3100/api/health` returned `status=ok`;
- authenticated/private deployment remained reported;
- Paperclip commit = `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- database-backup health = `ok`;
- host Paperclip source checkout is clean/detached at the same `dffc2b3...` commit.

Fresh Task Drain readback through the existing Remote-Ops semantic capability did **not** succeed in this session: the broker path returned `fetch failed`. Direct Docker list/exec through the current Remote-Ops path is also unavailable/denied. These failures are not permission gaps to bypass; the already-implemented `paperclip_task_drain_status` authority remains the correct capability.

Direct Core secret inspection also remains correctly denied with `SECRET_PATH_DENIED`. The ADR 0297 receipt proves the prior custody completion but is intentionally not reused as fresh metadata for this slice.

## PROVEN EVIDENCE — rollback contract

ADRs 0129/0130 and 0294 establish the accepted recovery pattern. A fresh rollback freeze for the currently-live Paperclip v2026.916.0 must capture, only after fresh preconditions pass:

1. official Paperclip `db:backup`;
2. PostgreSQL 18.1 schema-faithful custom-format `pg_dump -Fc`;
3. disposable PostgreSQL 18.1 restore proof and normalized schema equality;
4. the matching live `/paperclip/instances/default/secrets/master.key`, copied without printing contents and verified only by boolean byte equality;
5. current `/paperclip/instances/default/adapter-plugins.json`;
6. complete current `/paperclip/operator-packages` adapter package state;
7. exact current Organization Adapter 0.3.1 package path/tree obtained from Paperclip's own plugin registry;
8. live Paperclip base Compose, execution-bridge overlay and bridge wrapper;
9. current Core Compose/config anchors needed to return to the pre-effect state;
10. protected manifests/checksums, excluding key-derived material from user-visible output.

The backup root must remain operator-local and protected under `/home/wandora-admin/backups/`, with directory mode 0700 and files 0600, following ADR 0129.

## Secret metadata contract

The only fresh secret evidence requested by this slice is owner/group/mode/type for:

- `/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key`;
- `/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac`;
- `/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key`.

No value, plaintext, content hash or secret-derived material is required or authorized.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains satisfied:

- Wandora owns semantic/product/effect authorization;
- Paperclip remains operational authority for run/workforce/tools/plugin/secret state;
- the existing Paperclip backup path, plugin registry and Task Drain capability are reused;
- PostgreSQL 18.1 is only a disposable recovery-verification client;
- no Wandora backup subsystem, secret manager, lifecycle, run mirror, registry, cache or retry engine is created;
- `SECRET_PATH_DENIED` and Docker isolation remain guardrails, not defects to bypass.

## Decision

The intended effect is bounded to **creation of one protected recovery bundle plus one metadata-only receipt**.

The decision was not treated as a generic production GO. It was reviewed in two stages:

1. initial JEV route review: `proceed_fast=0.41`, `deep_review=0.33`, `block=0.23`, `split_task=0.03`, low confidence; this was treated as a request for deeper review rather than permission to execute;
2. final focused JEV guard review of the fail-closed operator-local procedure: `allow=0.64`, `confirm=0.20`, `deny=0.13`, `review=0.03`, confidence 0.53.

The final procedure requires **all** freshness checks before the first backup write: current Paperclip v916.0 health/identity, fresh Task Drain OFF/0/0/quiescent, exactly one OA 0.3.1 ready, current Core/Gateway health, Semantic/Fast Read/Human Send gates OFF, Gateway outbound OFF, and fresh secret metadata.

## EXECUTION

**No rollback backup was created. No secret metadata was re-read through a bypass.**

The current ChatGPT Remote-Ops session lacks an authorized root/operator path for the protected `/home/wandora-admin/backups` operation, while the existing semantic Task Drain capability currently fails at the broker transport with `fetch failed`. Running only a partial `db:backup`, widening Docker access, restarting infrastructure merely to recover evidence, using `sudo` through an allowlisted shell, or relocating the bundle into `/opt/wandora/ops-workspace` would violate the slice.

Therefore execution stops before the first effect.

The operator-local implementation contract is persisted in:

`docs/operations/production-rollback-freeze-secret-metadata-readback-v1.md`

## VALIDATION

Validated without production mutation:

- canonical authority chain re-read at the exact PR head;
- ADRs 0294, 0295, 0297 and 0298 reconciled;
- ADRs 0129/0130 recovery pattern re-read;
- PR #369 exact head workflows = 17/17 GREEN;
- PR #370 exact head workflows = 4/4 GREEN;
- ADR 0295 candidate remains available/non-expired;
- Paperclip live health/commit/backup health fresh-read succeeded;
- current Paperclip source checkout identity matched the live commit;
- direct secret path access remained denied as designed;
- no TypeSafe, Mistral, VendaERP, WhatsApp or customer call occurred;
- no Task Drain mutation, deploy, promotion, container restart or Compose mutation occurred.

## Result

**PARTIAL / OPERATOR-LOCAL EXECUTION REQUIRED / NO BACKUP CREATED / NO ACTIVATION / NO CUSTOMER EFFECT**

Do not rerun ADR 0298 yet. First complete this slice through the reviewed operator-local boundary and validate its safe receipt. Only then update this checkpoint (or add the sequential completion ADR) and rerun Immediate Pre-Mutation Attestation from fresh state.

### 2026-09-26 — fresh continuation: Task Drain recovered, operator custody still unavailable

A fresh continuation re-ran the exact canonical and runtime checks before any backup write.

- `main` remains `8d6a65f519de5c1c49607314b49968af608c7164`.
- PR #369 remained open/draft/mergeable at pre-documentation source head `4f461ae3bcdffa7ef20b47c3f8be60b9c835f068`, with **17/17 workflows GREEN**.
- PR #370 remained open/draft/mergeable at `11fd59599b21493a0fe335f4c32354989a6083a2`, with **4/4 workflows GREEN**.
- ADR 0295 artifact `10914008713` remains available/non-expired through 2026-10-03, with GitHub digest `sha256:e43acc85e3f7f010b7189f11bd9c3622f9a7a9015765a50f315ca61a98c36a19`.
- Fresh Task Drain readback now succeeds again: `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`.
- Fresh runtime still shows Paperclip `wandora/paperclip:v2026.916.0` / commit `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`, healthy/restart 0; Core `wandora/core:organization-adapter-candidate-f3225586d082`, healthy/restart 0; Messaging Gateway healthy/restart 0 with `outboundEnabled=false`.
- Core active Compose labels still exclude `compose.semantic-fast-read.yaml` and `compose.semantic-fast-read-custody.yaml`; startup still reports `humanSendProposal=false`.
- Fresh Paperclip plugin CLI readback reports exactly `wandora.organization-adapter-v1@0.3.1`, status `ready`.

The former Task Drain transport failure is therefore closed. The execution blocker is narrower: neither the current `wandora-agent` boundary nor the newly visible `wandora-admin` target exposes authorized access to `/home/wandora-admin/backups`, and the canonical Core secret directory continues to fail closed with `SECRET_PATH_DENIED`. No exposed capability can perform the required metadata-only `stat` for TypeSafe/`wfri1`/Mistral or create the protected rollback root without widening policy, using shell/sudo as a bypass, or relocating custody.

The deterministic decision remains **STOP BEFORE FIRST BACKUP WRITE**. A fresh independent JEV route review returned `block=0.99`, `deep_review=0.01`, confidence `0.98`. No backup, deploy, promotion, restart, Compose mutation, secret read, provider call, VendaERP call, customer work, outbound, Task Drain mutation or production effect occurred.

Status remains **PARTIAL / OPERATOR-LOCAL EXECUTION REQUIRED / NO BACKUP CREATED / NO ACTIVATION / NO CUSTOMER EFFECT**. Complete the already-reviewed operator-local runbook through an authorized boundary; do not expand Remote-Ops allowlists or bypass secret guards. Only after the safe receipt ends in `ROLLBACK_FREEZE_V1_OK` should ADR 0298-style Immediate Pre-Mutation Attestation be rerun from fresh state.

