# ADR 0375 — Semantic Fast Read Scoped Rollout Activation + Immediate Runtime Attestation V1

Date: 2026-10-01

Status: **GREEN / SCOPED ACTIVATION LIVE / NO CUSTOMER OR PROVIDER CALL IN THIS CHECKPOINT**

## Context

ADR 0374 intentionally stopped before activation because rollout-host materialization, fresh custody metadata and an immediate Paperclip/Organization Adapter operational projection still had to be proven.

This slice resumed from fresh runtime evidence and preserved the ADR 0168 boundary: Wandora owns semantic/effect rollout admission, while Paperclip remains operational authority for Connection/tool/profile state. No shadow lifecycle, registry or provider implementation was introduced.

## Proven pre-activation evidence

- live/stable Core revision remained `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- OCI manifest remained `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- exact current production baseline remained the established 14-file gates-OFF topology;
- rollback receipt from ADR 0373 remained current;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Human Send was OFF and Messaging Gateway outbound was OFF;
- Paperclip Organization Adapter operational projection was healthy;
- the known VendaERP Connection was active/healthy/read-only and `vendaerp_search_products` remained allowed by the effective profile;
- official Tool Policy test returned `allow / allow_profile` with no audit event and no rate-limit consumption.

## Rollout host materialization

The Git-qualified rollout overlay was materialized at:

`/opt/wandora/stacks/core/compose.semantic-fast-read-rollout.yaml`

Independent host hashing returned exactly:

`b58c6a91fe1dbbabd047bdf13189ccd90c5c24d9`

matching the qualified Git blob.

Fresh custody metadata through the existing dedicated managed-admin capability returned only safe metadata and proved the TypeSafe/JEV key, Fast Read intent HMAC and model-provider key are regular files owned by `wandora-admin:wandora-ops` with mode `0640`. No secret value was read or copied.

## Exact scoped render

A human-approved read-only managed-admin Compose render used the exact live 14-file baseline plus:

- `compose.semantic-fast-read-custody.yaml`;
- `compose.semantic-fast-read-rollout.yaml`.

The exact deployment-owned rollout scope rendered as:

- organization: 28PRO — `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- employee: Ana — `7b401163-8102-42db-b595-3a2017f54003`;
- sole BusinessCapability: `business.products.price`.

The render proved:

- image `wandora/core:organization-adapter-candidate-9ee338303292`;
- Fast Read Execution = ON;
- Semantic Fast Read = ON;
- Semantic Selector = ON;
- scoped rollout admission = exact 28PRO/Ana pair and exact capability above;
- Human Send = OFF;
- TypeSafe/JEV and Fast Read intent mounts = read-only;
- existing model-provider mount = read-only;
- no new port or network boundary.

No container was recreated by the render.

## Decision and second adversarial review

The activation design was reviewed after the exact render and fresh negative live proof.

JEV returned:

- decision: `confirm`;
- `confirm=0.74`;
- confidence `0.64`.

The action remained bounded to one Core recreation with:

- exact current baseline + custody + rollout overlays;
- `--no-deps`;
- `--force-recreate`;
- `--no-build`;
- `--pull never`;
- `--wait`.

No customer request or provider call was included in the activation action.

## Human-approved activation

The one-use managed-admin activation was explicitly approved and executed once.

Docker reported only:

- `wandora-core Recreate`;
- `wandora-core Recreated`;
- `wandora-core Starting`;
- `wandora-core Started`;
- `wandora-core Waiting`;
- `wandora-core Healthy`.

Execution exited 0 in approximately 7.1 seconds.

## Immediate runtime attestation

Post-activation readback is GREEN:

- new Core container id begins `28c86cd5de7d...`;
- same OCI image manifest `sha256:fbb3c420...`;
- same revision `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- restart count 0;
- healthy;
- Compose provenance is the exact prior 14-file baseline plus custody + rollout overlays, for 16 files total;
- TypeSafe/JEV and Fast Read intent mounts are present read-only;
- model-provider mount remains read-only;
- startup reports `fastReadExecution=true`;
- startup reports `semanticFastRead=true`;
- startup reports `semanticFastReadRollout=true`;
- startup reports `humanSendProposal=false`;
- Messaging Gateway remains `outboundEnabled=false`;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

Fresh Paperclip operational read after activation still reports the VendaERP read-only Connection active/healthy with organization grant active and all projected tools read-only/non-destructive. A fresh non-consuming Tool Policy test for Ana + the known Connection + `vendaerp_search_products` again returned `allow / allow_profile` with `auditEvent=null`.

## Effects

This checkpoint performed the explicitly approved Core activation only.

It did **not** perform:

- any customer/browser Fast Read request;
- any Ana execution;
- any VendaERP/provider call;
- any Human Send;
- any Messaging Gateway outbound;
- any Paperclip lifecycle mutation;
- any migration;
- any PR merge.

## Decision

**Semantic Fast Read Scoped Rollout Activation + Immediate Runtime Attestation V1 is GREEN.**

The scoped activation is live only for the exact 28PRO/Ana/`business.products.price` admission tuple. This checkpoint does not authorize broader rollout by implication.

## Next boundary

The next slice is a separately governed **single real canary read** for the exact enrolled tuple.

Before any real canary request:

1. reconcile fresh runtime/Paperclip state;
2. prove the scoped activation and outbound guardrails still match this ADR;
3. define exactly one customer question/request and no automatic retry;
4. run a fresh decision + second adversarial review;
5. obtain any effect approval required by the canonical runbook;
6. execute at most one real provider/customer read and validate the durable evidence.

No approval from this ADR may be reused for that future customer/provider effect.
