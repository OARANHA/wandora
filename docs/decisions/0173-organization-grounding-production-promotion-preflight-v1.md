# ADR 0173 — Organization Grounding Production Promotion Preflight V1

Status: **ACCEPTED / GO FOR A SEPARATE FUTURE EXECUTION ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-22

## Context

ADRs 0169–0172 complete, in code, the minimum Wandora-owned grounding semantic contract, bounded owner/admin mutation/read contract, provider-neutral Agent Runtime projection and customer `Empresa / Regras da Casa` surface.

Production deliberately still has migration 017 absent. The live Core predates ADR 0171's grounding readiness gate and the live Web predates ADR 0172's customer surface.

This preflight qualifies the coordinated future promotion. It does **not** authorize applying migration 017, recreating Core/Web, creating MEDICSPRO grounding, invoking a model, creating work/run/wakeup/session or enabling any outbound effect.

## REAL NOW

Canonical Git entering the preflight:

```text
main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
```

Applicable post-merge push workflows on that exact main are GREEN:

```text
Core CI               run 35717297574 = success
Web CI                run 35717297831 = success
Platform Admin CI     run 35717297587 = success
Messaging Gateway CI  run 35717297661 = success
```

The Core implementation itself was introduced at `main@d90b225e6cc2ff1e22e4bc446ee1a08d52e429ad`. That exact commit also has GREEN Core Candidate Artifact, Paperclip Mastra Adapter, Paperclip OpenAPI, Web, Platform Admin and Messaging Gateway workflows. A Git diff from `d90b225e...` to `fba159db...` proves **no changes under `apps/core/` or `infra/stacks/core/`**; the later delta is only Web + documentation. Therefore the immutable Core artifact from `d90b225e...` is the correct Core candidate for the current main.

Live readback before any preflight mutation:

```text
Core      = wandora/core:organization-adapter-candidate-61cbb34d4bfd
            image id sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
            healthy / restart 0 / readyz 200
Web       = wandora/web:candidate-65908b76c667
            image id sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e
            healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0
            image id sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
            healthy / restart 0
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de
            image id sha256:c9a780765c0b44ddb2b6dd59fcde6cc0d53330d5c1a4b32e414108ab7156d46d
            healthy / restart 0

Paperclip execution bridge = ON
Human Send                 = OFF / enable flag absent
Gateway outbound           = OFF / enable flag absent

MEDICSPRO active org       = 1
MEDICSPRO works            = 2
MEDICSPRO active+supervised Ana = 1
MEDICSPRO outbound attempts = 0

wandora.organization_grounding_entries = ABSENT
```

No live container/database/provider state was changed by this preflight.

## Capability Authority / Reuse Gate

No new capability is required for promotion.

- **semantic authority:** Wandora owns official company facts, Regras da Casa and provenance semantics;
- **durable product state:** migration 017 only;
- **customer operational contract:** existing Core APIs from ADR 0170;
- **runtime operational authority:** Agent Runtime/Mastra remains responsible for execution/context mechanics;
- **control-plane authority:** Paperclip remains responsible for Skills, Decisions/Decision Training, Connections/grants and employee/task/run lifecycle;
- **replacement boundary:** Wandora-owned API and Agent Runtime contracts remain provider-neutral.

The preflight therefore introduces no new table, migration, store, scheduler, retrieval/RAG, memory, vector, embedding, chunking, document or provider subsystem.

ADR 0168 remains the invariant:

> **Portability = contract decoupling, not implementation duplication.**

## Migration 017 qualification

Canonical source:

```text
infra/stacks/supabase/migrations/20260922_017_organization_grounding_contract_v1.sql
sha256 = bc14aedf77b2a12ab1e9d022fa7fddaa4ac3ec343c18f65f700755dd268a2fdd

infra/stacks/supabase/verifiers/VERIFY_20260922_ORGANIZATION_GROUNDING_CONTRACT_V1.sql
sha256 = 6c63c586101df1f8fd7ab2638663ea035f7878698d18c7149838987edd7fa2d7
```

