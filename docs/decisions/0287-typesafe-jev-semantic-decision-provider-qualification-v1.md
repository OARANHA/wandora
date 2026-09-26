# ADR 0287 — TypeSafe Jev SemanticDecisionProvider Qualification V1

Status: **QUALIFIED / TYPESAFE JEV ADAPTER GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0276 established the Wandora-owned provider-neutral `SemanticDecisionProvider` and explicitly deferred a concrete provider until network/API, authentication, credential custody and fail-closed behavior were qualified.

ADR 0286 completed the provider-neutral Core Organization Adapter Fast Read bridge and left the concrete semantic provider as the exact remaining admission blocker.

The existing `wandora-paperclip-semantic-decision-plugin` is still post-Issue/advisory and is not equivalent to the pre-Issue customer admission provider. The ChatGPT JEV MCP connector is also not a Core runtime contract.

ADR 0168 remains controlling:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Proven provider contract

The qualified provider implementation is **TypeSafe Jev through the official TypeSafe System One HTTPS API**.

Current official OpenAPI 0.2.0 proves:

- transport: HTTPS;
- endpoint: `POST https://api.typesafe.ai/v1/systemone`;
- authentication: HTTP Bearer API key;
- request: `{ model, state, questions }`;
- question types: `choice | noul | score`;
- response: `{ model, answers, usage }`;
- typed choice answers include selected choice, confidence and probabilities;
- noul answers return a probability in `[0,1]`.

The exact model qualified by the existing TypeSafe-backed JEV review path for this slice is `jev-1.13.0`.

## Capability Authority / Reuse Gate

Semantic authority remains Wandora-owned.

TypeSafe/Jev supplies probabilistic judgments only. It does not define:

- the Wandora `BusinessCapability` vocabulary;
- customer authorization;
- deterministic Fast Read thresholds;
- whether a provider-supplied mode is sufficient to dispatch work;
- Paperclip lifecycle, tools, grants, secrets or audit.

No table, migration, provider registry, lifecycle, runtime memory, retry subsystem, result mirror or provider execution store is introduced.

## Concrete adapter

`TypeSafeJevSemanticDecisionProvider` implements the existing interface without changing it.

One provider call asks six bounded questions:

1. execution mode;
2. one advertised business capability or `none`;
3. whether current business data/tool lookup is needed;
4. whether more context is needed;
5. whether human review is needed;
6. ambiguity class.

The provider receives only:

- the bounded customer request;
- the finite list of currently advertised Wandora `BusinessCapability` values.

It does **not** receive Wandora organization id, employee id, actor id, Paperclip ids, provider bindings, credentials or Tool Gateway state.

The adapter maps the typed provider answer into `SemanticRouteDecision`. For deterministic reads the Wandora-facing confidence is the conservative minimum of mode confidence and selected-capability confidence. The existing Wandora `gateDeterministicRead` remains the authoritative admission gate.

Provider identity/model are confined to optional `providerEvidence` and do not change the Wandora contract.

## Authentication and credential custody

The provider uses the TypeSafe Bearer API key.

This slice does not create or mount a production secret and does not add a new secret subsystem. The adapter receives the API key by constructor injection, matching the existing Wandora pattern where runtime configuration owns file-backed secret custody and providers receive the resolved secret.

Actual production secret-file wiring remains a later runtime-wiring effect and requires its own exact config/Compose qualification before activation.

## Isolation, limits, timeout and retry

Tenant/request isolation is fail-closed and stateless:

- one semantic admission creates at most one TypeSafe request;
- organization/employee identifiers are intentionally omitted from provider state;
- no cross-request provider session/state is created by the adapter.

Client bounds:

- customer request maximum: 12,000 characters;
- available capabilities: finite canonical Wandora set, unique;
- response maximum: 64 KiB;
- default whole-request timeout: 3 seconds;
- timeout override accepted only in the bounded 250 ms..10 s range;
- retries: **0**.

Network error, timeout, non-200 response, invalid JSON, oversized response, malformed answer, unknown mode/capability/ambiguity or invalid probabilities all fail closed before Paperclip Fast Read dispatch.

## Observability / audit boundary

The adapter itself introduces no durable provider audit store.

Allowed evidence is the existing Wandora request correlation plus bounded provider evidence `{ provider: "typesafe-jev", model }`. API key, raw provider payload and provider-internal identifiers must not cross the Wandora semantic contract or be persisted by this adapter.

## Replacement boundary

If TypeSafe/Jev is replaced:

- `SemanticDecisionProvider`, `SemanticDecisionInput`, `SemanticRouteDecision`, `BusinessCapability`, route policy and deterministic gate remain unchanged;
- only this provider adapter, its credential binding and provider-specific tests/configuration are replaced.

No provider execution state must be migrated into Wandora.

## Second adversarial review

Before implementation, the TypeSafe-backed JEV 1.13.0 review returned:

- `proceed_fast`: 0.56;
- `deep_review`: 0.34;
- `block`: 0.09;
- `split_task`: 0.01.

The implementation therefore remained intentionally narrow: adapter + fixtures/tests + documentation only, with no runtime wiring or production effect.

## Validation

Exact implementation head: `e4b044c5efbdf25ba50f181764b55c2a3782fd6d`.

All **16/16 PR workflows are GREEN** on that head under the ADR 0158 GitHub-hosted CI boundary.

Key runs:

- Semantic Fast Read CI `36230335382` — GREEN;
- Core CI `36230335422` — GREEN;
- Core Candidate Artifact `36230335359`, **attempt 2** — GREEN after Semantic Fast Read CI and Core CI completed;
- Paperclip Fast Read Run Result Read CI `36230335463` — GREEN;
- Paperclip OpenAPI Compatibility `36230335467` — GREEN.

The exact-head validation proves:

- Core typecheck/build/tests GREEN;
- adapter performs one exact HTTPS request with Bearer auth;
- no tenant/employee identifiers are sent;
- provider capability outside the advertised set fails closed;
- timeout performs one call and zero retries;
- non-200 response fails closed;
- oversized response fails closed;
- malformed typed answers fail closed.

The implementation is therefore **QUALIFIED** as a code-only concrete `SemanticDecisionProvider` adapter. This qualification does not authorize runtime wiring or production activation.

## Production boundary

This ADR does not authorize:

- runtime wiring of the customer Fast Read route;
- creation/mounting of a live TypeSafe API key;
- provider call from production;
- deployment or VPS mutation;
- Paperclip/Organization Adapter promotion;
- migration;
- VendaERP call;
- customer work or outbound effect.

Production activation remains **NO-GO**.

## Next gap after qualification

Wire the already-qualified provider into Core runtime behind a disabled-by-default semantic Fast Read configuration, reusing existing file-backed secret custody patterns and the ADR 0286 Organization Adapter bridge. That future slice must separately prove runtime config/secret custody, readiness/fail-closed behavior and customer route wiring before any production preflight.
