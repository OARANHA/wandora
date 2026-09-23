# ADR 0228 — ADR 0227 Core + VendaERP MCP Tool Error Semantics Promotion Preflight V1

Status: **GREEN / NO PRODUCTION EFFECT / GO FOR SEPARATE PROMOTION ONLY**
Date: 2026-09-23

## Objective

Qualify, without production mutation, the exact runtime promotion required by ADR 0227.

ADR 0227 corrected two boundaries in code:

1. VendaERP MCP tool-execution failures use standard MCP `result.isError=true` semantics instead of JSON-RPC protocol errors;
2. Wandora Core fails closed on MCP error results before any result can reach the supervised runtime/model.

This preflight does **not** authorize another VendaERP provider read.

## Canonical entry

```text
main = 9b211486aaea640c3ff7a81a5f5e1171da225bdb
PR #297 = merged
PR #297 final reviewed head = 0e8946186da935eecc6d5d2b7b02f70dc7afaa46
open PRs = 0 at reconciliation
```
PR #297 exact-head workflows were 9/9 GREEN:

- Core CI;
- Core Candidate Artifact;
- Paperclip Mastra Adapter CI;
- VendaERP Read-Only MCP CI;
- Organization Adapter Plugin CI;
- Paperclip OpenAPI Compatibility;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

Post-merge `main@9b211486...` push workflows materialized as 8/8 GREEN: Core CI, Core Candidate Artifact, VendaERP Read-Only MCP CI, Paperclip Mastra Adapter CI, Paperclip OpenAPI Compatibility, Web CI, Platform Admin CI and Messaging Gateway CI. Organization Adapter did not materialize as a push workflow on the squash commit; no conclusion beyond the observed workflow set is inferred from that absence.

## REAL NOW

Production readback before this preflight decision:

```text
Core image    = wandora/core:organization-adapter-candidate-da4289034575
Core revision = da42890345753ebabf579947f568acd74145089b
Core health   = healthy
Core restarts = 0

Paperclip image    = wandora/paperclip:v2026.916.0
Paperclip health   = healthy
Paperclip restarts = 0

wandora_mastra = 0.4.0 / loaded / enabled
retained package = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c

VendaERP MCP live server.mjs =
067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
live source marker = 87bf5d51a694389900bb81d5efbfcc15a8e12557
```
Paperclip native Task Drain is OFF and quiescent:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

28PRO company live runs = 0.

The temporary ADR 0227 execution state is clean:

```text
PRO-8 residual = 0
temporary profile 7d3ec031-... residual = 0
Wandora work operations = 0
Wandora outbound attempts = 0
```

The existing VendaERP Connection remains active `local_stdio` and its catalog still contains exactly eight tools. This preflight makes no Connection, grant, secret, install, profile or catalog mutation.

## Core candidate

Core Candidate Artifact workflow:

```text
run id      = 35929310603
artifact id = 10779549706
artifact    = core-organization-adapter-candidate-fc8721ccaedd5079eec9f3be11e8b64051416579
GitHub ZIP sha256 =
638ba85bed9677c9e544efec2e451e57e92b835425a4e6ada12f5bbb4b352888
```
Candidate manifest:

```text
source_sha          = fc8721ccaedd5079eec9f3be11e8b64051416579
source_tree_sha     = d399b5db81eeb4dcac7c32afd7f7423f1b41e8bb
image_tag           = wandora/core:organization-adapter-candidate-fc8721ccaedd
OCI config digest   = sha256:cc4658f877edfb0c4e570094d1e4e426651e28c75f71536b88b8af5052ecbc49
OCI manifest digest = sha256:a149dc3283a766f598abf80a2cdd9c4bdd77f9e3cd2addb6826a70fb2d11294b
archive sha256      = d838ec68f882b5b312d519a32d1ae89fdcf199676bf194632978aa9de0f3c931
image user          = node
```

The downloaded ZIP digest equals GitHub's published artifact digest and the inner archive equals `SHA256SUMS`.

Source equivalence to merged main is exact for the promoted Core surface:

