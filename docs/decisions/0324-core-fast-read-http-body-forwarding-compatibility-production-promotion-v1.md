# ADR 0324 — Core Fast Read HTTP Body Forwarding Compatibility Production Promotion V1

Date: 2026-09-29

Status: **GREEN / EXACT CORRECTED CORE LIVE / FAST READ + SEMANTIC + SELECTOR + HUMAN SEND + GATEWAY OUTBOUND OFF / NO HUMAN FAST READ**

## Objective

Promote only the exact Core candidate containing the ADR 0323 HTTP body-forwarding correction while keeping every Semantic Fast Read/customer/outbound effect inert.

This execution does **not** authorize a Human Fast Read request, Semantic Selector activation, provider/model execution, VendaERP access, Human Send or Messaging Gateway outbound.

## REAL NOW and proven evidence

Immediately before the production mutation:

- PR #369 was open, draft and mergeable at source head `a69b7ba232b76aaac80e991e3525d0df627e287b`;
- base remained `main@8d6a65f519de5c1c49607314b49968af608c7164`;
- exact-head CI was 17/17 GREEN;
- current merge ref / candidate revision was `b2cffbb54089212844ef177827e7a616b1008144`;
- fresh Rollback Freeze V2 precheck returned `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- live Core was the prior candidate `wandora/core:organization-adapter-candidate-2c2142237c9c`, healthy/restart 0;
- Core startup reported `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway remained healthy with `outboundEnabled=false`;
- Paperclip remained healthy;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- custody and attestation overlays were absent from the active Core composition.

## Exact candidate qualification

The exact Core Candidate Artifact was:

- workflow run: `36524539413` / run 549;
- artifact id: `11013762814`;
- artifact name: `core-organization-adapter-candidate-b2cffbb54089212844ef177827e7a616b1008144`;
- artifact ZIP size: `101282022` bytes;
- artifact ZIP SHA-256: `74fbcf13deaf6b4f0eef643b734b2b3864cfc698e86106c64a6f609067515e85`;
- Docker archive size: `101280293` bytes;
- Docker archive SHA-256: `976ffe25886cd7fbcb7053cc16ab3bce85b31dfaa2043c7cb5676a0ecc973018`;
- image tag: `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- OCI manifest / Docker image id: `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- OCI config: `sha256:349e59d620f9656dd25ea746a061d003474fba6eb3c52d00720afc28da195482`;
- image revision: `b2cffbb54089212844ef177827e7a616b1008144`;
- candidate contract: `organization-adapter-core-v1`;
- image user: `node`.

The ZIP was downloaded to the governed operator workspace and independently hashed on the production host. The archive was inspected before extraction and then hashed again after extraction. Its Docker manifest was inspected before load.

The host did not provide the `unzip` executable. The failed managed-admin attempt returned `spawn unzip ENOENT`; state-first verification proved that no destination directory or extracted file had been created. Extraction then reused the already-allowlisted non-privileged Python `zipfile` path with exact-entry validation and traversal rejection. No package installation or authority expansion was introduced.

The verified archive was loaded into Docker only after a separate review/approval. Post-load image inspection matched the exact expected tag, image id, revision, candidate label and non-root user.

## Capability Authority / Reuse Gate

No new runtime subsystem, deployment service, state machine, provider capability, table or migration was introduced.

The production effect reused the existing Docker Compose deployment substrate and managed-admin boundary. Portainer was checked and does not manage the Core stack; it remains an operator console rather than Core source of truth.

A stable non-secret operator image selector was created at:

`/opt/wandora/ops-workspace/core-runtime-image.env`

with exactly:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-b2cffbb54089`

Future Core Compose operations must preserve the protected existing render env-file first and pass this stable image selector last. The protected env-file was neither copied nor rewritten.

A promotion-specific temporary selector was used for the actual recreation. After promotion, the stable selector was independently rendered against the same 13-file baseline and resolved exactly to the live candidate. Core was not restarted a second time merely to rewrite Compose metadata; that would have added an unnecessary production effect.

## Pre-mutation Compose proof

The exact production baseline remained the existing 13-file Core composition ending at:

`/opt/wandora/stacks/core/compose.semantic-fast-read.yaml`

with no custody or attestation overlay.

Using the protected render env-file followed by the candidate image override:

- `docker compose ... config --quiet` returned exit 0;
- `docker compose ... config --images` resolved exactly:
  `wandora/core:organization-adapter-candidate-b2cffbb54089`.

The canonical Semantic Fast Read overlay remained the final environment authority and kept:

- `WANDORA_FAST_READ_EXECUTION_ENABLED=false`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED=false`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED=false`;
- `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`.

## Second adversarial review

Immediately before the production recreation, fresh evidence again proved:

- 17/17 exact-head CI GREEN;
- old Core healthy;
- Paperclip healthy;
- Gateway healthy and outbound OFF;
- Task Drain quiescent;
- exact candidate already loaded and verified;
- exact Compose render GREEN;
- no custody/attestation overlay.

The second adversarial review returned `confirm`. The mutation remained bounded to one Core recreation.

## Execution

The approved production command recreated only service `core` using the existing 13-file composition and exact verified image:

- `up -d`;
- `--no-deps`;
- `--force-recreate`;
- `--no-build`;
- `--pull never`;
- `--wait`.

Docker Compose reported:

- Core Recreate;
- Core Recreated;
- Core Starting;
- Core Started;
- Core Waiting;
- Core Healthy.

No Paperclip, Gateway, Web, database or dependency recreation was authorized.

## Post-mutation validation

State-first readback proved:

- container: `wandora-core`;
- status: running;
- health: healthy;
- restart count: 0;
- image: `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- image / manifest id: `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- revision: `b2cffbb54089212844ef177827e7a616b1008144`;
- candidate label: `organization-adapter-core-v1`;
- user: `node`;
- read-only root filesystem preserved;
- the exact 13 baseline Compose files remain active;
- custody and attestation remain absent;
- existing DB, Gateway ingress, model-provider, Organization Adapter and Paperclip execution-bridge mounts remain present and read-only where expected.

Core startup after recreation reports:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `agentRuntime=mastra-supervised-model`.

Messaging Gateway remained on its pre-existing container/start time and reports `outboundEnabled=false`. Paperclip remained on its pre-existing container/start time and healthy. Task Drain remained `false / 0 / 0 / quiescent=true`.

The stable selector render using protected render env-file first plus `core-runtime-image.env` last also resolves exactly to:

`wandora/core:organization-adapter-candidate-b2cffbb54089`.

## Effects accounting

This slice performed:

- staging of one exact candidate artifact under the governed ops workspace;
- one Docker image load;
- one recreation of `wandora-core`;
- creation of one non-secret stable Core image-selector file.

This slice did **not** perform:

- Human Fast Read;
- Semantic Fast Read execution;
- Semantic Selector execution;
- TypeSafe decision;
- Mistral/model call;
- Paperclip Fast Read work;
- VendaERP/provider call;
- Human Send;
- Messaging Gateway outbound;
- customer-visible work;
- migration or database mutation;
- Paperclip/Gateway/Web recreation.

## Decision

**Core Fast Read HTTP Body Forwarding Compatibility Promotion V1 is GREEN.**

The exact corrected Core candidate is now live with all semantic/customer/outbound effect gates OFF.

A future Semantic Fast Read bounded production attestation is a separate slice. It must start from fresh REAL NOW, re-prove current repository/CI/runtime/rollback/custody/provider evidence, use fresh approvals, and preserve the ADR 0320 mandatory-close discipline. No historical approval or failed ADR 0323 request is reusable.
