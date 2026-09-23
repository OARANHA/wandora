# ADR 0224 — ADR 0223 Core + Paperclip Adapter Convergence Promotion Preflight V1

Status: **GREEN / NO PRODUCTION EFFECT / GO FOR SEPARATE CONVERGENCE PROMOTION**
Date: 2026-09-23

## Objective

Qualify the runtime convergence required by ADR 0223 after ADR 0221's now-superseded Wandora-owned per-task read narrowing was fully promoted.

This preflight performs no production mutation and does not authorize a VendaERP provider retry.

## Canonical entry state

```text
main = e57d3b37c9e0bd01069a4a78b8a50076996e4de9
PR #291 = MERGED
ADR 0223 = canonical
open PRs = 0 at preflight reconciliation
```

PR #291 final reviewed head:

```text
0308965662dd53fd9d37d371522b092ff2c38a60
```

Exact-head workflows:

```text
9/9 GREEN
- Core CI
- Core Candidate Artifact
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- VendaERP Read-Only MCP CI
- Organization Adapter Plugin CI
- Web CI
- Platform Admin CI
- Messaging Gateway CI
```

## REAL NOW

Production before convergence:

```text
Core
  image    = wandora/core:organization-adapter-candidate-41801d40228f
  revision = 41801d40228f1781bb0025a1522e9206dcb97fa2
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
  package  = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/ff93cfa7f6d9efe7c7e544c49d0b985647c979cb74440617fdf487af5eb8ef92/package

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
  source marker     = 87bf5d51a694389900bb81d5efbfcc15a8e12557

Wandora work operations = 0
Wandora outbound attempts = 0
```

No provider retry occurred after the ADR 0221 runtime promotion.

## Core convergence candidate

Workflow:

```text
Core Candidate Artifact run = 35925116343
artifact id                 = 10779185395
artifact name               = core-organization-adapter-candidate-da42890345753ebabf579947f568acd74145089b
GitHub ZIP sha256           = b96be5c6bbb09c5cc4a9dd6ac16c19532f4da525f0da90d7fdd4d39f774f670b
```

Manifest:

```text
source_sha          = da42890345753ebabf579947f568acd74145089b
source_tree_sha     = 9d259527b81d4bee802b05056256869dd0b9114d
image_tag           = wandora/core:organization-adapter-candidate-da4289034575
OCI config digest   = sha256:093381e8cc6f798beeea1041a49e146962fcec3f4b7066359429c5d4d8abf031
OCI manifest digest = sha256:9c2aaa4ee0b3b29818a7c6f49fd1d8de2ab032b7893d89b205bf97912a2b9906
archive sha256      = 74427dcd299bf7b2558c6049ddef3fe977f4f659950bc58592692f1b346735f7
image user          = node
```

GitHub ZIP digest and internal `SHA256SUMS` validation are GREEN.

Source equivalence against merged main:

```text
apps/core/ = 101/101 blobs identical
infra/stacks/core/ = 15/15 blobs identical
```

### Full production Compose gate

The exact live 12-file Core Compose project was rendered using the live operational inputs.

```text
old = wandora/core:organization-adapter-candidate-41801d40228f
new = wandora/core:organization-adapter-candidate-da4289034575
```

Normalized diff:

```text
DIFF_COUNT = 1
/services/core/image
IMAGE_ONLY_DELTA_OK = 1
```

No secret, env, network, volume, capability, user, healthcheck or service configuration changes.

## Paperclip adapter convergence candidate

Workflow:

```text
Paperclip Mastra Adapter CI run = 35925116486
artifact id                     = 10778523591
artifact name                   = paperclip-mastra-adapter-da42890345753ebabf579947f568acd74145089b
GitHub ZIP sha256               = d8d9d873a8168f32d7ebb7fc90e2db129838aad166391ab14eda9ed7db585ed5
candidate tgz sha256            = 0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3
```

Candidate operational files:

```text
index.mjs        = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
package.json     = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f
compatibility    = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
```

These operational files are byte-identical to the retained pre-ADR0221 package already stored by Paperclip at:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
```

The currently active ADR 0221 package is:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
ff93cfa7f6d9efe7c7e544c49d0b985647c979cb74440617fdf487af5eb8ef92/package
```

Therefore convergence should **reuse the retained provider-owned package** instead of staging a duplicate hash-addressed package.

Source equivalence:

```text
integrations/paperclip/adapters/wandora-mastra-v1/
candidate blobs = 9
main blobs      = 9
differences     = 0
```

## VendaERP MCP stays unchanged

The live MCP is already the accepted safe-error-observability build:

```text
server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
```

ADR 0223 retains this change.

Source equivalence against merged main is 7/7 blobs identical.

No MCP file replacement, Paperclip ToolConnection change, grant change, secret change, profile change, catalog change or template change is required.

## Capability Authority / Reuse Gate

Convergence removes duplicated operational authority.

After convergence:

- Wandora continues to own the business-semantic decision that one task requires a particular capability;
- Paperclip exclusively owns issue-scoped profile binding and effective tool visibility;
- Paperclip continues to own connection/grant/secret/catalog/policy/audit/MCP execution;
- Mastra remains ephemeral supervised runtime;
- VendaERP MCP remains provider translation only.

The existing Paperclip package is reused instead of creating a duplicate.

ADR 0168 is therefore strengthened by this convergence.

## SECOND ADVERSARIAL REVIEW

- Does Core convergence change anything except the image? **No.**
- Is a new adapter package needed? **No; candidate operational bytes equal the retained provider package.**
- Does convergence require changing MCP? **No.**
- Does it require migration? **No.**
- Does it require provider call? **No.**
- Does it require ToolConnection/grant/secret/profile/catalog mutation? **No.**
- Is the currently active Core image retained for rollback? **Yes.**
- Is the currently active ADR 0221 adapter package retained for rollback? **Yes.**
- Can Paperclip native Task Drain guard the adapter/Core transition? **Yes.**
- Does ADR 0208 remain preserved? **Yes.**
- Does ADR 0168 remain preserved? **Yes.**

## Frozen convergence sequence

A separate execution may only:

1. reconcile main, open PRs, runtime health, live runs and work/outbound;
2. verify candidate/rollback hashes;
3. start Paperclip native Task Drain with bounded TTL;
4. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
5. load the exact Core candidate artifact;
6. recreate only Core with `wandora/core:organization-adapter-candidate-da4289034575`;
7. require Core healthy/restart 0 and `mastra-supervised-model`;
8. dispatch exactly one official Paperclip `/api/adapters/install` using the retained local path `6390812d...`;
9. ambiguous response => read back before retry; never blindly repeat;
10. if `requiresRestart=true`, recreate only Paperclip once using unchanged image/Compose;
11. require Paperclip healthy/restart 0;
12. require exactly one loaded/enabled `wandora_mastra@0.4.0` at the retained `6390812d...` path;
13. require official adapter test-environment PASS;
14. require MCP hash remains `067e7f...`;
15. require Ana idle, company live runs empty, work/outbound 0/0;
16. STOP.

No provider retry belongs to convergence.

## Rollback

Core rollback:

```text
wandora/core:organization-adapter-candidate-41801d40228f
```

Adapter rollback:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
ff93cfa7f6d9efe7c7e544c49d0b985647c979cb74440617fdf487af5eb8ef92/package
```

MCP requires no rollback because convergence does not modify it.

## Decision

**GREEN / GO for separate Core + Paperclip adapter convergence promotion only.**

After convergence, a separate retry preflight may create a temporary Paperclip issue-scoped profile containing exactly `vendaerp_search_products`, prove one-tool visibility, and only then authorize a bounded provider retry.
