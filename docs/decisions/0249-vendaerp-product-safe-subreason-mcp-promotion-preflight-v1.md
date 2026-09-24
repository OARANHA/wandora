# ADR 0249 — VendaERP Product Safe Subreason MCP Promotion Preflight V1

Status: **GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION / NO PROVIDER CALL**
Date: 2026-09-24

## Objective

Qualify the production promotion of ADR 0248's safe product-response subreason observability without changing production and without calling VendaERP or a model provider.

The promotion must reuse the existing Paperclip `local_stdio` connection, template, mount and lifecycle authority. No new runtime service, restart, catalog state or provider-owned subsystem is required.

## Canonical repository state

At preflight:

```text
main = c697c9c803ac03dfafa52bf730a7e28c6191fda6
PR #323 = MERGED
ADR 0248 = merged
open PRs = 0 at preflight entry
```

Post-merge push workflows for exact main are 6/6 GREEN:

- Core CI
- Messaging Gateway CI
- Paperclip OpenAPI Compatibility
- Platform Admin CI
- VendaERP Read-Only MCP CI
- Web CI

## Deployable artifact identity

The VendaERP MCP workflow validates source directly and does not publish a separate runtime package. Production already consumes the repository-derived `server.mjs` through a read-only bind mount.

Therefore the exact deployable artifact is:

```text
main path =
integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs

source commit =
c697c9c803ac03dfafa52bf730a7e28c6191fda6

git blob =
8dae8f49611988a021d903fc9e01d77330805675

sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

size =
20224 bytes

mode =
0444 when staged
```

The candidate `WANDORA_SOURCE_COMMIT` marker contains the exact canonical commit and hashes to:

```text
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

The Git blob of the independently staged candidate matches the Git blob at exact main.

## Current live / rollback identity

Production currently serves:

```text
server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

WANDORA_SOURCE_COMMIT =
9b211486aaea640c3ff7a81a5f5e1171da225bdb

marker sha256 =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d
```

Exact copies of both live files were frozen outside the runtime under:

```text
/home/wandora-admin/preflights/adr0249-vendaerp-safe-subreason-mcp-promotion-v1/rollback
```

Rollback requires no Git fetch, build, provider call or Paperclip restart.

## Executable delta

The exact main parent has the same `server.mjs` SHA-256 as production:

```text
parent server.mjs =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

Main changes under the MCP component are:

- README documentation;
- `server.mjs`;
- tests.

The only production executable change is `server.mjs`, with 23 insertions and 2 deletions.

The executable change only:

- adds an allowlist for `product-list-shape` and `product-name-missing`;
- attaches one of those reasons to the two existing product parser failures;
- retains the existing `invalid-provider-response` top-level code;
- retains the existing text MCP error shape;
- exposes the reason only in structured MCP metadata and the safe stderr event.

No endpoint, HTTP method, timeout, retry behavior, credential handling, catalog surface or tool permission changes.

## Existing runtime binding

The live Paperclip mount is:

```text
host:
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp

container:
/opt/wandora/integrations/vendaerp-readonly-mcp

type = bind
mode = ro
RW = false
```

The live host directory is:

```text
owner = wandora-admin:wandora-ops
mode = 2775
operator writable = yes
filesystem device = 2049
```

The preflight candidate is on the same filesystem device, so same-filesystem rename semantics are available. The execution should nevertheless create temporary replacement files inside the live directory before rename, making each file replacement atomic at the directory-entry level.

The live files are currently owner `wandora-admin:wandora-ops` and mode `0444`.

## Paperclip execution semantics

Pinned Paperclip `dffc2b3c...` proves connected `local_stdio` calls execute:

```text
spawn(template.command, template.args, ...)
```

for every invocation.

The current template is active:

```text
templateId = wandora.vendaerp-readonly-v1-r1
command = node
args =
  /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs
  --tenant
  voepro
toolCount = 8
```

The 28PRO Connection remains:

```text
id = 8e2c23f4-73f5-444a-8647-71428819ea91
status = active
enabled = true
transport = local_stdio
healthStatus = ok
```

Catalog remains exactly eight active entries, all:

```text
riskLevel = read
isWrite = false
isDestructive = false
```

Connection install remains Ana-only:

```text
targetType = agent
targetId = 428b6730-3df4-4b92-b90a-a87f87c401f9
```

