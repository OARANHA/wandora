# ADR 0250 — VendaERP Product Safe Subreason MCP Production Promotion Execution V1

Status: **COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Promote ADR 0248's safe product-response subreason observability into the live VendaERP read-only MCP using the exact ADR 0249-qualified artifact, without changing Paperclip lifecycle/configuration and without calling VendaERP or a model provider.

This execution changes only the two existing host-mounted runtime files:

- `server.mjs`;
- `WANDORA_SOURCE_COMMIT`.

Paperclip remains authority for Tool Gateway transport/lifecycle. No new Wandora runtime subsystem is introduced.

## Canonical entry state

At execution entry:

```text
main =
1a018c024ede186f3c55c061740fb3ca6e1d7abe

PR #324 =
MERGED

post-merge push workflows =
4/4 GREEN
  Core CI
  Messaging Gateway CI
  Platform Admin CI
  Web CI

open PRs =
0
```

The executable MCP candidate remains the ADR 0249-qualified source from:

```text
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

## Qualified artifacts

Candidate:

```text
server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT sha256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

source marker =
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

Frozen rollback:

```text
server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

WANDORA_SOURCE_COMMIT sha256 =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d

source marker =
9b211486aaea640c3ff7a81a5f5e1171da225bdb
```

The exact live files matched the rollback before effect.

## Protected maintenance entry

Before mutation:

```text
Paperclip =
  wandora/paperclip:v2026.916.0
  container 4b187dc595ea...
  healthy / restart 0

Core =
  wandora/core:organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy / restart 0

Ana =
  idle / wandora_mastra

work =
  1

unfinished =
  0

outbound =
  0

VendaERP activity =
  70 events
  sha256 e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b

active VendaERP stdio process =
  none
```

Paperclip-native Task Drain was started at:

```text
2026-09-24T08:19:26.880Z
```

Protected state:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

No temporary tool policy or rate-limit policy was required for this no-provider maintenance slice.

## Atomic promotion

At approximately `2026-09-24T08:19:40Z`, candidate temporary files were created inside the existing live runtime directory with:

```text
owner = wandora-admin:wandora-ops
mode = 0444
```

Temporary hashes were verified before rename:

```text
.server.mjs.adr0250.tmp =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

.WANDORA_SOURCE_COMMIT.adr0250.tmp =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

Each file was then atomically renamed over the existing live path on the same filesystem.

Post-replacement host hashes:

```text
server.mjs =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

The marker content is:

```text
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

No Paperclip restart occurred.

No Core restart occurred.

No Connection, template, grant, install, profile, catalog or secret mutation occurred.

## Host/container identity

After promotion, host and Paperclip bind-mounted bytes matched exactly:

```text
host server.mjs =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

container server.mjs =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

host marker =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

container marker =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

Host and container source marker contents are both:

```text
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

## Post-promotion no-network validation

The first attempted live-bytes discovery command produced `invalid-input` because the shell command emitted malformed JSON-RPC due to quoting. This was a validation-command defect only; it did not invoke VendaERP, mutate runtime state or demonstrate an MCP failure.

The corrected probe used the exact live mounted bytes with:

```text
network = none
credentials = none
```

and passed:

```text
LIVE_MCP_DISCOVERY_OK tools=8 network=none
server=wandora-vendaerp-readonly
```

The exact expected eight read-only tools remained present and non-destructive.

A second exact-live-byte proof used only an injected synthetic `fetchImpl`, also under `--network none`.

Observed:

```text
product-list-shape=OK
product-name-missing=OK
LIVE_SAFE_SUBREASON_OK network=none
```

Therefore the promoted bytes preserve the existing safe top-level error contract while adding the allowlisted structured subreason required to distinguish the two known parser failure classes.

## Final runtime validation

During protected validation:

```text
Task Drain =
  ON / quiescent
  activeRuns=0
  pendingWakes=0

Ana =
  idle / wandora_mastra

work =
  1

unfinished =
  0

outbound =
  0

active VendaERP stdio process =
  none

VendaERP activity =
  70 events
  sha256 e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

Runtime identity remained unchanged:

```text
Paperclip =
  same container 4b187dc595ea...
  wandora/paperclip:v2026.916.0
  healthy
  restart 0

Core =
  same container 72b05d682458...
  organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy
  restart 0
  healthz 200
  readyz 200
```

Maintenance-window log scan found no unexpected:

- `vendaerp_search_products`;
- `Produtos/Pesquisar`;
- Mistral/model-provider execution;
- MCP `tool-error`.

No real provider/model request occurred.

## Task Drain exit

Task Drain was explicitly ended through the native Paperclip API.

Observed:

```text
ended.wasActive = true
```

Final state:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

A second idempotent stop read returned `wasActive=false`, confirming the first native stop had already completed.

## Final production state

```text
server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT sha256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

source marker =
c697c9c803ac03dfafa52bf730a7e28c6191fda6

Task Drain =
OFF / quiescent

Core =
healthy / restart 0 / healthz 200 / readyz 200

Paperclip =
healthy / restart 0 / same container

Ana =
idle / wandora_mastra

work =
1 completed

unfinished =
0

outbound =
0

VendaERP activity =
70 events / byte-identical hash
```

Rollback was not required.

## Capability Authority / Reuse Gate

Authority is unchanged:

- Paperclip owns Tool Gateway transport, local stdio lifecycle, Connection/template/grant/install/profile/catalog state and audit.
- VendaERP MCP remains the replaceable provider adapter and owns provider-response parsing.
- Wandora Core owns product semantics and safe consumption of read-tool results.
- Mastra remains the replaceable supervised runtime.

No provider capability was internalized.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Decision

**COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL.**

The safe subreason observability is now live.

A future bounded real product read can distinguish the current `invalid-provider-response` as either:

- `product-list-shape`; or
- `product-name-missing`;

without persisting raw provider payload or broadening the VendaERP contract.

Next slice:

**ADR 0251 — 28PRO VendaERP Product Diagnostic One-Shot V2 Preflight — HARD PROVIDER CALL BUDGET / NO EFFECT.**

The preflight must reuse the already-qualified Paperclip native block/rate-limit controls from ADR 0242. It must not add retries or a new lifecycle mechanism. A real provider read remains prohibited until that bounded one-shot preflight is GREEN.