```text
apps/core/       candidate=101 blobs / main=101 / diff=0
infra/stacks/core candidate=15 blobs / main=15 / diff=0
```

Against the live Core source `da428903...`, the only Core implementation delta is:

- `apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts`;
- its focused test.

No Compose file changed.
### Full production Compose gate

The exact 12-file Compose project currently attached to `wandora-core` was rendered with the current image and with the candidate image override.

```text
OLD_IMAGE = wandora/core:organization-adapter-candidate-da4289034575
NEW_IMAGE = wandora/core:organization-adapter-candidate-fc8721ccaedd

OLD_NONIMAGE_HASH =
b9cd9ffc8f8d0a2df0f0b183189b69ad61a3c66601ee2c43658e2ff15c714679

NEW_NONIMAGE_HASH =
b9cd9ffc8f8d0a2df0f0b183189b69ad61a3c66601ee2c43658e2ff15c714679

IMAGE_ONLY_DELTA_OK = 1
```

Therefore the future Core promotion changes only `/services/core/image`.

Rollback image is already local:

```text
wandora/core:organization-adapter-candidate-da4289034575
org.opencontainers.image.revision =
da42890345753ebabf579947f568acd74145089b
```

The ADR 0227 candidate image is deliberately **not loaded into production Docker** by this preflight.

## VendaERP MCP candidate

Merged-main candidate:

```text
server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
candidate source marker =
9b211486aaea640c3ff7a81a5f5e1171da225bdb
```
The candidate directory is source-equivalent to merged main:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/
candidate=7 blobs / main=7 / diff=0
```

Compared with the accepted live MCP, only `server.mjs` changes operational bytes. The reviewed implementation adds an MCP tool-error result helper and changes only `tools/call` execution exceptions from JSON-RPC `message.error` to:

```text
result.content = safe normalized error code only
result.structuredContent.error.code = safe normalized error code
result.isError = true
```

Protocol/method/input failures continue using JSON-RPC errors.

The stack-local production directory remains:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
mode 2775 / wandora-admin:wandora-ops
server.mjs and WANDORA_SOURCE_COMMIT mode 0444
```

Protected no-effect rollback/candidate evidence was staged under:

```text
/home/wandora-admin/preflight/adr0227-tool-error-promotion-v1/
```
Frozen MCP hashes:

```text
rollback/server.mjs =
067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
rollback/WANDORA_SOURCE_COMMIT =
1d53c9a728d28f6a019f4c0b0043b4d280b6607f67b24e85c5252f2ab7fadd40

candidate/server.mjs =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
candidate/WANDORA_SOURCE_COMMIT =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d
```

Paperclip source inspection proves `local_stdio` starts a child MCP process for a call and, in `finally`, ends stdin, sends SIGTERM and awaits exit. Therefore replacing the bind-mounted `server.mjs` does not require a Paperclip restart. A future Task Drain still protects the atomic file transition from concurrent runs.

## Validation

Candidate-local validation is GREEN:

```text
VendaERP MCP npm test     = 10/10 GREEN
verify-static.mjs         = WANDORA_VENDAERP_READONLY_MCP_V1_OK

Core focused bridge tests = 5/5 GREEN
Core typecheck            = GREEN
Core build                = GREEN
```
The focused Core proof includes:

- fail closed on MCP `isError=true`;
- fail closed on Paperclip's `MCP tool returned an error result` marker;
- repeated identical MCP error calls in one run reuse the same rejected Promise;
- no second provider call is issued for that identical failure.

An initial ad-hoc `node --test` invocation was rejected by Node because it omitted the project's TypeScript loader. The canonical `node --import tsx --test` invocation then passed 5/5; this was a harness invocation correction, not a code change.

No test in this preflight called VendaERP.

## Capability Authority / Reuse Gate

Authority is unchanged:

- Paperclip owns issue/run lifecycle, profile binding, policy, Connection/grant/secret/install/catalog, Tool Gateway, audit and MCP execution;
- Wandora Core owns only the provider-neutral semantic/fail-closed bridge boundary;
- VendaERP MCP owns only bounded provider translation and safe normalized provider-error representation;
- Mastra remains ephemeral supervised runtime.

