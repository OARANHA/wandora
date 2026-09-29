# ADR 0345 — Current Vigia Core Rollback V2 Persistent Capture V1

Date: 2026-09-29

Status: **PERSISTENT CAPTURE EXECUTED + VALIDATED / CURRENT E4C7 ROLLBACK V2 READY / HISTORICAL RECEIPTS PRESERVED / CORE PROMOTION NOT AUTHORIZED**

## Objective

Execute exactly one persistent Rollback Freeze V2 capture for the current production baseline after ADR 0344 proved source requalification, exact-byte host deployment and a GREEN root precheck.

ADR 0168 remains binding. This slice reused the existing zero-argument `wandora-rollback-freeze-v2-capture` managed-admin capability and the existing Rollback Freeze V2 implementation. No new backup subsystem, lifecycle service, approval mechanism, orchestration layer or provider implementation was introduced.

## Fresh entry state

Immediately before capture:

- PR #369 head = `9bcad382bed0e40178e63530d98ad77c7ce2f727`;
- exact head CI = **17/17 GREEN**;
- Core = `wandora/core:organization-adapter-candidate-e4c7c36bb109`;
- Core image id = `sha256:ee5db7ffa1114b78670e713f374801730ab556d33a02183e19ef87742c121846`;
- Core revision = `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- Core healthy, restart count 0;
- Paperclip healthy on `wandora/paperclip:v2026.916.1`, restart count 0;
- exactly one Organization Adapter `0.6.1` ready at package path `80373a61.../package`;
- Messaging Gateway healthy, restart count 0, outbound disabled;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- current-baseline receipt absent;
- ADR 0344 root precheck already GREEN with `ROLLBACK_FREEZE_V2_PRECHECK_OK`.

A fresh adversarial review returned `confirm` with probability `0.98`. A fresh one-use human approval then authorized exactly the existing capture capability.

## Capture execution

Executed exactly once through managed-admin:

`wandora-rollback-freeze-v2-capture`

Result:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- duration = `31816 ms`;
- terminal marker = `ROLLBACK_FREEZE_V2_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

The new current-baseline receipt is:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-e4c7c36bb1091ba38d39b85fa259bae94553fc52.metadata`

The protected rollback root recorded by the receipt is:

`/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-e4c7c36bb109-20260929T210756570223976Z`

## Independent receipt validation

Readback of the newly published receipt proves:

- Paperclip image/id/commit and exact Compose provenance match the qualified production baseline;
- Core image/id/revision match the live `e4c7...` baseline;
- Core health = healthy, restart count = 0;
- exact active Core Compose provenance includes the Semantic Fast Read gates-OFF overlay, agent runtime model overlay and current Vigia overlay;
- Gateway health = healthy, restart count = 0;
- exactly one OA `0.6.1` is ready at the expected package path;
- `semantic_fast_read_gates_off=true`;
- custody overlay not live;
- attestation overlay not live;
- Task Drain quiescent;
- official Paperclip backup created;
- official backup gzip validation succeeded;
- protected master-key source/copy equality check succeeded without exposing the key or digest;
- disposable PostgreSQL restore succeeded;
- normalized live/restored schemas are equal;
- TypeSafe, wfri1, Mistral and Vigia custody are represented by metadata only;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal marker = `ROLLBACK_FREEZE_V2_OK`.

## Post-capture runtime validation

Fresh runtime readback after capture proves:

- same Core container id `8f49645a35fb064f1ef36bdaf1864dd8ffc2fea70d89af2895b4e1eedc727e02`;
- same Core start time `2026-09-29T19:49:00.640957248Z`;
- same Core image id/revision;
- Core healthy / restart count 0;
- same Paperclip start time, healthy / restart count 0;
- same Gateway start time, healthy / restart count 0;
- Task Drain still `false / 0 / 0 / quiescent=true`.

Historical Rollback V2 receipts for the earlier `2c214...` and `b2cff...` baselines were independently read back after capture and remain present.

## Decision

Classify the current `e4c7 + OA 0.6.1 + Vigia` rollback boundary as **READY**.

The current production baseline now has an independently validated persistent Rollback Freeze V2 artifact and receipt suitable as the rollback anchor for a later Core-only compatibility promotion.

This does **not** authorize that promotion.

## Effect boundary

Not executed in this slice:

- Core image promotion to `9acbf98...`;
- Core restart/recreation;
- Semantic Fast Read opening;
- Mistral selector invocation;
- VendaERP read;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp/outbound;
- any customer/provider effect.

## Next boundary

Next slice:

**Current Vigia + Semantic Fast Read Core Compatibility Promotion V1**

It must begin from fresh REAL NOW reconciliation of main, PR #369, exact-head CI and production runtime; re-prove the exact candidate image/digest and exact Compose resolution; perform a fresh decision and second adversarial review; require a new one-use human approval for the Core-only recreation; validate health/readiness/image/revision/gates/OA/Paperclip/Gateway/Task Drain after promotion; and fail closed with rollback to this `e4c7` boundary on any ambiguity.

Semantic Fast Read attestation remains a later, separate slice.
