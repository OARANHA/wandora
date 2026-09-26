# ADR 0298 — Immediate Pre-Mutation Attestation + Effect Authorization V1

Date: 2026-09-26

Status: **BLOCKED / NO MUTATION / NO PRODUCTION EFFECT**

## Objective

Capture freshness-sensitive evidence immediately adjacent to the first possible Semantic Fast Read production convergence mutation and decide whether exactly one bounded production effect may proceed.

The first mutation considered by this attestation is intentionally narrow:

> promote the exact ADR 0295 Paperclip `v2026.916.1` frozen candidate while the Organization Adapter remains `0.3.1` and all Semantic Fast Read, Semantic Selector, Human Send, Messaging Gateway outbound and WhatsApp Fast Read effects remain OFF.

This ADR does not authorize that mutation. The attestation is blocked on missing immediate rollback evidence.

Permanent guardrail:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Repository/GitHub readback immediately before the decision:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 = open / draft / mergeable;
- PR #369 source head before this documentation checkpoint = `3064c151331378c4d8b608c409967fd9f9f503ef`;
- pull-request merge ref = `0049e193f945f4c1512430df51a0b145c45c3c97`;
- exact source head had **17/17 workflows GREEN**;
- PR #370 remains a separate documentation-only draft at `11fd59599b21493a0fe335f4c32354989a6083a2`.

Fresh production readback:

### Core

- image = `wandora/core:organization-adapter-candidate-f3225586d082`;
- image ID = `sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9`;
- revision = `f3225586d0825334d2c9c697a1720512a65d47f8`;
- health = healthy;
- restart count = 0;
- current startup reports `humanSendProposal=false`;
- active Compose set does not include `compose.semantic-fast-read.yaml` or `compose.semantic-fast-read-custody.yaml`;
- TypeSafe/System One and `wfri1` host files are therefore not mounted into the running Core;
- existing Mistral mount remains read-only at `/run/secrets/wandora/model-provider.api-key`.

### Paperclip

- image = `wandora/paperclip:v2026.916.0`;
- image ID = `sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced`;
- commit = `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- health = `status=ok`;
- deployment mode = authenticated;
- exposure = private;
- restart count = 0;
- database-backup health reports enabled / ok.

Task Drain readback:

- draining = false;
- activeRuns = 0;
- pendingWakes = 0;
- quiescent = true.

### Organization Adapter

Exactly one live registration remains:

- key = `wandora.organization-adapter-v1`;
- version = `0.3.1`;
- status = ready;
- id = `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`;
- package path hash = `06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d`;
- lastError = null.

Its live manifest still contains only the reconcile / activate / supervised-work boundary and does not contain the Fast Read host capabilities.

### Messaging Gateway / outbound

- Gateway health = healthy;
- active composition = normal `compose.yaml` only;
- fresh startup log reports `outboundEnabled=false`.

No WhatsApp Fast Read wiring or outbound activation was introduced.

## PROVEN EVIDENCE

### Exact candidate attestation

The exact ADR 0295 Paperclip promotion artifact remains available:

- Actions artifact ID = `10914008713`;
- expired = false;
- expires = `2026-10-03T19:39:15Z`;
- uploaded ZIP digest = `sha256:e43acc85e3f7f010b7189f11bd9c3622f9a7a9015765a50f315ca61a98c36a19`;
- exact Paperclip source = `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- image/config digest = `sha256:e05f1604cf863d316b4ce5db189782f022fa4fd17544f9724747e11223d4356c`;
- raw Docker archive SHA-256 = `a91f96feff4dbb8161d182e350fc3e2ca1d0d6784cfa9179fdaa20a200e7ce97`;
- compressed archive SHA-256 = `69c962c79375446060af12fc9240385987790f4d11a3528cbb7a6ad745e98269`.

A later current-head workflow also emitted a different Paperclip artifact. It is not substituted for ADR 0295. Comparison from the ADR 0295 executable candidate source head `2029c7b3...` to pre-checkpoint head `3064c151...` shows only documentation/runbook changes; nevertheless the upstream Dockerfile contains floating `@latest` dependencies, so the exact frozen bytes remain the qualified promotion unit.

### Credential custody preflight

ADR 0297 remains the canonical custody qualification and proved, without exposing values:

- Core-side TypeSafe/System One file exists under canonical host custody and was byte-equivalent to the qualified provider credential;
- distinct `wfri1` HMAC exists under canonical host custody;
- TypeSafe, `wfri1` and Mistral were regular files owned by `wandora-admin:wandora-ops` with mode `0640`;
- `wfri1` was distinct from the then-current Core and Organization Adapter protected secret sets.

This immediate attestation attempted a fresh metadata-only read through the current Remote-Ops boundary. The secret-path guard correctly returned `SECRET_PATH_DENIED` for the Core secret directory. The guard was not bypassed and no shell workaround was used.

