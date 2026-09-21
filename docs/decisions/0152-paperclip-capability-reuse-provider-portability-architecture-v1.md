# ADR 0152 — Paperclip Capability Reuse + Provider Portability Architecture V1

Date: 2026-09-21  
Status: **Accepted candidate — repository/documentation only; NO PRODUCTION EFFECT**

Builds on: ADR 0036, ADR 0126, ADR 0137, ADR 0144, ADR 0147, ADR 0150, ADR 0151

## Decision summary

Wandora will reuse Paperclip deeply as the current specialist **operational control-plane provider** while preserving Wandora as the product/semantic authority.

The architectural rule is:

> **Reuse specialist capability deeply; couple Wandora to the specialist only through Wandora-owned contracts, bindings and effect boundaries.**

Paperclip is not the Wandora product contract.

The desired topology is:

```text
Customer
  -> Wandora Web/Core
  -> Wandora semantic contracts
  -> Organization / Work / Tool boundaries
  -> Paperclip operational provider
       -> Wandora adapters/plugins/connectors where needed
       -> Paperclip native issues/runs/routines/skills/budgets/etc.
  -> Wandora Agent Runtime
  -> Mastra/current runtime
  -> Mistral/current model provider

External effects
  -> Wandora policy
  -> Wandora Messaging/Effect Gateway
  -> Evolution / e-mail / ERP / other providers
```

Adapters, plugins and connectors may be implemented for Paperclip, but they remain **provider-side implementations of Wandora or Paperclip capability boundaries**, not Wandora's product identity.

## REAL NOW

Canonical repository at this audit checkpoint:

```text
main = 2e3a9e41eb0013c14da079d95120f03a85ee8f90
ADR 0151 = canonical
PR #205  = merged
```

Live Paperclip:

```text
image  = wandora/paperclip:v2026.916.0
source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health = ok
OpenAPI paths observed = 685
wandora_mastra = 0.3.0 / loaded
```

Live Core:

```text
image  = wandora/core:organization-adapter-candidate-d5f98ed92a29
source = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
health = healthy
runtime = mastra-supervised-model
logical profile = wandora-supervised-v1
current model implementation = Mistral / mistral-small-2603
```

Effect boundary:

```text
Human Send      = OFF
Gateway outbound= OFF
```

MED-1 remains historical/quiescent:

```text
status          = blocked
live runs       = []
active recovery = none
historical runs = 2
historical Core model calls = 1
outbound attempts = 0
```

Production remains unchanged by this audit.

## EVIDENCE HIERARCHY

Paperclip capability decisions must use this hierarchy:

1. Wandora canonical repository / accepted ADRs;
2. exact live/pinned Paperclip;
3. live `/api/openapi.json` + official CLI;
4. exact pinned Paperclip source;
5. official Paperclip docs for intent/public contract;
6. current Paperclip `master` only as future/radar evidence.

Current upstream master observed for this audit:

```text
8813a501058b29ae293fee7e94038a737d7d1594
```

A capability found only on master is **not** production capability.

## SEMANTIC AUTHORITY VS OPERATIONAL AUTHORITY

For every material capability, distinguish:

```text
semantic authority
  = who defines what it means to the Wandora customer/product

operational authority
  = who currently persists/executes the specialist state machine

provider implementation
  = the concrete software supplying that operational authority
```

Examples:

```text
customer employee identity/contract
  semantic authority = Wandora
  operational employee control-plane = Paperclip
  current provider = Paperclip

durable business work
  semantic work request/result = Wandora
  task/run lifecycle = Paperclip
  execution runtime contract = Wandora Agent Runtime
  current runtime = Mastra

external WhatsApp/e-mail/ERP effect
  final authorization = Wandora
  transport/provider = replaceable specialist
```

Paperclip being operational authority does not mean Wandora belongs to Paperclip.

## EXTENSION MODEL

### 1. External adapter

Use an external adapter when Paperclip needs to execute work through a runtime outside Paperclip.

Current example:

```text
Paperclip
  -> wandora_mastra
  -> Wandora Core / Agent Runtime
  -> Mastra
  -> current model provider
```

This is the correct home for `wandora_mastra`.

### 2. Paperclip plugin

Use a Paperclip plugin when additive capability properly belongs inside the Paperclip operational control plane, for example provider-side managed resources, Paperclip-native orchestration declarations or provider operator surfaces.

