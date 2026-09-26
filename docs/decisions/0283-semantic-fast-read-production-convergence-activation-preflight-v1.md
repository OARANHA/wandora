# ADR 0283 — Semantic Fast Read Production Convergence / Activation Preflight V1

Status: **PREFLIGHT COMPLETE / PRODUCTION ACTIVATION NO-GO / RUNTIME WIRING + ARTIFACT GAPS PROVEN / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Objective

Determine whether the code and attestations accepted by ADRs 0275–0282 are ready to be converged into production as one coherent customer-useful Semantic Fast Read path.

This ADR is a preflight only. It does not authorize deploy, migration, plugin replacement, customer work, provider/model calls, VendaERP calls or outbound effects.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação.  
> Provider replacement não implica internalização.

## REAL NOW

Repository:

```text
repo = OARANHA/wandora
main = 3ce1a138c87593c6be1881bdf7aa6347bbbe5186
open PRs = 0
```

Post-merge push workflows on that exact main are GREEN:

- Paperclip OpenAPI Compatibility;
- Platform Admin CI;
- Messaging Gateway CI;
- Web CI;
- Integration Capability Projection CI;
- Organization Adapter Plugin CI;
- Paperclip Host Operational Read Extension CI;
- Semantic Fast Read CI;
- Core CI.

Production runtime:

```text
Core
  image    = wandora/core:organization-adapter-candidate-f3225586d082
  revision = f3225586d0825334d2c9c697a1720512a65d47f8
  health   = healthy

Paperclip
  image    = wandora/paperclip:v2026.916.0
  commit   = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
  health   = healthy

Organization Adapter
  plugin   = wandora.organization-adapter-v1
  version  = 0.3.1
  status   = ready

Task Drain
  draining     = false
  activeRuns   = 0
  pendingWakes = 0
  quiescent    = true
```

No effect occurred during this preflight.

## Proven evidence

### 1. Fast Read execution contract exists, but live Core runtime wiring does not

Canonical Core contains `BusinessCapability`, `FastReadIntent`, deterministic read execution, Paperclip run identity verification, the Tool Gateway read bridge and `PaperclipFastReadExecutionService`.

However, `apps/core/src/runtime/main.ts` does not instantiate `PaperclipFastReadExecutionService` and constructs `createPaperclipExecutionHandler(...)` without `fastReadService`.

Accepted behavior is therefore explicit:

```text
fastRead envelope + no fastReadService
=> HTTP 409
=> fast-read-unavailable
```

Promoting current Core source cannot activate Fast Read.

### 2. No current customer admission path creates and dispatches Fast Read

The runtime Organization Adapter configuration currently exposes reconcile, activation and work webhooks only. It has no Fast Read webhook configuration.

The Core Paperclip Organization Adapter provider implements reconcile, activate and supervised work. It does not dispatch `employee-fast-read`.

The human/customer API currently has no route that performs:

```text
authenticated customer request
-> available BusinessCapability projection
-> SemanticDecisionProvider
-> Wandora semantic gate
-> signed FastReadIntent
-> Organization Adapter employee-fast-read
```

The `SemanticDecisionProvider` contract exists, but no runtime JEV/provider adapter is wired.

Therefore the business-visible path requested by the product objective does not yet exist in production-ready runtime code.

### 3. ADR 0282 is a disposable projection attestation, not live plugin wiring

ADR 0282 authorizes the Organization Adapter to consume the bounded Paperclip operational snapshot, but the accepted implementation is under the disposable attestation boundary.

The installable 0.4.0 manifest currently declares `employee-fast-read`, but it does not declare `tools.operational.read`.

The live worker therefore does not consume:

`ctx.toolAccess.readOperationalSnapshot({ companyId, agentId })`.

That is consistent with ADR 0282's explicit **DISPOSABLE ATTESTATION / NO PRODUCTION EFFECT** status. It must not be silently reinterpreted as already-live production code.

### 4. Current Organization Adapter 0.4.0 artifact is exact but pinned to Paperclip 916.0

Current-main Actions artifact:

```text
artifact id      = 10893171670
artifact name    = organization-adapter-plugin-3ce1a138c87593c6be1881bdf7aa6347bbbe5186
GitHub digest    = sha256:5e8cedd32720608e9b81bd5fcbaf526a6bd6c1ae1552d287877d004d6d6a7f7f
package          = paperclip-plugin-wandora-organization-adapter-0.4.0.tgz
package sha256   = 1b8d9ede3a14277858e0363aff433018fdd1c99df2d4354f11714df0315b1034
wandora source   = 3ce1a138c87593c6be1881bdf7aa6347bbbe5186
```

Embedded compatibility:

```text
paperclipImage        = wandora/paperclip:v2026.916.0
paperclipSourceCommit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
plugin version        = 0.4.0
```

The immutable 0.4.0 artifact must not be relabeled as 916.1-compatible without a new qualification/package artifact.

### 5. Existing Core candidate is stale relative to ADR 0278

ADR 0277 produced:

```text
Core Candidate Artifact run = 36158799495
artifact id                 = 10874807043
artifact GitHub digest      = sha256:106f993cd64ca4c5fc8d8c3a29d133999101170f74a7d02e3a2339179bbb37da
candidate synthetic source  = 5c511cca8cf0b993ad73a64449e34925e2bbb3fb
```