Because Paperclip spawns `node <mounted server.mjs>` for each call and the directory is bind-mounted, changing the host file is sufficient for subsequent invocations. A Paperclip restart, template mutation, catalog refresh, Connection mutation or install/grant/profile change is not required.

## Candidate isolated validation

The exact candidate was mounted read-only into:

```text
wandora/paperclip:v2026.916.0
network = none
credentials = none
```

MCP initialization and `tools/list` passed:

```text
EPHEMERAL_CANDIDATE_MCP_OK tools=8 network=none
server=wandora-vendaerp-readonly
```

The exact eight expected tools were returned and all remained read-only/non-destructive.

A second `--network none` proof imported the exact candidate and used only an injected synthetic `fetchImpl`.

Observed:

```text
product-list-shape=OK
product-name-missing=OK
SAFE_SUBREASON_CANDIDATE_OK network=none
```

No provider request was possible in either proof.

## Production no-effect baseline

Before promotion:

```text
Core =
  organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy / restart 0
  healthz 200
  readyz 200

Paperclip =
  wandora/paperclip:v2026.916.0
  container 4b187dc595ea...
  healthy / restart 0

Task Drain =
  OFF
  activeRuns = 0
  pendingWakes = 0
  quiescent = true

Ana =
  idle / wandora_mastra

temporary guards/counters = 0

28PRO work = 1
unfinished = 0
outbound = 0

VendaERP activity =
  events = 70
  sha256 = e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

`docker top` found no active process using the VendaERP MCP server path during the preflight.

No production file was changed by this preflight.

## Capability Authority / Reuse Gate

No authority changes.

- Paperclip remains authority for Tool Gateway transport, Connection/template/grant/install/profile/catalog state, local stdio execution, lifecycle and audit.
- VendaERP MCP remains the replaceable provider adapter and owns provider-response parsing.
- Wandora Core remains the semantic consumer of read-tool success/failure.
- Mastra remains the replaceable supervised runtime.

This promotion does not create a new service, tool runtime, state table, retry system, cache or provider mirror.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review

- Exact candidate derived from merged main? **Yes.**
- Candidate Git blob matches exact main? **Yes.**
- Candidate passed isolated network-none discovery? **Yes.**
- Candidate safe reasons passed synthetic network-none proof? **Yes.**
- Existing text MCP error contract remains unchanged? **Yes.**
- Current live rollback frozen? **Yes.**
- Runtime directory writable by normal deployment operator? **Yes.**
- Mount remains read-only inside Paperclip? **Yes.**
- Paperclip spawns the mounted file per call? **Yes.**
- Paperclip restart required? **No.**
- Catalog/template/Connection mutation required? **No.**
- Migration required? **No.**
- Provider/model call required? **No.**
- Production changed during preflight? **No.**

## Frozen production promotion sequence

A separate execution must:

1. reconcile main, open PRs, workflows and runtime;
2. reverify candidate and rollback hashes;
3. snapshot current VendaERP activity and work/outbound state;
4. require no active VendaERP stdio process;
5. start bounded Paperclip-native Task Drain;
6. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
7. create candidate temporary files inside the live runtime directory;
8. require temp file owner/group/mode and hashes;
9. atomically rename the candidate `server.mjs` over the live file;
10. atomically rename the candidate source marker over the live marker;
11. require exact host and container hashes/marker;
12. do not restart Paperclip;
13. do not mutate template, Connection, grant, install, profile, catalog or secrets;
14. run direct MCP `initialize + tools/list` from the live mounted bytes without credentials/provider call;
15. run a synthetic injected-fetch subreason proof against the live bytes, without provider network;
16. require Paperclip same container/image/healthy/restart 0;
17. require Core unchanged/healthy/ready;
18. require zero active/pending runs, no work/outbound delta and identical VendaERP activity;
19. scan maintenance logs for unexpected provider/model execution;
20. explicitly end Task Drain through the native Paperclip contract;
21. require final Task Drain OFF/quiescent.

If validation fails, keep Task Drain active and atomically restore the frozen rollback `server.mjs` and marker, validate old hashes through the container mount, and only then end Task Drain.

No real VendaERP read belongs to this promotion.

## Decision

**GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION / NO PROVIDER CALL.**

Next slice:

**ADR 0250 — VendaERP Product Safe Subreason MCP Production Promotion Execution V1 — NO PROVIDER CALL.**
