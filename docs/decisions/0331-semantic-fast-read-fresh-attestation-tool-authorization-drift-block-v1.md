# ADR 0331 — Semantic Fast Read Fresh Attestation Preflight — Tool Authorization Drift Block V1

Date: 2026-09-29

Status: **BLOCKED BEFORE OPENING / REQUIRED VENDAERP READ AUTHORIZATION DENIED / NO APPROVAL PREPARED / NO PRODUCTION OR PROVIDER EFFECT**

## Objective

Start the fresh Semantic Fast Read attestation slice after ADR 0330 Current-Core Rollback V2 completion and determine, from current repository/GitHub/runtime evidence, whether the bounded attestation window may be opened.

The intended future attestation remains exactly one authenticated owner/admin Human Fast Read for active Ana in 28PRO:

`Qual é o preço do produto PREMIUM PLUS?`

This ADR records a fresh mandatory-gate failure discovered before any production mutation.

## REAL NOW

Fresh repository/GitHub reconciliation proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact entry head = `2493236ec19624cf17110ac933ce7394c13478fa`;
- that exact head completed **17/17 workflows GREEN**, with zero pending and zero failed runs;
- ADR 0330 is present at that head and records the completed Current-Core Rollback V2 capture.

Fresh production readback proved:

- Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- Core image id = `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- Core revision = `b2cffbb54089212844ef177827e7a616b1008144`;
- Core is healthy with restart count 0;
- active Core Compose provenance remains the gates-OFF baseline ending at `compose.semantic-fast-read.yaml`;
- TypeSafe/System One and `wfri1` attestation mounts are absent;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip = `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy with restart count 0;
- exactly one `wandora.organization-adapter-v1@0.5.0` is installed, `ready`, `lastError=null`;
- Messaging Gateway remains healthy and startup reports `outboundEnabled=false`;
- Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Remote-Ops is healthy on `ghcr.io/oaranha/remote-ops-mcp:sha-677712a`, revision `677712aa48b41144df2bdcd285919a5eec2bd7be`;
- the managed-admin target still exposes the existing dedicated Rollback V2 precheck/capture programs; no new authority was added in this slice.

Fresh Paperclip readback for company 28PRO proved:

- company id = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- Ana id = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Ana remains in the historical `error / wandora_execution_failed_422` state;
- Ana organization-chain health remains `healthy`.

The historical Ana error state was already separately qualified as not being the deterministic attestation blocker by ADR 0325. No agent recovery or mutation was attempted here.

## Current-Core rollback evidence

The fresh Current-Core receipt was independently re-read from:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-b2cffbb54089212844ef177827e7a616b1008144.metadata`

It proves the exact live b2cff Core baseline, Paperclip v2026.916.1, Gateway, one OA 0.5.0, Task Drain quiescence, official backup creation, gzip validation, disposable restore, schema equality, metadata-only TypeSafe/`wfri1`/Mistral custody and:

- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- `ROLLBACK_FREEZE_V2_OK`.

The historical receipt `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata` was also re-read and remains intact for the prior Core `2c214...` baseline.

Therefore the ADR 0325 current-Core rollback-readiness blocker is closed.

## Fresh provider / Business System authorization gate

The attestation runbook requires fresh exact proof that the single qualified Business System read is currently authorized before opening the production window.

Fresh read-only Paperclip evidence returned:

- Tool Policies list for 28PRO = `[]`;
- actor = Ana agent `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- tool = `vendaerp_search_products`;
- arguments = `{"pageSize":5,"skip":0}`;
- `sideEffecting=false`;
- `consumeRateLimit=false` and `writeAuditEvent=false` are forced by the governed qualification capability;
- decision = `deny`;
- reason = `deny_default`;
- explanation = `No effective tool profile, grant, or allow policy permits this call.`;
- effective profile ids still include `259a5449-58ba-4d59-9774-92612e3caa91`;
- matched policy ids = `[]`;
- audit event = `null`.

