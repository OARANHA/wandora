# ADR 0364 — Core Paperclip Upstream Tool Identity Compatibility Production Promotion V1

Date: 2026-09-30

Status: **GREEN / EXACT CORRECTED CORE LIVE / ALL FAST-READ + OUTBOUND EFFECT GATES OFF / NO SECOND ANA READ**

## Objective

Promote only the exact Core candidate containing the ADR 0363 Paperclip upstream-tool identity compatibility correction, while preserving the current production topology and keeping every Semantic Fast Read/customer/outbound effect inert.

This slice does not authorize a Human Fast Read, Semantic Selector execution, TypeSafe/Mistral execution, VendaERP access, Human Send or Messaging Gateway outbound.

## REAL NOW

Immediately before promotion:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head = `6392d75a8e77518537351173c356958e937be663`;
- exact source-head CI = **17/17 GREEN**;
- current merge ref = `9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`;
- merge parents = exactly current main + PR head;
- production Core = `wandora/core:organization-adapter-candidate-f279acc98687`, healthy/restart 0;
- exact 14-file production Compose chain;
- Paperclip and Messaging Gateway healthy;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- Fast Read, Semantic Fast Read and Human Send OFF;
- Gateway `outboundEnabled=false`;
- ADR 0362 rollback receipt for f279acc remained GREEN.

## Exact candidate qualification

Core Candidate Artifact:

- workflow run `36805036147`;
- artifact id `11137207336`;
- artifact name `core-organization-adapter-candidate-9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`;
- GitHub ZIP digest `sha256:34c8cbbec7c628fa5c6c18936feaafee02c0a265d3bc45a99d8bf1c69ea36d11`.

The ZIP was downloaded into the governed operator workspace and independently hashed on-host; the digest matched GitHub exactly.

The staged archive contained only:

- `SHA256SUMS`;
- `candidate-manifest.txt`;
- `wandora-core-organization-adapter-candidate-9d0a4ba577fe.tar.gz`.

Internal candidate facts:

- archive SHA-256 = `00761e2e1c7501bfff57e7e4b13a27938e16243262873bbed0f2bb52514559e1`;
- image tag = `wandora/core:organization-adapter-candidate-9d0a4ba577fe`;
- OCI config = `sha256:fa88bb86490874225943a7c145f8415ae54d7c3648bec4fd5c26589798eba61a`;
- OCI manifest/image id = `sha256:3ae9e4eae1949cc9da7e191cea841e1564d1a1577385f994991561c49c715e7d`;
- revision = `9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`;
- candidate contract = `organization-adapter-core-v1`;
- image user = `node`.

The repository portable verifier completed with:

`PORTABLE_CANDIDATE_ARCHIVE_V1_OK`.

## Image load and pre-mutation proof

A separately reviewed and human-approved `docker load` loaded exactly:

`wandora/core:organization-adapter-candidate-9d0a4ba577fe`.

The live Core remained unchanged at f279acc after image load.

Managed-admin image inspection then proved the loaded candidate matched the exact expected image id, revision, candidate contract and non-root user.

Using the exact existing 14-file production Compose chain and a temporary non-secret candidate selector:

- `docker compose ... config --quiet` returned exit 0;
- `docker compose ... config --images` returned exactly:
  `wandora/core:organization-adapter-candidate-9d0a4ba577fe`.

No custody or attestation overlays were included.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

This promotion changes no authority boundary and introduces no new table, registry, cache, lifecycle, state machine, runtime service or provider implementation.

The source correction remains only an adapter-boundary translation:

- Paperclip retains Connection/catalog/grant/policy/session/execution authority;
- the namespaced Paperclip gateway alias remains the runtime execution identity;
- Wandora uses the provider upstream tool identity only to map to the existing provider-neutral Business Capability contract;
- duplicate semantic bindings remain fail-closed.

## Second adversarial review

Fresh pre-mutation evidence proved:

- exact source-head CI 17/17 GREEN;
- exact candidate artifact and image identity GREEN;
- current f279acc rollback receipt GREEN;
- old Core healthy;
- Paperclip/Gateway healthy;
- Task Drain quiescent;
- exact gates-OFF render GREEN;
- no custody/attestation overlays;
- no second Ana request authorized.

The final adversarial review returned `allow`.

## Execution

One fresh human-approved managed-admin action recreated only `wandora-core` using the exact 14-file production chain:

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

- container image = `wandora/core:organization-adapter-candidate-9d0a4ba577fe`;
- image/OCI digest = `sha256:3ae9e4eae1949cc9da7e191cea841e1564d1a1577385f994991561c49c715e7d`;
- revision = `9d0a4ba577fe41d9efd8a5d2c4e5539ec0e7afeb`;
- candidate contract = `organization-adapter-core-v1`;
- user = `node`;
- health = healthy;
- restart count = 0;
- read-only root filesystem preserved;
- `CapDrop=ALL`;
- `no-new-privileges=true`;
- no published host port;
- exact 14-file Compose provenance preserved;
- no custody or attestation mounts are live.

Core startup reports:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `vigiaTelemetry=true`;
- `agentRuntime=mastra-supervised-model`.

Neighbor invariants:

- Paperclip remained healthy and was not restarted;
- Messaging Gateway remained healthy and was not restarted;
- Gateway remains `outboundEnabled=false`;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

## Stable selector reconciliation

The non-secret stable selector:

`/opt/wandora/ops-workspace/core-runtime-image.env`

was updated only to:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-9d0a4ba577fe`.

No service was restarted by this metadata change.

A separately approved read-only stable render returned exactly:

`wandora/core:organization-adapter-candidate-9d0a4ba577fe`.

## Effects accounting

Executed:

- staging and exact verification of one Core candidate artifact;
- one Docker image load;
- one Core-only recreation;
- one non-secret stable selector update;
- read-only validation.

Not executed:

- Semantic Fast Read opening;
- custody/attestation activation;
- second Human Fast Read;
- TypeSafe/System One customer-path call;
- Mistral/model customer-path call;
- Paperclip Fast Read run;
- VendaERP read/write;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp/outbound;
- Paperclip/OA mutation;
- migration/database mutation;
- any other service recreation.

## Decision

**Core Paperclip Upstream Tool Identity Compatibility Production Promotion V1 is GREEN.**

The exact corrected Core candidate is now production-live with all effect gates OFF.

The ADR 0362 rollback receipt remains valid as rollback evidence for the prior f279acc baseline, but it is now historical for the current live Core revision.

## Next boundary

**Current 9d0a4ba Core Rollback Freeze V2 Refresh V1 — NO FAST READ / NO CUSTOMER EFFECT.**

Before any later supervised Fast Read opening:

1. reconcile current Git/CI/runtime;
2. refresh rollback readiness for the now-live `9d0a4ba...` Core baseline using the existing Rollback Freeze V2 mechanism only;
3. validate the new receipt;
4. keep Fast Read/Semantic/Human Send/Gateway outbound OFF throughout;
5. do not execute a second Ana read in the rollback-refresh slice.

A later supervised Ana re-attestation must be a separate slice after the new current-baseline rollback receipt is GREEN.
