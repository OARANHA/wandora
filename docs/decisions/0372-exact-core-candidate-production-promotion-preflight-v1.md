# ADR 0372 — Exact Core Candidate Production Promotion Preflight V1

Status: **GREEN / EXACT CANDIDATE PROMOTED / CORE 9ee338 LIVE / ALL EFFECT GATES OFF / NO CUSTOMER OR OUTBOUND EFFECT**

Date: 2026-10-01

## Context

ADR 0371 qualified the current-main-compatible Core candidate built from source merge
`9ee338303292173db8e1b21bef9c8c5067c104a4` and froze GitHub Actions artifact
`11153574632` for the next production promotion preflight.

This slice revalidated the candidate, live runtime, rollback authority and the operational
path immediately before any production mutation. It did **not** authorize Semantic Fast
Read rollout activation.

## REAL NOW

Fresh GitHub reconciliation remained unchanged:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head `bf5c82319f0815562d45cad90a2db0ea57b9251b`, open/draft/unmerged;
- PR #377 head `54b6120c81b735fd86d8e042e7bc18f0b0f96595`, open/draft/unmerged;
- PR #378 head `1ffb8853d1d44a0512b5b615a28ca4e05e256e2e`, open/draft/unmerged.

The qualified candidate artifact still exists and is unexpired:

- artifact id: `11153574632`;
- GitHub digest: `sha256:fdca91b452d73e68b53be4608fe016e6bf6e2222803cd38ce14ae4083692217b`;
- archive SHA-256: `612f04b1e60ad40a97ea0663c293af03fce65793a10358f46c8a85865b801724`;
- OCI config: `sha256:6e7e5bab6dcd9d19a6d314ae04b1c2495c210bee3708ea06d5e32126008131b7`;
- OCI manifest: `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- candidate image: `wandora/core:organization-adapter-candidate-9ee338303292`;
- contract: `organization-adapter-core-v1`;
- image user: `node`.

Fresh download verification reproduced the exact GitHub ZIP digest. The internal
`.tar.gz` payload was independently hashed on-host before interruption and matched the
frozen archive SHA exactly. Independent archive inspection also reconfirmed the source
revision, OCI manifest/config, contract, non-root user and absence of baked Wandora
enable/secret-like environment variables.

## Live production baseline

Production remained unchanged throughout the slice:

- Core: `wandora/core:organization-adapter-candidate-83baca411096`;
- Core revision: `83baca4110966989b484341b5c58bb42d1eb5407`;
- Core health: healthy;
- Paperclip: `wandora/paperclip:v2026.916.1`, healthy;
- Messaging Gateway: healthy;
- Organization Adapter: `0.6.1`, ready;
- Mastra adapter: external `wandora_mastra@0.6.0`, loaded/enabled;
- Task Drain: `false / 0 / 0 / quiescent=true`.

The active Core Compose provenance remained exactly the existing 14-file gates-OFF
composition. No custody, attestation or rollout overlay was active.

Core startup remained:

- Fast Read Execution = OFF;
- Semantic Fast Read = OFF;
- Human Send Proposal = OFF.

The canonical `compose.semantic-fast-read.yaml` also keeps Semantic Selector OFF.
Messaging Gateway startup remained `outboundEnabled=false`.

ADR 0367 rollback metadata was freshly readable and still ended in
`ROLLBACK_FREEZE_V2_OK`, with backup/restore/schema proof GREEN and no
activation/provider/customer/outbound effect.

## Capability Authority / Reuse Gate

No new table, migration, state machine, service, provider mirror, orchestration layer or
execution subsystem was introduced.

ADR 0168 remains binding. Paperclip/Mastra/provider operational authority remains
unchanged. The intended promotion changes only the Core image while preserving the
existing production composition and all effect gates OFF.

## Preflight staging evidence

A bounded staging workspace was created at:

`/opt/wandora/ops-workspace/adr0372-core-promotion-preflight`

The exact artifact ZIP was downloaded there and its digest was proven. No live service
was recreated or restarted.

The ordinary execution broker then reached its existing fixed session-capacity guard.
Inspection of the currently deployed broker source proved:

- `MAX_SESSIONS=16`;
- completed sessions are reaped only after 30 minutes;
- there is no manual session-delete operation.

Restarting the execution broker or changing its limits solely to continue this preflight
was rejected because that would mutate production infrastructure to recover execution
capacity.

The Docker candidate lifecycle boundary was also tested and correctly refused a Core
candidate because its current candidate-name allowlist is Web-only. No allowlist was
expanded.

A fail-closed Core promotion helper was staged for review, but managed-admin preparation
with generic `bash` was correctly rejected as hard-denied. The helper was immediately
renamed to:

`promote-core-9ee338-gates-off.sh.blocked`

It is evidence only and is **not executable authority**.

No `adm_...` ticket was generated and no managed-admin apply occurred.

## Decision

The candidate itself remains technically qualified and current-main compatible.

However, the exact production execution path is **NO-GO at this checkpoint** because the
available bounded operational capabilities cannot complete the remaining candidate
staging/render proof without either:

1. waiting for the existing process-session retention window to reap naturally; or
2. expanding/restarting operational authority solely to bypass the guardrail.

Option 2 is explicitly rejected.

Therefore production promotion is not authorized in this checkpoint.

## Second adversarial review

The exact promotion design received a JEV `confirm` review with high confidence only
under the stated exact-byte, same-Compose, gates-OFF, Core-only and rollback safeguards.
That advisory result does not override the deterministic operational capability denial.

## Effects accounting

Executed:

- read-only GitHub/runtime/rollback reconciliation;
- exact artifact download and hashing in the ops workspace;
- effect-inert staging files only;
- adversarial reviews;
- capability probes that were denied before live mutation.

Not executed:

- Core recreation/restart;
- stable Core selector change;
- Paperclip/OA/Mastra mutation;
- database migration;
- custody/attestation/rollout overlay;
- Fast Read/Semantic/Selector/Human Send enablement;
- Messaging Gateway outbound enablement;
- Ana/VendaERP/provider/customer call;
- PR merge;
- managed-admin apply.

## Next boundary

Resume this **same promotion preflight**, beginning again from REAL NOW.

Do not broaden allowlists or restart the execution broker merely to bypass session
capacity. Once the ordinary execution capability is naturally available again, finish
the exact candidate import/render proof. Only if that remains GREEN:

1. run a fresh second adversarial review;
2. prepare the minimum one-use managed-admin operation using an already-authorized
   program boundary;
3. present the exact `adm_...` ticket for explicit human approval;
4. stop before apply.

After any later successful Core promotion, capture a fresh Rollback Freeze V2 before
considering scoped Semantic Fast Read rollout activation.


## 2026-10-01 — Remote-Ops execution broker capacity blocker resolved

Post-preflight operational hardening was completed without touching Core/Paperclip/Gateway product state. Remote-Ops PR #44 was merged to `main` as commit `48a4d370187b013a4a196af293225c134ec55eb1`.

The execution broker now defaults to `48` concurrent **active** sessions through `WANDORA_EXEC_MAX_SESSIONS`, bounded to `1..256`. Completed sessions remain readable during retention but no longer consume active-session capacity; signaled processes are classified by `closedAt`, avoiding the prior `exitCode=null` false-running condition.

Production host deployment used the existing managed-admin boundary only: exact broker files were copied, then only `wandora-ops-exec-broker.service` was restarted. Post-restart readback proved `max_active_sessions=48`, `active_sessions=0`, empty fresh session registry, and a new broker PID. Core, Paperclip and Messaging Gateway remained running/healthy and were not recreated.

This resolves only the ADR 0372 execution-broker capacity blocker. It does **not** authorize Core promotion, candidate lifecycle expansion, Fast Read/Semantic/Selector/Human Send enablement, Gateway outbound, provider/customer calls or PR merge. Resume the exact Core candidate production promotion preflight from fresh REAL NOW evidence.

## 2026-10-01 — Promotion completion

Fresh REAL NOW reconciliation resumed this same ADR after the execution-broker blocker was removed.

### Remote-Ops reuse gate closure

No bespoke Core loader, candidate lifecycle subsystem or Portainer stack was created.

The existing Remote-Ops Docker proxy capability was repaired canonically on its own `main`:

- `5558aa7e05db856c7388505c2c883337afa9cbfd` — forwards the existing image-load/candidate allowlist environment contract into `docker-read-proxy`;
- `ce008d5b167c6d26c26edb6407e13105a4ee3e19` — adds the opt-in read-only governed image-load root bind;
- `e18056239a55a076d00a4124a766aacbcc84965b` — adds the explicit supplementary image-load-root group boundary instead of weakening host permissions.

The final two push workflows for `e1805623...` were GREEN. Production activation recreated only `remote-ops-docker-read-proxy`; the control plane, Core, Paperclip and Messaging Gateway were not part of that proxy change. The live proxy then reported only:

- `docker_actions=["restart","load_image"]`;
- `image_load_roots=1`;
- candidate image/network/name/port lifecycle authority remained empty.

The governed root remained read-only and host permissions stayed `0770/0750/0640` with gid `1003`.

### Candidate import and identity

The frozen candidate remained byte-exact:

- GitHub artifact `11153574632`;
- GitHub ZIP digest `sha256:fdca91b452d73e68b53be4608fe016e6bf6e2222803cd38ce14ae4083692217b`;
- internal archive SHA-256 `612f04b1e60ad40a97ea0663c293af03fce65793a10358f46c8a85865b801724`;
- OCI config `sha256:6e7e5bab6dcd9d19a6d314ae04b1c2495c210bee3708ea06d5e32126008131b7`;
- OCI manifest `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- image `wandora/core:organization-adapter-candidate-9ee338303292`;
- revision `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- contract `organization-adapter-core-v1`;
- image user `node`;
- no baked `WANDORA_`, HMAC, password, token or API-key environment values.

The governed `load_image` action then succeeded and Docker reported:

`Loaded image: wandora/core:organization-adapter-candidate-9ee338303292`.

### Final pre-mutation proof

Immediately before promotion:

- live Core remained exact `83baca411096...`, healthy, restart 0;
- Paperclip and Messaging Gateway remained healthy;
- Task Drain was `false / 0 / 0 / quiescent=true`;
- Fast Read Execution, Semantic Fast Read, Semantic Selector and Human Send Proposal were all OFF;
- TypeSafe/JEV and Fast Read intent secret mounts were absent;
- stable selector still pointed to `83baca411096...`;
- the candidate selector pointed to `9ee338303292...`.

A human-approved managed-admin render of the exact canonical 14-file Core topology with the candidate selector returned only:

`wandora/core:organization-adapter-candidate-9ee338303292`.

### Production promotion

Second adversarial review returned `confirm`.

One explicit human-approved managed-admin action recreated **only** service `core` with:

- exact canonical 14-file topology;
- exact candidate selector;
- `--no-deps`;
- `--force-recreate`;
- `--no-build`;
- `--pull never`;
- `--wait`.

The command exited 0 and Docker reported the recreated Core healthy.

Post-promotion readback is GREEN:

- image tag `wandora/core:organization-adapter-candidate-9ee338303292`;
- image/manifest `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- revision `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- contract `organization-adapter-core-v1`;
- user `node`;
- healthy;
- restart count 0;
- exact canonical 14-file Compose provenance;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send Proposal OFF;
- TypeSafe/JEV and Fast Read intent mounts absent;
- Paperclip container id unchanged and healthy;
- Messaging Gateway container id unchanged and healthy;
- Task Drain remained quiescent.

No database migration, Paperclip lifecycle mutation, provider/customer call, VendaERP call, Human Send or outbound effect occurred.

The stable selector was then atomically advanced to:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-9ee338303292`

while preserving mode `0640`, uid `999`, gid `1003`.

### Decision

**Exact Core Candidate Production Promotion V1 is GREEN.**

The live/stable Core baseline is now `9ee338303292...` with every rollout/effect gate OFF.

ADR 0367 remains valid historical rollback evidence for the previous `83baca...` baseline, but it is no longer the current-baseline rollback freeze.

The next mandatory boundary is to repin and capture a fresh Rollback Freeze V2 for live `9ee338...` before any separately approved scoped rollout activation for 28PRO / Ana / `business.products.price`.


