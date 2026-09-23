# ADR 0225 — ADR 0224 Core + Paperclip Adapter Convergence Production Execution V1

Status: **COMPLETE / PRODUCTION CONVERGED / NO PROVIDER RETRY**
Date: 2026-09-23

## Objective

Record the production convergence qualified by ADR 0224 after ADR 0223 proved that Paperclip already owns issue-scoped tool-profile narrowing.

The convergence removes the redundant Wandora-owned per-task narrowing path from:

- Wandora Core;
- external Paperclip adapter `wandora_mastra`.

The accepted VendaERP MCP safe-error-observability build remains unchanged.

## Canonical source

```text
main before execution = af987155e235dc72ab1dbf9e143709dd054e9491
PR #291 = merged
PR #292 = merged
ADR 0223 = capability correction
ADR 0224 = convergence promotion preflight
```

PR #291 exact reviewed head `0308965662dd53fd9d37d371522b092ff2c38a60` passed 9/9 workflows.

## Qualified artifacts

Core:

```text
source_sha = da42890345753ebabf579947f568acd74145089b
image = wandora/core:organization-adapter-candidate-da4289034575
GitHub artifact ZIP sha256 = b96be5c6bbb09c5cc4a9dd6ac16c19532f4da525f0da90d7fdd4d39f774f670b
archive sha256 = 74427dcd299bf7b2558c6049ddef3fe977f4f659950bc58592692f1b346735f7
```

The full live Core Compose preflight proved exactly one effective delta:

```text
/services/core/image
41801d40228f -> da4289034575
```

Adapter candidate:

```text
source = da42890345753ebabf579947f568acd74145089b
version = 0.4.0
candidate tgz sha256 = 0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3
index.mjs sha256 = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
```

ADR 0224 proved these operational files are byte-identical to the retained Paperclip package:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
```

## Concurrency / evidence discipline

The production mutation occurred while multiple operator sessions were reconciling the same authorized convergence slice.

Therefore this ADR intentionally does **not** canonize an inferred count or ordering of transient install/restart requests unless the final claim is supported by durable state or direct readback.

The permanent evidence is the final runtime, artifact provenance, Paperclip registry state, health/readiness checks and Wandora effect counters.

This follows the project rule:

```text
after timeout/disconnection/concurrency:
read back real state before repeating an operation
```

No mutation was repeated merely because a chat response or remote command output was interrupted.

## Final production state

Direct post-convergence readback proves:

```text
Core
  image    = wandora/core:organization-adapter-candidate-da4289034575
  revision = da42890345753ebabf579947f568acd74145089b
  health   = healthy
  restarts = 0

Paperclip
  image    = wandora/paperclip:v2026.916.0
  health   = healthy
  restarts = 0

wandora_mastra
  version  = 0.4.0
  loaded   = true
  disabled = false
  package  = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
             6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

Paperclip Task Drain
  draining     = false
  activeRuns   = 0
  pendingWakes = 0
  quiescent    = true

Ana
  Paperclip status = idle
  adapterType      = wandora_mastra

Wandora work operations = 0
Wandora outbound attempts = 0
```

The Paperclip health endpoint returned HTTP 200 / `status=ok`.

The official adapter environment test returned:

```text
HTTP 200
adapterType = wandora_mastra
status = pass
check = wandora-bridge-config
message = Private Wandora bridge configuration is valid.
```

## Capability-authority result

The production runtime now matches ADR 0223:

- Wandora owns business semantics and effect authorization;
- Paperclip owns issue/profile binding, effective tool visibility, policy, connection, grant, secret custody, catalog, audit and MCP execution;
- the redundant Wandora per-task marker/allowlist is not active in Core or `wandora_mastra`;
- Mastra remains the ephemeral supervised runtime;
- VendaERP MCP remains the provider translation boundary.

ADR 0168 is strengthened: provider-native operational authority is reused rather than duplicated.

ADR 0208 remains preserved: generic REST Tool Gateway execution is still NO-GO.

## Effect boundary

This convergence did **not**:

- change the VendaERP MCP;
- call `vendaerp_probe`;
- call `vendaerp_search_products`;
- call any VendaERP provider endpoint;
- create customer work;
- create outbound attempts;
- apply migrations;
- alter VendaERP ToolConnection/grant/secret/catalog/profile state.

## Decision

**ADR 0224 convergence promotion is COMPLETE / GREEN.**

The next slice is:

**28PRO VendaERP Bounded Product Read Retry Preflight V2 — NO PROVIDER CALL**

That preflight may:

1. create one temporary Paperclip-only proof issue;
2. create or reuse one temporary active `defaultAction=deny` profile;
3. include exactly the catalog entry for `vendaerp_search_products`;
4. bind the profile to that issue with `targetType=issue`;
5. prove the issue scope wins over the broader Ana agent profile;
6. prove effective Tool Gateway visibility is exactly one read tool;
7. prove zero write/destructive visibility;
8. prove cleanup/revoke of the temporary issue/profile;
9. STOP before any provider call.

Only a later separately authorized execution may perform one bounded VendaERP read.
