# ADR 0316 — Semantic Fast Read Bounded Production Attestation Preflight V2

Date: 2026-09-28

Status: **PRE-MUTATION EVIDENCE RECONCILED / NEXT BOUNDED EFFECT IDENTIFIED / EXPLICIT HUMAN CONFIRMATION REQUIRED / NO PRODUCTION MUTATION**

## Objective

Resume from ADR 0315 and determine the exact next Semantic Fast Read production boundary from current repository, CI and runtime evidence.

This ADR does not activate Semantic Fast Read, does not mount new live custody, does not recreate Core, does not call TypeSafe/Mistral/VendaERP, does not create customer work and does not enable Human Send, Messaging Gateway outbound or WhatsApp.

## REAL NOW

Fresh GitHub reconciliation before this documentation change proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head = `2b8e8127956ea92318ee7a790823cd8285b98f25`;
- current merge ref = `0c32247ccf71b0c822e1f1f60c47bd901e445e19`;
- all **17/17** workflows on that exact source head completed successfully, with no pending or failed workflow.

Fresh production readback proved:

- Remote-Ops health = `ok`, OAuth, non-mock;
- Remote-Ops image = `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`, OCI revision `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- ops agent = active/running, PID `1705827`, restart count 0;
- admin broker = active/running, PID `2368034`, restart count 0;
- exec broker = active/running, PID `3015740`, restart count 0;
- seven Wandora containers are running/healthy;
- Core = `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, healthy, restart 0;
- Core active Compose provenance includes `compose.semantic-fast-read.yaml` and excludes both `compose.semantic-fast-read-custody.yaml` and `compose.semantic-fast-read-attestation.yaml`;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false` and `humanSendProposal=false`;
- the active gates-OFF overlay sets Semantic Selector OFF;
- Paperclip = `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, authenticated/private, healthy, restart 0;
- exactly one `wandora.organization-adapter-v1@0.5.0` is installed, `ready`, `lastError=null`;
- Messaging Gateway is healthy and startup reports `outboundEnabled=false`;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No effect occurred during these reads.

## PROVEN EVIDENCE

The canonical ADR 0315 Rollback V2 receipt was independently re-read from:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`

Its current Paperclip/Core/Organization Adapter/Gateway/Compose anchors match the fresh runtime above.

The receipt also records:

- official Paperclip backup created and gzip-valid;
- disposable PostgreSQL restore succeeded;
- schema equality passed;
- TypeSafe/System One, `wfri1` and Mistral custody as regular `wandora-admin:wandora-ops 0640` files;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal marker `ROLLBACK_FREEZE_V2_OK`.

The ADR 0315 approval is historical execution evidence only and must not be reused.

A fresh Paperclip read-only policy qualification for the already-qualified 28PRO/Ana VendaERP path returned:

- tool = `vendaerp_search_products`;
- arguments = `{pageSize:5, skip:0}`;
- `sideEffecting=false`;
- decision = `allow`;
- reason = `allow_profile`;
- effective profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- temporary matched policy ids = `[]`;
- audit event = `null`.

The current company Tool Policies list is empty. The qualification did not consume a rate limit, did not write an audit event and did not call VendaERP.

## GAPS

There is no longer a proven need for another rollback/custody/provider-capability implementation slice before the bounded attestation.

The remaining execution-time conditions are intentionally human/effect boundaries, not missing subsystems:

1. the actual production mutation must receive fresh explicit human confirmation;
2. the owner/admin Human Fast Read must be initiated from a legitimate already-authenticated Wandora browser session;
3. the operator plane must never receive, export or impersonate the customer Bearer token;
4. immediately before any mutation, the freshness-sensitive runtime evidence must be rechecked;
5. after the single request, or on any ambiguity/failure, the attestation window must be closed immediately.

## Capability Authority / Reuse Gate

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

Authority remains separated:

- Wandora: semantic/product/effect authority, `BusinessCapability`, `wfri1`, deterministic admission/post-filter and human authorization;
- Paperclip: workforce/run lifecycle, Connections/grants/secrets, Tool Gateway execution/authorization, terminal result and audit;
- TypeSafe/System One: replaceable semantic-route provider;
- Mastra + Mistral: replaceable selector/runtime implementation;
- VendaERP: replaceable Business System read provider;
- Messaging Gateway/Evolution: separate transport boundary;
- Remote-Ops: governed production operator/root execution boundary.

No new table, migration, lifecycle, run mirror, registry, retry engine, cache, secret manager, orchestration subsystem, approval subsystem or provider implementation is justified.

## Decision

The next canonical Semantic Fast Read slice is:

**Semantic Fast Read Bounded Production Attestation V1 — EXACTLY ONE OWNER/ADMIN HUMAN FAST READ / MANDATORY WINDOW CLOSE**

The effect, if separately confirmed later, is bounded to:

1. start from the exact current Core image and exact live Compose provenance;
2. append the already-qualified `compose.semantic-fast-read-custody.yaml`;
3. append `compose.semantic-fast-read-attestation.yaml` last;
4. enable exactly:
   - `WANDORA_FAST_READ_EXECUTION_ENABLED=true`;
   - `WANDORA_SEMANTIC_FAST_READ_ENABLED=true`;
   - `WANDORA_SEMANTIC_SELECTOR_ENABLED=true`;
5. keep `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`;
6. keep Messaging Gateway outbound and WhatsApp Fast Read OFF;
7. validate the bounded window before customer execution;
8. allow exactly one already-authenticated owner/admin browser Human Fast Read using the prepared browser-owned procedure;
9. require exactly the qualified product-selector + price read path with zero automatic retry, no second ERP read and no ERP write;
10. close the window immediately after that one request or any ambiguity/failure by returning Core to the exact pre-attestation gates-OFF composition and removing custody/attestation overlays unless a separate later decision says otherwise.

A GREEN attestation is evidence for a later activation decision. It is not customer rollout authorization.

## Second adversarial review

A fresh JEV 1.13.0 task-route review over the reconciled evidence returned:

- `proceed_fast = 0.76`;
- `deep_review = 0.15`;
- `block = 0.08`;
- `split_task = 0.01`;
- selected route = `proceed_fast`.

A second guard focused on the exact production effect returned:

- `confirm = 0.63`;
- `deny = 0.34`;
- `review = 0.03`;
- `allow = 0.00`;
- selected decision = `confirm`.

The reviews are advisory. The deterministic consequence is a hard stop before production mutation until fresh explicit human confirmation is obtained.

## Execution

No production execution was performed.

In particular:

- no Core recreation;
- no custody mount;
- no attestation overlay;
- no Fast Read/Semantic/Selector gate activation;
- no Task Drain mutation;
- no provider/model/VendaERP call;
- no Human Fast Read;
- no Human Send;
- no WhatsApp;
- no Gateway outbound;
- no customer work;
- no new managed-admin approval.

## Validation

The pre-documentation head was 17/17 GREEN and the runtime remained healthy/inert after all governed read-only checks.

The Rollback V2 receipt remains present and its runtime anchors match the current live baseline.

## Next boundary

Stop before the first production mutation.

A later continuation must first re-read the exact repository head/CI and mutable runtime state because this documentation commit changes the PR head and production state may drift.

Then, and only after the exact mutation is frozen, use the appropriate governed operator boundary and require a **new explicit human confirmation**. Do not reuse `adm_cccf18ab2668c5e094cee2be` or any older approval.

The browser-owned owner/admin execution remains separately human-controlled and must never be replaced by operator impersonation.