Wandora customer semantics must not depend directly on:

- plugin database shape;
- plugin-local IDs;
- Paperclip UI slots;
- plugin-specific enums;
- plugin installation identity.

A Paperclip plugin is a provider implementation, not a Wandora domain object.

### 3. Connector / Tool Gateway integration

Use Paperclip Connections/Tool Gateway/connectors when Paperclip-governed employees need governed access to organizational tools.

Examples may include:

- GitHub;
- ERP/CRM tools;
- generic MCP providers;
- future supported business systems.

However:

> A Paperclip tool permission, connection grant or approval never grants a Wandora external effect by itself.

WhatsApp/e-mail/ERP mutations that are Wandora-governed effects must still cross the Wandora effect-policy boundary.

### 4. Wandora Core / Gateway

Keep a capability Wandora-owned when it defines the customer/product contract or final external-effect authority, including:

- tenant/customer identity;
- stable digital-employee product identity;
- customer authorization;
- plan/entitlement/price/margin/billing;
- retention/privacy/compliance policy;
- external-effect authorization;
- provider-neutral customer work/result contract;
- Wandora effect/messaging gateway policy.

## CAPABILITY REUSE CLASSIFICATION

Every reviewed capability is classified as one of:

- **REUSE NOW**
- **ADAPT**
- **FUTURE**
- **WANDORA OWNED**
- **DO NOT BUILD**
- **QUARANTINE**

### High-confidence REUSE / ADAPT

Current qualified/native Paperclip capability includes:

- companies/memberships/agents;
- durable issues/tasks;
- assignment/run/heartbeat lifecycle;
- continuation/recovery/watchdogs;
- Routines;
- Execution Policy / task-review governance;
- Skills catalog/policy/releases;
- Decisions / Decision Training;
- projects/goals;
- work products/documents/attachments;
- cost events and operational budgets;
- secrets/responsible-user surfaces;
- Connections / Tool Gateway foundations;
- execution workspaces/runtime services;
- external adapters;
- run-scoped identity;
- activity/control-plane audit;
- company export/import;
- Task Drain.

The exact adoption boundary must still be qualified per use case.

## DO NOT BUILD

Absent a proven Wandora-owned gap and a superseding authority decision, do not create a new generic Wandora:

- task/issue/run engine;
- recurring-work scheduler;
- liveness/watchdog/recovery engine;
- organizational Skills catalog;
- generic Decision Training store;
- task/control-plane approval engine;
- operational AI cost/budget ledger;
- Paperclip-agent secret vault;
- generic execution workspace/sandbox manager;
- generic Case/Pipeline engine;
- second organizational Connections/MCP grant authority;
- provider pricing engine;
- model router;
- Paperclip maintenance scheduler/drain;
- shadow copy of Paperclip's database/history.

Portability is achieved through contracts, provider bindings, export/reconciliation and negative leakage tests — not by maintaining two copies of the same specialist domain.

## EXPERIMENTAL-PROVIDER RULE

Paperclip's official operator documentation states experimental capabilities have no stable compatibility, migration, rollback or long-term-support guarantee.

Therefore any Paperclip feature marked experimental is **QUARANTINE by default**, even when routes exist in live OpenAPI.

Current live readback proves these are OFF:

```text
enableCases          = false
enablePipelines      = false
enableAgentChat      = false
enableChatConnectors = false
```

Cases/Pipelines in v2026.916.0 are substantial real capability — stages, transitions, automation, blockers, documents, outputs and review — but they remain experimental.

Decision:

- do not activate them now;
- do not build a generic competing Wandora Case/Pipeline engine;
- revisit only for a concrete Wandora product requirement with an adoption/exit ADR.

## PROVIDER PORTABILITY / EXIT TEST

Before a provider-backed capability becomes a material Wandora dependency, answer:

> **If Paperclip were replaced tomorrow, which Wandora contracts would change?**

Target answer:

> Only the provider adapter/binding and migration of provider-owned operational state.

If customer APIs, product vocabulary or unrelated Wandora services must change, portability risk is too high.

### Mandatory adoption-time questions

1. What is the provider-neutral Wandora semantic contract?
2. Is the capability available in the exact pinned/live provider?
3. Does a provider ID leak to the customer surface?
4. What configuration/state must be exported?
5. How are open operations reconciled?
6. What historical evidence is retained?
7. How are secrets reauthorized/rotated?
8. What is the rollback/exit strategy?
9. Is the feature stable or experimental?
10. Can the feature be disabled without corrupting Wandora-owned state?

