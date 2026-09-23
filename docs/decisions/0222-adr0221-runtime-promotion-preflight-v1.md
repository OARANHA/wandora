# ADR 0222 — ADR 0221 Core + Paperclip Adapter + VendaERP MCP Runtime Promotion Preflight V1

Status: **GREEN / NO PRODUCTION EFFECT / GO FOR SEPARATE PROMOTION ONLY**
Date: 2026-09-23

## Objective

Qualify the exact runtime promotion required after ADR 0221 without retrying the failed ADR 0220 provider read.

ADR 0221 introduced two code-only runtime changes:

1. Wandora per-task semantic narrowing of Paperclip-authorized read tools;
2. safe normalized VendaERP MCP failure-code observability.

The future promotion must update exactly the three runtime artifacts that carry those contracts:

- Wandora Core;
- Paperclip external adapter `wandora_mastra`;
- stack-local VendaERP read-only MCP source.

No provider call belongs to this promotion.

## REAL NOW

Canonical repository:

```text
main = 87bf5d51a694389900bb81d5efbfcc15a8e12557
PR #289 = merged
ADR 0221 = canonical
open PRs = 0 at reconciliation
```

PR #289 exact head:

```text
0b6afa5a4c38d98d654908d319fdcdb11539d3dd
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

Production runtime:

```text
Core
  image    = wandora/core:organization-adapter-candidate-3b39a14f5c23
  revision = 3b39a14f5c238257b0fd087ed0c32494948a92cc
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
  package  = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package

28PRO Ana
  Paperclip status = idle
  errorReason      = null

Wandora work operations = 0
Wandora outbound attempts = 0
```

Paperclip read-only state at preflight:

```text
Task Drain
  draining     = false
  activeRuns   = 0
  pendingWakes = 0
  quiescent    = true

28PRO company live runs = []
```

Official `wandora_mastra` test-environment returned HTTP 200 / PASS.

## Core candidate

Workflow:

```text
Core Candidate Artifact run = 35912643134
artifact id                 = 10773767677
artifact name               = core-organization-adapter-candidate-41801d40228f1781bb0025a1522e9206dcb97fa2
GitHub ZIP sha256           = f64a976e5d3a7544361e6815e003bbab832ecf7f7f54f9b335488ba14750ed3b
```

Candidate manifest:

```text
source_sha          = 41801d40228f1781bb0025a1522e9206dcb97fa2
source_tree_sha     = 6a751f803aa0447dfb4cb90086411c6e6403c968
image_tag           = wandora/core:organization-adapter-candidate-41801d40228f
OCI config digest   = sha256:624f8b60d98be62903e2ca57c889493ce70d63eea174d39a123cf7f453d8a222
OCI manifest digest = sha256:bd0f58254e79ea094482ba85522892f5fd2d5ec9ad516796a7cc0f83f42f8bab
archive sha256      = edcfbff65b989c3d363403665e3fa858bf7bb5ab8c33d4fad6b84f60d90e3aed
image user          = node
```

ZIP and inner archive hashes were independently reverified on the VPS.

Source equivalence against merged main:

```text
apps/core/
  candidate blobs = 101
  main blobs      = 101
  differences     = 0

infra/stacks/core/
  candidate blobs = 15
  main blobs      = 15
  differences     = 0
