# ADR 0278 — Integration Capability Plane V1

Status: **CODE COMPLETE / IMPLEMENTATION CI GREEN / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0276 established the Wandora-owned provider-neutral `BusinessCapability` vocabulary. ADR 0277 proved that a short-lived Wandora `FastReadIntent` can authorize exactly one deterministic read while Paperclip remains operational authority for run lifecycle and Tool Gateway authorization.

The next product question is different from execution:

> Que capacidades de negócio esta integração fornece para esta organização, e como elas são projetadas para o plano semântico Wandora?

This ADR answers that question without creating an ERP framework, integration registry, duplicate connection state or parallel tool catalog.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW / proven evidence

Reconciliation before implementation proved:

- Wandora `main@61b30a2263fc4fe72154d2d3428427a8310ea3f0`, PR #362 merged;
- ADR 0277 remains code-complete, CI-qualified and without production effect;
- production Paperclip is `wandora/paperclip:v2026.916.0`, healthy;
- production Core, Web, Messaging Gateway and `wandora-jev-mcp` are healthy;
- Paperclip Task Drain is OFF/quiescent with 0 active runs and 0 pending wakes;
- `wandora-paperclip-semantic-decision-plugin` remains at `main@f278ce976989d5ea968d50e0f6e3722a7d6fc5f1` and is explicitly post-Issue/advisory;
- `Remote-Ops-MCP` remains operational and healthy; no capability change is required for this slice.

Pinned Paperclip source/runtime already provides operational state and APIs for:

- Tool Applications;
- Connections;
- connection grants;
- installs;
- Tool Catalog;
- catalog refresh;
- Tool Profiles / access policy;
- health-check;
- activity/audit;
- run-scoped Tool Gateway sessions and authorized tool listing.

Existing Wandora code already provides:

- provider-neutral `BusinessSystemReadProvider` operations;
- VendaERP as one read-only provider adapter;
- provider-neutral `BusinessCapability`;
- `RuntimeReadTool[]` from the Paperclip Tool Gateway;
- per-run ephemeral `RuntimeReadTool -> BusinessCapability` bindings.

## Capability Authority / Reuse Gate

### Semantic authority — Wandora

Wandora owns:

- the business meaning of an integration;
- the provider-neutral `BusinessCapability` vocabulary;
- which semantic capabilities are presented to product/customer surfaces;
- semantic routing and Fast Read intent;
- the rule that runtime authorization can only narrow, never expand, organization capability availability.

### Durable product state

No new durable state is justified by this slice.

Specifically, this ADR rejects:

- an integration registry table;
- copied Connection state;
- copied health/readiness state;
- copied grants;
- copied Tool Catalog;
- copied secrets;
- a BusinessCapability-to-tool registry;
- a provider lifecycle state machine.

If a later customer-facing stable integration identity cannot be reconstructed or migrated across provider replacement, that future need must be proved separately before persistence is added.

### Operational authority — Paperclip

Paperclip remains authority for:

- Applications;
- Connections;
- grants;
- secrets;
- installs;
- Tool Catalog;
- Tool Profiles;
- policies;
- health/readiness evidence;
- run lifecycle;
- run-scoped Tool Gateway authorization;
- tool execution and audit.

### Provider implementation

VendaERP/MCP is the first concrete business-system provider only.

It is not the Wandora integration contract.

### Replacement boundary

Replacing VendaERP must require only provider adapter/catalog/configuration changes.

Replacing Paperclip must require an operational-provider adapter and legitimate state migration/export, not a rewrite of Wandora customer semantics.

## Mandatory preflight questions

### 1. Onde está hoje a autoridade de integração/provider no sistema?

Operational integration authority is Paperclip Applications + Connections + grants + secrets + installs + Tool Catalog/Profiles/Policies. Provider execution is the concrete MCP/adapter. Wandora owns semantic meaning and product projection.

### 2. Quais estados são Wandora-owned e quais pertencem a Paperclip/provider?

Wandora-owned:

- organization/customer identity and tenant policy;
- provider-neutral integration meaning;
- `BusinessCapability`;
- semantic routing/Fast Read authorization;
- customer-safe projection.

Paperclip/provider-owned:

- connection lifecycle and health;
- credentials/secrets;
- grants/install/access;
- tool catalog/profile/policies;
- run authorization and audit;
- provider-specific tool implementation.

### 3. Como representar que uma organização possui uma integração VendaERP sem duplicar Connections, grants, secrets ou lifecycle do Paperclip?

By a read-only Wandora projection over the existing organization->Paperclip company boundary and Paperclip operational integration evidence. No new Wandora integration row is required for V1.

The product may display a bounded integration label/category and semantic capability projection, but raw provider/Paperclip identifiers are not customer contract.

### 4. Como projetar capabilities provider-specific para `BusinessCapability`?

A provider adapter maps operational tool/catalog semantics into the finite Wandora `BusinessCapability` vocabulary.

The mapping is code/adaptor logic, not durable registry state.

### 5. Existe hoje algum registry/catálogo que já possa ser reutilizado?

Yes. Paperclip Tool Catalog + Applications/Connections already provide the operational catalog. Wandora must not build another tool/integration registry.

### 6. `RuntimeReadTool[]` e Tool Gateway já são suficientes como fonte operacional de tools ou existe algum gap semântico real?

They are sufficient for **current run authorization**.

The real gap is semantic/product projection at organization level: separating what an integration supports, what the organization operationally has available, and what a specific run is currently allowed to execute.

### 7. Como distinguir os cinco conceitos sem misturá-los?

