# ADR 0288 — SemanticDecisionProvider Runtime Wiring V1

Status: **QUALIFIED / RUNTIME WIRING GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0287 qualified the concrete pre-Issue `TypeSafeJevSemanticDecisionProvider` behind the Wandora-owned `SemanticDecisionProvider`, while deliberately leaving runtime composition and live secret custody unwired.

ADR 0286 had already qualified the provider-neutral `OrganizationAdapterFastReadBridge` and `HumanDigitalEmployeeFastReadService`. The authenticated Human API Fast Read route already existed but remained unavailable because no concrete semantic provider/service was supplied by `runtime/main.ts`.

ADR 0168 remains controlling:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

This slice is code-only. It does not authorize production activation, provider calls, VendaERP calls, WhatsApp outbound, deploy, Compose mutation, migration, VPS mutation or production secret creation/movement.

## REAL NOW before execution

Repository reconciliation proved:

- canonical `main = 8d6a65f519de5c1c49607314b49968af608c7164` (ADR 0283);
- PR #369 remained open, draft and mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- pre-slice PR #369 head was `cd28886c41f455ede95ddaa9711643e0476a0704`, with all 16 PR workflows GREEN;
- PR #370 remained open/draft as a documentation-only product/priority checkpoint; its four triggered workflows were GREEN;
- the newest qualified JEV boundary on PR #369 was ADR 0287.

No VPS/runtime mutation was needed for this slice because all required evidence was repository/CI scoped.

## Proven gap

The qualified pieces existed independently, but Core runtime did not compose them:

- `TypeSafeJevSemanticDecisionProvider` existed and was tested;
- `HumanDigitalEmployeeFastReadService` existed and consumed the ADR 0286 bridge;
- `createHumanSupervisionHandler(...)` already accepted the Fast Read service as its final optional dependency;
- the authenticated Fast Read route already existed;
- `PaperclipFastReadExecutionService` was already wired behind `WANDORA_FAST_READ_EXECUTION_ENABLED`;
- `runtime/config.ts` had no semantic Fast Read / TypeSafe runtime binding;
- `runtime/main.ts` instantiated neither the TypeSafe provider nor the human Fast Read admission service.

The gap was therefore composition/configuration, not a missing lifecycle, registry, orchestration system or Paperclip capability.

## Capability Authority / Reuse Gate

### Reused Wandora-owned semantics

- `SemanticDecisionProvider`;
- `BusinessCapability`;
- `SemanticRoutePolicy` and `gateDeterministicRead`;
- signed `FastReadIntent`;
- authenticated Human API/session and owner/admin admission;
- `OrganizationAdapterFastReadBridge`;
- `HumanDigitalEmployeeFastReadService`;
- existing file-backed runtime secret-custody pattern.

### Reused specialist operational authority

Paperclip remains authority for:

- digital-workforce/run lifecycle;
- Connections, grants and operational secrets;
- tool catalog/profile/policy application;
- Tool Gateway authorization/execution/audit;
- terminal run result;
- Organization Adapter operational capability projection and Fast Read dispatch.

TypeSafe/JEV remains a replaceable probabilistic semantic provider only.

### Explicitly not created

This slice creates no:

- table or migration;
- lifecycle/run-state machine;
- tool registry;
- Connection/grant/health mirror;
- Paperclip result mirror;
- secret store;
- retry subsystem;
- orchestration subsystem;
- runtime memory/RAG/vector subsystem;
- provider execution store;
- production credential.

## Decision

Qualify the smallest runtime composition boundary.

### Disabled-by-default activation

Add:

`WANDORA_SEMANTIC_FAST_READ_ENABLED`

Default is `false`.

When enabled, Core requires the already-existing:

- Human API;
- Organization Adapter;
- Fast Read Execution.

Fast Read Execution already requires the Paperclip Execution Bridge, so no second dependency chain is introduced.

### TypeSafe credential binding

When semantic Fast Read is enabled, runtime loads:

`WANDORA_TYPESAFE_JEV_API_KEY_FILE`

through the existing file-backed custody pattern:

- absolute path;
- mounted regular file;
- trimmed API key;
- 20..4096 characters;
- no whitespace.

No production file is created or mounted by this ADR.

The provider timeout is bounded through:

`WANDORA_TYPESAFE_JEV_TIMEOUT_MS`

with ADR 0287 semantics:

- default 3000 ms;
- minimum 250 ms;
- maximum 10000 ms;
- zero retries remain inside the provider implementation.

### Wandora-owned routing policy

Runtime supplies the V1 policy to the already-qualified service:

- minimum confidence = 0.90;
- maximum needs-more-context = 0.10;
- maximum needs-human-review = 0.10;
- minimum needs-data/tool-lookup = 0.90.

These are Wandora caller policy, not provider truth. This slice intentionally does not add four new operational environment knobs.

### Runtime composition

When all dependencies are present, `runtime/main.ts`:

1. instantiates the qualified `TypeSafeJevSemanticDecisionProvider`;
2. instantiates `HumanDigitalEmployeeFastReadService`;
3. reuses the existing Organization Adapter service as the provider-neutral Fast Read bridge;
4. reuses the existing Fast Read intent secret;
5. injects the service into the already-authenticated Human supervision handler.

When disabled or incomplete, the service is absent and the Fast Read route remains fail-closed/unavailable.

### Readiness boundary

No live TypeSafe probe is added to `/readyz`.

Reason:

- a health probe would create provider traffic merely to prove process readiness;
- ADR 0287 already defines network/timeout/provider failure as request-time fail-closed;
- startup configuration/custody validation proves the local dependency shape without external effect.

## Second adversarial review

The first JEV routing review was intentionally conservative:

- `deep_review = 0.40`;
- `proceed_fast = 0.39`;
- `split_task = 0.19`;
- `block = 0.02`.

The review therefore did not proceed on that ambiguous result.

A focused second pass challenged the two material design choices.

Result:

- policy scope: `runtime_constant` with probability 1.00;
- readiness scope: `startup_config_only` with probability 1.00;
- narrowed slice: `proceed` with probability 0.97.

Execution proceeded only after that narrowed review.

## Implementation

Qualification code head:

`52e2a4fc9b7fe8768d3b003eec492680eaaea58a`

Changed code/test files:

- `apps/core/src/runtime/config.ts`;
- `apps/core/src/runtime/main.ts`;
- `apps/core/test/runtime.test.ts`.

No Compose, VPS, deployment, provider, ERP or messaging configuration was changed.

## Validation

All **16/16 PR workflows on the exact qualification code head completed GREEN**.

Key evidence:

- Semantic Fast Read CI run `36234623424` — GREEN;
  - Core typecheck GREEN;
  - focused Fast Read Core tests GREEN;
  - Organization Adapter qualification GREEN;
  - disposable Semantic Fast Read E2E GREEN.
- Core CI run `36234623515` — GREEN.
- Core Candidate Artifact run `36234623410` initially completed before Core CI; it was deliberately rerun only after both Semantic Fast Read CI and Core CI were GREEN.
- post-gate Core Candidate rerun job `108384859313` — GREEN.
- Paperclip Fast Read Patch Composition, Run Result Read, Host Operational Read, synchronous webhook, OpenAPI, Organization Adapter, Mastra Adapter, Messaging, Web, Platform Admin and VendaERP Read-Only workflows were also GREEN.

A post-validation JEV completion review returned:

- `complete = 0.93`;
- `verify_more = 0.05`;
- `incomplete = 0.02`.

## Effect boundary

```text
production deploy = 0
Compose mutation = 0
VPS mutation = 0
migration = 0
live TypeSafe secret created/mounted = 0
real TypeSafe/JEV call from Wandora production = 0
VendaERP call = 0
WhatsApp send = 0
customer work = 0
new Wandora provider-owned subsystem = 0
```

Production remains **NO-GO and unchanged**.

## Next gap

The semantic admission/runtime composition gap is now closed in code.

Next work must keep the commercial sequence explicit:

1. reconcile the full Fast Read candidate as one measurable end-to-end path;
2. instrument stage latency before optimizing it;
3. perform a fresh production convergence preflight before any live credential mount or synchronized promotion;
4. only after an effect-authorizing decision, prove real product + price over the qualified VendaERP/WhatsApp path;
5. deterministic Quote V1 remains read-only with respect to ERP state.

Latency evidence should distinguish at least:

```text
WhatsApp/Gateway ingress
-> Core auth/context
-> JEV semantic decision
-> Paperclip dispatch
-> VendaERP tool/API
-> Paperclip terminal result
-> Core response
-> WhatsApp outbound
```

No latency optimization is authorized by this ADR.

