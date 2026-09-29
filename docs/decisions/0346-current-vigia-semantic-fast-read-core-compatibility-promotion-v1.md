# ADR 0346 — Current Vigia + Semantic Fast Read Core Compatibility Promotion V1

Date: 2026-09-29

Status: **GREEN / EXACT COMBINED CORE LIVE / VIGIA PRESERVED / FAST READ + SEMANTIC + SELECTOR + HUMAN SEND + GATEWAY OUTBOUND OFF / ROLLBACK E4C7 READY / NO HUMAN FAST READ**

## Objective

Promote only the exact Core candidate that combines the current Vigia `main` baseline with PR #369 Semantic Fast Read runtime wiring and HTTP body forwarding, while keeping every customer/provider/outbound effect inert.

This execution does not authorize Semantic Fast Read attestation, a Human Fast Read request, Mistral/TypeSafe execution, VendaERP access, Human Send or Messaging Gateway outbound.

## REAL NOW

Immediately before promotion:

- current `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head = `6035cfd2b32eb9a8da1aadb01414759201606930`;
- exact source-head CI = **17/17 GREEN**;
- current GitHub merge ref = `14534e57256f0a73c49feb3944a1068921468f94`;
- merge parents = current main `e4c7...` + PR head `6035...`;
- merge tree = `f5089f4ad75d80100babe18c8d0c574dd12d2bd6`;
- source proof includes Semantic Fast Read runtime/body-forwarding code and the final Vigia retry sequence `[0,500,1000,1500,2500,4000]`;
- production Core remained the protected `e4c7...` baseline, healthy/restart 0;
- Paperclip and Messaging Gateway were healthy/restart 0;
- exactly one Organization Adapter `0.6.1` was ready;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- ADR 0345 Rollback Freeze V2 for `e4c7 + OA 0.6.1 + Vigia` was READY.

## Exact candidate qualification

Core Candidate Artifact:

- workflow run `36631384273`;
- artifact id `11062264229`;
- artifact name `core-organization-adapter-candidate-14534e57256f0a73c49feb3944a1068921468f94`;
- artifact ZIP size `101273652` bytes;
- artifact ZIP SHA-256 `90abe0fe0ceba542f470dc272628d6476eb60916ec4267d4794eb509c79d34d8`;
- Docker archive SHA-256 `764ad058df8dfb8e9a09bb33fc05e9d9503ccbc8a505f5095a882122cf0c3292`;
- image tag `wandora/core:organization-adapter-candidate-14534e57256f`;
- OCI config digest `sha256:55a6dee45a4a59b7dac4760d9ca0c15de9911504f6944524d70cbcaadfa90b92`;
- OCI manifest / Docker image id `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- revision `14534e57256f0a73c49feb3944a1068921468f94`;
- candidate contract `organization-adapter-core-v1`;
- image user `node`.

The artifact was downloaded to the governed operator workspace, its ZIP digest independently matched GitHub Actions, and the extracted Docker archive passed the existing portable verifier with:

`PORTABLE_CANDIDATE_ARCHIVE_V1_OK`

The verified archive was loaded through a separately reviewed and human-approved `docker load`. Independent root image inspection then matched the exact OCI manifest id, revision, candidate contract and non-root user.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

This slice reused:

- the existing Docker Compose production substrate;
- the existing managed-admin approval boundary;
- the existing Rollback Freeze V2 mechanism;
- the existing Core image-selector pattern from ADR 0324.

No new runtime subsystem, deployment service, provider capability, state machine, table, migration, lifecycle manager or duplicated provider implementation was introduced.

## Pre-mutation Compose proof

The exact current 14-file Core production composition was preserved:

1. `/opt/wandora/stacks/core/compose.yaml`
2. `/opt/wandora/stacks/core/compose.database.yaml`
3. `/opt/wandora/stacks/core/compose.gateway-ingress.yaml`
4. `/opt/wandora/stacks/core/compose.agent-runtime-deterministic.yaml`
5. `/opt/wandora/stacks/core/compose.human-api.yaml`
6. `/opt/wandora/stacks/core/compose.organization-adapter.yaml`
7. `/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml`
8. `/opt/wandora/stacks/core/compose.paperclip-execution-bridge.yaml`
9. customer-owner activation overlay
10. first legitimate work customer overlay
11. `compose.agent-runtime-model.yaml`
12. `compose.customer-company-onboarding.yaml`
13. `compose.semantic-fast-read.yaml`
14. current Vigia overlay `compose.vigia.yaml`

No custody or attestation overlay was appended.

Using the protected current render env-file followed by the candidate image override:

- `docker compose ... config --quiet` returned exit 0;
- `docker compose ... config --images` resolved exactly:
  `wandora/core:organization-adapter-candidate-14534e57256f`.

The canonical Semantic Fast Read overlay kept:

- Fast Read execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send OFF.

## Second adversarial review

Immediately before the production recreation, fresh evidence again proved:

- exact source-head CI 17/17 GREEN;
- current main unchanged at `e4c7...`;
- exact candidate loaded and image-inspected;
- exact 14-file render GREEN;
- current `e4c7` rollback receipt READY;
- old Core healthy/restart 0;
- Paperclip healthy/restart 0;
- Gateway healthy/restart 0 and outbound OFF;
- Task Drain quiescent.

The final JEV review returned `confirm` with probability `0.98`.

## Execution

A fresh one-use human approval executed exactly one Core-only recreation:

`docker compose ... up -d --no-deps --force-recreate --no-build --pull never --wait core`

Compose reported:

- Core Recreate;
- Core Recreated;
- Core Starting;
- Core Started;
- Core Waiting;
- Core Healthy.

No dependency or other service was recreated.

## Post-promotion validation

Fresh readback proves:

- container `wandora-core`;
- image tag `wandora/core:organization-adapter-candidate-14534e57256f`;
- image / OCI manifest id `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- revision `14534e57256f0a73c49feb3944a1068921468f94`;
- candidate contract `organization-adapter-core-v1`;
- user `node`;
- healthy;
- restart count 0;
- read-only root filesystem preserved;
- cap-drop ALL / no-new-privileges preserved;
- no published host port;
- same `wandora-core` and `wandora-data` networks;
- exact 14-file Compose provenance preserved;
- current Vigia secret remains read-only mounted;
- no custody or attestation overlay is live.

Core startup reports:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `vigiaTelemetry=true`;
- `agentRuntime=mastra-supervised-model`.

Paperclip retained the same container id/start time and remains healthy/restart 0.

Exactly one `wandora.organization-adapter-v1@0.6.1` remains installed at the same content-addressed package path, `status=ready`, `lastError=null`.

Messaging Gateway retained the same container id/start time and remains healthy/restart 0.

Task Drain remains:

`false / 0 / 0 / quiescent=true`.

## Stable image selector reconciliation

Post-promotion inspection found the non-secret stable selector:

`/opt/wandora/ops-workspace/core-runtime-image.env`

still pointed to the older `b2cff...` Core candidate.

This stale selector did not affect the just-completed promotion because the promotion used a separate candidate-specific override. Leaving it stale, however, would create future operator drift.

Following the existing ADR 0324 selector pattern, the file was updated only to:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-14534e57256f`

No service was restarted by this metadata correction.

A separate human-approved read-only `docker compose ... config --images` using the protected render env-file first and the stable selector last returned exactly:

`wandora/core:organization-adapter-candidate-14534e57256f`.

Therefore the stable future operator render now matches the live Core exactly.

## Effects accounting

This slice performed:

- staging and verification of one exact Core candidate artifact;
- one Docker image load;
- one Core-only recreation;
- one non-secret stable image-selector correction;
- read-only validation.

This slice did **not** perform:

- Semantic Fast Read opening;
- Human Fast Read;
- TypeSafe/System One semantic decision;
- Mistral/model call;
- Paperclip Fast Read execution;
- VendaERP/provider call;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp/outbound;
- Paperclip/Gateway/Web/database recreation;
- OA lifecycle mutation;
- migration or database mutation.

## Decision

**Current Vigia + Semantic Fast Read Core Compatibility Promotion V1 is GREEN.**

The exact combined Core candidate is live, the current Vigia behavior is preserved, and all Semantic Fast Read/customer/outbound effect gates remain OFF.

The ADR 0345 `e4c7 + OA 0.6.1 + Vigia` rollback boundary remains the fail-closed rollback anchor for this promotion.

## Next boundary

Semantic Fast Read production attestation is a **new, separate slice**.

It must begin from fresh REAL NOW and must not infer authorization from this compatibility promotion.

Before any opening effect, it must freshly re-prove:

- current main / PR head / exact-head CI;
- current live Core candidate identity and health;
- Rollback V2 receipt;
- Paperclip/OA/Gateway health;
- Task Drain quiescence;
- intended Tool Policy qualification;
- fresh OA operational-read;
- custody metadata;
- legitimate already-authenticated owner/admin browser execution boundary.

The one Human Fast Read must remain browser-owned. No Bearer token may be exported into Remote-Ops, terminal or operator tooling.