- provider integration identity: operational provider/Application/Connection boundary;
- connection health/readiness: Paperclip/provider operational evidence;
- business capabilities: Wandora `BusinessCapability`;
- tools currently authorized: Paperclip Tool Gateway `RuntimeReadTool[]`;
- semantic fast-read capabilities: intersection of organization-available `BusinessCapability` with capabilities derived from the current run's authorized tools.

### 8. Como suportar múltiplos providers futuros sem fazer do VendaERP o contrato central?

The contract contains only integration category/display semantics, normalized operational status and `BusinessCapability[]`. VendaERP endpoint names, tool names, credential shape and schemas remain inside its adapter.

### 9. O que pertence ao painel futuro e o que deve existir primeiro como contrato/API interna?

First:

- provider-neutral integration capability projection;
- normalized readiness;
- semantic capability lists;
- strict separation from run authorization.

Later UI may render e.g. "VendaERP conectado" and "Ana pode consultar produtos/estoque/preços" using that projection. UI must not expose grants, secret refs, catalog IDs or provider lifecycle.

### 10. Onde entra o Wandora API Inspector/OpenAPI retido?

Development-time/provider-adapter evidence only.

It helps qualify endpoint/method/schema/casing and map provider operations to adapter/tool semantics. It is not runtime integration authority, credential authority or customer state.

### 11. Onde entra o `wandora-paperclip-semantic-decision-plugin`?

Outside this plane's operational path.

It remains post-Issue/advisory and does not own pre-Issue Fast Read admission or integration capability state.

### 12. O `wandora-jev-mcp` tem algum papel neste slice?

No operational role.

JEV may later implement the replaceable `SemanticDecisionProvider`, but it does not own Connections, capability projection, grants, tool authorization or runtime execution.

### 13. Existe necessidade de nova persistência Wandora-owned?

No evidence supports it for V1.

All required operational facts already exist in Paperclip/provider state, while the semantic vocabulary/projection can be computed in memory.

### 14. Como evitar transformar `BusinessCapability` em tool registry paralelo?

`BusinessCapability` stays a finite semantic vocabulary only.

It contains no tool name, provider credential, connection ID, grant ID, catalog entry ID or invocation details. Mapping is adapter code over observed authorized/provider evidence.

### 15. Qual é o menor E2E descartável antes de qualquer ativação em produção?

A pinned disposable Paperclip proof with one synthetic business-system connection must demonstrate:

1. native Application/Connection/catalog/grant/profile state exists only in Paperclip;
2. adapter projection yields bounded provider-neutral `BusinessCapability[]`;
3. not-ready/revoked operational state yields zero organization-available capabilities without a Wandora write;
4. a run-scoped Tool Gateway session yields `RuntimeReadTool[]`;
5. runtime semantic capability is the intersection with organization availability;
6. a capability not authorized in the run cannot appear in Fast Read;
7. no model call, provider call, customer work, outbound or Wandora persistence is required.

That provider-integrated disposable attestation is a separate next slice. This ADR does not activate production integration projection.

## Decision

Implement the smallest Wandora-owned contract only:

`IntegrationCapabilityPlaneEvidence`

contains:

- integration kind;
- bounded display name;
- normalized operational health/readiness;
- provider-supported semantic capabilities;
- organization-enabled semantic capabilities.

`OrganizationIntegrationCapabilityProjection`

contains:

- integration kind/display semantics;
- normalized health/readiness;
- canonical supported `BusinessCapability[]`;
- canonical currently available organization `BusinessCapability[]`.

`projectFastReadCapabilities(...)`

computes the final per-run semantic availability by intersecting organization availability with run-authorized capabilities.

Runtime authorization can only narrow capability availability.

Unknown/provider-specific strings are filtered instead of becoming semantic capabilities.

No provider IDs, tool names, connection/grant/catalog IDs or credentials enter the projection.

## Second adversarial review

The review explicitly challenged:

- creating an integration registry that Paperclip already supplies;
- copying Connection state or health;
- copying grants/secrets;
- building a Wandora Tool Catalog;
- making `BusinessCapability` a disguised tool registry;
- treating VendaERP as semantic authority;
- adding provider-specific contract fields;
- adding persistence without a proven replacement/stable-ID need;
- making Core depend directly on VendaERP or JEV;
- confusing provider support with organization enablement;
- confusing organization capability availability with run authorization.

All were rejected.

The remaining contract is strictly a semantic projection boundary and does not replace provider implementation.

## Code implemented

New code:

- `apps/core/src/integrations/capability-plane.ts`;
- `apps/core/test/integration-capability-plane.test.ts`.

Tests prove:

1. provider support, organization availability and run authorization remain separate;
2. readiness fails closed for availability without erasing supported semantics;
3. unknown/provider-specific strings are filtered;
4. runtime authorization cannot add an organization-disabled capability;
5. display names are bounded.

## Effect boundary

```text
new migration/table = 0
new integration registry = 0
new tool registry = 0
new grant/secret store = 0
production mutation = 0
Paperclip mutation = 0
VendaERP call = 0
JEV call = 0
Mastra/model call = 0
customer work = 0
outbound = 0
```

## Next slice

After exact-head CI is GREEN and this ADR is merged:

**Paperclip Integration Capability Projection + Disposable Attestation V1 — CODE ONLY / NO PRODUCTION EFFECT**

That slice should derive the V1 evidence from native Paperclip Application/Connection/catalog/grant/profile state, prove the run-scoped intersection through Tool Gateway, and keep provider/customer IDs behind the adapter boundary.

ADR 0278 is **CODE COMPLETE / IMPLEMENTATION CI GREEN / NO PRODUCTION EFFECT**.
