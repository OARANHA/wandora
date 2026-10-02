# ADR 0401 — Core Dynamic Organization Adapter Provider Client + Digital Employee Instance Binding Migration Qualification V1

Date: 2026-10-02

Status: **SPLIT REQUIRED / CORE DYNAMIC SWITCH BLOCKED ON INSTANCE-AWARE PROVIDER OPERATIONS + MULTI-INSTANCE HIRE JOURNAL QUALIFICATION / EXISTING PROVIDER BINDING REUSED / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0400 qualified a disposable Organization Adapter 0.7.0 candidate without replacing canonical 0.6.1. The candidate adds exactly one new signed provider bridge:

`employee-ensure-dynamic`

with the provider-neutral request:

```text
companyId + canonical Wandora employeeId + catalogKey
```

and returns only the private `providerAgentRef` after Paperclip proves the exact dynamic Agent is `paused`. Paperclip keeps ownership of `pending_approval`, approval, pause/resume, the immutable dynamic marker/fingerprint and exactly-one resource semantics.

This ADR answers the next question: can Core now consume that endpoint and migrate employee/provider identity coherently without breaking activation, work or Semantic Fast Read?

The answer is **not yet**. The blocker is concrete and spans the existing provider/runtime contracts, not a missing Wandora subsystem.

## REAL NOW

Fresh reconciliation on 2026-10-02 proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #396 remains open/draft/mergeable/unmerged at `21fc84982e522c0249eeb2778470cfa61c620b69`, 10/10 exact-head workflows GREEN;
- PR #397 remains open/draft/mergeable/unmerged at `a9b0f76d21758aea6ee70ce32796c400e08969fe`, 13/13 exact-head workflows GREEN;
- PR #398 remains open/draft/mergeable/unmerged at `233b4546dcbaaf7a281b40a30c9c1a6c182bb000`, 13/13 exact-head workflows GREEN;
- PR #399 remains open/draft/mergeable/unmerged at `1a10fe92338e9605b1c267a5e6c09110b606196a`, 12/12 exact-head workflows GREEN, including the dedicated Organization Adapter Dynamic Managed Candidate CI;
- canonical `integrations/paperclip/plugins/organization-adapter-v1` remains 0.6.1; 0.7.0 remains an isolated disposable overlay candidate;
- no merge, production deployment, production migration, Paperclip/Organization Adapter promotion, real Agent creation, VendaERP call, outbound or customer activation occurred.

The ADR 0400 text still described exact-head CI as pending because it was written before the final workflow completion. This ADR records the fresh 12/12 GREEN readback without rewriting that historical checkpoint.

## Proven canonical instance identity

Migration `20260914_002_ana_vertical_slice_v1.sql` defines `wandora.digital_employees.id` as the canonical employee UUID and explicitly states that provider/runtime identities never replace it.

ADR 0394 already qualified `catalog_key` as reusable template/offering semantics rather than employee-instance identity.

Therefore:

- `digital_employees.id` = employee instance identity;
- `catalog_key` = template/spec/policy selector;
- `provider_agent_ref` = private replaceable provider binding.

`catalog_key` remains necessary, but **not as instance identity**.

## Reuse Gate — provider binding table

The existing table is sufficient and must be reused:

`wandora_private.digital_employee_provider_bindings`

Its schema already has:

- primary key `(organization_id, employee_id, provider)`;
- `UNIQUE (provider, provider_agent_ref)`;
- FK `(organization_id, employee_id) -> wandora.digital_employees(organization_id, id)`;
- FK `(organization_id, provider) -> control_plane_provider_bindings`.

This exactly supports:

`organization + canonical employee instance + provider -> private provider Agent ref`.

**Decision: no second provider-binding table, registry or provider lifecycle mirror is justified.**

The existing `digital_employee_work_operations` table also already stores canonical `employee_id` plus frozen provider correlation as an integration-safety receipt. It is not a provider lifecycle engine and does not require replacement merely for dynamic Agent identity.

## Proven hire-journal singleton blocker

Migration `20260916_011_organization_adapter_service_contract_v1.sql` adds:

```sql
UNIQUE (organization_id, provider, catalog_key)
```

through `digital_employee_hire_operations_org_provider_catalog_uidx`.

Current `OrganizationAdapterService.reserveOperation(...)` also performs a `byCatalog` lookup on the same tuple and reuses the existing operation for a new idempotency key.

