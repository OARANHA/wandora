# ADR 0224 — ADR 0223 Core + Paperclip Adapter Convergence Production Execution V1

Status: **COMPLETE / PRODUCTION CONVERGED / NO PROVIDER RETRY**
Date: 2026-09-23

## Objective

Execute the ADR 0223 convergence after proving Paperclip already owns issue-scoped tool-profile narrowing.

The production change removes the redundant Wandora-owned per-task narrowing path from the two runtime artifacts that carried it:

- Wandora Core;
- external Paperclip adapter `wandora_mastra`.

The already-promoted VendaERP MCP safe error observability remains unchanged.

## Canonical source

```text
main before execution = e57d3b37c9e0bd01069a4a78b8a50076996e4de9
PR #291             = merged
ADR 0223            = canonical
```

PR #291 exact head `0308965662dd53fd9d37d371522b092ff2c38a60` passed 9/9 workflows.

## Provenance

Core candidate:

```text
source_sha  = da42890345753ebabf579947f568acd74145089b
image       = wandora/core:organization-adapter-candidate-da4289034575
archive     = SHA256SUMS verified on VPS
```

The candidate source is blob-identical to merged main for:

```text
apps/core/                                         101/101 blobs
infra/stacks/core/                                  15/15 blobs
integrations/paperclip/adapters/wandora-mastra-v1/  9/9 blobs
```

Full live Core Compose rendering proved exactly one effective delta:

```text
/services/core/image
41801d40228f -> da4289034575
```

Adapter candidate:

```text
artifact source = da42890345753ebabf579947f568acd74145089b
tgz sha256      = 0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3
index.mjs       = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
version         = 0.4.0
```

The previous live adapter package remains retained as rollback evidence.

## Execution

A Paperclip-native Task Drain was already active from the concurrent operator execution when this session reached the mutation boundary.

Readback proved:

```text
draining     = true
activeRuns   = 0
pendingWakes = 0
quiescent    = true
```

No second drain was started.

Execution then:

1. verified the final Core archive;
2. loaded the already-qualified Core image;
3. staged the adapter under a new hash-addressed Paperclip operator-package path;
4. recreated only Core using the exact existing production Compose inputs;
5. required Core healthy/restart 0;
6. dispatched exactly one official `POST /api/adapters/install` replacement;
7. Paperclip returned HTTP 201 and `requiresRestart=true`;
8. restarted only Paperclip once on the unchanged `wandora/paperclip:v2026.916.0` image;
9. required Paperclip healthy/restart 0;
10. executed the official adapter test-environment once.

No install request was replayed.

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
  package  = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3/package
  test-environment = PASS

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

Task Drain after Paperclip restart
  draining     = false
  activeRuns   = 0
  pendingWakes = 0
  quiescent    = true

Wandora work operations = 0
Wandora outbound attempts = 0
```

The heartbeat-runs endpoint ignored the requested `status=running` filter and returned historical rows, but every returned row had terminal `status=succeeded`; no actual running row was observed.

## Capability authority result

ADR 0223 is now reflected in the live runtime:

- business semantics remain Wandora-owned;
- profile binding, issue scope, policy evaluation, Tool Gateway visibility, audit and MCP execution remain Paperclip-owned;
- no second Wandora tool-policy language remains active;
- Mastra remains the supervised execution runtime;
- VendaERP MCP remains the provider translation boundary.

ADR 0168 remains preserved:

> Portability = contract decoupling, not implementation duplication.

## Effect boundary

This execution did not:

- modify the VendaERP MCP;
- call `vendaerp_probe`;
- call `vendaerp_search_products`;
- call any VendaERP provider endpoint;
- create customer work;
- create outbound attempts;
- apply migrations;
- alter Paperclip connection/grant/secret/catalog/profile state.

## Decision

**ADR 0223 runtime convergence is COMPLETE.**

The next slice is a separate **Paperclip-native issue-scoped VendaERP retry preflight**.

That preflight may prove, without a provider call:

1. a temporary Paperclip issue;
2. an issue-scoped deny-by-default profile;
3. exactly one admitted catalog entry: `vendaerp_search_products`;
4. effective Tool Gateway visibility of exactly that one read tool;
5. safe cleanup/rollback for the temporary profile and issue.

Only a later separately authorized execution may perform one bounded provider read.
