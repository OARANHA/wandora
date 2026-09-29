# ADR 0305 — Core Semantic Fast Read Compatibility Convergence Production Execution V1

Status: **EXECUTED / GREEN / CORE COMPATIBILITY CONVERGED / SEMANTIC+OUTBOUND EFFECTS OFF**

## Objective

Execute only the remaining Phase-2 Core compatibility convergence after ADR 0303 and ADR 0304:

> promote the exact qualified post-gates Core candidate and add only the canonical Semantic Fast Read gates-OFF overlay, while preserving Paperclip v2026.916.1, Organization Adapter 0.5.0, Mastra supervised runtime, existing Core mounts and all customer/provider/outbound effects OFF.

This ADR does **not** activate Semantic Fast Read, Semantic Selector, Fast Read execution, Human Send, Messaging Gateway outbound, WhatsApp Fast Read, VendaERP, model/provider calls or customer work.

## REAL NOW before mutation

Repository/GitHub reconciliation before execution:

- PR #369 remained open/draft/mergeable;
- source head: `c6deae0fd0419b3b4d5f8a2eac85fa2930e6093d`;
- base `main`: `8d6a65f519de5c1c49607314b49968af608c7164`;
- pull-request merge ref used by Actions: `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- source tree equivalence between source head and merge ref was proven by zero changed files;
- all 17 PR workflows were GREEN.

The original Core Candidate Artifact run completed before the primary Core/Semantic Fast Read gates, so it was not accepted as the promotion unit. The successful Core Candidate job was rerun only after the primary gates were GREEN.

Production immediately before Core recreation:

- Core image `wandora/core:organization-adapter-candidate-f3225586d082`;
- Core image/manifest `sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9`;
- Core healthy, restart count 0;
- Paperclip `wandora/paperclip:v2026.916.1`, image `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`, healthy, restart count 0;
- Organization Adapter exactly one `wandora.organization-adapter-v1@0.5.0`, plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, `ready`, `lastError=null`;
- Messaging Gateway healthy and `outboundEnabled=false`;
- Task Drain `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`.

## Exact Core candidate identity

Post-gates Core Candidate Artifact evidence:

- workflow run: `36324400396`;
- post-gates artifact id: `10933862421`;
- artifact ZIP SHA-256: `9dad4e04084f9bd97a2c75f18ec77edabf551e1f2de7bf743ba28cdee394209a`;
- candidate archive:
  `wandora-core-organization-adapter-candidate-2c2142237c9c.tar.gz`;
- archive SHA-256:
  `93e98c07b9914eb99b89cfc185effe6397ecd021cbded6121ab0c7edfb571d4b`;
- image tag:
  `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- OCI config digest:
  `sha256:25a89258bd27e96f57ecf641911005dafc8d714c2d10521e1d37b3e27b309393`;
- OCI manifest digest:
  `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- source/merge ref:
  `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- source tree:
  `bd11487...`;
- candidate contract:
  `organization-adapter-core-v1`;
- image user:
  `node`.

The archive hash was independently revalidated on the production host before `docker load`.

## Capability authority / reuse gate

ADR 0168 remains binding.

This slice introduced no new registry, lifecycle engine, state machine, runtime memory, orchestration subsystem, provider implementation, retrieval stack, vector store, retry engine or secret manager.

Authority remains separated:

- Wandora owns semantic/product/effect authorization;
- Paperclip owns workforce lifecycle, run/tool operational authority, plugin lifecycle, secrets and audit;
- Mastra remains the replaceable runtime execution provider behind the existing Wandora boundary;
- TypeSafe/System One and Mistral remain replaceable semantic/model providers;
- VendaERP remains a replaceable Business System provider;
- Messaging Gateway/Evolution remains transport authority.

The Core candidate consumes existing contracts. No specialist-provider implementation was internalized.

## Decision + second adversarial review

The selected mutation was the narrowest compatibility step:

1. load only the exact post-gates Core candidate;
2. install the canonical `compose.semantic-fast-read.yaml`;
3. do **not** add `compose.semantic-fast-read-custody.yaml`;
4. preserve every existing Core overlay and mount;
5. recreate only the `core` service with `--no-build --pull never --no-deps --force-recreate --wait`;
6. leave Paperclip, Organization Adapter plugin lifecycle, Messaging Gateway and all provider/customer/outbound paths untouched.

The first advisory JEV attempt failed with `fetch failed` and was not treated as evidence. The final immediately-adjacent review succeeded:

