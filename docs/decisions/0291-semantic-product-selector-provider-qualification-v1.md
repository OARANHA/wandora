# ADR 0291 — Semantic Product Selector Provider Qualification V1

Status: **QUALIFIED / 16/16 PR WORKFLOWS GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0290 qualified the Wandora-owned provider-neutral product selector and bound it cryptographically into the existing `wfri1` Fast Read intent. It deliberately left one gap: the current concrete `TypeSafeJevSemanticDecisionProvider` does not originate arbitrary product-selector values.

This slice determines whether the current TypeSafe/System One boundary can fill that gap without inventing provider behavior. If not, it qualifies only the smallest provider-neutral semantic-provider extension required for a future concrete extractor.

ADR 0168 remains controlling:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

This slice is repository/CI only. No production effect is authorized.

## REAL NOW

Before execution:

- canonical `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 was open, draft and mergeable;
- pre-slice PR #369 head was `a952cc18068d55149e1214720b88d03cc193380c`;
- that head contained ADR 0290 and had 16/16 PR workflows GREEN;
- runtime/VPS reconciliation was not required because the slice was code-only.

## Proven TypeSafe/System One capability

The official TypeSafe OpenAPI 0.2.0 is published at:

`https://api.typesafe.ai/openapi.json`

Its `Question` schema is exactly one of:

- `NoulQuestion`;
- `ChoiceQuestion`;
- `ScoreQuestion`.

Its `Answer` schema is exactly one of:

- `NoulAnswer`;
- `ChoiceAnswer`;
- `ScoreAnswer`.

A `ChoiceQuestion` selects one option from caller-supplied `criteria`. There is no arbitrary string/extraction answer primitive.

Therefore current System One can classify, score or choose among candidates supplied by the caller, but it cannot independently originate an arbitrary product name/code/barcode string from free customer text under the currently published API contract.

### Consequence

The existing `TypeSafeJevSemanticDecisionProvider` must not be extended by assumption to fabricate `ProductSelector.value`.

Feeding TypeSafe a product candidate list would require obtaining that list before semantic admission. Current Wandora has no legitimate Wandora-owned product catalog, and adding one would duplicate provider state. Reading VendaERP merely to construct TypeSafe choices would introduce an ERP read before the already-qualified one-read product-price path.

Both are rejected.

## Capability Authority / Reuse Gate

### Wandora-owned

Wandora owns:

- `BusinessCapability`;
- `ProductSelector` / `SemanticSelector`;
- semantic admission policy;
- the rule that selector confidence/ambiguity can only narrow admission;
- the signed Fast Read intent.

### Specialist-provider-owned

TypeSafe/JEV remains a replaceable routing/decision provider. A future selector extractor is also a replaceable semantic provider.

Paperclip remains operational authority for:

- run lifecycle;
- Tool Gateway authorization/execution/audit;
- Connections, grants, secrets and policies;
- terminal run state/result.

VendaERP remains the concrete business-system read provider only.

### Explicitly not created

No:

- product catalog/cache;
- provider registry;
- selector table;
- lifecycle/run mirror;
- heuristic parser;
- pre-admission ERP candidate fetch;
- second ERP lookup;
- concrete selector-provider client;
- provider secret/config;
- production activation.

## Decision

### 1. Keep the qualified TypeSafe route provider

Do not replace the already-qualified `SemanticDecisionProvider` merely because one specialist primitive is unavailable.

### 2. Add one narrow provider-neutral selector interface

`SemanticSelectorProvider` accepts:

- organization semantic context;
- employee semantic context;
- bounded request;
- already-selected `BusinessCapability`.

It returns only:

- `SemanticSelector | null`;
- confidence;
- ambiguity;
- bounded provider evidence.

It does not return a second route decision and does not expose provider-specific JSON.

### 3. Invoke selector provider only on `missing-selector`

The Human Fast Read admission flow first performs the existing semantic route decision and Wandora gate.

Only when:

- the gate reason is `missing-selector`;
- a capability is already selected;
- a selector provider is explicitly injected;

does Core call the selector provider.

All other route failures remain failures without a selector-provider call.

### 4. Selector output is not directly authoritative

After selector-provider response:

