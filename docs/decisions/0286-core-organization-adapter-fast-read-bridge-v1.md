# ADR 0286 — Core Organization Adapter Fast Read Bridge V1

Status: **QUALIFIED / CORE BRIDGE GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0285 qualified the provider-side Organization Adapter 0.5.0 candidate for ephemeral BusinessCapability projection and bounded synchronous Fast Read, while intentionally leaving production on Paperclip v2026.916.0 and blocking candidate activation.

The remaining Core gap was not another lifecycle or execution subsystem. Core needed a Wandora-owned, provider-neutral bridge that could:

1. obtain the ephemeral BusinessCapability projection available to one already-bound digital employee; and
2. dispatch one signed deterministic Fast Read and receive only the bounded semantic result required by the customer admission service.

ADR 0168 remains mandatory: portability is contract decoupling, not duplication of specialist-provider implementation.

ADR 0276 remains authoritative for semantic decision provider wiring: a concrete Core -> JEV/TypeSafe client is not qualified until its network, authentication and credential-custody boundary is proven.

## Decision

Qualify **Core Organization Adapter Fast Read Bridge V1** as code-only architecture.

### Wandora-owned contract

`OrganizationAdapterFastReadBridge` is provider-neutral and exposes only:

- Wandora organization id;
- authenticated actor user id;
- Wandora digital employee id;
- Wandora BusinessCapability values;
- Wandora correlation id;
- signed FastReadIntent token;
- customer request;
- bounded deterministic result `{model, summary, usage}`.

The public Fast Read bridge does not expose Paperclip, `agentRuns`, webhook URLs, Tool Gateway internals, provider credentials or provider run identity.

`OrganizationAdapterProvider.provider` is no longer typed as the literal `'paperclip'`; the provider implementation remains free to identify itself internally without making Paperclip part of the Wandora contract.

### Existing authorization and binding reuse

`OrganizationAdapterService` reuses the existing owner/admin authorization and exact active employee/hire/provider binding validation. It does not create a Fast Read registry, lifecycle, run table, result mirror or provider-state cache.

The bridge only calls the provider after the existing Wandora employee is proven to be active, hired, bound to the organization control-plane provider and bound to the exact managed employee reference.

### Paperclip implementation boundary

Only the Paperclip provider/runtime adapter knows the concrete webhook transport.

It reuses:

- the existing company-scoped Organization Adapter HMAC secret resolver/custody;
- the existing signed request shape;
- the existing 5 second transport timeout;
- fail-closed uncertain behavior;
- the already-qualified `employee-capabilities` and `employee-fast-read` webhooks.

The runtime adapter derives those sibling webhook URLs from the already-configured canonical Organization Adapter plugin route. No new environment variable or new secret custody was introduced.

The provider validates the Paperclip Fast Read `runId` only as provider-response correlation evidence and strips it before returning the Wandora-owned result.

### Human Fast Read service

`HumanDigitalEmployeeFastReadService` now consumes the canonical Organization Adapter bridge contract for both capability projection and Fast Read dispatch.

`SemanticDecisionProvider` remains injected. No concrete JEV/TypeSafe runtime implementation is introduced by this ADR.

## Reuse Gate

No new durable state is justified.

Semantic authority remains Wandora-owned through the finite BusinessCapability vocabulary and deterministic Fast Read policy.

Operational authority remains Paperclip-owned for run lifecycle, Connections/grants/secrets/catalog/profiles, Tool Gateway authorization/audit and terminal run state.

Provider implementation remains Paperclip Organization Adapter 0.5.0 plus the separately qualified Paperclip v2026.916.1 provider deltas.

Replacement boundary is the Organization Adapter provider implementation, not a duplicated Wandora execution engine.

## Second adversarial review

Before relevant execution, JEV 1.13.0 routed the proposed bridge as `proceed_fast` with probability 0.67, versus 0.30 `deep_review`.

The implementation was therefore kept narrow:

- no new table/migration;
- no new lifecycle/state machine;
- no provider credential in Core;
- no Core polling of Paperclip;
- no direct Paperclip DB read;
- no concrete SemanticDecisionProvider client;
- no production effect.

After exact-head validation, JEV completion review returned `complete` with probability 0.96.

## Validation

Qualification code head:

`3ca3800adf9fdef3478d43b1fb6044e02e073aab`

All 16 PR workflows on that head completed GREEN.

Key evidence:

- Semantic Fast Read CI run `36228374257` — GREEN, including Core typecheck, focused Fast Read bridge tests, adapter contract tests, Organization Adapter package qualification and disposable Semantic Fast Read E2E.
- Core CI run `36228374350` — GREEN.
- Core Candidate Artifact run `36228374169`, **attempt 2** — GREEN after Semantic Fast Read CI and Core CI completed.
- Organization Adapter Plugin CI — GREEN.
- Integration Capability Projection CI — GREEN.
- Paperclip OpenAPI Compatibility — GREEN.
- Paperclip 916.1 OpenAPI Candidate CI — GREEN.
- Paperclip Synchronous Webhook Response CI — GREEN.
- Paperclip Host Operational Read Extension CI — GREEN.
- Paperclip Fast Read Run Result Read CI — GREEN.
- Paperclip Fast Read Patch Composition CI — GREEN.
- Paperclip Mastra Adapter CI — GREEN.

The first Core CI execution exposed a stale rehearsal assertion that still required Organization Adapter `0.4.0`. ADR 0285 had already qualified `0.5.0`. The rehearsal was reconciled to the canonical 0.5.0 candidate without relaxing any activation, custody, no-work-on-activation or fail-closed guardrail; the exact next head then passed Core CI.

Tests prove at least:

- valid canonical capability projection;
- unavailable capability fails closed;
- valid Fast Read returns the deterministic bounded result;
- nonzero token usage is rejected even with the correct deterministic model;
- malformed provider capability/result payloads fail closed;
- transport/provider uncertainty fails closed under the existing timeout boundary;
- Core performs one bridge dispatch and introduces no retry/second execution;
- Paperclip run identity does not cross the Wandora-owned Fast Read result contract.

## Production state

Production is unchanged and remains **NO-GO** for this candidate.

This ADR does not authorize:

- Paperclip production upgrade;
- Organization Adapter 0.5.0 production activation;
- deploy or compose mutation;
- migration;
- VPS mutation;
- VendaERP real call;
- provider/model real call;
- outbound/customer work.

Production remains on Paperclip v2026.916.0 and the previously installed Organization Adapter baseline until a separately reviewed convergence/activation decision.

## Next gap

The remaining blocker to complete the customer Fast Read admission path is the **concrete SemanticDecisionProvider boundary**.

Next work must first qualify the ADR 0276 boundary for JEV/TypeSafe:

- exact network/API surface;
- authentication mechanism;
- secret/credential custody;
- tenant/request isolation;
- timeout and fail-closed semantics;
- bounded provider-neutral decision response;
- no reuse of the post-Issue advisory Paperclip semantic-decision plugin as a pre-Issue customer admission provider.

Only after that evidence is GREEN may Core instantiate the already-injected `SemanticDecisionProvider` and wire the customer Fast Read service in runtime.