No VendaERP request was issued.

ADR 0325 previously recorded the required path as `allow / allow_profile`. The fresh result is therefore either real operational authorization drift or an unresolved difference in the currently effective Connection/grant/profile state. Historical allow evidence cannot override the current deny.

## GAPS

The attestation window cannot be opened until the required read authorization is freshly GREEN.

The exact missing evidence is now narrower:

1. reconcile the current Paperclip Connection/install/grant/tool-profile state that should authorize `vendaerp_search_products` for the 28PRO Ana path;
2. determine why the same effective profile id is present while the official policy evaluation now returns `deny_default`;
3. prove the authorized path again through the existing Paperclip authority, without calling VendaERP and without creating a temporary allow policy merely to make the attestation pass;
4. only after that gap is closed, restart the entire freshness-sensitive Semantic Fast Read preflight, including exact overlays/renders and effect authorization.

No attempt was made to continue to the later render/opening gates after this mandatory authorization gate failed.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

This denial does not justify a new Wandora tool registry, Connection/grant mirror, policy engine, secret manager, lifecycle, retry engine, cache, state machine or provider implementation.

Authority remains:

- Wandora: semantic/product/effect policy and the provider-neutral Fast Read contract;
- Paperclip: Connection/install/grant/tool-profile/Tool Gateway/run/result/audit operational authority;
- TypeSafe/System One: semantic-route provider;
- Mastra/Mistral: selector/runtime implementation;
- VendaERP: replaceable read provider;
- Remote-Ops: governed production operator boundary;
- authenticated owner/admin browser: Human Fast Read actor boundary.

The next gap-closure work must inspect and reuse the existing Paperclip authority. Do not add a temporary allow policy, widen Remote-Ops or duplicate Paperclip state just to bypass this deny.

## Decision

**STOP BEFORE OPENING THE ATTESTATION WINDOW.**

Do not prepare an opening approval.

Do not mount custody/attestation overlays.

Do not recreate Core.

Do not execute the owner/admin browser Human Fast Read.

Do not call TypeSafe, Mistral or VendaERP.

Do not modify Paperclip Tool Policies, grants or Connection state inside this attestation slice.

## Second adversarial review

A fresh independent JEV 1.13.0 guard review challenged the stop decision using the current rollback/runtime evidence and the fresh official Paperclip authorization result.

Result:

- decision = `deny`;
- deny = `0.90`;
- allow = `0.07`;
- confirm = `0.02`;
- review = `0.01`;
- confidence = `0.87`.

The advisory result agrees with the deterministic runbook stop condition. It does not replace provider authority or human authorization.

## Effects accounting

This slice performed read-only repository/GitHub/runtime reconciliation, safe Paperclip CLI reads and one governed no-rate-limit/no-audit policy qualification.

It performed zero:

- production container recreation;
- custody/attestation mount;
- Fast Read/Semantic/Selector activation;
- managed-admin prepare/apply;
- approval creation or reuse;
- TypeSafe/Mistral call;
- VendaERP provider call;
- Human Fast Read;
- customer work;
- Human Send;
- Gateway/WhatsApp outbound;
- Tool Policy/grant/Connection mutation;
- secret-value read.

## Next boundary

Start a separate:

**Paperclip VendaERP Tool Authorization Drift Reconciliation V1 — READ-ONLY / NO PROVIDER CALL / NO POLICY MUTATION**

Reconcile the current Paperclip Connection/install/grant/profile authority and explain the fresh `deny_default` using provider-owned state.

If the existing intended authorization is proven and can be restored only through a legitimate separately reviewed provider-authority change, treat that change as its own decision/effect slice. Do not combine it with Semantic Fast Read attestation opening.

Only after the required `vendaerp_search_products` qualification is freshly GREEN may a brand-new Semantic Fast Read attestation preflight start from REAL NOW. No approval from any historical attestation or rollback slice is reusable.