1. validate bounded selector-provider decision shape;
2. combine the selector with the original route decision;
3. set effective confidence to `min(route confidence, selector confidence)`;
4. allow selector ambiguity to block, never to relax route ambiguity;
5. rerun the existing Wandora deterministic gate;
6. only then issue the existing signed `wfri1` intent.

Thus the selector provider cannot bypass Wandora admission policy.

### 5. Current runtime remains fail-closed

No concrete `SemanticSelectorProvider` is wired by this ADR.

Current TypeSafe-only runtime therefore still returns `missing-selector` for product-price requests that require arbitrary selector origination.

Fixtures prove the composition contract only; they are not production/provider behavior.

### 6. Measurement

Add one bounded ephemeral latency stage:

`semantic.product_selector`

It uses the existing `wandora.latency.v1` event contract and creates no durable trace state.

## Adversarial review

Pre-execution review selected:

- architecture `compose_selector_provider` — 1.00;
- contract `selector_plus_confidence` — 1.00;
- authority `rerun_wandora_gate_before_intent` — 1.00;
- current runtime `remain_fail_closed` — 0.91;
- narrowed code execution `proceed` — 0.93.

Rejected:

- replacing the whole TypeSafe route provider;
- prefetching ERP candidates for TypeSafe `choice`;
- Core/ERP heuristic parsing;
- trusting selector-provider output without rerunning Wandora policy.

## Implementation

Exact qualification code head:

`7de01d0ffd32079d2a18cac919dd0d2bd9d8581e`

Changed code/test surfaces:

- `apps/core/src/semantic-routing/contracts.ts`;
- `apps/core/src/supervision/human-digital-employee-fast-read.ts`;
- `apps/core/src/latency.ts`;
- `apps/core/test/human-digital-employee-fast-read.test.ts`.

No runtime configuration or concrete provider implementation changed.

## Validation

All **16/16 PR workflows GREEN** on the exact qualification code head.

Key evidence:

- Semantic Fast Read CI `36256708250` — GREEN;
  - Core typecheck GREEN;
  - focused Fast Read Core tests GREEN;
  - Organization Adapter package qualification GREEN;
  - disposable Semantic Fast Read E2E GREEN.
- Core CI `36256708309` — GREEN.
- VendaERP Read-Only MCP CI `36256708353` — GREEN.
- Paperclip OpenAPI Compatibility `36256708433` — GREEN.
- all retained Paperclip Fast Read compatibility/provider-patch gates GREEN.

Core Candidate Artifact run `36256708316` completed before the primary gates. After both Semantic Fast Read CI and Core CI were GREEN, job `108444747916` was explicitly rerun; post-gate job `108445446127` completed GREEN.

Tests prove:

- selector provider is called exactly once only for selector-required admission;
- its input contains only the already-selected business capability plus bounded semantic context;
- its selector is carried into the signed intent only after the second Wandora gate;
- low selector confidence fails closed before dispatch;
- malformed selector-provider confidence fails closed;
- `semantic.product_selector` latency is correlated and ephemeral;
- existing selector-less runtime remains fail-closed when no selector provider is injected.

Post-validation adversarial review:

- `complete = 0.95`;
- `verify_more = 0.01`;
- `incomplete = 0.04`;
- next gap `concrete_selector_provider = 0.98`.

## Effect boundary

```text
new migration/table = 0
new catalog/cache = 0
new provider registry = 0
new lifecycle/run state = 0
heuristic parser = 0
pre-admission ERP read = 0
concrete selector provider/client = 0
production secret/config = 0
production deploy/VPS/Compose mutation = 0
real TypeSafe/VendaERP customer call = 0
WhatsApp wiring/outbound = 0
ERP write = 0
```

Production remains **NO-GO and unchanged**.

## Next gap

**Concrete Semantic Product Selector Provider Qualification V1 — CODE ONLY / NO PRODUCTION EFFECT.**

Qualify one replaceable provider capable of bounded string extraction behind `SemanticSelectorProvider`.

That future slice must prove:

- exact supported API/schema;
- authentication and credential custody;
- tenant/context minimization;
- strict typed response validation;
- timeout and retry semantics;
- malformed/ambiguous response fail-closed;
- no provider-specific contract leakage;
- disabled-by-default runtime composition only after qualification.

Do not wire WhatsApp until concrete selector origination is qualified and a later effect-authorizing preflight is GREEN.
