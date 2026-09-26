# Wandora Product Layer + Paperclip Workforce Engine + ProRevest Demo Priority

Status: **PRODUCT/ARCHITECTURE CHECKPOINT / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Purpose

This document records the conclusions reached after reviewing the current Wandora architecture, the Paperclip UI/capabilities, the active Semantic Fast Read work, the Integration Hub direction, and the immediate commercial need to demonstrate real value to the owner of ProRevest Tintas through WhatsApp.

This is a product/architecture checkpoint, not an authorization to deploy, mutate production, enable ERP writes, create new durable state, or bypass accepted provider boundaries.

The controlling guardrail remains ADR 0168:

> Portability means contract decoupling, not duplication of provider implementation. Provider replacement does not imply internalization.

## Current verified context

At this checkpoint:

- canonical `main` is still `8d6a65f519de5c1c49607314b49968af608c7164` (ADR 0283);
- PR #369 is the only open PR and remains **CODE ONLY / NO PRODUCTION EFFECT**;
- PR #369 has already qualified, on its branch, the provider-neutral Core Fast Read bridge (ADR 0286) and the TypeSafe/JEV-backed `SemanticDecisionProvider` (ADR 0287);
- production remains unchanged and is still NO-GO for the Semantic Fast Read convergence candidate;
- the current Paperclip UI shows that Ana already has first-class operational concepts for runtime, tools, permissions/trust, runs, costs, budgets, hierarchy/manager relationships and agent creation/delegation;
- Ana currently has the VendaERP read-only integration/tool surface installed operationally in Paperclip;
- the current capability projection already maps at least:
  - `business.products.search`;
  - `business.products.price`;
  - `business.stock.read`;
  - `business.price_tables.list`;
  - `business.price_tables.products.read`;
  - `business.parties.search`;
  - `business.orders.search`;
  - `business.companies.list`;
  - `business.connection.probe`.

## Product architecture conclusion

The clearer product model is:

```text
                    WANDORA
             Product & Business Layer
                      |
      +---------------+----------------+
      |               |                |
     JEV           Paperclip           HUB
 semantic judge   workforce engine   integrations
                      |
                    Mastra
               runtime/workflow
```

This does **not** make Wandora a thin visual skin over Paperclip.

Wandora remains the premium SaaS product and owns customer/product semantics. Paperclip is used deeply as the operational Digital Workforce Engine instead of being duplicated by a parallel Wandora workforce engine.

### Wandora-owned authority

Wandora should remain authoritative for:

- tenant / customer company identity;
- user login and human identity;
- plans and subscriptions;
- entitlements;
- commercial digital-employee catalog;
- employee persona and business behavior;
- enterprise/business policies;
- provider-neutral `BusinessCapability` vocabulary;
- Integration Hub product surface;
- mapping of business systems to provider-neutral capabilities;
- business authorization;
- human approval rules;
- semantic routing contract and deterministic admission policy;
- UX, customer Admin and platform Admin;
- customer-facing product state that has genuine Wandora business meaning.

### Paperclip-owned operational authority

Where Paperclip already provides the capability, Wandora should not build a parallel copy. Paperclip should remain the operational authority for:

- agent lifecycle;
- operational agent identity/materialization;
- hierarchy / manager / reports-to relationships;
- operational teams and subagents;
- tasks and delegation;
- runs and run lifecycle;
- runtime execution state;
- operational budgets and costs;
- operational trust / permissions;
- effective tool access;
- Connections;
- grants;
- secret custody associated with provider execution;
- tool catalog/profile/policy application;
- Tool Gateway authorization/execution/audit;
- operational activity and audit evidence;
- other provider-native workforce control-plane state.

The exact ownership of any future capability must still pass the Capability Authority / Reuse Gate before implementation.

### Mastra

Mastra remains a replaceable specialist runtime/workflow provider behind Wandora/Paperclip contracts. It must not become the customer-facing semantic authority, and Wandora must not internalize Mastra-like workflow/runtime capabilities merely for portability.

### JEV / TypeSafe

JEV is a probabilistic semantic/judgment provider, not authorization authority.

The qualified direction in PR #369 is:

```text
customer request
   |
Wandora Core
   |
SemanticDecisionProvider
   |
TypeSafe / JEV
   |
structured semantic decision
   |
Wandora deterministic gate
   |
qualified execution path
```

Wandora still owns:

- the `BusinessCapability` vocabulary;
- what capabilities are currently advertised to the request;
- business authorization;
- deterministic Fast Read thresholds;
- whether a semantic result is sufficient to dispatch;
- all final admission gates.

JEV/TypeSafe must remain replaceable behind `SemanticDecisionProvider`.

## Projection and Command Plane principle

The customer/admin panel may show and control Paperclip-owned operational state without copying that state into a parallel Wandora operational database.

Use two provider-neutral API families in Wandora Core.

### Projection APIs

Projection means Wandora presents a product-oriented view of provider-owned state.

Example:

```text
Paperclip
  |- agents
  |- hierarchy
  |- tasks
  |- runs
  |- costs
  |- budgets
  |- tools
  |- audit/activity
       |
       | provider adapter / contract
       v
Wandora Core
       |
       v
Wandora Admin / customer panel
```

