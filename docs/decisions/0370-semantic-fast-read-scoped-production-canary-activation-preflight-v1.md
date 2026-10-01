# ADR 0370 — Semantic Fast Read Scoped Production Canary Activation Preflight V1

Status: **PREFLIGHT COMPLETE / PREPARATION MAY PROCEED AS SPLIT TASK / ACTIVATION NOT AUTHORIZED / NO PRODUCTION EFFECT**.

## Scope

Prepare, without executing, the first persistent controlled Semantic Fast Read rollout for:

`28PRO → Ana → business.products.price → VendaERP`.

This ADR does not authorize a Core promotion, custody mount, rollout overlay, Ana request, VendaERP call, customer-path TypeSafe/Mistral call, Human Send, Messaging Gateway outbound, migration, PR merge, or any other production mutation.

## REAL NOW

Fresh GitHub reconciliation:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 remains open / draft / mergeable at `bf5c82319f0815562d45cad90a2db0ea57b9251b`;
- PR #369 exact head has 17/17 checks successful;
- PR #377 remains open / draft / mergeable at `b6a8ca26cfbf989fc98eb19b3a1877103dc0f726`;
- PR #377 base is exactly PR #369 head `bf5c823...`;
- PR #377 exact head has 12/12 checks successful.

Fresh production readback:

- Core = `wandora/core:organization-adapter-candidate-83baca411096`;
- Core image id = `sha256:f8f09f785ed2b1f8fd86c9b9120c8ba09956d8f30b239190b93a110efd462d7f`;
- Core revision = `83baca4110966989b484341b5c58bb42d1eb5407`;
- Core healthy / restart 0;
- Paperclip = `wandora/paperclip:v2026.916.1`, healthy / restart 0;
- Organization Adapter = exactly one `0.6.1`, `ready`, `lastError=null`;
- external `wandora_mastra@0.6.0` = loaded / enabled;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core startup = Fast Read OFF / Semantic Fast Read OFF / Human Send OFF;
- Messaging Gateway = healthy and `outboundEnabled=false`;
- active Core composition is the ADR 0367 14-file gates-OFF baseline;
- custody, attestation and scoped-rollout overlays are absent.

Paperclip Ana runtime still points to the ADR 0368 successful run and is now `idle` with no error. No later Fast Read run was created by this preflight.

## Exact canary identities

Wandora customer/employee identifiers to be used by rollout admission:

- organization `28PRO` = `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- Ana employee = `7b401163-8102-42db-b595-3a2017f54003`.

Fresh Web access logs independently show current authenticated reads using exactly that organization and employee pair.

Provider bindings remain:

- Paperclip company `28PRO` = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- Paperclip Ana = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Ana = `idle`, adapter `wandora_mastra`, organization chain `healthy`.

## VendaERP operational authority

The provider-owned Connection remains:

- Connection id = `8e2c23f4-73f5-444a-8647-71428819ea91`.

Fresh Organization Adapter `operational-read`, using Paperclip `tools.operational.read` and no provider I/O, proves one relevant VendaERP connection with:

- runtime health `ok`;
- status `active`;
- enabled = true;
- health = `ok`;
- organization grant active = true;
- installed for Ana = true;
- all eight projected tools active;
- all eight tools risk `read`;
- `isReadOnly=true`;
- `isWrite=false`;
- `isDestructive=false`;
- `allowedByEffectiveProfile=true`.

Paperclip explicit Tool Policies for 28PRO are currently empty. A fresh non-consuming/non-auditing Tool Policy test for Ana + Connection `8e2c23f4...` + `vendaerp_search_products` returns:

- decision = `allow`;
- reason = `allow_profile`;
- effective profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- matched policy ids = none;
- audit event = null.

Therefore Connection, grant, install and effective Tool Policy remain Paperclip-owned and currently usable for the read-only product path. No Wandora mirror is required.

## Capability scope

ADR 0369 code intersects the Paperclip/Organization Adapter operational capability projection with the deployment-owned rollout allowlist **before** JEV routing and before `wfri1` issuance.

The future first-canary values are exactly:

```text
WANDORA_SEMANTIC_FAST_READ_ROLLOUT_TARGETS=7a531811-9fea-4395-b0b2-2e2b0fce0570:7b401163-8102-42db-b595-3a2017f54003
WANDORA_SEMANTIC_FAST_READ_ROLLOUT_CAPABILITIES=business.products.price
```

Although Paperclip operationally exposes other read-only VendaERP tools, they are not admitted into the semantic set for this canary. A non-enrolled organization/employee pair fails before operational projection/JEV/Paperclip/ERP work.

Human Send remains independently OFF. Messaging Gateway outbound remains independently OFF.

## Rollback

The ADR 0367 current-baseline receipt remains present and matches the live baseline:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0366-83baca4110966989b484341b5c58bb42d1eb5407-mastra060-2e97da6d.metadata`.

Fresh readback still records:

- exact Core/Paperclip/OA/Mastra identities;
- exact 14-file gates-OFF Core provenance;
- official backup created and gzip-valid;
- `schema_restore=true`;
- `schema_equal=true`;
- Semantic Fast Read gates OFF;
- custody/attestation overlays absent;
- Task Drain quiescent;
- `ROLLBACK_FREEZE_V2_OK`.

The baseline has therefore **not drifted** since ADR 0367.

This receipt remains the rollback authority for the currently-live 83baca baseline. If a new Core is promoted, ADR 0367 becomes historical for that new baseline and Rollback Freeze V2 must be freshly requalified/captured before scoped activation.

## Provenance gap: current PR #377 candidate is not production-eligible as-is

PR #377 Core Candidate run `36840518148` is GREEN and produced artifact:

- artifact id = `11151382368`;
- artifact name = `core-organization-adapter-candidate-5f6ad99b81775b71ae1889df28637057ccc7c883`;
- GitHub digest = `sha256:7eba8e8482b17ff124e920c56da5918208028801df58e5e4320ff4257bc15987`;
- expired = false at preflight.

The candidate revision `5f6ad99b81775b71ae1889df28637057ccc7c883` has parents exactly:

1. PR #369 head `bf5c82319f0815562d45cad90a2db0ea57b9251b`;
2. PR #377 head `b6a8ca26cfbf989fc98eb19b3a1877103dc0f726`.

However current `main=e4c7c36...` and PR #369 are diverged; PR #369 is behind current main by one commit. The candidate also diverges from live Core revision `83baca...` and is behind by two commits.

Therefore artifact `11151382368` is **not authorized for production promotion as-is**. GREEN on the stacked PR proves the scoped code contract, not current-main production convergence.

## Capability Authority / Reuse Gate

ADR 0168 remains satisfied:

- semantic/product rollout admission = Wandora-owned;
- workforce/run/Connection/grant/install/profile/Tool Policy/Tool Gateway/result/audit = Paperclip-owned;
- Mastra/JEV/Mistral/VendaERP remain replaceable provider implementations behind existing contracts;
- no new table, migration, state machine, lifecycle, registry, Connection mirror, entitlement subsystem, retry engine, secret manager or provider mirror is justified.

## Decision

**Preparation decision: GO, but only as a split task.**

The preflight has enough evidence to freeze the exact customer, employee, capability and provider-operational scope. It does **not** authorize activation.

The next preparation task must create/qualify a Core candidate that closes over current `main` + current PR #369 + PR #377 scoped-rollout code, with all effect gates OFF. Do not use artifact `11151382368` as the production candidate.

After that candidate is promoted under its own explicit approval with gates OFF, requalify/capture Rollback Freeze V2 for the new live Core baseline.

Only after that fresh rollback checkpoint may a separate activation slice consider custody + `compose.semantic-fast-read-rollout.yaml`.

## Second adversarial review

JEV/TypeSafe `jev-1.13.0` returned:

- `split_task = 0.70`;
- `deep_review = 0.14`;
- `block = 0.10`;
- `proceed_fast = 0.06`;
- confidence = `0.60`.

This supports separating Core convergence from customer activation.

## Future stop conditions

Stop before or during future activation if any of these are true:

- Git/main/PR head/merge provenance differs from the qualified candidate;
- exact candidate artifact/digest is unavailable or mismatched;
- Core, Paperclip, OA, Mastra or Gateway is not healthy;
- Task Drain is not `false/0/0/quiescent`;
- rollback for the then-current live Core is absent/stale;
- custody metadata or required mounts differ from the qualified contract;
- 28PRO/Ana identity/binding differs;
- VendaERP Connection is not active/enabled/healthy;
- organization grant is inactive;
- Connection is not installed for Ana;
- effective Tool Policy is not `allow/allow_profile`;
- `business.products.price` is absent from the effective operational intersection;
- any capability outside `business.products.price` reaches semantic admission;
- non-enrolled org/employee reaches JEV/Paperclip/ERP;
- any retry/second ERP read occurs unexpectedly;
- any write/destructive tool becomes eligible;
- deterministic result model differs from `wandora-deterministic-read-v1`;
- deterministic result token usage is non-zero;
- Human Send becomes enabled;
- Messaging Gateway outbound becomes enabled.

## Exact rollback boundaries

1. **Before scoped activation, while converging the new Core:** rollback target is the current ADR 0367 exact 83baca 14-file gates-OFF baseline.
2. **After the new Core becomes the validated gates-OFF baseline:** capture a fresh Rollback Freeze V2 receipt for that exact Core before activation.
3. **During scoped activation:** immediate close removes custody + rollout overlays and recreates only Core on that exact new gates-OFF baseline. If the new baseline itself is unhealthy, use its freshly captured Rollback Freeze V2.

## Hard stop

No production mutation was executed in this ADR.

No Ana request, VendaERP call, customer-path TypeSafe/Mistral call, Human Send, outbound, migration, PR merge or rollout occurred.

Next boundary: **Semantic Fast Read Scoped Rollout Current-Main Core Convergence V1 — CODE/CANDIDATE FIRST, GATES OFF, NO CUSTOMER EFFECT**.
