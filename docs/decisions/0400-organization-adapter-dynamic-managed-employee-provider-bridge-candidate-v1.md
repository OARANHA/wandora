# ADR 0400 — Organization Adapter Dynamic Managed Employee Provider Bridge Candidate V1

- Status: **IMPLEMENTED AS DISPOSABLE OVERLAY CANDIDATE / EXACT-HEAD CI PENDING / NO PRODUCTION EFFECT**
- Date: 2026-10-02
- Base: PR #398 exact head `233b4546dcbaaf7a281b40a30c9c1a6c182bb000` — 13/13 GREEN
- Scope: provider-bound dynamic employee ensure inside an isolated Organization Adapter 0.7.0 candidate

## REAL NOW

PR #398 was freshly revalidated at exact head `233b4546dcbaaf7a281b40a30c9c1a6c182bb000` with **13/13
completed/success** workflows.

The first #399 implementation attempt mutated
`integrations/paperclip/plugins/organization-adapter-v1` directly from 0.6.1
to 0.7.0. Exact-head CI correctly rejected that shape:

- Core production-activation rehearsal protects the canonical 0.6.1 source;
- Paperclip Fast Read Production Candidate protects the 0.6.1 / 916.1 pin;
- OpenAPI compatibility asserts the qualified 0.6.1 candidate remains canonical;
- Semantic Fast Read compiles the canonical plugin against the four-patch 916.1 provider profile.

The dedicated Organization Adapter Plugin CI passed only because that first
attempt also changed it to the five-patch profile. The semantic bridge was not
the controlling failure; candidate identity isolation was.

Those historical/production guards remain authoritative and are not weakened.

## CAPABILITY AUTHORITY / REUSE GATE

Wandora owns canonical employee instance identity and customer hire/activation
semantics. Paperclip owns Agent creation, exactly-one concurrency, native
approval, provider markers/fingerprints and operational pause lifecycle.
Organization Adapter remains the replaceable HMAC boundary.

No new Wandora lifecycle table/enum is justified. `pending_approval` stays
provider-operational and is not persisted as Wandora product state.

ADR 0168 remains binding: portability is contract decoupling, not provider
implementation duplication.

## DECISION — PRESERVE 0.6.1, OVERLAY 0.7.0

The canonical source remains unchanged at
`integrations/paperclip/plugins/organization-adapter-v1`, version **0.6.1**,
provider pin `wandora/paperclip:v2026.916.1`.

The dynamic candidate is one versioned overlay:
`integrations/paperclip/organization-adapter-dynamic-managed-v1/organization-adapter-v0.7.0.patch`.

A composition script copies canonical 0.6.1 to a disposable directory, proves
its version/provider pin, applies the overlay with exact-context
`git apply --check`, and verifies the resulting candidate identity. There is
no second long-lived plugin implementation.

## 0.7.0 CONTRACT

The overlay adds `agents.managed.dynamic`, signed sibling webhook
`employee-ensure-dynamic`, exact request
`{ companyId, employeeId, catalogKey }`, canonical employee UUID validation,
resource key `wandora-digital-employee:<employee UUID>`, and a bounded
catalog-derived create spec with `initialStatus=paused`, budget `0`, and the
existing `wandora_mastra` adapter.

The bridge calls `ctx.agents.managed.ensureDynamic`.

Success requires exact provider correlation and Agent state exactly `paused`.
It returns only the private binding:

```json
{ "providerAgentRef": "<private Paperclip Agent id>" }
```

`pending_approval` and all non-paused states fail closed. Replay after native
approval converges to the same Agent; ADR 0399 preserves requested paused state.

## COMPATIBILITY / CI

The new `Organization Adapter Dynamic Managed Candidate CI` checks out exact
Paperclip `d554c478…`, composes all five qualified provider deltas, builds the
dynamic-capable plugin SDK, composes the disposable 0.7.0 overlay, and reuses
the plugin's package typecheck/test/validation/package pipeline.

Existing Core, OpenAPI, Fast Read Production Candidate, Semantic Fast Read and
canonical Organization Adapter 0.6.1 guards are unchanged.

## VALIDATION

The overlay carries tests for strict HMAC/body/UUID shape, rejection of caller
provider IDs, UUID-only resource keys, same-employee replay, distinct resources
for two employee UUIDs on one template, bounded paused spec, pending-approval
fail-closed behavior, same-Agent success after provider approval, and
fail-closed provider correlation/state. All inherited static tests also run.

## SECOND ADVERSARIAL REVIEW

Initial design projected provider lifecycle and received
`deep_review=0.59`. Removing that projection and failing closed while approval
is pending yielded:
`proceed_fast=0.58, deep_review=0.38, block=0.03, split_task=0.01`.

The four RED guards then refined packaging identity, not the runtime semantic
contract.

## EFFECT BOUNDARY

No Core consumer change, schema/hire-journal change, production plugin upgrade,
Paperclip promotion/migration/restart, registry push, real Agent creation,
customer/workforce activation or merge is authorized.

## NEXT GATE

After exact-head CI GREEN for the isolated overlay candidate, qualify the
Core-side dynamic provider client and employee-instance binding migration
separately, removing static managed-hash assumptions before any runtime switch.
