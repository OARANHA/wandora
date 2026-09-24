# ADR 0240 — wandora_mastra@0.5.0 Read-Tool Failure Disposition Production Promotion Execution V1

Status: **COMPLETE / GREEN / NO PROVIDER CALL**
Date: 2026-09-24

## Objective

Execute the separately qualified ADR 0239 production promotion for `wandora_mastra@0.5.0` without calling VendaERP, invoking a production model, creating customer work, emitting outbound effects, changing Core, or changing any Paperclip Connection/grant/secret/profile/catalog state.

The promotion changes only the Paperclip external adapter package/registration and the Paperclip process required to reload it.

## REAL NOW at execution entry

Repository authority:

```text
main = 9c8ebb0d543fc773dc812cd63baccc7295de735f
PR #312 = MERGED
open PRs = 0
post-merge workflows = 4/4 GREEN
```

Production before effect:

```text
Core image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

Core revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

Core =
healthy / restart 0

Paperclip image =
wandora/paperclip:v2026.916.0

Paperclip container id =
3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e

Paperclip =
healthy / restart 0

live adapter =
wandora_mastra@0.4.0
loaded=true
disabled=false
isLocalPath=true
```

The exact active 0.4.0 path was:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/
package
```

Official `test-environment` was HTTP 200 / PASS.

Task Drain before effect:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
expiresAt=null
```

Wandora side-effect counters:

```text
28PRO work operations = 0
28PRO outbound attempts = 0
```

VendaERP Connection activity remained byte-identical to ADR 0236 / ADR 0239:

```text
historical events = 68
response sha256 =
47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

This historical event count is not new activity. The unchanged response hash proves zero activity delta.

## Candidate and rollback re-verification

Candidate artifact:

```text
artifact id = 10788382398
artifact name =
paperclip-mastra-adapter-9f40ccfd3469d9e8c465155ddd95f85c76b45348

tgz =
wandora-paperclip-adapter-mastra-0.5.0.tgz

tgz sha256 =
64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62
```

Candidate file SHA-256:

```text
README.md =
f7fa768533bd6f1daa627203428e3efd66ecda05531049809676f89613e02287

compatibility.json =
be434e6bf3c7366a601fda63e5c5995bf7ebc592078b4fb5cfd1bd3d652cc7d8

index.mjs =
d76571aa107316683feda2f1222a61f559be47544ff60b04e1592d9f7f06cd95

package.json =
9b79cd5e192936c6ad3d0ec346d28e2c05b5e63325b59eddf7cf186e1b4b513d
```

Frozen rollback registry before promotion:

```text
adapter-plugins.json sha256 =
45e0ca8d1ba002754a56de189ac1586cac99378a782a674bce36093290877a17
```

Retained 0.4.0 package hashes were reverified exactly against ADR 0239.

The future 0.5.0 persistent target was absent before staging.

## Live Compose identity re-verification

Paperclip project:

```text
project = paperclip
working directory = /opt/wandora/stacks/paperclip
service = paperclip
```

Exact inputs:

```text
compose.yaml =
eabfb8b8828d3de90bf29b8e96a503231f97b2413d8dc61903fbd610b379bf29

compose.paperclip-execution-bridge.yaml =
193bc8931652681a03891934db1799dee5557e0e6e6fb068ba09da1d0d017789

paperclip-bridge-secret-entrypoint.sh =
e44b6ff5dc83a5b991fc0e44035598b32528a6e7b5f3fe6db2f929561be7856d

rendered Compose =
84e9f72b38d8d9097fc116c0d9da780112fe975af9c91060e867fbed79afd068
```

The rendered project contains only the `paperclip` service.

No Compose file, image reference, Core service, MCP mount, bridge mount, secret path or environment contract was changed.

## Task Drain activation

Paperclip-native Task Drain was started with a 10-minute TTL.

The successful mutation occurred at:

```text
startedAt = 2026-09-24T03:49:37.852Z
expiresAt = 2026-09-24T03:59:37.852Z
HTTP 200
```

The POST response contains only `startedAt/expiresAt`, so the first local harness incorrectly expected the full status object and exited non-zero **after** the successful HTTP 200.

The drain mutation was **not repeated**.

Following the permanent timeout/failure guardrail, the already-executed operation was reconciled first through the pinned Paperclip CLI client/auth store path.

Official readback proved:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
startedAt=2026-09-24T03:49:37.852Z
expiresAt=2026-09-24T03:59:37.852Z
```

Only after that proof did execution continue.

## Candidate staging

While Task Drain remained active/quiescent, the exact 0.5.0 package was staged atomically under:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/
package
```

The staging directory and final directory remained owned `1000:1000` with mode `755`.

Before the atomic rename, all four files matched the qualified hashes.

After the atomic rename, all four files matched the same hashes again.

The retained 0.4.0 package was not deleted or modified.

## Official adapter replacement

Exactly one official Paperclip adapter installation/replacement request was dispatched.

Confirmed response:

```text
type = wandora_mastra

packageName =
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/
package

