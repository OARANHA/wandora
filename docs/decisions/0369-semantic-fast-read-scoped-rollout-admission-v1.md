# ADR 0369 — Semantic Fast Read Scoped Rollout Admission V1

Date: 2026-10-01

Status: **GREEN / CODE-ONLY QUALIFIED / SCOPED ROLLOUT CONTRACT READY / NO PRODUCTION ACTIVATION / NO CUSTOMER EFFECT**

## Objective

Convert the GREEN ADR 0368 Semantic Fast Read attestation into the smallest safe persistent-rollout contract without reopening production, repeating the Ana/VendaERP read, duplicating Paperclip authority, or creating new durable rollout infrastructure.

This ADR is rollout engineering only. It does **not** authorize a production activation or PR merge.

ADR 0168 remains binding:

**Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.**

## REAL NOW before implementation

The slice began from fresh source/runtime reconciliation:

- current `main`: `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369: open, draft, not merged;
- PR #369 head: `bf5c82319f0815562d45cad90a2db0ea57b9251b`;
- PR #369 exact-head CI: 17/17 GREEN;
- production Core remained exact `wandora/core:organization-adapter-candidate-83baca411096`;
- Core revision remained `83baca4110966989b484341b5c58bb42d1eb5407`;
- Paperclip v2026.916.1 healthy;
- Organization Adapter 0.6.1 ready;
- external `wandora_mastra@0.6.0` loaded/enabled;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Fast Read OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Messaging Gateway outbound OFF;
- custody and attestation overlays absent.

ADR 0367 remained the current-baseline rollback qualification for the exact 83baca gates-OFF production state.

No production effect was required to implement or validate this ADR.

## Capability Authority / Reuse Gate

The existing provider surfaces already solve operational authorization:

- Paperclip company scope;
- managed Ana resolution;
- Connection active/enabled/healthy state;
- organization grant;
- installed-for-agent state;
- effective tool profile;
- read/write/destructive tool semantics;
- runs;
- Tool Gateway execution;
- terminal result;
- audit.

Those are Paperclip operational authority and remain there.

They are **not** the Wandora product decision that says which customer/employee/capability has entered a Wandora rollout.

The missing capability was therefore only a Wandora-owned product admission policy.

The reuse gate rejected:

- a new table;
- a migration;
- a rollout service;
- a state machine;
- a provider-grant mirror;
- a second Connection/grant registry;
- a retry engine;
- using Paperclip grants as a Wandora feature flag;
- reusing the attestation-only overlay as permanent rollout configuration.

No new durable product state was proven necessary for the initial canary. Deployment configuration is sufficient.

## Decision

Keep the existing process-level Fast Read/Semantic booleans as coarse kill switches.

Add one optional, fail-closed Wandora rollout policy containing:

1. exact `organizationId + employeeId` target pairs;
2. an allowlist of Wandora `BusinessCapability` values.

For the first future production canary, the intended scope is one exact customer/employee pair with:

`business.products.price`

Broader capabilities remain a later decision.

## Admission order

When rollout policy is configured, the Human Fast Read path now follows:

```text
authenticated human request
  -> exact rollout organization+employee admission
  -> existing owner/admin + employee/provider binding checks
  -> existing Paperclip/OA operational capability projection
  -> intersection with Wandora rollout capability allowlist
  -> fail closed if intersection is empty
  -> JEV semantic decision
  -> existing Wandora semantic gate
  -> optional product selector
  -> same gate again
  -> signed wfri1 intent containing the effective capability set
  -> Paperclip dispatch
  -> Tool Gateway
  -> provider read
