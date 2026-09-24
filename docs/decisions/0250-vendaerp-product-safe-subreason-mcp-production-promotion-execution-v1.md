# ADR 0250 — VendaERP Product Safe Subreason MCP Production Promotion Execution V1

Status: **COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Promote ADR 0248's safe product-response subreason observability to the live VendaERP read-only MCP exactly as qualified by ADR 0249, without calling VendaERP or a model provider and without restarting Paperclip.

## Canonical entry

```text
main = 1a018c024ede186f3c55c061740fb3ca6e1d7abe
ADR 0249 = GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION
open PRs = 0
post-merge push workflows = 4/4 GREEN
```

The executable MCP source remains the exact merged ADR 0248 artifact from:

```text
source commit =
c697c9c803ac03dfafa52bf730a7e28c6191fda6

candidate server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

candidate WANDORA_SOURCE_COMMIT sha256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

## Pre-mutation baseline

Production before effect:

```text
live server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

live WANDORA_SOURCE_COMMIT sha256 =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d

work = 1
unfinished = 0
outbound = 0

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

Ana =
  idle / wandora_mastra

VendaERP activity =
  events=70
  sha256=e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

No active process referenced:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs
```

The exact rollback copies frozen by ADR 0249 still matched the live old hashes.

Core and Paperclip were healthy/restart 0. No temporary policy or rate counter was present.

## Task Drain

Paperclip-native Task Drain was started before runtime file mutation:

```text
startedAt =
2026-09-24T08:19:26.880Z

expiresAt =
2026-09-24T08:34:26.880Z

draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

The TTL was only a backstop.

## Atomic MCP file promotion

The live runtime directory remained:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
```

Candidate temporary files were created **inside the live directory** with:

```text
owner = wandora-admin
group = wandora-ops
mode = 0444
```

Pre-rename temp hashes:

```text
server.mjs =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

Each file was then atomically renamed over its corresponding live directory entry while Task Drain remained active/quiescent.

Immediate host readback:

```text
server.mjs =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

marker contents =
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

No Paperclip restart occurred.

## Interruption reconciliation

Immediately after replacement, the Remote Desktop connection failed during the first validation command.

No mutation was repeated.

After reconnecting, independent readback proved:

- host hashes were the exact candidate hashes;
- Paperclip's read-only bind mount exposed the exact same hashes;
- the source marker contained the expected source commit;
- Task Drain was still active/quiescent;
- VendaERP activity was still byte-identical at 70 events;
- Ana remained idle.

Therefore the already-completed replacement was accepted as real and validation resumed without replaying it.

## Live mounted-byte validation

Inside the unchanged Paperclip container:

```text
server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT sha256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6
```

Direct MCP stdio initialization and `tools/list` were executed from the live mounted bytes without credentials and without any provider tool call.

Observed:

```text
server = wandora-vendaerp-readonly
tools = 8
all readOnlyHint = true
all destructiveHint = false
LIVE_MCP_DISCOVERY_OK
```

## Synthetic live subreason proof

The live mounted `server.mjs` was imported inside the Paperclip container with an injected in-memory `fetchImpl`.

No network request was used.

Observed:

```text
object envelope instead of direct product array
-> code=invalid-provider-response
-> reason=product-list-shape

array product without usable nome
-> code=invalid-provider-response
-> reason=product-name-missing

unapproved reason string
-> discarded

LIVE_SAFE_SUBREASON_SYNTHETIC_OK
network=synthetic-only
```

The existing eight-tool surface and provider endpoint behavior were not broadened.

## Protected validation before admission restore

While Task Drain was still active:

```text
Task Drain =
  draining=true
  activeRuns=0
  pendingWakes=0
  quiescent=true

Ana =
  idle / wandora_mastra

VendaERP activity =
  events=70
  sha256=e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b

work=1
unfinished=0
outbound=0
active VendaERP stdio process=0
```

Paperclip remained the exact same container/image:

```text
container =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5

image =
wandora/paperclip:v2026.916.0

healthy
restart=0
```

Core remained unchanged:

```text
container =
72b05d68245862e5bfc3c8e61bb96e3aacddc117332305081ea1ff7ae7ab0178

image =
wandora/core:organization-adapter-candidate-46741f8d82d0

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

healthy
restart=0
healthz=200
readyz=200
```

Maintenance-window log scan found:

```text
Paperclip provider/model markers = 0
Core provider/model markers = 0
```

No provider/model call occurred.

## Task Drain completion

The Task Drain was explicitly ended through the native Paperclip Board API before TTL expiry.

The first native stop/readback, executed at approximately `2026-09-24T08:22:05Z`, returned:

```text
ended.wasActive=true
after.draining=false
after.startedAt=null
after.expiresAt=null
after.activeRuns=0
after.pendingWakes=0
after.quiescent=true
```

A second idempotent native stop/readback at approximately `2026-09-24T08:22:11Z` returned:

```text
before.draining=false
stopped.wasActive=false
after.draining=false
after.activeRuns=0
after.pendingWakes=0
after.quiescent=true
```

Therefore admission restoration was caused by the first explicit native stop; the TTL remained only a backstop.

## Final production state

```text
VendaERP MCP live server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

VendaERP MCP source marker =
c697c9c803ac03dfafa52bf730a7e28c6191fda6

Task Drain = OFF / quiescent
activeRuns = 0
pendingWakes = 0

Ana = idle / wandora_mastra

work = 1
unfinished = 0
outbound = 0

VendaERP activity =
  events=70
  sha256=e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b

Paperclip = same container/image / healthy / restart 0
Core = same promoted container/image / healthy / restart 0
```

No template, Connection, install, grant, profile, catalog, secret, database schema or migration changed.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Paperclip owns Tool Gateway transport, Connection/template/grant/install/profile/catalog state, lifecycle, policy, rate limiting and audit.
- VendaERP MCP remains the replaceable provider-specific adapter and now emits bounded safe parsing reasons.
- Wandora Core remains the semantic consumer of tool success/failure.
- Mastra remains the replaceable supervised runtime.

No provider capability was duplicated or internalized.

ADR 0168 remains preserved.

## Second adversarial review

- Exact prequalified bytes promoted? **Yes.**
- Existing rollback frozen? **Yes.**
- Atomic replacement used? **Yes.**
- Task Drain active/quiescent during mutation? **Yes.**
- Paperclip restart? **No.**
- Core restart? **No.**
- Template/Connection/catalog mutation? **No.**
- Migration? **No.**
- Real provider call? **No.**
- Model call? **No.**
- Activity changed? **No.**
- Work/outbound changed? **No.**
- Live mounted bytes validated? **Yes.**
- Safe subreasons proven on live bytes with synthetic I/O? **Yes.**
- Task Drain final OFF/quiescent? **Yes; the first explicit native stop returned `wasActive=true`, and a second idempotent stop confirmed `wasActive=false`.**

## Decision

**COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL.**

The live VendaERP MCP can now distinguish the next bounded product failure as either:

- `product-list-shape`; or
- `product-name-missing`;

without persisting raw provider payloads and while preserving the existing normalized error contract.

A second real provider read may only occur as a separately bounded one-shot with the existing Paperclip-native hard one-call budget and canonical owner-originated customer-work path.