version = 0.5.0
requiresRestart = true
installedAt = 2026-09-24T03:54:19.123Z
```

The response was unambiguous. No install retry occurred.

## Pre-restart validation

The first Task Drain was still active.

Official readback proved:

```text
wandora_mastra =
  version=0.5.0
  loaded=true
  disabled=false
  isLocalPath=true
  exact candidate package path

test-environment =
  HTTP 200
  PASS

Task Drain =
  draining=true
  activeRuns=0
  pendingWakes=0
  quiescent=true
  expiresAt=2026-09-24T03:59:37.852Z
```

One local validation attempt before this successful readback had a shell/heredoc interpolation error and did not reach the Paperclip API. No mutation was repeated because of that harness error.

## Paperclip-only restart

Only the existing Paperclip service was recreated, exactly once, through the exact current Compose project.

Old container:

```text
3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e
```

New container:

```text
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5
```

New process:

```text
image =
wandora/paperclip:v2026.916.0

startedAt =
2026-09-24T03:55:11.867228668Z

health =
healthy

restart count =
0
```

Core was not recreated and remained:

```text
image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

healthy / restart 0
```

The health polling wrapper reported a contradictory process exit after printing `health=healthy`; direct Docker inspection immediately afterward was used as authoritative runtime evidence and proved the new container healthy/restart 0.

No restart retry occurred.

## Post-restart validation

Official adapter readback:

```text
type = wandora_mastra
version = 0.5.0
loaded = true
disabled = false
isLocalPath = true
packageName = exact qualified 0.5.0 path
```

Official `test-environment`:

```text
HTTP 200
status = pass
wandora-bridge-config = info / valid
```

Task Drain was cleared by restart as designed:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
expiresAt=null
```

Therefore no explicit DELETE was needed after restart.

The new persistent registry contains exactly one `wandora_mastra` record:

```text
count = 1
version = 0.5.0
installedAt = 2026-09-24T03:54:19.123Z

adapter-plugins.json sha256 =
bd7665892541f787b9062ca4124fc3bfb9454458007e9c5742c4ba36b4e38169
```

Both packages remain retained:

```text
0.4.0 rollback path = present
0.5.0 live path     = present
```

The live 0.5.0 files still match all four qualified hashes.

## Side-effect validation

After promotion:

```text
28PRO work operations = 0
28PRO outbound attempts = 0

VendaERP Connection historical events = 68
VendaERP Connection response sha256 =
47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

The VendaERP activity response is byte-identical to the pre-maintenance snapshot.

Core logs for the maintenance window contained no marker for:

- VendaERP;
- Mistral;
- tool call;
- read-tool execution;
- Paperclip execution bridge;
- Mastra execution.

Paperclip logs after restart contained no VendaERP/model/tool invocation or `issue_continuation_needed` marker. The only matching run-related startup message was:

```text
startup reap of orphaned heartbeat runs complete
reaped = 0
runIds = []
```

Therefore this promotion produced no customer work, no Paperclip execution run, no model call, no VendaERP provider/tool call and no outbound effect.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Wandora owns customer/business work semantics, durable success-vs-uncertain receipts, provider-neutral execution correlation and external-effect authorization.
- Paperclip owns issue/run lifecycle, recovery/disposition, external adapter loading/registry, Task Drain and run-scoped operational identity.
- Mastra owns the ephemeral supervised model/tool loop.
- VendaERP MCP owns bounded provider translation and MCP tool-error representation.

No table, migration, retry engine, lifecycle state machine, secret store, provider registry or Paperclip fork was introduced.

ADR 0168 remains preserved:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review after execution

- Was install dispatched more than once? **No.**
- Was Paperclip restarted more than once? **No.**
- Did the first Task Drain remain active through staging/install/pre-restart validation? **Yes.**
- Did restart clear Task Drain? **Yes, confirmed by official readback.**
- Was a post-restart rollback needed? **No.**
- Is the exact 0.4.0 rollback package still retained? **Yes.**
- Is there exactly one live 0.5.0 registration? **Yes.**
- Did Core change? **No.**
- Did the VendaERP MCP change? **No.**
- Did Connection/grant/secret/install/profile/catalog state change? **No evidence of any such mutation; the promotion did not invoke those boundaries.**
- Did VendaERP Connection activity change? **No; exact response hash unchanged.**
- Did a model/provider/tool call occur? **No evidence of one; work/outbound remained zero, activity was unchanged and maintenance-window log scans were empty for execution markers.**
- Did outbound occur? **No.**
- Was a migration applied? **No.**
- Was a synthetic validation work created? **No.**

## Decision

**ADR 0240 production promotion is COMPLETE / GREEN / NO PROVIDER CALL.**

Production now runs:

```text
Paperclip image = wandora/paperclip:v2026.916.0
wandora_mastra = 0.5.0
Core = organization-adapter-candidate-4a54b5d8f14c
VendaERP MCP = unchanged
```

Another real VendaERP/provider read remains **NO-GO**.

The next slice must re-attest the promoted runtime failure semantics without provider/model calls before any future one-shot real read is designed.

## Next Slice

**ADR 0241 — wandora_mastra@0.5.0 Post-Promotion Read-Tool Failure Disposition Semantics Preflight V1 — NO PROVIDER CALL.**