A separate legacy-collision guard rejects a matching `display_name + role + autonomy` employee.

Those are legacy singleton semantics. Two canonical employee UUIDs created from the same template cannot coexist while they remain.

**A schema/service migration is genuinely necessary for the eventual multi-instance target, but it is not authorized or applied by this ADR.** Its exact replacement semantics must be qualified separately before a migration file is introduced or production schema is touched.

The existing tenant eligibility row `organization + catalog_key` is not an instance identity. It may remain a template-level product policy if the next schema review confirms that interpretation.

## Core static identity assumptions still present

At the PR #399 head, Core still contains all of the following static-singleton assumptions:

1. `OrganizationAdapterProvider.reconcileCatalogEmployee(...)` accepts only `providerCompanyRef + catalogKey`.
2. `paperclipManagedAgentRef(company,catalogKey)` derives a synthetic `managed:v1:<sha256>` ref.
3. Hire calls `reconcileCatalogEmployee(...)` without the already-reserved canonical `employee_id`.
4. Activation requires the persisted provider ref to equal the synthetic `paperclipManagedAgentRef(company,catalogKey)`.
5. Work context rejects the employee binding unless it equals the same static hash.
6. Fast Read reuses that work context and therefore inherits the static-hash requirement.
7. `PaperclipExecutionService.resolveExecutionBinding(...)` derives the same synthetic hash from `company + catalogKey` instead of binding the run's actual provider Agent id.
8. `PaperclipRunIdentity` accepts only the legacy `metadata.pluginManagedAgent.agentKey = ana-commercial-v1` marker. A dynamic Agent uses the distinct provider-owned `paperclipDynamicManagedAgent` marker.
9. Migration `20260920_015_digital_employee_activation_projection_v1.sql` hard-codes Ana, `commercial-assistant`, Paperclip and `ana-commercial-v1`.

These assumptions must not be removed independently while provider dispatch still targets the static Agent.

## Organization Adapter 0.7.0 is dynamic only for ensure

The 0.7.0 overlay adds `employee-ensure-dynamic`, but intentionally preserves inherited 0.6.1 runtime operations.

The inherited code still resolves:

- activation through `ctx.agents.managed.get(CATALOG_KEY, companyId)`;
- work through `ctx.agents.managed.get(CATALOG_KEY, companyId)`;
- operational capability projection through `ctx.agents.managed.get(CATALOG_KEY, companyId)`;
- Fast Read through `ctx.agents.managed.get(CATALOG_KEY, companyId)` followed by `ctx.agents.invoke(staticAgentId,...)`.

Therefore a Core-only hire switch would create this invalid mixed state:

```text
hire -> dynamic employee Agent
activation/work/capabilities/Fast Read -> legacy static catalog Agent
```

That is explicitly rejected.

## Deep provider Reuse Gate

The fifth Paperclip patch proves two relevant native capabilities:

- `ctx.agents.get(agentId, companyId)` exists, but requires explicit `agents.read`;
- `ctx.agents.managed.ensureDynamic(...)` is create-or-resolve and requires `agents.managed.dynamic`.

Organization Adapter 0.7.0 does **not** currently request `agents.read`.

Using `ensureDynamic` as an accidental post-hire lookup is not accepted: if the provider resource were genuinely absent, a lookup path could create an Agent when activation/work/Fast Read intended only to operate an already-bound instance.

The next provider contract must therefore qualify a **no-create resolve/validate path** for an already-bound dynamic Agent. The smallest reuse candidate is native `agents.get` behind an explicit, reviewed `agents.read` capability plus validation of the provider-owned dynamic marker/resource key. If that grant is broader than acceptable, a narrower Paperclip-owned read primitive must be qualified instead. This choice belongs to the provider boundary, not to a Wandora lifecycle mirror.

The contract must also decide how an already-bound operation is addressed across the replacement boundary:

- canonical `employeeId`;
- private `providerAgentRef`;
- or both, with provider-side correlation validation.

This must be settled before Core freezes a mixed provider interface.

## Options evaluated

### Option 1 — Core client only, unused by hire

Adding an unused `employee-ensure-dynamic` client is technically safe but is **deferred**.

Reason: the current `OrganizationAdapterProvider` interface groups hire, activation, work, capability projection and Fast Read. Freezing only the create/ensure half before deciding the instance-aware post-hire addressing contract would create dead mixed-abstraction surface and does not unlock a coherent Core migration.