- decision: `allow`;
- `allow=0.54`;
- `confirm=0.43`;
- `review=0.02`;
- `deny=0.01`.

Deterministic repository/runtime evidence remained authoritative.

## Pre-execution composition proof

The full active Core Compose chain plus the Semantic Fast Read overlay was rendered before mutation.

The final render proved:

- image = `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- `WANDORA_FAST_READ_EXECUTION_ENABLED=false`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED=false`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED=false`;
- `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`;
- `WANDORA_AGENT_RUNTIME_MODE=mastra-supervised-model`;
- `WANDORA_ORGANIZATION_ADAPTER_ENABLED=true`;
- TypeSafe custody mount absent;
- Fast Read intent-HMAC custody mount absent;
- existing model-provider mount preserved;
- existing Organization Adapter mount preserved;
- existing Paperclip execution-bridge mount preserved.

The production overlay was installed byte-for-byte from the repository contract. Git blob SHA:

`e65ba5293d3d51fb9f2038ed368cadbe217e54b3`.

## Execution

The exact candidate archive was copied to operator-local `/tmp`, SHA-256 verified, gzip-tested, decompressed and loaded with Docker.

Loaded image readback:

- image/manifest id:
  `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- revision:
  `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- candidate:
  `organization-adapter-core-v1`;
- user:
  `node`.

The canonical overlay was installed at:

`/opt/wandora/stacks/core/compose.semantic-fast-read.yaml`

and byte-for-byte verified against the repository blob.

Only `wandora-core` was then recreated using the complete pre-existing Compose chain plus the canonical gates-OFF overlay:

- no build;
- no pull;
- no dependency recreation;
- force-recreate only for `core`;
- wait for health.

Compose returned `wandora-core Healthy`.

No Paperclip, Organization Adapter plugin, Messaging Gateway or other application container restart was part of the mutation.

## Validation

Post-promotion Core:

- container id:
  `4fc1ac92f8f58007ebaaa028caa8d0ad143c6ee2a543600827302145496a9b7b`;
- image:
  `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- image/manifest:
  `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- revision:
  `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- candidate:
  `organization-adapter-core-v1`;
- user:
  `node`;
- health:
  `healthy`;
- restart count:
  `0`.

Active Compose provenance now includes:

`/opt/wandora/stacks/core/compose.semantic-fast-read.yaml`.

It does **not** include `compose.semantic-fast-read-custody.yaml`.

Post-start Core log explicitly reports:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `organizationAdapter=true`;
- `agentRuntime=mastra-supervised-model`.

The rendered active composition also keeps `WANDORA_SEMANTIC_SELECTOR_ENABLED=false`.

Mount readback proves the new Core still has only the existing secret mounts relevant to this slice:

- model provider;
- Organization Adapter;
- Paperclip execution bridge;
- existing Core DB and Gateway ingress secrets.

No TypeSafe/System One API-key or Fast Read intent-HMAC custody mount is active.

Cross-component invariants after Core convergence:

- Task Drain remains `false/0/0/quiescent`;
- Paperclip remains the same running `v2026.916.1` container, same start time, image `sha256:7b72d43...`, healthy, restart count 0;
- exactly one Organization Adapter remains at `0.5.0`, same plugin id, `ready`, `lastError=null`;
- Messaging Gateway remains the same running container, same start time, healthy and `outboundEnabled=false`;
- no provider/model invocation, VendaERP request, WhatsApp Fast Read, customer work, Human Send or outbound effect was executed.

## Rollback boundary

The exact pre-change Core rollback anchor remains locally identifiable as:

- tag:
  `wandora/core:organization-adapter-candidate-f3225586d082`;
- image/manifest:
  `sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9`.

Rollback must remove the Semantic Fast Read compatibility overlay from the active Compose invocation and recreate only Core on the prior image, after fresh runtime/quiescence reconciliation.

No database migration or durable-state mutation was part of this slice.

## Result

**GREEN / CORE COMPATIBILITY CONVERGENCE COMPLETE.**

The Phase-2 compatibility baseline is now production-live:

- Paperclip v2026.916.1;
- Organization Adapter 0.5.0;
- Core candidate `2c214223...` with canonical Semantic Fast Read compatibility overlay.

All effect-authorizing gates remain OFF.

Semantic Fast Read activation, Semantic Selector activation, Human Send, Messaging Gateway outbound, WhatsApp Fast Read and any provider/VendaERP/customer effect remain separate future slices requiring fresh reconciliation, decision, second adversarial review and explicit effect authorization.

This ADR authorizes no activation by implication.
