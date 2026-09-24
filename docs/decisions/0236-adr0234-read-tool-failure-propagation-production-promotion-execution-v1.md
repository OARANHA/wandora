# ADR 0236 — ADR 0234 Read Tool Failure Propagation Production Promotion Execution V1

Status: **COMPLETE / GREEN / PRODUCTION PROMOTION EXECUTED / NO PROVIDER CALL**
Date: 2026-09-24

## Objective

Execute exactly the Core-only production promotion qualified by ADR 0235 so the ADR 0234 read-tool failure semantics become live without changing Paperclip, `wandora_mastra`, VendaERP MCP, database schema, provider configuration or outbound capability.

This execution does **not** authorize a VendaERP provider read or model run.

## Canonical entry

```text
main = 71346756f01771127a99e25672f220e5d5fa1ccb
PR #308 = MERGED
ADR 0235 = GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION
open PRs = 0 at execution reconciliation
```

Post-merge `main@71346756...` workflows materialized as 4/4 GREEN before mutation:

- Core CI;
- Messaging Gateway CI;
- Platform Admin CI;
- Web CI.

The executable candidate remains the exact post-ADR-0234 main artifact built from `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`. The later `71346756...` commit is documentation-only.

## Pre-mutation runtime readback

Immediately before mutation:

```text
Core image    = wandora/core:organization-adapter-candidate-fc8721ccaedd
Core revision = fc8721ccaedd5079eec9f3be11e8b64051416579
Core health   = healthy
Core restarts = 0
healthz       = 200
readyz        = 200

Paperclip image    = wandora/paperclip:v2026.916.0
Paperclip id       = 3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e
Paperclip health   = healthy
Paperclip restarts = 0
Paperclip created  = 2026-09-23T22:07:07.108505365Z

wandora_mastra = 0.4.0 / loaded / enabled
retained package =
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c

VendaERP MCP server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

VendaERP MCP source marker sha256 =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d
```

Paperclip native Task Drain was OFF and quiescent:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

28PRO live runs = 0.

Wandora durable side-effect counters:

```text
work operations = 0
outbound attempts = 0
```

The VendaERP Tool Connection activity endpoint was snapshotted before maintenance:

```text
activity count  = 0
activity sha256 = 47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

## Artifact re-verification

The exact post-merge ADR 0234 artifact was reverified immediately before promotion:

```text
artifact id =
10783439687

GitHub ZIP sha256 =
072dedfc37a82b4db7c0b43bd480025a188dc10db2932851d4c6c597b6f4c2e6

source_sha =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

source_tree_sha =
ffe6faee50cc24a8eb361a0eaf81def44f511cbf

image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

archive sha256 =
cdedc7532ce39f59f6641a215ac79c2669dddec04ff53da9526ec1ab31507d12

OCI config digest =
sha256:6ccc94a9be25f7472c2b7b870eb86079971e569b8cf392a825aee03ed95cd7d1

OCI manifest digest =
sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882

image user = node
```

The ZIP digest matched GitHub and the inner archive passed `SHA256SUMS`.

The rollback image remained locally available before mutation:

```text
wandora/core:organization-adapter-candidate-fc8721ccaedd
image id = sha256:a149dc3283a766f598abf80a2cdd9c4bdd77f9e3cd2addb6826a70fb2d11294b
revision = fc8721ccaedd5079eec9f3be11e8b64051416579
```

## Task Drain

Paperclip-native Task Drain was started through the protected Board authority with:

```text
ttlMs = 600000
startedAt = 2026-09-24T01:26:17.916Z
expiresAt = 2026-09-24T01:36:17.916Z
```

Immediate readback:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

No run was admitted during the Core transition.

## Core-only promotion

The exact archive was loaded locally. The loaded tag was:

```text
wandora/core:organization-adapter-candidate-4a54b5d8f14c
revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
image user = node
docker image identity = sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882
```

The loaded Docker image identity equals the artifact OCI manifest digest.

The live Core container's exact twelve-file Compose project was reused. Required interpolation values were reconstructed from the running container's existing group and mount metadata; no secret contents were read or emitted.

Only:

```text
WANDORA_CORE_IMAGE =
wandora/core:organization-adapter-candidate-4a54b5d8f14c
```

changed.

Only service `core` was force-recreated with `--no-deps`.

Container transition:

```text
old container =
d9b77246c0565048e6e3d26eeeadb0b344b48fc7e4ba29fb6269277b3bfb090c

new container =
92f83c491ef6d07060d82fc935cc2ad5f313921dcbf906d35a9d84a99ee4e46b