```

A non-enrolled target stops before provider capability projection, JEV/Mistral semantic work, Paperclip dispatch or ERP execution.

An enrolled target whose operational capabilities do not intersect the rollout allowlist stops with `capability-not-advertised` before semantic decision or dispatch.

The existing Organization Adapter owner/admin check remains defense in depth.

When no rollout policy is configured, the already-qualified bounded attestation behavior is unchanged.

## Runtime configuration

The rollout policy is non-secret startup configuration:

- `WANDORA_SEMANTIC_FAST_READ_ROLLOUT_TARGETS`;
- `WANDORA_SEMANTIC_FAST_READ_ROLLOUT_CAPABILITIES`.

The runtime parser:

- requires both fields together;
- accepts 1..64 exact UUID target pairs;
- canonicalizes UUIDs to lowercase;
- bounds raw configuration size;
- deduplicates target pairs;
- accepts only canonical `BUSINESS_CAPABILITIES`;
- deduplicates capability values;
- fails closed on malformed or unsupported values.

No database state is introduced.

## Persistent rollout Compose contract

A new overlay exists:

`infra/stacks/core/compose.semantic-fast-read-rollout.yaml`

It is separate from:

`compose.semantic-fast-read-attestation.yaml`

The rollout overlay:

- enables Fast Read Execution;
- enables Semantic Fast Read;
- enables Semantic Selector;
- keeps Human Send OFF;
- requires explicit rollout targets;
- requires explicit rollout capabilities;
- adds no volume;
- adds no port;
- adds no image/build;
- adds no network;
- adds no secret.

A future authorized production composition must append the rollout overlay after the existing gates-OFF convergence and custody contracts. The attestation overlay must not be used as the customer rollout surface.

Messaging Gateway outbound remains separately controlled and must remain OFF for the initial Fast Read rollout.

## TDD evidence

The slice was implemented test-first.

### RED 1 — target and capability admission

Before implementation:

- a non-enrolled target still reached dispatch;
- JEV still received `business.products.search` even when rollout allowed only `business.products.price`.

The tests failed for exactly those reasons.

The minimum service change then:

- rejected non-enrolled target pairs;
- intersected Paperclip/OA operational capabilities with Wandora rollout capabilities.

That implementation head completed Core CI, Semantic Fast Read CI and all other triggered workflows GREEN.

### RED 2 — runtime rollout configuration

The config test was added before the runtime contract. Semantic Fast Read CI failed because `RuntimeSemanticFastReadConfig` had no rollout field.

The bounded parser was then added.

### RED 3 — empty effective capability set

A final test proved that an enrolled target with no overlap between operational and rollout capabilities must not call the semantic provider.

Before the fix, `semanticDecisionCalls=1`.

The minimum fix added a three-line fail-closed return before JEV.

## Validation

Implementation head:

`3b63623f249c050536c0484c8db26a1d505ffae7`

Stacked PR:

- PR #377;
- branch `feat/semantic-fast-read-scoped-rollout-v1`;
- base `feat/semantic-fast-read-runtime-wiring-v1`;
- draft;
- not merged.

Exact implementation-head workflows completed **7/7 GREEN**:

- Core CI;
- Semantic Fast Read CI;
- Paperclip Mastra Adapter CI;
- Core Candidate Artifact;
- Messaging Gateway CI;
- Web CI;
- Platform Admin CI.

Semantic Fast Read CI additionally proved:

- Core typecheck GREEN;
- focused Fast Read Core tests GREEN;
- adapter contract/package qualification GREEN;
- disposable Semantic Fast Read E2E GREEN.

Core CI validates the separate rollout Compose rendering and keeps outbound surfaces absent.

## Adversarial review

Before implementation, the focused architecture guard returned:

- allow = 0.56;
- confirm = 0.30;
- review = 0.10;
- deny = 0.04.

A completion review during final verification correctly returned `verify_more=0.83` because exact-head long-running CI and canonical documentation were still incomplete at that moment.

That review did not authorize production.

## Production effects

None.

This ADR did not:

- recreate Core;
- mount custody;
- open Fast Read;
- call Ana;
- call VendaERP;
- call a customer-path model/provider;
- change Paperclip lifecycle;
- enable Human Send;
- enable Messaging Gateway outbound;
- apply a migration;
- create a table/service/state machine;
- merge PR #369;
- merge PR #377.

## Rollback boundary

No runtime rollback was needed because no production mutation occurred.

For the future production canary, the immediately previous production state remains the exact gates-OFF 83baca baseline qualified by ADR 0367, subject to fresh effect-adjacent revalidation.

If production drifts before activation, the rollback must be requalified for that new exact baseline rather than inferred from this ADR.

## Next boundary

The next slice is:

**Semantic Fast Read Scoped Production Canary Activation Preflight V1**

It must begin from fresh evidence and must not blindly reuse this code-only checkpoint as effect authorization.

Before any production mutation it must re-prove:

1. current `main`, PR #369 and PR #377 provenance;
2. exact merge/ref compatibility;
3. exact-head CI;
4. current Core/Paperclip/OA/Mastra/Gateway state;
5. Task Drain quiescence;
6. current rollback readiness;
7. custody readiness;
8. exact customer + Ana IDs for the intended canary;
9. intended capability scope, initially `business.products.price`;
10. Human Send OFF and Gateway outbound OFF.

Then perform a fresh decision, a second adversarial review and obtain explicit human approval for the production effect.

A code qualification is not a rollout authorization.