The migration is additive and transaction-wrapped. It adds the three grounding audit enum values, creates the single grounding table, indexes, RLS, tenant-scoped SELECT authority and the three bounded SECURITY DEFINER mutation functions.

The verifier proves RLS, least privilege, owner/admin mutation, member denial, cross-tenant denial, provenance constraints, correction history, retirement behavior and audit evidence. Its fixtures roll back.

### Production-derived restore rehearsal

A read-only preflight dump was captured from the live `wandora` + `wandora_private` schemas:

```text
/home/wandora-admin/preflights/organization-grounding-production-promotion-preflight-v1/
  wandora-pre-migration-017.dump

mode   = 0600
sha256 = 15fe0cb6d515a3c562c085405899f5c4e1ca11fffd79bfe8debf54f947675ee0
```

This is **preflight evidence only**, not the future execution rollback asset.

The first disposable restore attempt was intentionally rejected as invalid evidence: it used the ordinary `postgres` role of a fresh Supabase image, which is not superuser and cannot assume `supabase_admin`; the fresh image also did not yet contain Wandora application roles.

The retry reconciled that dependency instead of weakening restore flags:

1. exact `supabase/postgres:17.6.1.136`;
2. restore administrator = native `supabase_admin`;
3. recreate the three non-secret Wandora role shapes required by the dump:
   - `wandora_core_runtime`;
   - `wandora_platform_provisioner`;
   - `wandora_customer_hire_operator`;
4. restore with `pg_restore --exit-on-error`.

Result:

```text
baseline restore            = GREEN
migration 017 before apply  = ABSENT
migration apply #1          = GREEN
migration apply #2          = GREEN
canonical verifier          = ORGANIZATION_GROUNDING_CONTRACT_V1_OK
grounding rows after verifier = 0
```

The role definitions remain reproducible from canonical repository migrations rather than chat memory. On the live same-cluster rollback path, those roles are unchanged by migration 017.

## Exact promotion artifacts

### Core

```text
source SHA          = d90b225e6cc2ff1e22e4bc446ee1a08d52e429ad
workflow run        = 35712541588
artifact id         = 10686954415
artifact name       = core-organization-adapter-candidate-d90b225e6cc2ff1e22e4bc446ee1a08d52e429ad
artifact ZIP sha256 = fca39cf5dd03cf12aa934b3d5b55258c25a0ed334de48cbb8863bf97ff1e3bfb
expires             = 2026-09-29

image tag           = wandora/core:organization-adapter-candidate-d90b225e6cc2
archive sha256      = f4a17b776c85b377a4c2f150852eb99553e085d6f30a0d7d72d79d152e067498
OCI config          = sha256:f6b589b6dbfc84d86fd5eae10593e99e6c1ecbee08fc943ba41ad4bc5d966b0a
OCI manifest        = sha256:7d8d9e5c83dc70b73e7b2ff56599d402fe4413676d3fab691fdc56069234727b
image user          = node
```

The authenticated artifact ZIP was staged on the VPS and its ZIP digest matched GitHub. The internal `SHA256SUMS` validated, and the OCI archive loaded as the expected candidate without recreating any live container.

### Web

```text
source SHA          = fba159db751122bfb5c600296bb7a0d5beb5a474
workflow run        = 35717297831
artifact id         = 10690072338
artifact name       = web-candidate-fba159db751122bfb5c600296bb7a0d5beb5a474
artifact ZIP sha256 = 73ef5b75f3b021861ce2fe14b305dc030bdebe276aa82e688166d8e14687faf6
expires             = 2026-09-29

image tag           = wandora/web:candidate-fba159db7511
image id            = sha256:96779cdf6106d20cea39e98a82b47deb2d9df2ee05d50169f1d9a95274a1c9b2
archive sha256      = f90927f7622f27bfafe003c7c108043f8926d0565c98bf84d21b320883c673a3
```

