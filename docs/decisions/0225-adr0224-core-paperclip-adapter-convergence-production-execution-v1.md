# ADR 0225 — ADR 0224 Core + Paperclip Adapter Convergence Production Execution V1

Status: **COMPLETE / PRODUCTION CONVERGED / NO PROVIDER RETRY**
Date: 2026-09-23

## Objective

Record the production convergence qualified by ADR 0224 after ADR 0223 proved that Paperclip already owns issue-scoped tool-profile narrowing.

The final production state removes the redundant Wandora-owned per-task narrowing path from Core and `wandora_mastra`, preserves the VendaERP MCP safe-error observability build, and reuses the retained Paperclip adapter package required by the ADR 0224 reuse gate.

## Canonical source

```text
main before execution = af987155e235dc72ab1dbf9e143709dd054e9491
PR #291 = merged
PR #292 = merged
ADR 0223 = capability correction
ADR 0224 = convergence promotion preflight
```

PR #291 exact head `0308965662dd53fd9d37d371522b092ff2c38a60` passed 9/9 workflows.

## Qualified artifacts

Core:

```text
source_sha = da42890345753ebabf579947f568acd74145089b
image      = wandora/core:organization-adapter-candidate-da4289034575
```

Source equivalence against merged main:

```text
apps/core/                                         101/101 blobs identical
infra/stacks/core/                                  15/15 blobs identical
integrations/paperclip/adapters/wandora-mastra-v1/  9/9 blobs identical
```

The full production Core Compose render had exactly one effective delta:

```text
/services/core/image
41801d40228f -> da4289034575
```

Approved adapter operational bytes:

```text
index.mjs     = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
package.json  = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f
compatibility = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
version       = 0.4.0
```

Those bytes are identical in the retained Paperclip-owned package:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
```

## Execution and reconciliation

A concurrent operator execution began the convergence while the chat was interrupted.

It:

- promoted the qualified Core image;
- installed the approved adapter bytes under an additional hash-addressed path `0e53cda6...`;
- restarted Paperclip;
- left Core/Paperclip healthy and work/outbound at 0/0;
- made no VendaERP provider retry.

After reconnecting, the runtime was reconciled before any repeat.

ADR 0224 requires reuse of the already-retained `6390812d...` provider package rather than leaving an unnecessary duplicate as the active registration.

A Paperclip-native Task Drain was then started with a bounded TTL and proved:

```text
draining     = true
activeRuns   = 0
pendingWakes = 0
quiescent    = true
```

Exactly one official `POST /api/adapters/install` was then dispatched for the retained `6390812d...` local path.

Paperclip returned:

```text
HTTP = 201
version = 0.4.0
requiresRestart = true
```

Readback immediately pointed to the retained package.

Paperclip was then recreated once using the unchanged production Compose files and unchanged image `wandora/paperclip:v2026.916.0`.

No Core recreation was repeated during this correction because Core was already converged and healthy.

## Final production state

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
  test-environment = PASS

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

Ana
  status      = idle
  adapterType = wandora_mastra
  errorReason = null
  orgChain    = healthy

Wandora work operations = 0
Wandora outbound attempts = 0
```

No VendaERP tool call or provider request appeared after convergence.

The extra `0e53cda6...` package directory is inert package-store residue and is not active. It is not deleted in this slice.

## Capability authority result

Final authority is:

```text
business-semantic choice = Wandora
issue/profile/tool visibility = Paperclip
connection/grant/secret/catalog/policy/audit/MCP execution = Paperclip
supervised ephemeral execution = Mastra
provider translation = VendaERP MCP
provider data = VendaERP
```

The redundant Wandora task-tool authorization path is no longer active.

ADR 0168 is preserved: portability is contract decoupling, not provider implementation duplication.

ADR 0208 remains preserved: generic REST Tool Gateway execution is still NO-GO.

## Effect boundary

This convergence did not:

- modify the VendaERP MCP;
- call `vendaerp_probe`;
- call `vendaerp_search_products`;
- call any VendaERP provider endpoint;
- create customer work;
- create outbound attempts;
- apply migrations;
- change ToolConnection, grant, secret, catalog or VendaERP install state.

## Decision

**ADR 0224 convergence promotion is COMPLETE and aligned with its frozen reuse gate.**

The next slice is:

**28PRO VendaERP Bounded Product Read Retry Preflight V2 — NO PROVIDER CALL**

That preflight may prove:

1. a temporary Paperclip-only issue;
2. an issue-scoped deny-by-default profile;
3. exactly one admitted catalog entry: `vendaerp_search_products`;
4. effective Tool Gateway visibility of exactly that one read tool;
5. no write/destructive tool visibility;
6. safe cleanup/rollback of the temporary issue/profile;
7. Core/Paperclip healthy, Ana idle, work/outbound 0/0.

Only a later separately authorized execution may perform one bounded provider read.
