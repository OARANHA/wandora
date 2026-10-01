# ADR 0292 — Concrete Semantic Product Selector Provider Qualification V1

Status: **QUALIFIED / 16/16 PR WORKFLOWS GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0290 qualified the provider-neutral product selector carried by the signed `wfri1` Fast Read intent:

```text
{ kind: "product", by: "name" | "code" | "barcode", value: bounded-string }
```

ADR 0291 then proved that the current TypeSafe/System One 0.2.0 contract can route and score bounded choices but cannot originate an arbitrary product selector string. It therefore introduced only the Wandora-owned `SemanticSelectorProvider` replacement boundary and left the concrete implementation deliberately absent.

This slice qualifies one concrete provider implementation behind that boundary. It is **CODE ONLY / NO PRODUCTION EFFECT**.

ADR 0168 remains controlling:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW before execution

Repository reconciliation proved:

- canonical `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 was open, draft and mergeable at `0ad47604941c8029919c07d1edf4413094ebed30`;
- that exact starting head had 16/16 PR workflows GREEN;
- PR #370 remained open/draft/mergeable and documentation-only;
- ADR 0291 was the latest canonical checkpoint on PR #369;
- no runtime/VPS reconciliation was required because this slice is repository/CI scoped.

The current Core also proved an important reuse opportunity:

- `apps/core` already depends on `@mastra/core@1.66.0` and `zod@4.6.4`;
- the existing supervised model runtime already uses Mastra `Agent` with Mistral;
- its approved model is `mistral-small-2603`;
- it already uses Zod-backed `structuredOutput`, `maxRetries: 0` and a bounded abort timeout.

Therefore the gap was not a missing LLM subsystem. The gap was one narrow selector adapter behind the already-qualified Wandora contract.

## Official provider evidence

### TypeSafe/JEV remains routing-only for this need

Official TypeSafe OpenAPI 0.2.0 at:

`https://api.typesafe.ai/openapi.json`

continues to expose System One typed decisions through Noul, Choice and Score. It does not expose an arbitrary-string extraction primitive. ADR 0291 therefore remains valid and TypeSafe/JEV is not modified or bypassed by assumption.

### Mistral Small 4 supports schema-constrained extraction

Official Mistral documentation current on 2026-09-26 identifies:

- model: **Mistral Small 4**;
- model id: `mistral-small-2603`;
- GA version: `v26.03`;
- Chat Completions: `/v1/chat/completions`;
- Structured Outputs: supported.

Official Custom Structured Outputs documentation states that a caller can supply a JSON schema and that Pydantic, Zod or JSON Schema may define the expected result structure. The response is constrained to that structure.

The Mistral Chat API uses Bearer authentication. Rate/provider uncertainty may surface as request failure including rate-limit responses. This adapter deliberately performs **zero retries** so semantic admission remains bounded and fail-closed.

Sources reviewed:

- `https://docs.mistral.ai/models/mistral-small-4-0-26-03`
- `https://docs.mistral.ai/studio/conversations/structured-output/custom`
- `https://docs.mistral.ai/api`

## Capability Authority / Reuse Gate

### Wandora-owned semantic authority

Wandora continues to own:

- `BusinessCapability`;
- `SemanticSelector` / product selector meaning;
- `SemanticSelectorProvider` replacement contract;
- selector validation and maximum length;
- semantic admission policy;
- the rule that selector confidence/ambiguity can only narrow admission;
- the final deterministic gate;
- the signed Fast Read intent.

### Provider implementation

Mastra + Mistral are a replaceable concrete selector implementation only.

The provider may extract one bounded selector candidate. It does **not**:

- choose a new BusinessCapability;
- authorize Fast Read;
- bypass the Wandora gate;
- query the ERP;
- rank products;
- perform fuzzy matching;
- create product state.

### Paperclip operational authority remains unchanged

Paperclip remains authority for:

- run lifecycle;
- Tool Gateway authorization/execution/audit;
- Connections, grants, secrets and policies;
- terminal run state/result.

### VendaERP remains the business-system provider

VendaERP is not used by the selector provider. There is no pre-admission product read and no candidate-list fetch.

### Reused instead of created

Reused:

- `@mastra/core`;
- existing Mistral provider configuration shape;
- existing approved Mistral Small 4 model id;
- Zod;
- existing timeout / zero-retry model-runtime pattern;
- `SemanticSelectorProvider`;
- `canonicalSemanticSelector`;
- existing Human Fast Read missing-selector composition and final Wandora gate.

Not created:

- second LLM subsystem;
- direct Mistral HTTP client;
- OpenAI/Anthropic/other vendor client;
- provider registry;
- product catalog/cache;
- selector table;
- lifecycle/run mirror;
- retry engine;
- orchestration layer;
- ERP candidate lookup;
- fuzzy matcher/parser;
- production secret/config.

## Decision

Qualify:

`MastraMistralSemanticSelectorProvider`

behind the existing:

`SemanticSelectorProvider`.

The concrete provider uses the already-present Mastra abstraction and Mistral Small 4 rather than adding a second vendor/client subsystem.

### Bounded provider input

Although `SemanticSelectorInput` contains organization and employee semantic context for the Wandora boundary, the provider network prompt receives only:

- trimmed customer request;
- already-selected `BusinessCapability`.

It deliberately omits:

- organization id;
- employee id;
- actor id;
- Paperclip ids;
- connection/grant state;
- ERP data;
- credentials beyond the provider credential itself.

Customer request length remains bounded to 12,000 characters.

### Strict output schema

The provider accepts only:

```text
{
  selector:
    | { kind: "product", by: "name" | "code" | "barcode", value: string<=512 }
    | null,
  confidence: number 0..1,
  ambiguity:
    | "none"
    | "missing_entity"
    | "multiple_matches"
    | "vague_reference"
    | "unknown"
}
```

The schema is strict. Unknown selector fields such as `sku` are rejected.

Semantic coherence is also enforced:

- non-null selector requires `ambiguity = "none"`;
- null selector cannot claim `ambiguity = "none"`.

The result then passes through the existing canonical selector validation before crossing the Wandora contract.

### Extraction rules

The provider instructions explicitly prohibit:

- invention;
- fuzzy matching;
- product ranking;
- product expansion;
- translation as normalization;
- case normalization;
- external catalog lookup.

Only surrounding whitespace is semantically normalized.

Multiple product identities or vague references return no selector with a blocking ambiguity class.

### Timeout and retry policy

Bounds:

- default timeout: 3000 ms;
- minimum: 250 ms;
- maximum: 10000 ms;
- provider retries: **0**;
- agent steps: **1**;
- tools: **0**;
- ERP calls: **0**;
- maximum structured output budget: 200 tokens.

The implementation uses an explicit `AbortController` + timer and always clears the timer.

Provider exceptions, timeout and malformed output fail closed.

## Second adversarial review

Before implementation, an independent JEV review challenged whether this introduced a new unnecessary LLM subsystem or duplicated specialist authority.

Initial routing review:

- `proceed_fast = 0.70`;
- `deep_review = 0.28`;
- `split_task = 0.01`;
- `block = 0.01`.

A focused second pass selected:

- `reuse_mastra_mistral = 0.97`;
- `provider_only = 1.00`.

The review therefore rejected:

- a new direct Mistral client;
- a new vendor SDK/client;
- runtime wiring in this slice;
- WhatsApp wiring in this slice.

The implementation stayed provider-only.

## Implementation

Added:

- `apps/core/src/semantic-routing/mastra-mistral-selector-provider.ts`;
- `apps/core/test/mastra-mistral-semantic-selector-provider.test.ts`.

Updated:

- `.github/workflows/semantic-fast-read-ci.yml` so the concrete provider tests are an explicit Fast Read qualification gate.

No `runtime/main.ts`, production Compose, production secret path or VPS configuration was changed.

## Tests

Focused concrete-provider tests prove:

- product extraction by name;
- product extraction by code;
- product extraction by barcode;
- only request + capability cross the generator boundary;
- ambiguous product input returns no selector;
- no product selector returns `missing_entity`;
- malformed structured output fails closed;
- invalid confidence fails closed;
- selector over 512 chars fails closed;
- unsupported selector field fails closed;
- selector/ambiguity inconsistency fails closed;
- provider exception fails closed with one call and zero retry;
- timeout fails closed with one call and zero retry;
- unsupported BusinessCapability fails before provider invocation;
- invalid API-key/timeout constructor configuration fails closed.

Existing Human Fast Read tests continue to prove:

- selector provider is invoked only after `missing-selector`;
- selector confidence cannot loosen route confidence;
- selector ambiguity blocks;
- the Wandora gate reruns after selector composition;
- signed intent is emitted only after the final gate.

Existing VendaERP Fast Read tests continue to prove:

- exactly one authorized product read;
- no first-row trust;
- exact deterministic post-filter;
- no second ERP call;
- no tool call when price lacks an authorized selector.

## Validation

The first implementation head exposed one legitimate Core CI issue: the timeout test used `AbortSignal.timeout()`, whose internal timer did not keep the Node test event loop alive when the synthetic generator was otherwise pending. This caused later tests to be cancelled even though their assertions had not failed.

The fix changed the adapter to the same explicit timeout pattern already used by the qualified TypeSafe provider:

- `AbortController`;
- `setTimeout(() => abort())`;
- `clearTimeout(...)` in `finally`.

No gate or timeout semantics were weakened.

Final qualified code head:

`7d0aaf1e6581bb9aac97b129d88ac710362bd777`

Validation on that head:

- **16/16 PR workflows GREEN**;
- Semantic Fast Read CI `36258479880` — GREEN;
- Core CI `36258479851` — GREEN;
- the original Core Candidate Artifact finished before the primary gates and therefore was not counted;
- after Semantic Fast Read CI + Core CI were GREEN, the Candidate job was rerun;
- post-gate Core Candidate job `108450267362` — GREEN.

Post-validation adversarial completion review:

- `complete = 0.92`;
- `verify_more = 0.05`;
- `incomplete = 0.03`.

## Production boundary

This ADR does **not** authorize:

- runtime composition of the selector provider;
- creation/mounting of a live Mistral selector credential;
- production provider calls;
- VendaERP calls;
- WhatsApp wiring/outbound;
- deploy;
- VPS or Compose mutation;
- migration;
- ERP write.

`WANDORA_SEMANTIC_FAST_READ_ENABLED` remains disabled by default.

Production remains:

**PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

## Next gap

The next minimum slice is:

**Concrete Semantic Product Selector Provider Runtime Wiring V1 — CODE ONLY / NO PRODUCTION EFFECT**

That slice should reuse the existing file-backed Mistral credential custody already used by the supervised model runtime if and only if the runtime boundary can do so without conflating independent enablement/purpose. It must:

- compose `MastraMistralSemanticSelectorProvider` into `HumanDigitalEmployeeFastReadService`;
- remain disabled by default;
- keep selector provider activation independent and fail-closed;
- introduce no new provider subsystem;
- prove config/custody/readiness behavior with tests;
- make no live provider/customer/ERP/WhatsApp call.

Do **not** wire WhatsApp until the concrete selector runtime composition is qualified and a later effect-authorizing convergence preflight is GREEN.