The authenticated Web artifact ZIP was also staged and its digest matched GitHub.

If either artifact expires before execution, the future execution must STOP and reproduce a candidate from the exact accepted source using the canonical GitHub-hosted workflow, then freeze new provenance. It must never substitute a mutable/latest image silently.

## Dependency and readiness order

The promotion dependency is strict:

```text
migration 017
    ↓
Core candidate / readiness
    ↓
Web customer surface
```

Why:

1. the Web surface calls the ADR 0170 Core grounding API;
2. the new Core execution-bridge readiness explicitly probes `wandora.organization_grounding_entries`;
3. therefore the Core candidate must not replace the live Core before migration 017 is verified;
4. the Web must not replace the live Web before the new Core API is healthy.

The current live Core is still ready with migration 017 absent because it predates ADR 0171's grounding readiness gate. This is expected historical behavior, not evidence that the new Core can run safely without 017.

### Fail-closed evidence

The exact candidate source contains an explicit readiness test:

```text
Paperclip bridge readiness fails closed when migration 017 grounding read boundary is unavailable
→ { ready: false, reason: "organization-grounding-runtime-boundary-unavailable" }
```

The readiness implementation probes the grounding table only when the Paperclip execution bridge is enabled and returns that failure reason if the boundary cannot be read.

That exact source passed Core CI and Core Candidate Artifact on `d90b225e...`.

A final attempt to run an additional disposable binary-level Core proof was blocked by the execution tool before the command reached the VPS. No state was created by that blocked attempt, and no alternate/unsafe path was used. The source-level exact-candidate test plus successful exact-SHA CI remains the accepted fail-closed evidence for this preflight.

## Rollback anchors

Current live binary anchors were recorded above. The exact live Compose hashes observed at preflight are also frozen here so rollback does not depend on chat history:

```text
Core compose.yaml                         d028a7bed2af02fcc0bab3bcbe6e7297d0857549792542c54a4760ff0624dda6
Core compose.database.yaml                8b044de0cd49cab664fe5b0a6b4db6e638d16956b3ec5cb9bb6eb958fe696d9e
Core compose.gateway-ingress.yaml         36f047128914a846b7a667e67ab9daf40725e67fa9c320ddd35f8be62c9e3eed
Core compose.agent-runtime-deterministic  aa6661847833a9df0a6f5af56dbf26af28b9041dce5560684b126ffbb849644e
Core compose.human-api.yaml               f1ace87f21280aa2e41c7d4260b43f66d0cd39ded211d088ecb09864bf7cf8a2
Core compose.organization-adapter.yaml    1b3f100dfa62a64a6d1cab0d307bcb9b52ba8ee848f3e1b49dece59761d3c394
Core compose.human-digital-employee-hire  e5f695eb5bfed785b6f441444b8f7334a3da22f71ae14bfd2258afa06e7d0320
Core compose.paperclip-execution-bridge   98d084c6f3da52b97949e5cdb16d25f7cd972a44173749186ca43794a799f9ab
Core compose.agent-runtime-model.yaml     f5e1989a6e1d9560c70d06d202d078eecebce597421f949b45657ec6dd8e7f8c
Web compose.yaml                          b5f70e13e73f1a4fbc381fdaec16725496503deaaa052da4b1b0d60637b25269
```

The two additional live Core overlays are also part of the running composition and must be preserved/re-hashed at execution time: the accepted activation overlay from ADR 0135 and the customer-work overlay from ADR 0139. Their absolute paths are visible in the live container Compose labels; the future execution must freeze their current bytes before recreating Core rather than infer them from this preflight.

Database rollback has two distinct boundaries:

### Before migration verifier is GREEN

A failure applying or verifying migration 017 is a hard STOP. Restore the **fresh execution-time** pre-migration dump and verify the exact pre-017 baseline. Do not improvise a down migration.

This is especially important because PostgreSQL enum values are part of migration 017; exact pre-migration rollback is a restore problem, not a `DROP TABLE` problem.