If unresolved, keep the capability in **QUARANTINE**.

## CURRENT WANDORA PORTABILITY PROOF

The existing architecture already contains important protections.

### Generic bindings

Persistence uses provider-keyed internal mappings such as:

```text
provider
provider_company_ref
provider_agent_ref
```

instead of using Paperclip IDs as Wandora IDs.

### Customer API

The current Human API returns only Wandora semantics for a digital employee:

```text
Wandora employee id
name
role
status
autonomy
activation state
work availability
```

Provider refs are used only for internal reconciliation/eligibility.

### Negative leakage tests

Core/Web tests reject provider leakage such as:

```text
providerAgentId
paperclip
```

from customer-facing employee/team surfaces.

This pattern is mandatory for future provider-backed customer DTOs.

### Localized current debt

Two internal couplings remain:

- `OrganizationAdapterProvider.provider` is currently typed as literal `'paperclip'`;
- the private execution bridge/run-identity implementation is Paperclip-specific.

These are **localized legitimate provider integrations**, not evidence for a broad abstraction rewrite.

Decision:

> Do not generalize them speculatively. Generalize when a second provider, migration rehearsal or concrete portability requirement proves the need.

## PAPERCLIP NATIVE PORTABILITY

Pinned Paperclip contains company export/import with preview and export-fidelity reporting.

Native portable bundle covers selected:

- company;
- agents;
- projects;
- issues/tasks;
- skills;
- adapter/env declarations.

The native export is intentionally not perfect.

`paperclip-export-fidelity-v1` explicitly warns that these histories are not exported:

```text
approvals_not_exported
cost_history_not_exported
activity_history_not_exported
```

Therefore provider replacement uses:

```text
Paperclip native export
+ minimal Wandora provider-binding/receipt manifest
+ targeted export/archive of adopted non-portable history
```

Never a shadow Paperclip database.

Historical provider evidence normally remains historical evidence; do not recreate old runs/approvals in a replacement provider as if they happened there.

## COST / USAGE AUTHORITY

Pinned v2026.916.0 source proves:

```text
adapterResult.usage
  -> normalized heartbeat usage
  -> agent runtime totals
  -> costService.createEvent when token usage > 0
```

So normalized external-adapter tokens automatically create Paperclip cost events.

If no authoritative `costUsd` is supplied:

```text
tokens     = recorded
costCents  = 0
costStatus = unpriced
```

Paperclip budgets in this version support only:

```text
BUDGET_METRICS = ["billed_cents"]
```

Therefore:

- token telemetry is reusable Paperclip operational evidence;
- unpriced token evidence does **not** make the monetary hard-stop effective;
- do not claim a zero-cost event means free usage;
- do not create a Wandora provider-pricing table merely to force a monetary number;
- Wandora customer pricing/subscription/billing remains Wandora-owned.

## PRODUCTION GAP DISCOVERED BY THE AUDIT

Live `wandora_mastra@0.3.0` and live Core successfully executed the first customer work, but live Core's private Paperclip execution response still returns only:

```text
executionId
model
summary
```

It does not return normalized usage.

Current main has the required companion change in exactly one executable Core file:

```text
apps/core/src/paperclip-execution/service.ts
```

No other Core executable source/package changed between the live Core source `d5f98ed...` and current main.

Compatibility proof:

- 0.3.0 safely ignores an additive `usage` field from Core;
- 0.4.0 safely accepts missing `usage` as null.

Therefore lifecycle and usage are independently backward-compatible, but **end-to-end prospective usage requires both the companion Core and adapter 0.4.0**.

ADR 0151's adapter-only future execution cannot truthfully satisfy the usage claim and is blocked until a superseding no-effect companion preflight amends the execution order.

## OPENAPI COMPATIBILITY GATE

Future Paperclip upgrade qualification should freeze:

```text
paperclip-openapi.json
paperclip-openapi.sha256
wandora-paperclip-api-contract.json
```

with curated Class A/B dependencies.

A breaking candidate difference in a required path/method/request/response/auth boundary becomes an explicit review gate.

OpenAPI does not replace pinned-source review for semantics such as:

- wake behavior;
- Task Drain process locality;
- recovery timing;
- ambiguous mutation handling;
- transaction/idempotency behavior.

