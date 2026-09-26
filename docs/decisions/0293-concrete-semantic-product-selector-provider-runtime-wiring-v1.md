# ADR 0293 — Concrete Semantic Product Selector Provider Runtime Wiring V1

Date: 2026-09-26
Status: **Accepted — QUALIFIED / 16/16 PR WORKFLOWS GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

## Context

ADR 0291 introduced the Wandora-owned `SemanticSelectorProvider` replacement boundary because the qualified TypeSafe/System One contract does not originate arbitrary product strings. ADR 0292 qualified `MastraMistralSemanticSelectorProvider` as one concrete, replaceable implementation using the existing Mastra + Mistral stack.

ADR 0292 intentionally stopped before runtime composition. Human Fast Read already accepted an optional `semanticSelectorProvider`, so the remaining gap was configuration and composition rather than a new semantic or execution subsystem.

This ADR closes only that code/runtime-composition gap. It does not authorize a production secret mount, live provider call, VendaERP call, WhatsApp wiring or deployment.

## REAL NOW

At slice start:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 was open / draft / mergeable at `2d4efc2226c96a97ff46907c910a37cc120abf8a` with 16/16 workflows GREEN;
- PR #370 remained open / draft / mergeable at `11fd59599b21493a0fe335f4c32354989a6083a2`;
- ADR 0292 was the latest canonical branch checkpoint;
- production remained NO-GO and unchanged.

No VPS/runtime mutation was required to determine this code-only slice.

## PROVEN EVIDENCE / REUSE GATE

Existing repository boundaries already provided the optional `HumanDigitalEmployeeFastReadService.semanticSelectorProvider`, the qualified `MastraMistralSemanticSelectorProvider`, the disabled-by-default Semantic Fast Read gate, and the file-backed platform model credential locator `WANDORA_MODEL_API_KEY_FILE`.

ADR 0144 classifies the credential behind `WANDORA_MODEL_API_KEY_FILE` as Wandora platform-owned when Wandora pays the model provider. The filesystem path is deployment configuration, not product/domain authority, and ADR 0144 rejects a second secret manager/provider registry for convenience.

Authority remains separated:

- Wandora: semantic selector contract, tenant authorization, confidence/ambiguity gates, signed `wfri1`, deterministic post-filter and effect policy;
- TypeSafe/JEV: replaceable route-decision implementation;
- Mastra + Mistral: replaceable structured selector extraction implementation;
- Paperclip: lifecycle, Connections/grants/secrets, Tool Gateway, terminal result and operational audit;
- VendaERP: concrete business-system read implementation.

## Decision

Add one explicit runtime gate: `WANDORA_SEMANTIC_SELECTOR_ENABLED=false` by default. Do not add a selector-provider registry or provider-selection environment variable.

When selector wiring is enabled:

- `WANDORA_SEMANTIC_FAST_READ_ENABLED` must also be enabled;
- Core reuses `WANDORA_MODEL_API_KEY_FILE` and validates it as an absolute mounted regular file;
- `WANDORA_SEMANTIC_SELECTOR_TIMEOUT_MS` defaults to 3000 ms and is bounded to 250..10000 ms;
- Core instantiates the already-qualified `MastraMistralSemanticSelectorProvider`;
- Core injects it only through the Wandora-owned optional `SemanticSelectorProvider` dependency.

When the selector gate is absent/false, no selector model credential is required and missing-selector behavior remains fail-closed.

The existing model-key validation was factored into one helper and reused by the supervised model runtime. This deduplicates validation logic without creating credential authority.

## Second adversarial review

The first independent JEV review challenged a mini provider registry and credential-purpose coupling: `deep_review=0.52`, `proceed_fast=0.48`.

The design was narrowed to one boolean gate, fixed qualified provider/model, and ADR 0144 credential reuse. The focused second review then returned `proceed_fast=0.94`, `deep_review=0.06`, `block=0`, `split_task=0`.

## Implementation

Code commit: `a44348706fc99aace844de63e0be078c2b1fe70d`.

Changed:

- `apps/core/src/runtime/config.ts`;
- `apps/core/src/runtime/main.ts`;
- `apps/core/test/runtime.test.ts`.

Runtime config now has optional `RuntimeSemanticSelectorConfig`, `WANDORA_SEMANTIC_SELECTOR_ENABLED`, and bounded `WANDORA_SEMANTIC_SELECTOR_TIMEOUT_MS`. `runtime/main.ts` instantiates the provider only when selector config exists.

## Validation

Exact code head: `a44348706fc99aace844de63e0be078c2b1fe70d`.

- Semantic Fast Read CI `36260828998` — GREEN;
- Core CI `36260828980` — GREEN;
- all 16/16 PR workflows — GREEN.

The first Core Candidate Artifact completed before the primary gates and was deliberately not counted. After both primary gates were GREEN, post-gate Core Candidate job `108457131633` completed GREEN.

Focused runtime tests prove disabled default, Semantic Fast Read dependency, model key requirement only when enabled, fixed `mastra-mistral` config, 3000 ms default timeout and fail-closed invalid timeout. Semantic Fast Read CI also passed Core typecheck, focused Fast Read tests and disposable E2E.

## Production state

**PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT.**

No VPS mutation, Compose change, production credential mount/read, live model call, VendaERP call, WhatsApp wiring/outbound, customer work, migration, ERP write or deployment occurred.

## Next slice

**Semantic Fast Read + Product Selector Production Convergence Preflight V2 — NO EFFECT.**

Reconcile exact qualified Core/Paperclip/Organization Adapter artifacts against production, prove rollback/deployment order and platform-model secret-file custody/mount plan without reading the secret value, and freeze the smallest activation/attestation sequence. WhatsApp wiring remains subsequent to a GREEN convergence/attestation path.