```

### Full production Compose render gate

The exact 12 Compose/overlay files used by the live Core were recovered from Docker labels.

Rendering the full current production composition with the current image and the ADR 0221 candidate produced exactly one effective delta:

```diff
- /services/core/image = wandora/core:organization-adapter-candidate-3b39a14f5c23
+ /services/core/image = wandora/core:organization-adapter-candidate-41801d40228f
```

```text
DIFF_COUNT = 1
IMAGE_ONLY_DELTA_OK = 1
```

No migration, flag, secret mount, network, volume or other Compose field changes.

The current Core rollback image remains locally available:

```text
wandora/core:organization-adapter-candidate-3b39a14f5c23
image id = sha256:1dd167a8a914eece572ed9004c16ff10d0a97734d3bad65e6f45c011622b1a47
```

## Paperclip adapter candidate

Workflow:

```text
Paperclip Mastra Adapter CI run = 35912643142
artifact id                     = 10773298917
artifact name                   = paperclip-mastra-adapter-41801d40228f1781bb0025a1522e9206dcb97fa2
GitHub ZIP sha256               = 2c9985f16a4a8713ee762ee8877a155adde744272a9740cec7c2a027736318ea
```

Artifact provenance:

```text
wandora_source   = 41801d40228f1781bb0025a1522e9206dcb97fa2
paperclip_image  = wandora/paperclip:v2026.916.0
paperclip_source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
adapter_type     = wandora_mastra
```

Package:

```text
file   = wandora-paperclip-adapter-mastra-0.4.0.tgz
sha256 = ff93cfa7f6d9efe7c7e544c49d0b985647c979cb74440617fdf487af5eb8ef92
```

Extracted candidate:

```text
index.mjs        = 7effba71ea572b3d4679fda8792e18b46ea1a6ae26d3cf9d1f314c4d02bfc89c
package.json     = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f
compatibility    = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
```

Live active adapter:

```text
index.mjs        = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
package.json     = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f
compatibility    = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
```

Therefore the package delta is exactly the reviewed adapter implementation; package identity/version/compatibility metadata remain unchanged.

The candidate source directory is blob-identical to merged main:

```text
integrations/paperclip/adapters/wandora-mastra-v1/
candidate blobs = 9
main blobs      = 9
differences     = 0
```

The future persistent candidate path is frozen as:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
ff93cfa7f6d9efe7c7e544c49d0b985647c979cb74440617fdf487af5eb8ef92/
package
```

At preflight:

```text
operator-package parent writable by Paperclip = yes
candidate target exists                         = no
```

The existing active package remains the rollback package and must not be deleted.

## VendaERP MCP candidate

Canonical source:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs
sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
```

Live staged source:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp/server.mjs
sha256 = 3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92
source marker = 3bf7ccc0efb2a0b365fdd8896b9e4edffd477502
```

The same live bytes are visible inside Paperclip at:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs
```

The candidate source directory is blob-identical to merged main:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/
candidate blobs = 7
main blobs      = 7
differences     = 0
```

The live stack-local directory remains operator-owned and writable:

```text
wandora-admin:wandora-ops
mode = 2775
```

Rollback evidence was copied read-only to:

```text
/home/wandora-admin/preflight/adr0221-runtime-promotion-v1/rollback-mcp/
```

Frozen rollback hashes:

```text
server.mjs            = 3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92
WANDORA_SOURCE_COMMIT = 4f50a87f8ad28d225df9efeb58f59d72ee94ad4394f70038c6c26ecc5fd01713
```

The future promotion must replace the file in the existing mounted directory atomically; it must not change the bind-mount path or Paperclip connection/template configuration.

## Paperclip runtime inputs

Paperclip image remains unchanged:

```text
wandora/paperclip:v2026.916.0
```

Current Compose inputs:

```text
/opt/wandora/stacks/paperclip/compose.yaml
sha256 = eabfb8b8828d3de90bf29b8e96a503231f97b2413d8dc61903fbd610b379bf29

/opt/wandora/stacks/paperclip/compose.paperclip-execution-bridge.yaml
sha256 = 193bc8931652681a03891934db1799dee5557e0e6e6fb068ba09da1d0d017789
```

No Paperclip Compose change is required.

The existing read-only VendaERP bind mount remains unchanged.

## Capability Authority / Reuse Gate

No new subsystem is introduced.

```text
semantic per-task read narrowing = Wandora-owned contract
connection/grant/secret/catalog/policy/audit = Paperclip
external adapter install/replace = Paperclip
run lifecycle / Task Drain = Paperclip
ephemeral supervised execution = Mastra
provider translation = VendaERP MCP adapter
provider data = VendaERP
```

The promotion reuses:

- Paperclip native Task Drain;
- Paperclip external-adapter package store;
- Paperclip official adapter install/readback;
- existing Core Compose project;
- existing stack-local MCP bind mount.

No Wandora maintenance scheduler, provider registry, secret manager or duplicate tool authority is created.

ADR 0168 remains preserved.

## Second adversarial review

### Promotion while a run is active

Rejected.

The future execution must first start Paperclip native Task Drain and require:

