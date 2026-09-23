# ADR 0217 — 28PRO VendaERP End-to-End Core Bridge Promotion Preflight V1

Status: **GREEN / READY FOR CORE-ONLY PROMOTION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Objective

Qualify the minimum production change required before the bounded end-to-end proof:

```text
Wandora Core
-> Paperclip Tool Gateway
-> supervised Mastra
-> authorized VendaERP read tool
```

ADR 0216 already activated the 28PRO Paperclip-owned VendaERP read connection.

## REAL NOW

Repository:

```text
main = ff123b508080d1700610488d590e5916f6585aea
open PRs = 0 at entry
ADR 0216 = merged
```

Live runtime:

```text
Core image = wandora/core:organization-adapter-candidate-0a7f36833188
Core revision = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
Core health = healthy
Core restart count = 0
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED = true
WANDORA_AGENT_RUNTIME_MODE = mastra-supervised-model
```

The live Core revision predates ADR 0211 and therefore does not contain the read-tool bridge implementation.

## Candidate artifact

Validated ADR 0211 Core Candidate Artifact:

```text
workflow run = 35859795861
artifact id = 10749840984
artifact name = core-organization-adapter-candidate-fa64d98c5b87e3fcd78ec9c0d0eb8d2d40d3d64d
artifact ZIP sha256 = 01c85b4ab7b8b2217339dc552cb312da7fc102a14253670fa3e00e9e6834e03
archive sha256 = 292f8cd28964dbfa59ec1f333ffc14810ee2fd9d50f1955c28f2ccce3ad2e790
image = wandora/core:organization-adapter-candidate-fa64d98c5b87
OCI config digest = sha256:aeb494213aa71f592f051a535a7129ac2f8e54465775bc3c55bb57e9a33996a4
OCI manifest digest = sha256:928d6aeff2e3d5affd9f57301597b5e1cec942428175ba5246838cd8716a3d61
image user = node
source sha = fa64d98c5b87e3fcd78ec9c0d0eb8d2d40d3d64d
```

GitHub artifact ZIP and inner archive SHA-256 were reverified on the VPS.

## Source equivalence gate

The candidate source SHA differs from current main because later merges were squash/documentation history.

A blob-by-blob comparison proves:

```text
apps/core/
candidate blobs = 101
main blobs = 101
different blobs = 0

infra/stacks/core/
candidate blobs = 15
main blobs = 15
different blobs = 0
```

Therefore the candidate is source-equivalent to the current main for both Core implementation and Core stack definition.

The ADR 0211 bridge implementation is present in the candidate/current Core source and absent from the live Core revision.

## Full live Compose render gate

The exact config-file list used by the running `wandora-core` container was recovered from Docker Compose labels.

Both the current image and candidate image were rendered with the same:

- database secret file;
- Gateway ingress secret file;
- Organization Adapter secret directory;
- Paperclip execution bridge secret file;
- model-provider secret file;
- secret GID;
- all existing activation/work/model/onboarding overlays;
- networks, mounts and environment configuration.

The rendered diff contains exactly one effective change:

```diff
- image: wandora/core:organization-adapter-candidate-0a7f36833188
+ image: wandora/core:organization-adapter-candidate-fa64d98c5b87
```

No other rendered Compose field changes.

## Capability Authority / Reuse Gate

This promotion creates no new subsystem or durable product state.

Authority remains:

- Wandora: semantic/product/effect authority and narrow read-tool admission contract;
- Paperclip: connection/install/grant/secret/catalog/profile/policy/audit/MCP execution;
- Mastra: ephemeral supervised runtime;
- VendaERP: replaceable provider adapter.

The Core change only activates the already-accepted ADR 0211 adapter path.

ADR 0168 is preserved.

ADR 0208 is preserved: generic REST Tool Gateway remains NO-GO.

## SECOND ADVERSARIAL REVIEW

- Reusing Paperclip connection/grant/secret/profile/audit? **Yes.**
- Creating a Wandora connection/tool/secret authority? **No.**
- Provider credential enters Core/Mastra/model? **No.**
- Does candidate contain current Core source? **Yes, 101/101 blobs identical.**
- Does candidate contain current Core stack source? **Yes, 15/15 blobs identical.**
- Any migration required? **No.**
- Any Web change required? **No.**
- Any Paperclip change required? **No.**
- Any runtime flag change required? **No.**
- Does rendered production config change beyond image? **No.**
- Could this enable write/destructive ERP tools? **No; ADR 0211 admits only connection-backed MCP risk=read descriptors and ADR 0216 catalog contains only eight read tools.**
- Is rollback image-only? **Yes.**

## Future execution order

1. reconcile live Core image/health/state again;
2. load the exact verified candidate archive;
3. verify loaded image ID/config digest/tag/revision;
4. preserve the current full Compose config-file list and secret host paths;
5. recreate **only Core** with the candidate image;
6. require healthy + restart count 0;
7. prove unchanged critical mounts/env/networks and Paperclip reachability;
8. prove Ana/work/outbound invariants remain unchanged;
9. only after promotion, perform the separately bounded end-to-end read proof.

Do not create customer work, outbound effects, ERP writes or migrations during Core promotion.

## Rollback

On any promotion validation failure:

1. set `WANDORA_CORE_IMAGE` back to `wandora/core:organization-adapter-candidate-0a7f36833188`;
2. recreate only Core using the same full Compose config-file list and environment;
3. verify health/restart 0 and prior runtime contract;
4. stop before any end-to-end tool proof.

## Decision

**GREEN / GO for Core-only bridge promotion.**
