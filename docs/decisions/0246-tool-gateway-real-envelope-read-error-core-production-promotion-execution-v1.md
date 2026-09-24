# ADR 0246 — Tool Gateway Real Envelope Read-Error Core Production Promotion Execution V1

Status: **COMPLETE / GREEN / CORE-ONLY PRODUCTION PROMOTION EXECUTED / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Promote the ADR 0244 Tool Gateway execution-envelope correction to production exactly as qualified by ADR 0245, without changing Paperclip, `wandora_mastra`, VendaERP MCP, database schema, provider configuration or outbound capability.

This execution does **not** authorize a VendaERP provider read or model run.

## Canonical entry

```text
main = be85e5f4409a5f90134c148ef0ee550af7401416
PR #319 = MERGED
ADR 0245 = GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION
open PRs = 0
```

Post-merge workflows for `main@be85e5f...` were 4/4 GREEN before mutation:

- Core CI
- Messaging Gateway CI
- Platform Admin CI
- Web CI

The executable Core candidate remains the exact post-PR-317 artifact built from:

```text
46741f8d82d041b3f3cdde3d209c923e630db968
```

The later main commits are documentation-only relative to this candidate.

## Pre-mutation baseline

At `2026-09-24T07:32:36Z`:

Core:

```text
container =
92f83c491ef6d07060d82fc935cc2ad5f313921dcbf906d35a9d84a99ee4e46b

image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

image id =
sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882

revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

health = healthy
restart = 0
```

Paperclip:

```text
container =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5

image =
wandora/paperclip:v2026.916.0

health = healthy
restart = 0
created = 2026-09-24T03:55:10.570956517Z
```

`wandora_mastra`:

```text
version = 0.5.0
package =
64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62
```

VendaERP MCP:

```text
server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

Paperclip admission:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

28PRO state:

```text
work=1
unfinished=0
outbound=0
```

The one work is ADR 0244's completed canonical one-shot.

VendaERP Tool Connection:

```text
events=70
sha256=e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

## Artifact re-verification

Immediately before promotion:

```text
GitHub ZIP sha256 =
ffa055b1cbf7c8cbd0b9b545cf1b6329bc3984494ce82b19d0f2b550f85c9e70

inner archive sha256 =
3e59111bbaf7843272bb0831917456be2e183533bebe80bfa6de59f030783c4f

source revision =
46741f8d82d041b3f3cdde3d209c923e630db968

source tree =
d35330714a7fa2355fb35e8cd1c3fd849834d5b1

candidate tag =
wandora/core:organization-adapter-candidate-46741f8d82d0

OCI config =
sha256:a2717e86aceea23864cecb61081820074ddb1042fbd65315e0ab099398722089

OCI manifest =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4
```

The artifact had already passed `SHA256SUMS` in ADR 0245.

## Task Drain

Paperclip-native Task Drain was started before any image/runtime mutation:

```text
startedAt =
2026-09-24T07:32:49.139Z

expiresAt =
2026-09-24T07:42:49.139Z

draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

The TTL was only a safety backstop.

## Candidate image load

The exact prequalified archive was loaded once.

Docker readback:

```text
tag =
wandora/core:organization-adapter-candidate-46741f8d82d0

image id =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

candidate contract =
organization-adapter-core-v1

user =
node
```

The loaded Docker image identity equals the candidate manifest's OCI manifest digest.

Task Drain was immediately reread after load and remained active/quiescent. VendaERP activity remained unchanged at 70 events.

## Core-only promotion

The exact running twelve-file Compose project was reused.

Required existing interpolation/mount values were reused:

- Core secret GID = 987
- existing Core DB password file
- existing Gateway→Core ingress HMAC file
- existing Organization Adapter secret directory
- existing Paperclip execution bridge HMAC file
- existing model API key file
- Core mode = database

Only:

```text
WANDORA_CORE_IMAGE =
wandora/core:organization-adapter-candidate-46741f8d82d0
```

changed.

Command semantics:

```text
docker compose -p core <same 12 -f files>
  up -d --no-deps --force-recreate core
```

No dependent service was recreated.

Container transition:

```text
old Core container =
92f83c491ef6d07060d82fc935cc2ad5f313921dcbf906d35a9d84a99ee4e46b

