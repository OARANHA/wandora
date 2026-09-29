# ADR 0290 — ProRevest Product Selector + Price Fast Read V1

Status: **QUALIFIED / 16/16 PR WORKFLOWS GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0289 proved a specific commercial gap before WhatsApp could legitimately enter Semantic Fast Read: the Organization Adapter already projected `business.products.price`, while Core's VendaERP Fast Read adapter only exposed generic product search and invoked `vendaerp_search_products` with `{ pageSize: 5, skip: 0 }`, ignoring the product requested by the customer.

The existing read-only VendaERP tool already supports bounded product filters and already normalizes `salePrice`. The gap was therefore semantic authorization of product identity/query, not a missing price service or provider endpoint.

Permanent guardrail:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

This slice is **CODE ONLY / NO PRODUCTION EFFECT**.

## REAL NOW before execution

Repository/GitHub reconciliation proved:

- canonical `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 open, draft and mergeable at pre-slice head `1b93c38606808e395a726e559f811f02c95eb607`;
- that pre-slice head had 16/16 workflows GREEN;
- PR #370 remained open/draft/mergeable at `11fd59599b21493a0fe335f4c32354989a6083a2` with four triggered workflows GREEN;
- ADR 0289 was the latest checkpoint on PR #369;
- no VPS/runtime reconciliation was required because the slice was repository/CI scoped.

The current code proved:

- `SemanticRouteDecision` had no structured selector;
- `TypeSafeJevSemanticDecisionProvider` asked only typed mode/capability/probability/ambiguity questions and could not be claimed to return an arbitrary structured product identity;
- `FastReadIntent` already authenticated organization, employee, capability, correlation, request digest and expiry;
- `vendaerp_search_products` already accepted `code`, `name` and `barcode`-style semantic inputs behind its provider adapter and returned normalized `salePrice`;
- Paperclip projection already mapped `vendaerp_search_products` to `business.products.search` and `business.products.price`.

## Capability Authority / Reuse Gate

### Wandora-owned semantic authority

Wandora owns:

- provider-neutral product-selector meaning;
- semantic decision and admission;
- the rule that product price requires an authorized product selector;
- Fast Read intent signing/verification;
- deterministic customer-safe normalization/presentation.

### Paperclip operational authority

Paperclip remains authority for:

- issue-less run lifecycle;
- Tool Gateway session and authorized tool set;
- Connections, grants, secrets and policies;
- exact tool execution/audit;
- terminal run state/result.

### Provider implementation

VendaERP remains one concrete read-only business-system provider.

The existing `vendaerp_search_products` tool remains the implementation used by this slice.

### Explicitly rejected

This slice creates no:

- product/price service;
- new provider tool or endpoint;
- second price lookup;
- price-table fallback;
- selector/query table;
- registry;
- lifecycle/run mirror;
- retry engine;
- fuzzy ranker;
- raw-text parser inside Core's VendaERP adapter;
- direct provider-specific field in the customer semantic contract.

## Decision

### 1. Minimum product selector contract

Add one provider-neutral selector:

```ts
type ProductSelector = {
  kind: 'product';
  by: 'name' | 'code' | 'barcode';
  value: string;
};
```

The value is trimmed and bounded to 512 characters.

Multiple simultaneous filters, category/brand filters and provider tool arguments are intentionally excluded from V1.

### 2. Selector is part of semantic admission

`SemanticRouteDecision` may carry the selector.

`business.products.price` requires a valid product selector. Missing or malformed selectors fail closed before Fast Read dispatch.

A selector attached to an unrelated capability also fails closed.

Generic `business.products.search` without a selector preserves the already-qualified bounded first-page behavior.

### 3. Cryptographic binding through existing FastReadIntent

Keep `wfri1` backward compatible.

When a selector is present, the canonical selector is included in the existing HMAC-signed intent payload. Existing selector-less search intents remain valid.

The raw request digest remains independently bound.

No selector field is added to Organization Adapter/Paperclip transport because the opaque signed intent already carries the authority. Core obtains the selector only after verifying the intent.

### 4. Deterministic execution receives only the verified selector

The ephemeral deterministic binding gains a selector parameter.

`PaperclipFastReadExecutionService` passes `intent.selector` only after:

1. Paperclip run identity resolution;
2. Fast Read HMAC verification;
3. exact organization/employee/correlation/request-digest checks;
4. Tool Gateway authorization.

The VendaERP adapter therefore does not derive execution parameters from raw customer text.

### 5. Reuse the existing product read for price

`createVendaErpFastReadCapabilityAdapter()` maps the exact tool `vendaerp_search_products` to:

- `business.products.search`;
- `business.products.price`.

It deliberately does **not** map `vendaerp_search_price_table_products` into this V1, avoiding duplicate price bindings and a second provider read.

Selector-aware invocation uses exactly one filter:

- `name`;
- `code`; or
- `barcode`;

plus:

```json
{ "pageSize": 5, "skip": 0 }
```

### 6. Never trust the first provider row

Provider search exact-match semantics are not assumed.

After the one read returns, Core deterministically checks the normalized selected field:

- product names use Unicode NFKC, whitespace normalization and pt-BR case normalization;
- code and barcode require exact string equality.

Then:

- zero exact matches -> bounded not-found;
- multiple exact matches -> bounded clarification;
- exactly one exact match -> deterministic facts;
- price requires a finite normalized `salePrice`, otherwise bounded price-unavailable response.

No fuzzy ranking or second read exists.

## Concrete TypeSafe/JEV limitation

The current qualified `TypeSafeJevSemanticDecisionProvider` was **not** modified.

Its proven System One contract still produces only:

- execution mode;
- BusinessCapability choice;
- lookup/context/human-review probabilities;
- ambiguity;
- bounded provider evidence.

There is no proven arbitrary structured product-selector answer in ADR 0287.

Therefore a live TypeSafe price decision without a selector now returns `missing-selector` before dispatch. This is intentional fail-closed behavior, not an incomplete adapter workaround.

Disposable/injected semantic-provider tests may emit a selector to qualify the downstream contract, but that does not claim the production provider can do so.

## Second adversarial review

The first focused design review selected with probability 1.00:

- selector authority: existing signed FastReadIntent;
- selector shape: one provider-neutral product key/value;
- current TypeSafe gap: qualify contract + disposable proof while live provider remains fail-closed;
- price implementation: reuse `vendaerp_search_products`.

Overall execution was initially close to `deep_review`, so execution did not start on that result.

A second focused pass then selected:

- optional backward-compatible `wfri1` selector claim: 1.00;
- missing selector -> semantic fallback before dispatch: 1.00;
- exact post-filter instead of first-row trust/fuzzy ranking: 1.00;
- map price operationally but require semantic selector: 1.00;
- narrowed code-only execution: `proceed = 0.92`.

## Implementation

Exact qualification code head:

`7898dfc7e664185d872ad0e8fc6cefc3efcc2d12`

Changed code/test surfaces include:

- `apps/core/src/semantic-routing/contracts.ts`;
- `apps/core/src/semantic-routing/fast-read-intent.ts`;
- `apps/core/src/agent-runtime/deterministic-read.ts`;
- `apps/core/src/agent-runtime/runtime-read-capability-binding.ts`;
- `apps/core/src/paperclip-execution/fast-read.ts`;
- `apps/core/src/business-system/vendaerp-fast-read.ts`;
- focused Core tests;
- disposable Semantic Fast Read E2E fixture;
- Semantic Fast Read CI focused VendaERP test inclusion.

No Organization Adapter webhook/request schema, Paperclip lifecycle implementation, database schema, Compose or production configuration changed.

## Validation

Exact code head `7898dfc7e664185d872ad0e8fc6cefc3efcc2d12` completed **16/16 PR workflows GREEN**.

Key evidence:

- Semantic Fast Read CI `36239607985` — GREEN:
  - Core typecheck GREEN;
  - focused Fast Read Core tests GREEN;
  - VendaERP selector+price tests GREEN;
  - adapter contract tests GREEN;
  - Organization Adapter package qualification GREEN;
  - dedicated disposable Semantic Fast Read E2E GREEN.
- Core CI `36239607974` — GREEN.
- VendaERP Read-Only MCP CI `36239608018` — GREEN.
- Paperclip Mastra Adapter CI `36239608035` — GREEN.
- Paperclip OpenAPI Compatibility `36239608015` — GREEN.
- all retained Paperclip Fast Read provider-patch gates GREEN.

Core Candidate Artifact run `36239607989` completed early on its first attempt. It was deliberately rerun only after Semantic Fast Read CI + Core CI were GREEN. Attempt 2 job `108398239115` completed GREEN.

The focused product-price proof shows:

- requested selector is signed and reaches execution only after verification;
- exactly one authorized `vendaerp_search_products` call;
- query input contains the authorized selector rather than parsed raw request;
- first returned row is not trusted;
- exact requested product is selected from normalized returned rows;
- its normalized `salePrice` is rendered deterministically;
- zero/multiple matches remain bounded and non-agentic;
- no second provider call;
- no model/token usage in the disposable Fast Read path.

This is a code/disposable proof. It is **not** live VendaERP customer price evidence.

Post-validation JEV completion review selected `complete` with probability 0.77 while retaining the concrete semantic-provider selector gap as the next prerequisite.

## Effect boundary

```text
new table/migration = 0
new product/price service = 0
new provider tool = 0
new registry = 0
new lifecycle/run mirror = 0
production deploy = 0
VPS/Compose mutation = 0
live TypeSafe secret/provider call = 0
live VendaERP call = 0
customer work = 0
WhatsApp outbound = 0
ERP write = 0
```

`WANDORA_SEMANTIC_FAST_READ_ENABLED` remains disabled by default.

Production remains **NO-GO**.

## Next minimum preflight

**Semantic Product Selector Provider Qualification V1 — CODE ONLY / NO PRODUCTION EFFECT.**

Before WhatsApp wiring, prove the current TypeSafe/System One boundary's real supported answer shapes for producing the bounded Wandora product selector.

If the current provider cannot return that structure, define/qualify the smallest provider-neutral semantic-provider extension. Do not compensate with:

- Core regex/heuristic parsing;
- VendaERP adapter parsing;
- a provider-specific semantic contract;
- a second ERP read merely to infer the selector.

Only after selector origination is GREEN should a later separately governed slice consider WhatsApp ingress -> Semantic Fast Read -> real read-only product+price -> bounded outbound.

Quote V1 remains later and must use deterministic arithmetic over qualified product/price facts with no ERP write.