Use:

```text
OpenAPI dependency diff
+ pinned source review
+ migration review
+ disposable production-derived proof
+ rollback proof
```

## UPSTREAM MASTER FINDINGS

The current upstream delta reinforces Paperclip's own reuse philosophy:

- GitHub review agents reuse ordinary tasks/runs/activity/governed tools instead of another scheduler;
- newer MCP providers reuse existing Connections/grants/policy/audit instead of another grant system;
- Runner-created Skills reuse the existing company Skills library/policy;
- Railway runtime operations reuse the MCP Gateway rather than another service/database;
- AI Connections reuse grants/vault/responsible-user concepts;
- distribution plugins extend the host rather than requiring Paperclip forks.

This is architecture evidence, not production authorization.

## SECOND ADVERSARIAL REVIEW

### “Paperclip already does a lot, so Wandora should become a Paperclip skin”

Rejected.

Wandora retains product semantics, stable IDs, customer UX, commercial policy and effect authorization.

### “Avoid lock-in by duplicating Paperclip data/state in Wandora”

Rejected.

That creates dual authority and synchronization risk. Use bindings + export/exit contracts.

### “Abstract every provider behind generic interfaces immediately”

Rejected.

Premature abstraction without a second implementation can hide rather than reduce coupling. Keep private provider integration localized and introduce a broader port only when a concrete requirement proves it.

### “Use Paperclip approvals to authorize WhatsApp/payment/ERP effects”

Rejected.

Paperclip may govern task/control-plane approval, but Wandora's effect boundary remains final.

### “Use experimental Cases/Pipelines because the API already exists”

Rejected.

The provider itself gives no stable compatibility/migration guarantee.

### “Use current upstream master directly because it has newer connectors/plugins”

Rejected.

Master is radar only. Production capability is exact-version evidence.

### “Paperclip budgets already cap Wandora/Mistral spend”

Rejected.

Unpriced token events have costCents=0; v2026.916.0 budget hard-stop observes billed cents.

### “Adapter 0.4 alone provides prospective usage”

Rejected by live evidence.

Current Core does not return usage to the adapter.

## DECISION

The capability/portability audit is architecturally accepted with these durable rules:

1. Paperclip is the current specialist operational control-plane provider.
2. Wandora owns customer semantics and stable product contracts.
3. Paperclip capability is reused before a duplicate Wandora subsystem is considered.
4. Wandora/Paperclip integration uses adapters/plugins/connectors according to capability type.
5. External effects remain Wandora-authorized.
6. Provider IDs and state machines remain private implementation detail.
7. Material provider adoption requires an Exit Test.
8. Experimental provider capabilities default to QUARANTINE.
9. Current master is radar, never live authority.
10. Provider portability uses native export + minimal bindings/receipts + targeted historical archive.
11. OpenAPI dependency inventory becomes part of future Paperclip compatibility qualification.
12. The adapter 0.4 production execution remains blocked until the companion Core usage-return preflight corrects ADR 0151's execution order.

## EXECUTION / VALIDATION

This audit performed only:

- repository/source inspection;
- official GitHub upstream inspection;
- live read-only OpenAPI/CLI/runtime inspection;
- pinned Paperclip source inspection;
- live Core compiled-source inspection;
- isolated Git comparisons;
- repository documentation.

It did **not**:

- install/replace an adapter;
- restart Paperclip/Core;
- mutate MED-1;
- enable a Paperclip experiment;
- activate a connector/plugin;
- apply a migration;
- create work/wakeup/run;
- call the model provider;
- enable Human Send/Gateway outbound;
- send a message.

Research artifacts:

- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_AUDIT_V1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_MATRIX_V1.md`
- `docs/research/PAPERCLIP_PROVIDER_EXIT_STRATEGY_V1.md`
- `docs/research/PAPERCLIP_OPENAPI_COMPATIBILITY_GATE_PROPOSAL_V1.md`
- `docs/research/PAPERCLIP_UPSTREAM_DELTA_AUDIT_2026-09-21.md`

## Next decision

Create a separate **ADR 0153 — Paperclip Customer-Work Usage Companion Core Promotion Preflight V1 — NO EFFECT**.

It must preserve the lifecycle remediation from ADR 0151 but replace the adapter-only promotion order with an end-to-end Core + adapter order proven against current live compatibility and rollback evidence.
