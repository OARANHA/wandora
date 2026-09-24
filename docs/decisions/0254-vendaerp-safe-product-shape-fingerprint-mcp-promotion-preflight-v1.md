# ADR 0254 — VendaERP Safe Product-Shape Fingerprint MCP Promotion Preflight V1

Status: **GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Qualify ADR 0253's allowlisted product-list structural fingerprint for a separate production promotion of the existing VendaERP read-only MCP, without changing production and without calling VendaERP or any model provider.

This is not a parser-broadening slice. The candidate remains fail-closed and only enriches the already-safe semantic error with an allowlisted structural `shape`.

## Canonical repository state

At preflight:

```text
main =
18549a59a5fd82fe1efbe07902dbc189a3ceb609

PR #332 =
MERGED

post-merge push workflows =
6/6 GREEN
  Core CI
  Messaging Gateway CI
  Paperclip OpenAPI Compatibility
  Platform Admin CI
  VendaERP Read-Only MCP CI
  Web CI
```

The merged runtime source is:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs

Git blob =
1687678d6543834993d0413ec94f761fd860ebb1

SHA-256 =
67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303
```

Candidate source marker:

```text
content =
18549a59a5fd82fe1efbe07902dbc189a3ceb609

SHA-256 =
e436a3b5029d30e1614dfaeb2717153361759ee2fdf8fa972f957341c36e5a56
```

## Current live rollback identity

Production currently exposes:

```text
server.mjs SHA-256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT content =
c697c9c803ac03dfafa52bf730a7e28c6191fda6

WANDORA_SOURCE_COMMIT SHA-256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

Frozen rollback copies were created at:

```text
/home/wandora-admin/preflights/adr0254-vendaerp-safe-shape-mcp-promotion-v1/rollback
```

Their hashes match production byte-for-byte.

Candidate copies were created at:

```text
/home/wandora-admin/preflights/adr0254-vendaerp-safe-shape-mcp-promotion-v1/candidate
```

No live file was changed.

## Runtime binding

The existing Paperclip bind remains:

```text
host =
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp

container =
/opt/wandora/integrations/vendaerp-readonly-mcp

type =
bind

read-only inside Paperclip =
true
```

Live file ownership/mode:

```text
server.mjs =
wandora-admin:wandora-ops / 0444

WANDORA_SOURCE_COMMIT =
wandora-admin:wandora-ops / 0444
```

There was no active VendaERP stdio process at preflight.

ADR 0249 already proved the pinned Paperclip `local_stdio` implementation spawns the mounted template command per invocation. No Paperclip restart, template mutation, Connection mutation, catalog refresh, grant/install/profile change or new runtime service is required.

## Candidate functional proof

The exact candidate bytes were mounted read-only into the existing Paperclip image under:

```text
--network none
```

MCP initialize/tools-list passed:

```text
DISCOVERY_OK tools=8 network=none
```

All eight tools remained read-only/non-destructive.

Synthetic in-memory response-shape probes, also under `--network none`, passed:

```text
object-items-array=OK
array-non-object=OK
object-Message=OK
null=OK
string=OK
object-other=OK
SAFE_SHAPE_OK network=none
```

No real provider endpoint was reachable or called.

The earlier malformed JSON-RPC discovery command during this preflight produced only normalized `invalid-input` responses because of shell quoting. The corrected file-based JSON-RPC probe passed; this was a validation-command defect, not a candidate/runtime failure.

## Production baseline

Live runtime:

```text
Paperclip =
  container 4b187dc595ea...
  wandora/paperclip:v2026.916.0
  healthy / restart 0

Core =
  container 72b05d682458...
  wandora/core:organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy / restart 0

Task Drain =
  OFF / quiescent
  activeRuns=0
  pendingWakes=0

temporary block/rate-limit policies =
0

rate-limit counter rows =
0

Connection =
  active / enabled / local_stdio / health=ok

Tool Gateway =
  active / gateway_only

catalog =
  exactly 8 active tools
  all risk=read
  all isWrite=false
  all isDestructive=false

VendaERP activity =
  72 events
  sha256 6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb

work =
  2 total

unfinished =
  1

outbound =
  0

Ana =
  error / wandora_execution_failed_422
```

Ana's error state and the ADR 0252 `execution_uncertain` work are truthful prior state. This maintenance slice does not rewrite or recover them. Their presence does not create an active run/wake and does not require provider execution for this file-only promotion.

## Executable delta

Relative to the currently live MCP source marker `c697c9c...`, the repository runtime delta is limited to:

```text
M integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs
M integrations/paperclip/mcp-vendaerp-readonly-v1/test/server.test.mjs
```

Only `server.mjs` is production executable.

ADR 0253 does not:

- accept a new provider wrapper;
- change endpoint/method/headers;
- add retry;
- add network access;
- alter the eight-tool surface;
- change model-visible text error;
- persist provider payload;
- modify Core/Paperclip lifecycle.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Paperclip owns Tool Gateway transport, Connection/template/grant/install/profile/catalog state, local stdio lifecycle, policy and audit.
- VendaERP MCP owns provider-specific parsing and safe response-shape classification.
- Wandora Core owns customer-work semantics and fail-closed consumption of read-tool errors.
- Mastra remains a replaceable supervised runtime provider.

No new Wandora table/service/state machine, provider mirror, retry engine or tool runtime is introduced.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review

- Exact merged candidate source identified? **Yes.**
- Candidate hash independently computed on VPS? **Yes.**
- Exact live rollback frozen? **Yes.**
- Host bind remains read-only inside Paperclip? **Yes.**
- Active stdio process at qualification? **No.**
- Candidate discovery works under network none? **Yes.**
- Safe structural fingerprints work under network none? **Yes.**
- Parser broadened? **No.**
- Model-visible text error changed? **No.**
- Connection/template/catalog mutation required? **No.**
- Paperclip/Core restart required? **No.**
- Migration required? **No.**
- Production provider/model call during preflight? **No.**
- VendaERP activity changed? **No.**
- Existing Ana/work failure state force-reconciled? **No.**

## Frozen promotion sequence

A separate production execution must:

1. reconcile current main/workflows/runtime and require no material drift;
2. reverify candidate and rollback hashes;
3. snapshot work/outbound/VendaERP activity;
4. require no active run/pending wake or active VendaERP stdio process;
5. start bounded Paperclip-native Task Drain;
6. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
7. create candidate temporary files inside the live host directory with owner/group/mode matching the live files;
8. verify temporary candidate hashes before rename;
9. atomically rename candidate `server.mjs` over live `server.mjs`;
10. atomically rename candidate source marker over live `WANDORA_SOURCE_COMMIT`;
11. require exact host and container hashes/source marker;
12. do not restart Paperclip or Core;
13. do not mutate template, Connection, grant, install, profile, catalog or secrets;
14. validate exact live bytes with MCP discovery under no-network conditions where applicable;
15. validate the new safe structural fingerprint using only injected synthetic in-memory response data;
16. require Paperclip/Core healthy/restart unchanged;
17. require VendaERP activity byte-identical to pre-maintenance snapshot;
18. require no provider/model markers in maintenance logs;
19. explicitly end Task Drain through the native Paperclip API;
20. require final Task Drain OFF/quiescent.

If protected validation fails, keep admission drained, atomically restore the frozen rollback files, verify rollback bytes through the container mount, and only then end Task Drain.

No real VendaERP read belongs to this promotion.

## Decision

**GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION / NO PROVIDER CALL.**

Next slice:

**ADR 0255 — VendaERP Safe Product-Shape Fingerprint MCP Production Promotion Execution V1 — NO PROVIDER CALL.**
