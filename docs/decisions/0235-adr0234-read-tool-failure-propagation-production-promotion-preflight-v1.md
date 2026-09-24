# ADR 0235 — ADR 0234 Read Tool Failure Propagation Production Promotion Preflight V1

Status: **GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION**
Date: 2026-09-24

## Objective

Qualify the exact production promotion for ADR 0234 without changing production and without calling VendaERP or a model provider.

## Canonical repository state

- main: `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`
- PR #306: MERGED
- PR #307: CLOSED / not merged / superseded by #306
- open PRs: 0
- ADR 0234: implemented and merged

PR #306 exact head `42a17d8ac3e0a6b094b00b102d1364c089613e3e` passed 9/9 GREEN:

- Core CI
- Core Candidate Artifact
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- VendaERP Read-Only MCP CI
- Organization Adapter Plugin CI
- Web CI
- Platform Admin CI
- Messaging Gateway CI

Post-merge `main@4a54b5d8...` push workflows passed 7/7 GREEN:

- Core CI
- Core Candidate Artifact
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- Web CI
- Platform Admin CI
- Messaging Gateway CI

## Exact post-merge Core artifact

Use the post-merge main artifact:

- artifact id: `10783439687`
- workflow run: `35939709102`
- head: `main@4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`
- GitHub ZIP digest: `sha256:072dedfc37a82b4db7c0b43bd480025a188dc10db2932851d4c6c597b6f4c2e6`
- image tag: `wandora/core:organization-adapter-candidate-4a54b5d8f14c`
- source sha: `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`
- source tree: `ffe6faee50cc24a8eb361a0eaf81def44f511cbf`
- OCI config/image id: `sha256:6ccc94a9be25f7472c2b7b870eb86079971e569b8cf392a825aee03ed95cd7d1`
- OCI manifest: `sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882`
- archive sha256: `cdedc7532ce39f59f6641a215ac79c2669dddec04ff53da9526ec1ab31507d12`
- image user: `node`

The ZIP was independently downloaded and hashed on the VPS. The ZIP digest matched GitHub. The inner archive passed `SHA256SUMS`, and the OCI config reported the exact main revision.

The earlier PR artifact source commit `b4c87997fe92dbe958af97fcdd22dda26a8262e2`, PR head `42a17d8...`, and merged main all resolve to the same source tree `ffe6faee...`. The post-merge artifact is directly source-addressed to canonical main.

## Runtime delta

Current live Core revision:

`fc8721ccaedd5079eec9f3be11e8b64051416579`

The only executable Core source delta to the candidate is:

- `apps/core/src/agent-runtime/mastra-supervised-model.ts`
- `apps/core/src/paperclip-execution/handler.ts`
- `apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts`

There is no candidate delta in:

- Core compose overlays
- Core package.json/package-lock.json
- Paperclip source
- `wandora_mastra`
- VendaERP MCP
- migrations
- database schema
- Tool Gateway policy/config

Therefore the production effect is Core-only.

## Current live runtime

Core:

- image: `wandora/core:organization-adapter-candidate-fc8721ccaedd`
- revision: `fc8721ccaedd5079eec9f3be11e8b64051416579`
- healthy / restart 0
- `/healthz=200`
- `/readyz=200`

Paperclip:

- `wandora/paperclip:v2026.916.0`
- healthy / restart 0
- unchanged container

`wandora_mastra`:

- version `0.4.0`
- loaded=true / disabled=false
- retained package `6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c`

VendaERP MCP remains:

- `server.mjs` sha256 `6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f`
- source marker sha256 `5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d`

Paperclip Task Drain readback:

- draining=false
- activeRuns=0
- pendingWakes=0
- quiescent=true

28PRO live runs = 0. Wandora work operations = 0. Outbound attempts = 0.

## Live Core composition

The live Core Compose project uses the same twelve files that must be reused during promotion:

1. `/opt/wandora/stacks/core/compose.yaml`
2. `/opt/wandora/stacks/core/compose.database.yaml`
3. `/opt/wandora/stacks/core/compose.gateway-ingress.yaml`
4. `/opt/wandora/stacks/core/compose.agent-runtime-deterministic.yaml`
5. `/opt/wandora/stacks/core/compose.human-api.yaml`
6. `/opt/wandora/stacks/core/compose.organization-adapter.yaml`
7. `/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml`
8. `/opt/wandora/stacks/core/compose.paperclip-execution-bridge.yaml`
9. customer-owner activation overlay
10. customer-work overlay
11. `/opt/wandora/stacks/core/compose.agent-runtime-model.yaml`
12. `/opt/wandora/stacks/core/compose.customer-company-onboarding.yaml`

The five existing Core secret mounts remain read-only and unchanged: DB password, gateway ingress HMAC, model API key, organization-adapter secret directory, and Paperclip execution bridge HMAC.

## Rollback

The exact current live image remains locally available:

- tag: `wandora/core:organization-adapter-candidate-fc8721ccaedd`
- image id: `sha256:a149dc3283a766f598abf80a2cdd9c4bdd77f9e3cd2addb6826a70fb2d11294b`
- revision: `fc8721ccaedd5079eec9f3be11e8b64051416579`

Rollback needs no rebuild or download.

## Frozen promotion sequence

A separate execution must:

1. reconcile main/workflows/runtime again;
2. verify the exact artifact hashes above;
3. start a bounded Paperclip-native Task Drain;
4. require draining=true, activeRuns=0, pendingWakes=0, quiescent=true;
5. load the exact post-merge Core archive;
6. reuse the same twelve Compose files and all current secret paths;
7. change only `WANDORA_CORE_IMAGE` to `wandora/core:organization-adapter-candidate-4a54b5d8f14c`;
8. force-recreate only service `core`;
9. do not restart Paperclip;
10. do not replace `wandora_mastra`;
11. do not change VendaERP MCP bytes;
12. require candidate image/revision, healthy, restart 0, healthz 200 and readyz 200;
13. require Paperclip same container/image, healthy, restart 0;
14. require live runs/work/outbound = 0/0/0;
15. scan the maintenance boundary for unexpected VendaERP tool/provider activity;
16. explicitly end Task Drain;
17. require final draining=false and quiescent=true.

No provider call or model run belongs to the promotion.

If validation fails, keep Task Drain active, restore the previous Core image through the same twelve-file composition, validate health/readiness, then end the drain.

## Capability Authority / Reuse Gate

This promotion changes only Wandora Core implementation. It does not internalize or replace Paperclip lifecycle/recovery, Tool Gateway/policy, MCP execution, provider connections, Mastra runtime implementation, or adapter ownership.

ADR 0168 remains preserved.

## Second adversarial review

- Artifact directly tied to merged main? **Yes.**
- Archive independently verified? **Yes.**
- Image revision exact main? **Yes.**
- Source tree exact canonical main tree? **Yes.**
- Executable delta limited to the three intended Core files? **Yes.**
- Paperclip restart required? **No.**
- Adapter/MCP replacement required? **No.**
- Migration required? **No.**
- Rollback locally available? **Yes.**
- Live runs/work/outbound zero? **Yes.**
- Another VendaERP read authorized? **No.**

## Decision

**GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION.**

Next slice: **ADR 0234 Read Tool Failure Propagation Production Promotion Execution V1**.

No VendaERP/provider read is authorized until that promotion completes and a separate post-promotion no-provider preflight confirms the live failure semantics.