### Option 2 — dynamic client + hire/binding, downstream blocked

Rejected for this slice.

It would create paused dynamic employees that cannot yet be safely activated, assigned work or used for Fast Read, while the current hire journal still forbids the second instance of the same template. This does not satisfy the target instance model and increases transitional state without unlocking a usable coherent path.

### Option 3 — migrate all Core consumers now

Blocked by provider evidence.

Organization Adapter 0.7.0 has no instance-aware activation/work/capability/Fast Read contract and the execution callback still validates the legacy static managed marker/hash. Core cannot correctly route those operations merely by deleting its static assertions.

### Selected — split prerequisites before Core switch

The Core switch is divided before implementation.

No new Core client, service, table, migration, lifecycle state or runtime gate is introduced in this ADR.

## Second adversarial review

The mandatory advisory reviews were deliberately used to attack the split:

1. Broad review: `split_task=0.60`, `proceed_fast=0.19`, `deep_review=0.19`, `block=0.02`, confidence `0.47`.
2. Focused challenge asking whether an unused client should still be implemented: `deep_review=0.88`, confidence `0.84`.
3. Deep provider review after proving `agents.get` / `agents.read` and create-capable `ensureDynamic`: `deep_review=0.59`, `block=0.28`, `split_task=0.12`, `proceed_fast=0.01`, confidence `0.46`.

JEV remained advisory. The deterministic repository/provider evidence resolves the uncertainty conservatively: the instance-aware provider operation contract must be qualified before Core freezes or consumes the incomplete dynamic surface.

## Decision

The requested Core-side dynamic client/binding migration **must be split before implementation**.

The next executable slice is:

**Organization Adapter Dynamic Managed Employee Instance Runtime Operations Contract Qualification V1 — NO EFFECT**

It must prove, without production effects:

1. the exact no-create provider correlation mechanism for `employeeId + providerAgentRef`;
2. whether native `agents.get` with explicit `agents.read` is the least-privilege reusable capability or whether a narrower Paperclip provider primitive is required;
3. instance-aware activation semantics without creating/reprovisioning an Agent;
4. instance-aware work assignment to exactly the bound Agent;
5. instance-aware operational capability projection for exactly the bound Agent;
6. instance-aware Fast Read dispatch/result for exactly the bound Agent;
7. the dynamic `PaperclipRunIdentity` marker/correlation contract needed by the Core execution bridge;
8. legacy static-employee compatibility during migration;
9. exact tests for wrong employee/ref/company, terminated/rejected/pending states, ambiguous correlation and no-create guarantees.

Separately, before a second same-template hire can be enabled, qualify:

**Digital Employee Hire Journal Multi-Instance Schema Qualification V1 — NO PRODUCTION MIGRATION**

That slice must remove the singleton meaning of `organization + provider + catalog_key` and the matching legacy-collision semantics without creating a new hire table or lifecycle engine. Same idempotency key must still converge; a distinct idempotency key may reserve a distinct canonical employee UUID when policy allows it.

Only after both prerequisites are qualified should the original Core implementation resume as a coherent:

**Core Dynamic Employee Instance Binding Migration V1 — CODE ONLY / NO PRODUCTION EFFECT**

That implementation should then migrate hire, activation, work, capability projection, Fast Read and Paperclip execution binding as one compatibility-aware instance-identity cut, using the existing provider-binding table.

## Capability authority

- **Semantic authority:** Wandora owns canonical DigitalEmployee identity, template semantics, tenant ownership, product policy and customer authorization.
- **Durable product state:** `wandora.digital_employees.id` and the existing provider binding/journals remain Wandora-owned where already justified.
- **Operational authority:** Paperclip owns Agent lifecycle, Board approval, `pending_approval`, pause/resume, Agent/run/tool lifecycle, dynamic marker/fingerprint and exactly-one provider resource.
- **Provider implementation:** Paperclip plugin/SDK operations and Organization Adapter implementation remain provider-specific.
- **Replacement boundary:** Organization Adapter remains the only Core-facing Paperclip workforce boundary.

ADR 0168 remains unchanged:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Effects

This ADR causes **no production effect**.

It does not:

- merge any PR;
- deploy or promote Core, Paperclip or Organization Adapter;
- apply any schema migration;
- modify production/VPS/runtime configuration;
- create or activate a real Agent;
- call VendaERP;
- call a model/provider for customer work;
- enable Human Send or outbound;
- alter Task Drain.

