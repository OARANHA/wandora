# ADR 0276 — Semantic Route + Deterministic Read Contract V1

Status: **CODE COMPLETE / NO PRODUCTION EFFECT / PROVIDER UNWIRED**  
Date: 2026-09-25

## Context

ADR 0275 established that a true semantic fast path must classify a customer request before Paperclip Issue admission and may reuse a normal Paperclip run plus the existing run-scoped Tool Gateway authorization for deterministic reads.

The current `wandora-paperclip-semantic-decision-plugin` remains post-Issue/advisory. The live `wandora-jev-mcp` exists as a separate OAuth-protected MCP service on the `wandora-edge` network, with its current operational source in the governed VPS ops-workspace. Core does not yet have a qualified versioned auth/network client boundary to that service.

This slice therefore implements only Wandora-owned provider-neutral semantics and a bounded deterministic executor. It deliberately does not create a direct TypeSafe/JEV client in Core and does not change the production Paperclip execution request shape.

## Authority / reuse gate

Preserved authority:

- Wandora owns customer-facing semantic routing meaning, business-capability vocabulary and deterministic presentation rules;
- Paperclip owns run lifecycle, Connections/grants/secrets/catalog/profiles/policies, Tool Gateway execution and audit;
- provider adapters map authorized provider tools into Wandora business capabilities;
- JEV/TypeSafe remains a replaceable semantic-decision provider;
- Mastra remains the generative runtime for agentic work.

No second tool registry, grant system, lifecycle, secret store, retry engine or persistence model is introduced.

## Implemented contract

New provider-neutral semantic concepts:

```text
SemanticExecutionMode =
  deterministic_read
  generative_reasoning
  human_review
  unknown

SemanticAmbiguity =
  none
  missing_entity
  multiple_matches
  vague_reference
  unknown
```

Business capability vocabulary:

```text
business.products.search
business.products.price
business.stock.read
business.price_tables.list
business.price_tables.products.read
business.parties.search
business.orders.search
business.companies.list
business.connection.probe
```

`SemanticDecisionProvider` is an interface only. No TypeSafe/JEV implementation is wired by this ADR.

A `SemanticRoutePolicy` is supplied by the caller; no provider threshold becomes hard-coded product truth.

## Deterministic read gate

The executor may proceed only when all conditions hold:

- mode = `deterministic_read`;
- exactly one non-null business capability is selected;
- the capability is present in the ephemeral authorized binding set;
- confidence meets policy;
- missing-context probability remains below policy;
- human-review probability remains below policy;
- data/tool lookup probability meets policy;
- ambiguity = `none`.

Otherwise it returns a fallback reason before any binding/tool call.

## Execution boundary

The deterministic executor receives only ephemeral `DeterministicReadBinding[]` values.

Each binding:

- represents one Wandora business capability;
- is expected to be derived from tools already admitted by the existing Paperclip Tool Gateway boundary;
- exposes one bounded execution function;
- is not persisted and is not a registry.

The executor selects exactly one matching capability binding. Zero or multiple bindings fail closed.

The executor performs no retry and makes no model call.

## Deterministic presentation

Normalized deterministic results are limited to:

- bounded facts;
- bounded clarification;
- bounded not-found response.

Rendering is deterministic and customer-facing. It returns model identity:

`wandora-deterministic-read-v1`

with zero token usage.

This model string is a logical execution identity, not an inference provider.

## Security decision: do not trust provider-supplied execution mode

This ADR does **not** add `executionMode=deterministic_read` to the existing Paperclip execution request.

Reason:

The semantic decision is Wandora-owned product authority. Accepting a mode/capability merely because a Paperclip adapter echoed it back would make provider-controlled payload authoritative.

The next integration slice must prove an authenticated/correlated Wandora-issued fast-read intent. A stateless signed intent is preferred if it can satisfy tenant, employee, capability, expiry and idempotency requirements without new persistence.

## Live JEV boundary

Runtime inspection proves:

- `wandora-jev-mcp:0.1.0` is healthy;
- it exposes the JEV/TypeSafe decision layer through MCP;
- it is OAuth protected;
- it runs on `wandora-edge`;
- current Core has no qualified internal client/auth dependency on it.

Therefore this ADR explicitly rejects:

- direct TypeSafe calls from Core;
- ad-hoc Core -> live JEV MCP calls;
- new credential custody in Core;
- network/auth changes merely to complete this slice.

A concrete `SemanticDecisionProvider` adapter remains a separate qualification.

## Tests

The new tests prove:

1. a high-confidence deterministic price decision executes exactly one ephemeral capability binding;
2. reported token usage is zero;
3. low confidence executes zero bindings;
4. ambiguity executes zero bindings;
5. missing capability executes zero bindings;
6. duplicate capability bindings fail closed;
7. bounded clarification renders deterministically;
8. human-review/generative/unknown modes execute zero bindings.

No network or provider is used in these tests.

## Second adversarial review

JEV initially recommended deep review.

The narrowed review strongly favored:

- provider-neutral business-capability mapping over returning concrete provider tool names;
- no concrete live JEV/TypeSafe Core adapter in this slice.

The review was less decisive about immediate request-shape integration. Independent security review identified the stronger issue: the existing Paperclip adapter request cannot become authority for a Wandora semantic decision without an authenticated Wandora-origin intent.

Therefore integration into the live execution handler is deferred.

## Effect boundary

```text
new migration/table = 0
production mutation = 0
Paperclip mutation = 0
VendaERP call = 0
JEV/TypeSafe production call = 0
Mastra/model call = 0
customer work = 0
outbound = 0
```

## Next slice

**Semantic Fast Read Intent + Disposable Paperclip Attestation V1 — CODE ONLY / NO PRODUCTION EFFECT**

Required proof:

1. Wandora issues an authenticated/correlated fast-read intent;
2. Paperclip on-demand run can carry only that intent reference/token;
3. Core verifies the intent before deterministic execution;
4. existing Tool Gateway supplies the ephemeral authorized tools;
5. provider adapter maps those tools to Wandora business capabilities;
6. exactly one synthetic read executes;
7. no Paperclip Issue is created;
8. no Mastra/model call occurs;
9. run reaches a terminal state;
10. duplicate idempotency does not re-execute.

ADR 0276 is **CODE COMPLETE / NO PRODUCTION EFFECT / PROVIDER UNWIRED**.
