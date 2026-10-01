# ADR 0319 — Semantic Fast Read Human Preflight Attempt V1

Date: 2026-09-28

Status: **HUMAN PREFLIGHT GREEN / HUMAN FAST READ NOT EXECUTED / ATTESTATION WINDOW CLOSED / BASELINE RESTORED**

## Objective

Record the bounded Semantic Fast Read production-attestation attempt that progressed through a valid owner/admin browser preflight but did not execute the Human Fast Read request because the mandatory close approval path expired/was blocked before the customer request boundary. Preserve the fail-closed result and the exact restored baseline.

This ADR does not authorize a new attestation attempt.

## REAL NOW before opening

Fresh repository/runtime evidence established:

- PR #369 source head was `b482ca060924951ccb0157d49dd242da36a4e3c5` with 17/17 exact-head workflows GREEN;
- Rollback Freeze V2 post-capture precheck returned `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- Core baseline image was `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core image digest was `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- Core revision was `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Messaging Gateway startup evidence showed `outboundEnabled=false`;
- Paperclip Tool Policies list was empty;
- the qualified `vendaerp_search_products` policy test remained `allow / allow_profile` with no audit event.

The installed custody and attestation overlays were proven byte-for-byte against the GREEN PR head.

## ADR 0317 image-identity hard gate

A fresh non-secret render input explicitly pinned:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-2c2142237c9c`

The exact active Core Compose chain plus custody then attestation overlays was rendered with:

- `docker compose ... config --quiet` => exit 0;
- separately, `docker compose ... config --images` => exactly `wandora/core:organization-adapter-candidate-2c2142237c9c`.

This closed the image-identity gap that invalidated ADR 0317.

## Bounded opening

After a fresh adversarial review and explicit human approval, only `wandora-core` was recreated with:

- exact pinned image;
- no build;
- no pull;
- no dependency recreation;
- custody overlay appended;
- attestation overlay appended last.

Immediate state-first readback proved:

- Core healthy, restart count 0;
- exact expected image, digest and revision;
- custody + attestation present in active Compose provenance;
- TypeSafe/System One and `wfri1` mounted read-only;
- `fastReadExecution=true`;
- `semanticFastRead=true`;
- `humanSendProposal=false`;
- Gateway remained `outboundEnabled=false`;
- Task Drain remained quiescent.

No browser request had yet been executed.

## Human browser preflight

The canonical owner/admin browser procedure was run only with:

`EXECUTE = false`

The human-controlled browser session proved:

- organization = `28PRO`;
- role = `owner`;
- exactly one active digital employee named `Ana`;
- request text = `Qual é o preço do produto PREMIUM PLUS?`;
- `executionAuthorizedLocally=false`.

The browser preflight returned successfully.

The human explicitly confirmed that no second script/action was executed and `EXECUTE` was never changed to `true`.

Therefore:

- no Human Fast Read request was sent;
- no TypeSafe semantic-route call was initiated by the browser request;
- no Mistral selector call was initiated by the browser request;
- no VendaERP read was initiated by the browser request;
- no ERP write occurred;
- no Human Send occurred;
- no Gateway outbound occurred;
- no WhatsApp Fast Read occurred.

## Close-path interruption

A previously prepared mandatory-close approval expired before successful server-side execution. Attempts to use or replace that approval were blocked/expired before managed-admin execution.

State-first readback proved that the attestation window remained open and healthy; no hidden close had occurred.

The human was explicitly instructed not to execute `EXECUTE=true`.

A fresh deep review required re-proving the exact baseline close render before issuing another close approval.

The baseline close render then passed:

- `config --quiet` => exit 0;
- `config --images` => exactly `wandora/core:organization-adapter-candidate-2c2142237c9c`.

## Mandatory close

A fresh close approval was prepared and explicitly confirmed.

The close executed exactly once and recreated only `wandora-core` with the exact pre-attestation Compose chain ending at:

`compose.semantic-fast-read.yaml`

The custody and attestation overlays were excluded.

No build, pull or dependency recreation occurred.

## Restored baseline validation

Fresh post-close readback proves:

- Core is running and healthy;
- restart count = 0;
- image = `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- digest = `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- revision = `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- active Compose provenance ends at `compose.semantic-fast-read.yaml`;
- custody and attestation overlays are absent;
- TypeSafe/System One and `wfri1` mounts are absent;
- Core startup reports `fastReadExecution=false`;
- Core startup reports `semanticFastRead=false`;
- Core startup reports `humanSendProposal=false`;
- Paperclip remains healthy;
- Messaging Gateway remains healthy and `outboundEnabled=false`;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

This attempt created no new lifecycle, orchestration, approval system, provider implementation, secret manager, run mirror, registry, table, migration or duplicate provider-owned capability.

The only production execution boundary remained the existing governed Remote-Ops managed-admin path.

## Result

**FAIL-CLOSED / HUMAN PREFLIGHT GREEN / HUMAN FAST READ NOT EXECUTED / BASELINE RESTORED / NO CUSTOMER OR OUTBOUND EFFECT.**

A later retry is a new slice. It must restart from fresh REAL NOW, current exact-head CI, runtime/rollback/custody/provider qualification, exact image-pinned render, a newly prepared close path that remains valid across the human browser window, a fresh decision, a fresh second adversarial review and new human approvals.

No approval from this attempt may be reused.