new Core container =
72b05d68245862e5bfc3c8e61bb96e3aacddc117332305081ea1ff7ae7ab0178
```

The recreate happened exactly once.

## Protected validation

Before ending Task Drain:

Core:

```text
image =
wandora/core:organization-adapter-candidate-46741f8d82d0

image id =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

health = healthy
restart = 0
healthz = 200
readyz = 200
```

The new Core container still reported the exact same twelve Compose config files.

Paperclip remained unchanged:

```text
same container id =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5

same image =
wandora/paperclip:v2026.916.0

health = healthy
restart = 0
```

Paperclip admission still showed:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

Other invariants:

```text
Ana = idle / wandora_mastra
wandora_mastra = 0.5.0
VendaERP MCP hash = unchanged

work=1
unfinished=0
outbound=0

VendaERP activity events=70
VendaERP activity sha256=
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

Maintenance-window log scan:

```text
Paperclip provider markers = 0
Core provider/model markers = 0
```

Therefore no provider/model execution occurred during the promotion.

## Explicit Task Drain completion

After protected validation, Task Drain was ended through the native Paperclip Board API.

Authoritative response:

```text
wasActive=true
```

Immediate readback:

```text
draining=false
startedAt=null
expiresAt=null
activeRuns=0
pendingWakes=0
quiescent=true
```

The TTL did not become the admission-restoration mechanism.

## Final production state

Final Core:

```text
container =
72b05d68245862e5bfc3c8e61bb96e3aacddc117332305081ea1ff7ae7ab0178

image =
wandora/core:organization-adapter-candidate-46741f8d82d0

image id =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

health = healthy
restart = 0
healthz = 200
readyz = 200
```

Final Paperclip:

```text
same container/image
healthy
restart = 0
```

Final Task Drain:

```text
OFF / quiescent
activeRuns=0
pendingWakes=0
```

Final durable/provider state:

```text
work=1
unfinished=0
outbound=0

VendaERP activity events=70
VendaERP activity sha256=
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

No migration, Paperclip restart, adapter replacement, MCP mutation, provider read, model run or outbound effect occurred.

## Validation-harness note

One final evidence command had a shell quoting error in the internal Node `healthz/readyz` probe after already printing the live Core/Paperclip identity.

No runtime action was repeated.

The two probes were rerun separately as read-only checks and returned:

```text
healthz=200
readyz=200
```

The final Task Drain/activity/work/outbound readbacks were also rerun read-only and remained correct.

## Capability Authority / Reuse Gate

The production change is confined to the Wandora-owned Core adapter boundary.

- Paperclip remains lifecycle, Tool Gateway, policy/rate-limit and audit authority.
- Mastra remains the replaceable supervised runtime.
- VendaERP MCP remains the replaceable provider adapter.
- Wandora Core now correctly unwraps Paperclip's real execution envelope before mapping MCP semantic failure.

No provider capability was internalized or duplicated.

ADR 0168 remains preserved.

## Second adversarial review

- Exact prequalified artifact loaded? **Yes.**
- Artifact source revision/tree exact? **Yes.**
- Only Core recreated? **Yes.**
- Same twelve-file Compose project? **Yes.**
- Non-image production composition changed? **No.**
- Paperclip restarted? **No.**
- Mastra adapter replaced? **No.**
- VendaERP MCP changed? **No.**
- Migration applied? **No.**
- Any run/wake admitted during maintenance? **No.**
- Any provider/model marker during maintenance? **No.**
- VendaERP activity changed? **No.**
- Work/outbound changed? **No.**
- Rollback needed? **No.**
- Task Drain ended explicitly? **Yes.**
- Final Core healthy/ready? **Yes.**

## Decision

**COMPLETE / GREEN / CORE-ONLY PRODUCTION PROMOTION EXECUTED / NO PROVIDER CALL.**

The real Tool Gateway execution-envelope semantic-error correction is now live.

Another real VendaERP read remains prohibited until a separate no-provider post-promotion re-attestation confirms the live revision and failure semantics boundary.

Next slice:

**ADR 0247 — Tool Gateway Real Envelope Read-Error Post-Promotion Re-Attestation V1 — NO PROVIDER CALL.**
