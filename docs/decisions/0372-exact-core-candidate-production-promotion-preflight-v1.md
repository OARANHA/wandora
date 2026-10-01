# ADR 0372 — Exact Core Candidate Production Promotion Preflight V1

Status: **PRE-FLIGHT NO-GO / CANDIDATE STILL QUALIFIED / EXECUTION AUTHORITY BLOCKED / NO PRODUCTION EFFECT**

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
