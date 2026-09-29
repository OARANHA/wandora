# ADR 0347 — Semantic Fast Read Production Attestation V1 — Browser-Owned Trigger Preflight Blocked

Date: 2026-09-29

Status: **BLOCKED BEFORE ATTESTATION OPEN / BASELINE PRESERVED / NO HUMAN FAST READ / NO BUSINESS PROVIDER OR CUSTOMER EFFECT**

## Objective

Prepare the next bounded Semantic Fast Read production attestation from fresh repository, CI and runtime evidence, and execute exactly one browser-owned owner/admin Human Fast Read only if every precondition is proven immediately before opening.

The opening was not authorized because the required browser-owned execution boundary is not available in this operator session. The slice therefore stopped fail-closed before any Core composition mutation.

## REAL NOW

Fresh repository/GitHub reconciliation proved:

- current `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 remains open, draft and mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- current PR head = `1ee7c6e888d740510d192a4a1c3364dedf961853`;
- exact-head CI = **17/17 workflows GREEN**.

Fresh production readback proved:

- Core = `wandora/core:organization-adapter-candidate-14534e57256f`;
- Core OCI manifest/image id = `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- Core revision = `14534e57256f0a73c49feb3944a1068921468f94`;
- Core is healthy with restart count 0;
- Paperclip = `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy with restart count 0;
- exactly one `wandora.organization-adapter-v1@0.6.1` is installed, `ready`, `lastError=null`, at content-addressed package `80373a61...`;
- Messaging Gateway is healthy with restart count 0;
- Task Drain = `false / 0 / 0 / quiescent=true`.

Core startup remains inert:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `vigiaTelemetry=true`.

Messaging Gateway startup remains `outboundEnabled=false`.

## PROVEN EVIDENCE

### Baseline composition and mounts

Live Core inspect reports the same 14-file production Compose provenance qualified by ADR 0346, ending with:

- `compose.semantic-fast-read.yaml`;
- current Vigia overlay `compose.vigia.yaml`.

The baseline contains no custody or attestation overlay. Live mounts include the existing model-provider, Organization Adapter, Paperclip execution-bridge and Vigia credentials, but do **not** include the TypeSafe/System One or `wfri1` attestation mounts.

Because the browser hard gate below failed before opening authorization, this slice intentionally did not render or apply the opening composition. A fresh opening-time `docker compose config --quiet` plus `config --images` remains mandatory for any later retry and ADR 0346's earlier render is not reused as future authorization.

### Rollback and custody evidence

The ADR 0345 rollback receipt remains present at:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-e4c7c36bb1091ba38d39b85fa259bae94553fc52.metadata`

and still terminates in:

`ROLLBACK_FREEZE_V2_OK`.

The receipt records the intended prior `e4c7 + OA 0.6.1 + Vigia` rollback baseline, healthy Paperclip/Gateway, quiescent Task Drain, gates OFF, custody/attestation overlays absent, official backup/restore proof and metadata-only custody for TypeSafe/System One, `wfri1`, Mistral and Vigia.

The receipt metadata is rollback evidence, not a substitute for a fresh opening-time custody read. No new root custody metadata execution was requested after the browser hard gate failed.

### Tool Policy read attempt

One fresh company Tool Policy list and one fresh governed Tool Policy test for the intended 28PRO/Ana/VendaERP path both reached Paperclip and returned HTTP 200.

The enclosing client/tool call was then blocked before their response bodies were returned to this session. State-first log readback proved the two operations happened, so they were **not repeated** merely because the result payload was lost.

Consequently the exact fresh `allow / allow_profile` response body required for an opening was not available as proven evidence in this slice. Historical ADR 0338 evidence was not promoted into fresh authorization.

### Fresh Organization Adapter operational read

Exactly one fresh `operational-read` was then executed through the existing Paperclip plugin-data bridge.

It returned:

- `runtimeHealth=ok`;
- VendaERP Connection display name `Wandora VendaERP Read-Only V1`;
- `status=active`;
- `enabled=true`;
- `healthStatus=ok`;
- `organizationGrantActive=true`;
- `installedForAgent=true`;
- `vendaerp_search_products` active, risk `read`, read-only, non-write, non-destructive and allowed by the effective profile;
- the other mapped read tools remain active with the same read-only/non-destructive properties.

Per the qualified contract, this read is Paperclip-owned/cache-only and did not execute VendaERP.

## GAPS

Two opening prerequisites are not proven for this session:

1. the exact response body from the fresh Tool Policy qualification is unavailable after the client-layer tool block and was deliberately not replayed;
2. most importantly, this operator session has no legitimate capability to execute the required request *inside the already-authenticated owner/admin Wandora browser session*.

The canonical owner/admin browser trigger runbook requires browser-owned session authority. Bearer token/cookie export, impersonation, alternate admin endpoints and browser-authority internalization are prohibited.

This session has no local browser-control surface bound to the user's authenticated Wandora browser. Opening first and waiting for an out-of-band/manual request would create an uncontrolled production window and is not an acceptable substitute.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

No Wandora subsystem is missing:

- browser/session authority remains browser-owned;
- Wandora remains semantic/effect authority;
- Paperclip remains operational Connection/tool/run authority;
- Organization Adapter remains the bounded provider-neutral projection;
- TypeSafe/System One and Mastra/Mistral remain replaceable providers.

The correct response to the browser boundary is **not** to add a Remote-Ops browser proxy, copy tokens, create an alternate admin endpoint, widen MCP permissions, add a session store or impersonate the human.

No new table, migration, registry, lifecycle, cache, secret store, orchestration path or provider implementation is justified.

## DECISION

**DO NOT OPEN the Semantic Fast Read production attestation window in this session.**

No custody/attestation overlay may be mounted, no Semantic Fast Read/Selector gate may be enabled and no Core recreation may be performed.

This decision is reached before production mutation; therefore no production approval ticket is requested.

## SECOND ADVERSARIAL REVIEW

A fresh JEV 1.13.0 adversarial review was asked whether any evidence justified opening despite the missing browser-owned trigger boundary and incomplete fresh policy-result payload.

Result:

- route = `block`;
- `block=0.97`;
- `deep_review=0.03`;
- `proceed_fast=0`;
- confidence = `0.96`.

The advisory review agrees with the deterministic runbook stop condition.

## EXECUTION

No attestation opening was executed.

Read-only/preflight activity in this slice was limited to:

- repository/PR/CI reconciliation;
- runtime/container/plugin/Task Drain readback;
- one fresh OA `operational-read`;
- one Tool Policy list and one Tool Policy test that were proven executed by state-first logs after their client result was lost;
- rollback receipt readback;
- JEV governance review.

Not executed:

- Core recreation;
- custody overlay;
- attestation overlay;
- Fast Read/Semantic/Selector activation;
- Human Fast Read;
- TypeSafe/System One customer-route decision;
- Mistral selector call;
- Paperclip Fast Read run;
- VendaERP read;
- retry or second read;
- Human Send;
- Gateway outbound;
- WhatsApp/customer outbound.

## VALIDATION

Final readback after the decision proves:

- all seven Wandora containers remain running/healthy;
- Core remains exact `14534e...`;
- Paperclip remains v2026.916.1;
- OA remains exactly one 0.6.1 ready;
- Task Drain remains `false / 0 / 0 / quiescent=true`;
- Core Fast Read/Semantic/Human Send remain OFF;
- Gateway outbound remains OFF;
- no custody or attestation overlay was introduced.

## Next boundary

A retry is a **new production attestation slice**, not a continuation of authorization from this one.

Before any future opening it must again perform fresh REAL NOW and all mutable gates, including exact Tool Policy result, fresh OA operational-read, rollback/custody applicability, and opening-time `config --quiet` + exact `config --images`.

Most importantly, the legitimate already-authenticated owner/admin browser execution surface must be available **before** opening. Browser Bearer/cookie authority must remain in the browser and must not cross into Remote-Ops, terminal, MCP or operator tooling.