No retry engine, lifecycle flag, second policy system, connection store, secret store or Paperclip fork is introduced.

ADR 0168 remains preserved.

ADR 0208 remains preserved: generic REST Tool Gateway execution is still NO-GO.
## SECOND ADVERSARIAL REVIEW

- Are we reusing Paperclip rather than moving execution authority to Wandora? **Yes.**
- Is MCP `isError=true` a tool-execution failure rather than a protocol failure? **Yes; protocol errors remain JSON-RPC errors.**
- Can the HTTP-200 MCP error result become logical success in Wandora? **No; the candidate Core converts it to `PaperclipToolGatewayReadBridgeError("unavailable")`.**
- Can `structuredContent.error.code` reach the model through this bridge? **No; Core throws before returning `result.data`.**
- Can an identical failed tool call be repeated within the same run? **No; ADR 0218 memoizes the same rejected Promise.**
- Could MCP alone solve the problem? **No; without the Core correction, an MCP `isError=true` result could be passed onward as data.**
- Is a Paperclip fork/change required? **No.**
- Must `wandora_mastra` be replaced? **No.**
- Must Paperclip Connection/grant/secret/install/profile/catalog state change? **No.**
- Is any VendaERP provider call necessary for promotion validation? **No.**
- Are Core and MCP rollback assets proven? **Yes.**
- Are ADR 0168 and ADR 0208 preserved? **Yes.**

## Frozen future promotion sequence

A separate **ADR 0227 Core + VendaERP MCP Tool Error Semantics Promotion Execution V1** may only:

1. reconcile main, open PRs, runtime health, live runs and work/outbound;
2. reverify Core candidate artifact + inner archive hashes and candidate MCP/rollback hashes;
3. require the current rollback Core image to remain locally available;
4. start Paperclip native Task Drain with bounded TTL;
5. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
6. atomically replace only stack-local MCP `server.mjs` and `WANDORA_SOURCE_COMMIT` using the frozen candidate bytes;
7. verify host and container-visible MCP hashes before continuing;
8. load the exact Core candidate archive;
9. recreate **only Core** with `wandora/core:organization-adapter-candidate-fc8721ccaedd`;
10. require Core healthy/restart 0 and `/readyz=200`;
11. require Paperclip remains on the same `wandora/paperclip:v2026.916.0` image, healthy/restart 0;
12. require exactly the existing loaded `wandora_mastra@0.4.0` retained package;
13. require existing VendaERP Connection/grant/secret/install/profile/catalog state is unchanged;
14. require 28PRO live runs remain empty and work/outbound remain 0/0;
15. clear Paperclip Task Drain explicitly because Paperclip is not restarted;
16. require Task Drain returns OFF/quiescent;
17. STOP.

No provider call, issue/profile proof, model run or customer work belongs to that promotion.

If MCP staging validation fails, restore the frozen `067e7f98...` bytes and marker before clearing Task Drain.

If the Core candidate fails, recreate only Core with `wandora/core:organization-adapter-candidate-da4289034575`, restore MCP rollback if already changed, revalidate health, and only then clear Task Drain.

If any mutation response is ambiguous, read back real state before retrying.

## Effect boundary

This preflight performed only read-only repository/runtime/API/DB reconciliation, GitHub artifact inspection, local candidate tests, protected rollback/candidate evidence copies, and Compose rendering.

It did **not**:

- promote/recreate Core;
- replace the live MCP;
- start Task Drain;
- restart Paperclip;
- replace `wandora_mastra`;
- call VendaERP;
- call a model;
- create issue/profile/work/outbound;
- apply a migration;
- mutate Connection/grant/secret/install/profile/catalog state.

## Decision

**GREEN / GO for a separate Core + MCP promotion execution only.**

Another VendaERP provider retry remains prohibited.

After promotion and runtime-only validation, the next separate slice remains:

**Paperclip Comment-Driven One-Shot Product Read Preflight V1 — NO PROVIDER CALL**.
