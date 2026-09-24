# ADR 0245 — Tool Gateway Real Envelope Read-Error Core Promotion Preflight V1

Status: **GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Qualify the production promotion of the ADR 0244 Core correction without changing production and without calling VendaERP or a model provider.

The correction is already merged in canonical source. This ADR proves that the exact post-merge Core artifact is source-addressed, that production promotion is image-only, that rollback is locally available, and that no provider-owned capability must be replaced or duplicated.

## Canonical repository state

At preflight:

```text
main = d1dcc517fe2eaeb34d77d010e4a0045aff85f10a
PR #317 = MERGED
PR #318 = MERGED
open PRs = 0
```

Executable candidate source remains:

```text
46741f8d82d041b3f3cdde3d209c923e630db968
```

The later main commit `d1dcc517...` is documentation-only relative to that candidate. There is no executable delta under Core, VendaERP MCP, migrations or DB assets between `46741f8...` and current main.

Post-merge push workflows for `46741f8...` are 7/7 GREEN:

- Core CI
- Core Candidate Artifact
- Messaging Gateway CI
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- Platform Admin CI
- Web CI

## Exact Core candidate artifact

GitHub Actions artifact:

```text
artifact id =
10794878077

workflow run =
35968066729

artifact name =
core-organization-adapter-candidate-46741f8d82d041b3f3cdde3d209c923e630db968

head =
main@46741f8d82d041b3f3cdde3d209c923e630db968

GitHub ZIP digest =
sha256:ffa055b1cbf7c8cbd0b9b545cf1b6329bc3984494ce82b19d0f2b550f85c9e70
```

The ZIP was downloaded independently to the VPS and hashed byte-for-byte:

```text
ffa055b1cbf7c8cbd0b9b545cf1b6329bc3984494ce82b19d0f2b550f85c9e70
```

The artifact contains exactly:

```text
SHA256SUMS
candidate-manifest.txt
wandora-core-organization-adapter-candidate-46741f8d82d0.tar.gz
```

The inner archive passed `SHA256SUMS`.

Candidate manifest:

```text
candidate_contract = organization-adapter-core-v1
source_sha = 46741f8d82d041b3f3cdde3d209c923e630db968
source_tree_sha = d35330714a7fa2355fb35e8cd1c3fd849834d5b1
image_tag = wandora/core:organization-adapter-candidate-46741f8d82d0
archive_sha256 = 3e59111bbaf7843272bb0831917456be2e183533bebe80bfa6de59f030783c4f
oci_config_digest = sha256:a2717e86aceea23864cecb61081820074ddb1042fbd65315e0ab099398722089
oci_manifest_digest = sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4
image_user = node
```

The Docker-save config embedded in the archive independently reports:

```text
org.opencontainers.image.revision =
46741f8d82d041b3f3cdde3d209c923e630db968

io.wandora.candidate =
organization-adapter-core-v1

User =
node
```

Git tree verification:

```text
git tree for 46741f8... =
d35330714a7fa2355fb35e8cd1c3fd849834d5b1
```

Therefore artifact source SHA and source tree are directly tied to the canonical merged code.

The candidate image is intentionally **ABSENT** from the live Docker daemon during this preflight.

## Executable delta

Relative to the currently live Core revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`, the Core tree changes only:

```text
apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts
apps/core/test/organization-adapter-work.integration.test.ts
apps/core/test/paperclip-tool-gateway-read-bridge.test.ts
```

Only the first file is production executable code. The other two are tests.

No migration, database schema, Compose source, VendaERP MCP source, Paperclip source or provider credential/config mutation is required.

## Live runtime baseline

Core:

```text
image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

image id =
sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882

health = healthy
restart = 0
healthz = 200
readyz = 200
```

Paperclip:

```text
image = wandora/paperclip:v2026.916.0
health = healthy
restart = 0
```

Paperclip task admission:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

Ana:

```text
idle / wandora_mastra
```

Live adapter registry still reports:

```text
wandora_mastra = 0.5.0
```

VendaERP MCP live hash remains:

```text
server.mjs =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

28PRO durable state:

```text
work = 1
unfinished work = 0
outbound = 0
```

The one work is ADR 0244's already-recorded completed one-shot.

VendaERP Tool Connection activity remains unchanged after ADR 0244 cleanup:

```text
events = 70
sha256 =
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

No provider/model call occurred during this preflight.

## Live Core Compose proof

The running Core container records exactly twelve Compose files:

1. `/opt/wandora/stacks/core/compose.yaml`
2. `/opt/wandora/stacks/core/compose.database.yaml`
3. `/opt/wandora/stacks/core/compose.gateway-ingress.yaml`
4. `/opt/wandora/stacks/core/compose.agent-runtime-deterministic.yaml`
5. `/opt/wandora/stacks/core/compose.human-api.yaml`
6. `/opt/wandora/stacks/core/compose.organization-adapter.yaml`
7. `/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml`
8. `/opt/wandora/stacks/core/compose.paperclip-execution-bridge.yaml`
9. the existing customer-owner activation overlay
10. the existing customer-work overlay
11. `/opt/wandora/stacks/core/compose.agent-runtime-model.yaml`
12. `/opt/wandora/stacks/core/compose.customer-company-onboarding.yaml`

The five existing read-only secret mounts remain unchanged:

- Core DB password;
- Gateway→Core ingress HMAC;
- model provider API key;
- Organization Adapter secret directory;
- Paperclip execution bridge HMAC.

The existing secret group is:

```text
GID = 987
```

The effective Compose was rendered twice from the exact live twelve-file project and exact existing host paths, changing only `WANDORA_CORE_IMAGE`.

Structural comparison:

```text
DIFF_COUNT = 1
DIFF_PATH = /services/core/image

CURRENT =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

CANDIDATE =
wandora/core:organization-adapter-candidate-46741f8d82d0
```

After removing the image field, both renders hash identically:

```text
CURRENT_NONIMAGE_SHA256 =
941a21aecf07932b804a4285bb7e1fcd08a396a6682fd5aa378e892b1461c8e3

CANDIDATE_NONIMAGE_SHA256 =
941a21aecf07932b804a4285bb7e1fcd08a396a6682fd5aa378e892b1461c8e3
```

Therefore the qualified production effect is **Core image only**.

## Rollback

The exact live image remains locally available:

```text
wandora/core:organization-adapter-candidate-4a54b5d8f14c

image id =
sha256:280ee858bfefb464a99d8ebb9a2cf11088be9e93b36d93243067d881ba42e882

revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

user =
node
```

Rollback requires no rebuild and no network download.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Wandora Core owns semantic translation from Paperclip Tool Gateway execution envelopes into runtime read-tool success/failure.
- Paperclip remains authority for Tool Gateway transport, policy, rate limiting, audit and lifecycle.
- Mastra remains the replaceable supervised model/runtime provider.
- VendaERP MCP remains the replaceable business-system adapter.

No Paperclip fork, lifecycle implementation, retry engine, Tool Gateway duplicate, provider mirror or new Wandora subsystem is authorized.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review

- Exact artifact tied to merged executable source? **Yes.**
- GitHub ZIP digest independently matched? **Yes.**
- Inner archive checksum passed? **Yes.**
- Embedded source revision exact? **Yes.**
- Embedded source tree exact? **Yes.**
- Candidate image loaded during preflight? **No.**
- Production composition image-only? **Yes.**
- Rollback locally available? **Yes.**
- Migration required? **No.**
- Paperclip restart required? **No.**
- Mastra adapter replacement required? **No.**
- VendaERP MCP change required? **No.**
- Task Drain currently quiescent? **Yes.**
- Unfinished customer work? **0.**
- Outbound attempts? **0.**
- VendaERP activity changed during preflight? **No.**
- Any model/provider call? **No.**

## Frozen promotion sequence

A separate production execution must:

1. reconcile current main/workflows/runtime;
2. reverify artifact hashes and source identity;
3. snapshot VendaERP activity and work/outbound state;
4. start a bounded Paperclip-native Task Drain;
5. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
6. load exactly `wandora-core-organization-adapter-candidate-46741f8d82d0.tar.gz`;
7. require the loaded image revision/config identity from this ADR;
8. reuse the exact twelve live Compose files and existing host secret paths;
9. change only `WANDORA_CORE_IMAGE` to `wandora/core:organization-adapter-candidate-46741f8d82d0`;
10. force-recreate only service `core` with `--no-deps`;
11. do not restart Paperclip;
12. do not replace `wandora_mastra`;
13. do not modify VendaERP MCP bytes;
14. require Core candidate image/revision, healthy, restart 0, healthz 200, readyz 200;
15. require Paperclip same container/image, healthy, restart 0;
16. require no new active/pending run and no unfinished work/outbound delta;
17. require VendaERP activity byte-equivalent to pre-maintenance snapshot;
18. scan maintenance logs for unexpected provider/model execution;
19. explicitly end Task Drain through the native Paperclip API;
20. require final `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

If protected validation fails, keep admission drained, restore the exact current Core image through the same twelve-file Compose project, validate health/readiness, and only then end Task Drain.

No VendaERP read belongs to this promotion.

## Decision

**GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION / NO PROVIDER CALL.**

Next slice:

**ADR 0246 — Tool Gateway Real Envelope Read-Error Core Production Promotion Execution V1 — NO PROVIDER CALL.**