```text
draining = true
activeRuns = 0
pendingWakes = 0
quiescent = true
```

The current read-only preflight already observed no live runs and `quiescent=true`, but this must be re-read after Drain is actually activated.

### Adapter replacement replay

Exactly one install/replace request may be dispatched.

If its response is ambiguous, read back `/api/adapters/wandora_mastra` and the external-adapter registry before any retry.

Do not blindly repeat installation.

### MCP staging while work can start

Rejected.

The MCP file may only be replaced after Task Drain is active/quiescent, so no new run can spawn a local_stdio process against a half-promoted runtime.

### Provider smoke during promotion

Rejected.

No `vendaerp_probe`, product search or other provider call belongs to runtime promotion.

### Paperclip restart

Replacement of the external adapter on pinned v2026.916.0 historically requires restart.

If the official install response returns `requiresRestart=true`, recreate/restart only Paperclip once using the exact existing Compose inputs.

Restart clears Task Drain by design.

### Core rollback

If the Core candidate fails validation, recreate only Core with:

```text
wandora/core:organization-adapter-candidate-3b39a14f5c23
```

and the same 12 Compose inputs.

### Adapter rollback

The active old package path remains retained.

If the new adapter cannot load/test after restart, replace the registration back to the retained old local package through Paperclip's official adapter boundary, restart Paperclip once if required, and require exactly one loaded `wandora_mastra@0.4.0` with the old `index.mjs` hash.

Do not delete either package during rollback.

### MCP rollback

Restore the frozen rollback `server.mjs` and source marker atomically inside the existing stack-local directory.

No connection/grant/secret/catalog/template state changes.

## Frozen future execution order

A separate production execution may perform only:

1. reconcile canonical main, open PRs, Core/Paperclip health and live runs;
2. require work operations=0 and outbound attempts=0;
3. verify Core candidate, adapter artifact and MCP candidate hashes again;
4. verify Core rollback image, retained adapter package and MCP rollback hashes;
5. start Paperclip native Task Drain with bounded TTL;
6. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
7. atomically stage the ADR 0221 MCP `server.mjs` and update its source marker in the existing stack-local directory;
8. load the exact verified Core image archive;
9. recreate only Core with `wandora/core:organization-adapter-candidate-41801d40228f`;
10. require Core healthy/restart 0 and runtime still `mastra-supervised-model`;
11. stage the exact adapter package under its frozen persistent hash-addressed Paperclip path;
12. dispatch exactly one official adapter install/replace using that local persistent directory;
13. ambiguous response => readback first; no blind repeat;
14. require type=`wandora_mastra`, version=`0.4.0`, exact candidate package path and expected restart requirement;
15. if required, recreate/restart only Paperclip once using unchanged image/Compose;
16. require Paperclip healthy/restart 0;
17. require exactly one loaded/enabled `wandora_mastra@0.4.0` at the candidate path;
18. require official adapter `test-environment=PASS`;
19. require container-visible VendaERP MCP `server.mjs` hash = `067e7f...`;
20. require 28PRO Ana remains idle/healthy and company live runs remain [];
21. require work operations=0 and outbound attempts=0;
22. STOP.

This promotion does **not** authorize retrying the ADR 0220 product read.

A new provider retry requires its own post-promotion preflight that proves the live marker exposes exactly `vendaerp_search_products` to Mastra and that safe MCP error-code observability is present.

## Effect boundary

This ADR performed only:

- read-only repository/runtime reconciliation;
- GitHub artifact download;
- checksum/provenance verification;
- Compose rendering;
- read-only adapter/MCP hash comparison;
- read-only Task Drain/live-run/agent/adapter readback;
- official no-effect adapter test-environment;
- copies of rollback evidence into the operator preflight directory.

It did **not**:

- start Task Drain;
- load or promote the Core image;
- stage the MCP candidate into production;
- stage/install/replace the adapter candidate;
- restart Core or Paperclip;
- mutate Paperclip connection/grant/secret/profile/catalog state;
- call VendaERP;
- run the model;
- create customer work;
- create outbound attempts;
- apply migrations.

## Decision

**GREEN / GO for a separate runtime-promotion execution slice only.**

Provider retry remains explicitly out of scope.