The UI may transform provider state into customer-friendly concepts, but the operational source of truth remains Paperclip.

Examples of customer-facing projections:

- Ana's current status;
- team/specialist structure;
- current budget and usage;
- tasks and recent runs;
- tools/capabilities currently available;
- operational activity/audit history;
- current connection readiness.

Projection is **not** a durable mirror.

### Command APIs

Wandora may also issue authorized product commands that mutate provider-owned state.

Example:

```text
Wandora Admin
   |
Wandora Core
   |
auth + tenant + entitlement + policy
   |
provider-neutral command
   |
Paperclip adapter/API
   |
Paperclip state changes
   |
readback/projection
   |
Admin refreshed
```

Possible future command families include:

- set/change operational budget;
- assign manager;
- create a specialist/subagent;
- assign task;
- change operational trust/permission configuration;
- install/enable an integration capability;
- adjust effective tool access;
- materialize a package/team composition.

The browser should not hold Paperclip credentials or depend directly on provider-private APIs.

A successful command should be followed by provider readback where the customer experience needs confirmation. Wandora should not write a second operational copy merely to remember what it asked Paperclip to do.

## Integration Hub conclusion

The Integration Hub is one of the primary premium differentiators of Wandora.

Its product responsibility is to let a company connect ERP/CRM/WhatsApp/e-mail/business systems and expose useful **business capabilities** to digital employees.

The customer should see concepts such as:

```text
VendaERP connected
Ana may:
- search products
- read prices
- read stock
- search customers
- search orders
```

Provider-specific tool names remain implementation details.

Operationally, Paperclip may continue to own Connections, grants, secrets, installed tools, profiles and run-scoped Tool Gateway authorization.

Therefore:

```text
Wandora Hub semantic capability
            |
            v
Paperclip operational connection/tool
            |
            v
provider API
```

Wandora must not create a duplicate Connection/tool/secret registry merely to make the UI convenient.

## Persona and behavior conclusion

Paperclip is strong at operational workforce state, but the employee's commercial identity/persona is a Wandora product concern.

Wandora should own the canonical employee persona/behavior contract, for example:

- tone of voice;
- language;
- sales posture;
- communication style;
- escalation behavior;
- customer-facing boundaries;
- enterprise-specific rules;
- approval behavior;
- product/brand instructions.

That configuration may later be projected into the qualified runtime/adapter, but it should not become irretrievably Paperclip- or model-provider-owned.

This preserves the identity of “Ana” across runtime/provider replacement.

## Commercial packaging direction

The architecture naturally supports product packages without rebuilding workforce execution.

A commercial package can be modeled as Wandora entitlements/policies that are materialized into Paperclip operational configuration.

Examples:

### Starter

- one digital employee;
- bounded integrations;
- limited operational budget;
- read-oriented capabilities;
- no or very limited subagent creation;
- simplified audit/customer view.

### Business

- Ana plus selected specialists;
- more integrations;
- higher operational budget;
- supervised writes where qualified;
- richer audit/projection surface.

### Enterprise

- multiple digital employees;
- department/team compositions;
- hierarchy and delegation;
- budget/policy boundaries by role/team;
- advanced approval rules;
- advanced operational audit projection;
- broader integrations;
- provider-neutral business policies and entitlements.

The package contract is Wandora-owned. The operational workforce materialization should reuse Paperclip when Paperclip already owns the relevant state/capability.

## Immediate commercial objective: ProRevest Tintas demo

The urgent customer proof is not “support the whole VendaERP API”.

The urgent proof is:

```text
WhatsApp
  |
  v
Ana
  |
  +--> product lookup
  +--> real price lookup
  +--> deterministic quote composition
```

The demonstration should prove:

1. a customer can ask naturally for a product over WhatsApp;
2. Ana understands the request semantically;
3. the correct provider-neutral BusinessCapability is selected;
4. an authorized Fast Read reaches the real VendaERP connection;
5. the customer receives real product/price data;
6. multiple items/quantities can be composed into a simple quote;
7. quote arithmetic is deterministic, not free-form LLM arithmetic;
8. V1 does not need to create/write the quote back into VendaERP.

The first quote capability should remain read-only with respect to ERP state. A later ERP-write flow requires separate business authorization, approval and audit qualification.

## Execution priority

### Priority 1 — Finish JEV runtime wiring

Complete the already-qualified `TypeSafeJevSemanticDecisionProvider` runtime wiring behind a disabled-by-default configuration and existing secret-custody pattern.

Acceptance intent:

- real authenticated customer request can reach the provider-neutral semantic decision path;
- JEV/TypeSafe is called at most once per semantic admission;
- zero retries;
- fail closed on timeout/network/malformed result;
- no Paperclip/VendaERP dispatch when semantic admission fails;
- no production activation until the normal code-only CI and subsequent production preflight authorize it.

### Priority 2 — Finish real Fast Read path and instrument latency

Connect the qualified semantic admission to the qualified Organization Adapter Fast Read bridge and Paperclip execution path.

Instrument the major timing boundaries so end-to-end latency can be explained rather than guessed:

```text
WhatsApp/Gateway ingress
Core auth/context
JEV semantic decision
Paperclip dispatch
VendaERP tool/API
Paperclip terminal result
Core response
WhatsApp outbound
```

The purpose is to identify the actual bottleneck before adding optimization layers.

### Priority 3 — ProRevest WhatsApp Product + Price Demo V1

Qualify and activate only the minimum real capabilities needed for the demo:

- product search;
- product price.

The customer experience should support requests such as:

- “Vocês têm a tinta X?”
- “Quanto custa a tinta X de 18 litros?”
- “Me mostra opções de esmalte.”
- “Qual o valor deste produto?”

Real provider data must be the source of product/price facts.

### Priority 4 — ProRevest WhatsApp Quote V1

Add a bounded quote composition layer over real read-only product/price facts.

Example:

```text
3 x Produto A
2 x Produto B
      |
deterministic arithmetic
      |
subtotal / total
      |
customer-safe WhatsApp response
```

Rules:

- item identity and unit price come from qualified ERP reads;
- quantities come from the user request/context;
- subtotal/total are computed deterministically;
- no LLM free-form money arithmetic;
- no ERP quote/order mutation in V1;
- no write/destructive provider capability is enabled merely for the demo.

### Priority 5 — Workforce Projection & Command Plane V1

After the demo-critical path is working, define and qualify the provider-neutral read/command contracts that let Wandora Admin project and control Paperclip-owned workforce state without duplicating it.

First candidates for review:

- hierarchy/team;
- current status;
- tasks;
- runs;
- budgets/costs;
- operational permissions/trust;
- tools/integration readiness;
- operational audit/activity.

Before implementing each surface, prove that the state belongs to Paperclip or Wandora under the Reuse Gate.

### Priority 6 — VendaERP Read-Only Capability Expansion

Expand beyond product/price only after the demo path is stable.

Prefer business-capability families, not endpoint-by-endpoint product semantics.

Candidates include:

- stock;
- price tables;
- people/customers/suppliers;
- orders;
- companies;
- opportunities;
- other useful read-only commercial/financial views.

Each capability must map provider-specific operations into stable provider-neutral Wandora semantics.

### Priority 7 — ERP write capabilities

Only after business authorization, approval, audit and effect policies are qualified.

Possible future examples:

- create/update quote/proposal;
- create/update order;
- customer/party updates;
- other ERP mutations.

Classify writes by consequence and require appropriate human approval where necessary. Destructive operations remain separately gated and must never be enabled as an accidental consequence of broad integration access.

### Priority 8 — Commercial package materialization and Enterprise workforce controls

Use Wandora plans/entitlements to drive authorized Paperclip workforce commands/projections for:

- packaged teams;
- specialists;
- departmental structures;
- budgets;
- trust levels;
- approval modes;
- audit retention/presentation;
- integration/capability availability.

Do not introduce parallel lifecycle/hierarchy/budget/run systems in Wandora to implement package differentiation.

## Things explicitly not to do now

Do not:

- expand all VendaERP operations merely because they exist in Swagger;
- enable ERP writes to make the first ProRevest demo look more complete;
- build a Wandora agent lifecycle engine;
- build a parallel Wandora task/run engine;
- build a second tool registry;
- mirror Paperclip Connections/grants/secrets/catalog/health into Wandora durable state;
- let the frontend call Paperclip directly with provider credentials;
- make JEV authoritative for authorization;
- make Mastra authoritative for Wandora product semantics;
- move employee personality into provider-private state as its only canonical representation;
- optimize response latency before measuring the actual stage-by-stage latency.

## Architecture shorthand

Use the following language in future design discussions unless newer canonical evidence supersedes it:

- **Wandora** = Product & Business Layer.
- **Paperclip** = Digital Workforce Engine / operational workforce control plane.
- **Mastra** = replaceable runtime/workflow specialist.
- **JEV/TypeSafe** = replaceable probabilistic semantic decision provider.
- **Integration Hub** = provider-neutral business-system connectivity/capability product layer.
- **Projection** = customer-facing view derived from provider-owned operational state without creating a parallel durable mirror.
- **Command** = authorized Wandora product intent translated through a provider adapter into provider-owned state mutation.
- **BusinessCapability** = Wandora semantic vocabulary, never a provider tool-name registry.

## Review result

A second adversarial JEV review was performed before recording this checkpoint.

Result:

- `deep_review`: 0.44;
- `proceed_fast`: 0.43;
- `split_task`: 0.07;
- `block`: 0.06.

Interpretation: the direction is not blocked, but the boundary is architecturally significant enough that implementation should remain sliced, evidence-driven and provider-reuse-first. This document therefore records the decision/order only; it does not authorize production effects.

## Next executable work

The next executable technical work remains the already-identified **SemanticDecisionProvider runtime wiring V1 — CODE ONLY / NO PRODUCTION EFFECT**, followed by measured Fast Read convergence.

After that, prioritize the minimum Product + Price WhatsApp demonstration for ProRevest Tintas, then deterministic Quote V1.

Broader Workforce Projection & Command Plane and wider VendaERP expansion follow after the demo-critical path is proven.