Current Mistral mount presence/read-only state is independently visible in the running Core, but exact fresh host-file metadata for the inert TypeSafe/`wfri1` files is not independently re-readable through the present MCP capability.

### Rollback readiness

The current runtime anchors are freshly known:

- Core image/revision/image ID;
- Paperclip image/commit/image ID;
- current Paperclip compose set and bridge wrapper path;
- live Organization Adapter exact version/id/hash-addressed package path;
- current Task Drain and component health.

However, ADR 0294 requires an immediately-pre-mutation **fresh rollback set**, including current Paperclip durable-state recovery evidence: current DB backup, schema-faithful recovery artifact when required by the accepted runbook, matching `master.key` custody evidence, current plugin/adapter store, current compose/wrapper, and protected hashes/manifests.

No such fresh protected rollback bundle was captured in this slice.

The current MCP exposes no dedicated backup/snapshot capability. The official `paperclipai db:backup` command exists, but executing it creates a new backup and is therefore a gap-closing operation, not read-only attestation. Under the slice discipline, that operation must be handled separately rather than improvised inside this authorization decision.

## GAPS

Two freshness gaps remain:

1. **blocking rollback gap** — the immediately-pre-mutation protected rollback set required by ADR 0294 has not been freshly captured/proven;
2. **secret-metadata freshness gap** — the current secret-safe MCP boundary cannot independently re-read metadata for the inert TypeSafe/`wfri1` files without violating the secret-path guard.

The rollback gap alone is sufficient to block the proposed Paperclip promotion.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora subsystem is justified.

Authority remains:

- semantic/product/effect authority: Wandora;
- durable product state: existing Wandora state only; no new registry/mirror/cache/store;
- operational workforce/run/tool/Connection/grant/secret/audit authority: Paperclip;
- semantic route implementation: replaceable TypeSafe/System One;
- structured product-selector implementation: replaceable Mastra/Mistral;
- business-system read implementation: replaceable VendaERP adapter/tool path;
- replacement boundaries: existing Wandora-owned provider-neutral contracts.

The next gap-closing work must reuse the accepted Paperclip backup/recovery pattern and existing host custody. It must not add a secret manager, lifecycle, provider registry, run mirror, retry engine or widen Remote-Ops permissions for convenience.

ADR 0168 Exit Test remains PASS.

## DECISION

**BLOCKED / NO MUTATION / NO PRODUCTION EFFECT.**

The following otherwise-candidate mutation is **not authorized**:

> promote exact artifact `10914008713` / `wandora/paperclip:v2026.916.1` into production while Organization Adapter remains 0.3.1.

Reason: immediate rollback readiness has not been freshly proven to the accepted ADR 0294/0129 standard.

No generic GO exists. No Paperclip promotion, Organization Adapter upgrade, Core promotion, Compose mutation, secret mount, Semantic/Fast Read activation, Task Drain mutation, provider call, VendaERP call, customer work or outbound effect is authorized by this checkpoint.

## SECOND ADVERSARIAL REVIEW

JEV `jev-1.13.0` reviewed the exact decision and evidence after the deterministic decision was formed.

Result:

- route = `block`;
- confidence = `0.93`;
- `block = 0.95`;
- `split_task = 0.04`;
- `deep_review = 0.01`;
- `proceed_fast = 0`.

The review specifically received the fresh GitHub/runtime/candidate/quiescence evidence, the missing fresh rollback bundle, the secret-safe MCP limitation, the one-mutation scope and the prohibition on permission expansion.

The advisory result is consistent with the deterministic rollback gap. It does not replace repository/runtime authority.

## EXECUTION

No production mutation was executed.

Read-only diagnostics included current GitHub/CI/artifact reconciliation, safe Docker inspection, Paperclip Task Drain readback, Paperclip plugin CLI inspection, Gateway/Core startup-log readback and safe filesystem listing outside denied secret paths.

Two read-only Docker image-enumeration attempts through the restricted Docker proxy returned `404`; they did not mutate Docker state and were not bypassed.

The secret-path guard denial was accepted as a boundary, not worked around.

## VALIDATION

Post-decision state remains:

- live Core unchanged;
- live Paperclip unchanged at v2026.916.0;
- Organization Adapter unchanged at 0.3.1;
- Semantic/Fast Read/custody overlays absent from live Core;
- Human Send OFF;
- Messaging Gateway outbound OFF;
- Task Drain not mutated;
- no provider/model/VendaERP/customer/WhatsApp call;
- no deployment or migration.

## Next slice

Close the evidence gap separately:

**Production Rollback Freeze + Secret Metadata Readback V1 — operator-local / NO ACTIVATION / NO CUSTOMER EFFECT**

That slice should reuse the accepted ADR 0129 recovery pattern to capture a fresh protected rollback set, and use an approved metadata-only operator path for the canonical Core secret files without reading values or weakening secret policy.

After that checkpoint is complete, rerun **Immediate Pre-Mutation Attestation + Effect Authorization** from fresh state. Do not reuse this attestation as future authorization.