Blob comparison against current main proves the candidate predates ADR 0278 and lacks:

- `apps/core/src/integrations/capability-plane.ts`;
- `apps/core/test/integration-capability-plane.test.ts`.

It is not the convergence artifact. A fresh Core candidate must be produced after runtime wiring is complete.

### 6. Paperclip 916.1 host extension is qualified, but no deployable candidate exists yet

Exact upstream target:

```text
v2026.916.1
commit = d554c4789ed3930f8a53ac9fdf6503b3187097da
```

Compared with production v2026.916.0 commit `dffc2b3...`:

- 916.1 is exactly one upstream commit ahead;
- no upstream migration files changed in that commit.

ADR 0281 retains:

`integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch`

with SHA-256:

`fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb`.

The host-extension CI checks out exact 916.1, applies the patch, runs static authority/leak verification, typechecks SDK/server and focused tenant/capability/cache-only tests.

It does **not** build/upload a production-promotable Paperclip image artifact.

Therefore exact image ID/digest/build provenance and disposable startup compatibility are still missing.

The v2026.916.0 upgrade process in ADRs 0128–0130 remains the accepted deployment/rollback pattern and must be reused rather than replaced.

## Capability Authority / Reuse Gate

### Semantic authority — Wandora

Wandora owns customer-facing business meaning, `BusinessCapability`, Semantic Fast Read policy, signed `FastReadIntent` and provider-neutral product admission.

### Durable product state

No new durable state is justified.

Rejected:

- integration registry;
- Connection mirror;
- grant mirror;
- Tool Catalog mirror;
- health/readiness mirror;
- provider tool registry;
- parallel run/work lifecycle;
- copied operational snapshot.

### Operational authority — Paperclip

Paperclip remains authority for run lifecycle, Applications, Connections, grants, secrets, installs, catalog, Tool Profiles/policies, operational health/readiness, Tool Gateway authorization/execution and audit.

### Provider implementation

Paperclip supplies current control-plane/runtime authority; Mastra remains replaceable runtime implementation; VendaERP/MCP remains one concrete business-system implementation.

### Replacement boundary

Customer-facing semantics and `BusinessCapability` remain stable across provider replacement. Provider-specific operational reads, tool mappings, packages and runtime state remain behind adapters.

## Gaps

Production convergence is blocked by all of the following:

1. Fast Read execution service not wired into Core runtime;
2. no customer Fast Read admission/dispatch path;
3. no runtime SemanticDecisionProvider/JEV adapter;
4. no production Organization Adapter operational-capability projection;
5. Organization Adapter 0.4.0 compatibility pinned to Paperclip 916.0;
6. no current Core candidate containing the complete post-ADR0278/runtime-wired source;
7. no deployable Paperclip 916.1+ADR0281 candidate image.

These are independent of production health; production is healthy.

## Decision

**NO-GO for production activation.**

Do not promote Paperclip 916.1 alone, Organization Adapter 0.4.0 alone, the ADR 0277 Core candidate, or any partial pair of those components.

Doing so would create a partially converged runtime without the accepted customer Fast Read path.

## Second adversarial review

JEV 1.13.0 reviewed the exact evidence.

```text
choice        = block
confidence    = 0.98
block         = 0.99
deep_review   = 0.01
proceed_fast  = 0
```

The block is advisory but consistent with deterministic repository/runtime evidence.

## Next executable slice

**Semantic Fast Read Runtime Wiring V1 — CODE ONLY / NO PRODUCTION EFFECT**

That slice must, at minimum:

1. wire the existing Fast Read execution service into Core runtime behind explicit config;
2. add a provider-neutral Organization Adapter Fast Read dispatch contract and Paperclip implementation using the existing company HMAC boundary;
3. add the customer-authenticated admission path that obtains available semantic capabilities, invokes a replaceable `SemanticDecisionProvider`, applies Wandora's deterministic-read gate, creates a short-lived signed `FastReadIntent`, and dispatches `employee-fast-read`;
4. productionize the bounded Paperclip operational projection only as needed to supply organization capability availability, without persistence or provider-state mirroring;
5. keep current-run Tool Gateway authorization as the final narrowing authority;
6. provide a concrete JEV adapter only behind the Wandora-owned semantic-decision contract; JEV remains provider implementation/advisory evidence, not semantic authority;
7. prove an end-to-end disposable path with exactly one authorized read tool call and zero generative model calls;
8. prove denied/unavailable/ambiguous capability cases fail closed before provider execution;
9. create no Wandora registry/lifecycle/tool execution subsystem;
10. produce fresh Core and Organization Adapter candidate artifacts only after runtime wiring tests are GREEN.

After that code slice is merged, return to a fresh production convergence preflight. That later preflight may then qualify the Paperclip 916.1+ADR0281 candidate image, exact rollback set, Compose delta and synchronized promotion order.

## Effect boundary

```text
production deploy = 0
Paperclip restart = 0
Paperclip upgrade = 0
Organization Adapter promotion = 0
Core promotion = 0
migration = 0
provider/VendaERP call = 0
model call = 0
customer work = 0
outbound = 0
new Wandora operational registry/state = 0
```

ADR 0283 is **PREFLIGHT COMPLETE / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**.