new created =
2026-09-24T01:27:12.427021783Z
```

Immediate Core validation:

```text
image   = wandora/core:organization-adapter-candidate-4a54b5d8f14c
revision= 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
health  = healthy
restart = 0
healthz = 200
readyz  = 200
mode    = database
```

The recreated container still reports exactly twelve Compose config files.

## Post-promotion protected validation

While Task Drain remained active:

- Core stayed healthy / restart 0 / healthz 200 / readyz 200;
- Paperclip retained the exact same container id, image, creation timestamp, healthy state and restart 0;
- `wandora_mastra@0.4.0` remained loaded/enabled from the exact same retained package;
- VendaERP MCP server and source-marker hashes remained unchanged;
- 28PRO live runs remained 0;
- work operations remained 0;
- outbound attempts remained 0.

The VendaERP Connection activity snapshot after the transition remained:

```text
activity count  = 0
activity sha256 = 47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

Therefore the activity evidence was byte-for-byte equivalent on the compared fields before and after promotion.

The maintenance-window log scan from Task Drain start found:

```text
Paperclip VendaERP/provider markers = 0
Core VendaERP/provider markers      = 0
```

No provider or model call occurred.

## Validation-harness corrections

Two read-only validation commands initially returned non-zero for harness reasons only:

1. the first activity comparison compared the full local evidence objects; the baseline included an additional `httpShape` metadata field even though `count` and `sha256` were identical;
2. the first no-marker log scan used `grep` under `pipefail`, where zero matches returns exit code 1.

Both checks were rerun with bounded comparisons that correctly treat zero activity/zero markers as success. No runtime mutation was repeated because of either harness correction.

## Task Drain explicit completion

After direct post-promotion validation proved Core healthy/ready, Paperclip unchanged, zero live runs, unchanged VendaERP activity and work/outbound = 0/0, Task Drain was explicitly ended through the native Paperclip contract:

```text
DELETE /api/instance/task-drain
```

Authoritative response:

```text
HTTP 200
{ "wasActive": true }
```

Immediate GET readback proved:

```text
draining=false
startedAt=null
expiresAt=null
activeRuns=0
pendingWakes=0
quiescent=true
```

Therefore the preferred explicit exit from ADR 0235 did execute successfully. Paperclip's bounded TTL remained only a safety backstop and did not become the mechanism that restored admission.

## Final readback

After explicit Task Drain completion:

```text
main = 71346756f01771127a99e25672f220e5d5fa1ccb
open PRs = 0

Core =
  wandora/core:organization-adapter-candidate-4a54b5d8f14c
  revision 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
  healthy
  restart 0
  healthz 200
  readyz 200

Paperclip =
  wandora/paperclip:v2026.916.0
  same container id
  healthy
  restart 0

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

wandora_mastra =
  0.4.0
  loaded=true
  disabled=false
  same retained package

VendaERP activity count = 0
VendaERP activity sha256 = 47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36

28PRO live runs = 0
work operations = 0
outbound attempts = 0
```

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Wandora Core owns provider-neutral business execution success/failure semantics;
- Paperclip owns issue/run lifecycle, Task Drain, Tool Gateway, policy and provider-native recovery/disposition;
- Mastra owns the ephemeral supervised runtime;
- VendaERP MCP owns bounded provider translation and MCP tool-error representation.

No lifecycle engine, retry engine, maintenance scheduler, tool-policy subsystem, provider connection store or provider implementation was internalized.

ADR 0168 remains preserved.

## Second adversarial review

- Was the executable artifact exact and reverified? **Yes.**
- Did the Core promotion alter any Compose configuration other than the image? **No; ADR 0235 proved image-only and the same twelve files were reused.**
- Was only Core recreated? **Yes.**
- Was Paperclip restarted? **No.**
- Was `wandora_mastra` replaced? **No.**
- Was VendaERP MCP changed? **No.**
- Was a migration applied? **No.**
- Were work/outbound effects created? **No.**
- Was any provider/model call made? **No.**
- Did Connection activity change? **No.**
- Did the preferred explicit Task Drain DELETE execute? **Yes; HTTP 200 returned `wasActive=true`.**
- Did immediate GET prove admission restored safely? **Yes; `draining=false`, zero active/pending runs and `quiescent=true`.**
- Is rollback still locally available? **Yes.**
- Is the promoted Core healthy and ready after admission restoration? **Yes.**

## Decision

**COMPLETE / GREEN.**

ADR 0234 read-tool failure propagation is now live in production through a Core-only promotion.

Another VendaERP/provider read remains prohibited until a separate post-promotion **NO PROVIDER CALL** preflight confirms the live failure-semantics boundary and defines the next bounded proof.

## Next slice

**ADR 0234 Read Tool Failure Propagation Post-Promotion Failure-Semantics Preflight V1 — NO PROVIDER CALL.**