### After migration verifier is GREEN, before real grounding writes

Migration 017 is additive and the previous Core/Web do not depend on its absence.

If Core promotion fails, restore the prior Core image/config and keep the verified additive migration in place unless a separately reviewed exact-baseline restore is truly required.

If Web promotion fails, restore the prior Web image/config; the verified migration and healthy Core may remain.

Do not restore the pre-migration database merely to undo a binary deployment: such a restore could roll back unrelated Wandora mutations after the snapshot.

### After real grounding/customer writes exist

The pre-017 dump is no longer a routine rollback mechanism because it would delete post-snapshot customer state. Any later schema reversal requires a separate forward/retention-aware decision.

The future Promotion Execution V1 therefore must STOP after successful promotion/validation and must not create real MEDICSPRO grounding as part of the execution.

## Frozen future execution order

A separate future **Organization Grounding Production Promotion Execution V1** may proceed only if a fresh REAL NOW revalidation remains green:

1. reconcile current main, open PRs, exact CI and live runtime;
2. require migration 017/table still absent; if unexpectedly present, STOP and reconcile rather than reapply;
3. require MEDICSPRO/customer/runtime/effect baseline to remain understood; unexpected work/run/outbound drift is a STOP;
4. verify exact Core/Web artifacts and expiry/digests;
5. capture a **fresh** protected `pg_dump -Fc` of `wandora` + `wandora_private`, hash it and perform a role-aware isolated restore-check before any live schema mutation;
6. preserve current Core/Web image IDs and exact compose hashes;
7. apply migration 017 exactly once and immediately run the canonical verifier;
8. on migration/verifier failure: STOP and restore the fresh pre-migration baseline before any later service promotion;
9. start the exact Core candidate in a bounded candidate proof against the verified live DB composition; require `healthz=200`, `readyz=200` and unchanged effect gates/state;
10. promote/recreate **only Core** with the exact candidate and existing reviewed overlays; require healthy/readiness and no new work/run/model/outbound effect;
11. validate the exact Web candidate against the promoted Core without creating grounding;
12. promote/recreate **only Web** with the exact candidate;
13. validate `/company`, unauthenticated API behavior, tenant/session boundary and that grounding rows are still zero unless a separately authorized customer mutation occurred outside this execution;
14. require Human Send OFF, Gateway outbound OFF, services healthy/restart-stable and no new model/work/run/wakeup/session/outbound effect caused by promotion;
15. STOP.

Paperclip, Mastra and Messaging Gateway are not promoted/recreated by this execution.

## Objective stop conditions

Hard STOP before the next effect if any of the following is observed:

- main/PR drift affecting migration 017, Core or Web without a fresh review;
- exact candidate artifact missing, expired or digest mismatch;
- unexpected pre-existing grounding table/migration state;
- backup/hash/role-aware restore-check failure;
- migration or verifier failure;
- candidate/live Core readiness failure;
- unexpected compose/image provenance drift;
- Human Send or Gateway outbound no longer OFF;
- unexpected MEDICSPRO work/run/wakeup/session/model/outbound effect;
- provider/runtime health degradation;
- any need to add a new capability/table/store merely to complete promotion.

## Second adversarial review

The review explicitly rejected:

1. promoting Core before migration because the old Core currently reports ready;
2. promoting Web before the new Core API;
3. treating the preflight dump as the future execution rollback asset;
4. using `--no-owner`/weakened restore flags to hide missing role dependencies in the rehearsal;
5. hand-written down SQL to remove enum labels/table after a failed promotion;
6. rebuilding artifacts merely because promotion is later;
7. interpreting portability as a reason to copy Mastra/Paperclip operational capabilities into Wandora;
8. creating real MEDICSPRO grounding to prove the promotion.

## Decision

**GO for a separate future Organization Grounding Production Promotion Execution V1, and only under the frozen order/stop conditions above.**

This preflight success is **not** production authorization by itself and does not perform any production promotion.

