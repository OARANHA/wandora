# ADR 0209 — Business-System Read Execution Boundary Capability Preflight V1

Status: **GO FOR PAPERCLIP NATIVE CONNECTOR IMPLEMENTATION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0208 proved that Paperclip v2026.916.0 can represent Business System Connections, installs/grants and secret-backed credentials, but its generic Tool Gateway does not execute `rest_api` connections. That use remains NO-GO.

This preflight evaluates only provider-side/reuse execution boundaries. It must not create real VendaERP credentials, connections, grants, provider calls, production deployments or Wandora-native tool infrastructure.

## REAL NOW

At entry:

```text
main = 689908c7891f09dec12868665bd0682ba1ac96ae
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
Paperclip pinned source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
28PRO Paperclip Tool Connections = 0
28PRO Paperclip Connection Grants = 0
```

Core, Web, Paperclip and Messaging Gateway are healthy. 28PRO remains starter-workforce ready and ERP-unconnected.

## OPTION 1 — newer stable Paperclip generic REST gateway

The upstream stable release newer than the live pin is v2026.916.1. Its release notes describe a task-conversation messaging fix only, with no migrations, configuration changes or API changes.

No evidence was found that v2026.916.1 adds generic `rest_api` execution to Tool Gateway.

Therefore an upgrade from v2026.916.0 to v2026.916.1 would not close ADR 0208's execution gap and is not justified for this capability.

Result: **REJECTED AS GAP CLOSURE**.

## OPTION 2A — standalone Paperclip plugin tool

Pinned Paperclip v2026.916.0 Plugin SDK proves provider-side primitives for:

- `agent.tools.register`;
- `secrets.read-ref`;
- `http.outbound`;
- run-scoped tool context;
- host-side Tool Gateway policy decision and audit around plugin-tool execution;
- argument/result content validation.

A plugin can therefore execute a narrow outbound REST call while resolving a Paperclip secret at call time.

However a standalone plugin tool does not, by itself, prove reuse of the accepted `ToolConnection` install/grant lifecycle. Using plugin config + tool policy as a second organizational connection authority would weaken ADR 0203/0208.

Result: **REJECTED AS THE COMPLETE BOUNDARY**.

The Plugin SDK remains useful evidence that Paperclip can safely host provider-side HTTP execution, but it is not the selected ownership model for VendaERP connection assignment.

## OPTION 2B — Paperclip native connector contribution

Pinned Paperclip v2026.916.0 already contains the native connector runtime pattern.

The reviewed implementation:

- declares trusted connector tool definitions server-side;
- resolves resources for an exact `companyId + agentId`;
- rechecks assignment before every tool execution;
- runs the provider call inside Paperclip;
- exposes tools through Paperclip's Tool Gateway policy/audit path;
- keeps connector skills runtime-only rather than making them durable Wandora product state.

The same pinned source also proves `toolConnectionInstalls` with `company` and `agent` targets, and existing services use those installs as the consent/assignment boundary for provider-backed capabilities.

This pattern preserves:

```text
Wandora semantic/read policy
-> Paperclip ToolConnection
-> Paperclip connection install/grant
-> Paperclip-custodied secret refs
-> Paperclip native connector tool
-> bounded provider HTTP request
-> VendaERP
```

No secret value needs to cross into Wandora Core, Web, durable Wandora tables or a model prompt.

## Upstream corroboration

Current Paperclip upstream is independently moving REST-only connected applications toward the same pattern.

A public TypeSafe connection proposal explicitly states that a generic `rest_api` catalog card is unsuitable because the connected MCP gateway cannot execute it, and proposes a native connector contribution whose credential remains in Paperclip custody, whose tool is assigned by connection/install state, and whose assignment is rechecked on every call.

This upstream direction is corroborating evidence only. The Wandora decision remains grounded in the exact pinned v2026.916.0 primitives already inspected.

## Selected boundary

**GO for a Paperclip native VendaERP read connector candidate.**

The connector is provider implementation, not Wandora semantic authority.

It must remain behind the existing Wandora `BusinessSystemReadProvider` semantic contract and must not leak Paperclip connection IDs, VendaERP endpoint names or provider DTOs into customer-facing contracts.

## Required implementation shape

The next code-only candidate must expose exactly the ADR 0202 V1 read operations:

1. connection probe;
2. list companies;
3. search products;
4. read product stock;
5. list price tables;
6. read product prices;
7. search parties;
8. search orders.

The connector must enforce all of the following independently of tool naming:

- fixed HTTPS VendaERP base origin;
- fixed allowlisted GET routes only;
- no caller-supplied URL;
- no caller-supplied HTTP method;
- no POST/PUT/PATCH/DELETE;
- no provider endpoint pass-through;
- bounded pagination;
- no automatic retries;
- deterministic timeout;
- exactly three secret-backed headers:
  - `Authorization-Token`;
  - `User`;
  - `App`;
- secret refs resolved inside Paperclip at execution time;
- no secret values in result, logs, activity metadata, model-visible skill text or durable Wandora state;
- output projected to bounded provider-neutral DTOs before leaving the connector boundary.

## Tool Gateway policy caveat

Plugin/native tools in v2026.916.0 derive default risk classification partly from tool names.

The implementation must not rely on this heuristic as the security boundary.

Tool names should still be unambiguously read-oriented, but read-only safety must be proved by connector code and tests that reject mutation methods/routes and arbitrary URLs.

Tests must additionally prove the eight exposed tools are classified as read by the pinned Tool Gateway so a provider upgrade cannot silently change policy semantics unnoticed.

## Connection/install/grant rule

28PRO already has the correct Paperclip company and Ana.

The candidate must reuse them.

No second Paperclip company or employee is permitted.

The future connection object is company-scoped. Initial installation may be organization/company-scoped only if that matches the intended customer authorization policy; an agent-targeted install for Ana may be used when narrower assignment is desired.

Credentials belong to the connection/secret boundary, never to the employee.

## Capability authority

### Semantic authority

Wandora owns:

- Business System / ERP vocabulary;
- tenant authorization;
- provider-neutral read operations;
- read/write policy;
- mobile/conversational identity authorization;
- external-effect authorization.

### Durable product state

No new Wandora integration table, credential table, tool registry or execution ledger is approved.

Minimum Wandora state remains stable bindings/policy/reconciliation evidence only when separately proven necessary.

### Operational authority

Paperclip owns:

- connection identity;
- connection installs/grants;
- secret custody;
- provider-side connector assignment;
- connector tool governance/audit.

### Runtime authority

Mastra remains the general agent/runtime execution provider.

This connector is a specialist provider-side tool implementation reached through the Paperclip-governed tool boundary; it does not make Paperclip the owner of Wandora's Business System semantics.

### Provider implementation

VendaERP is the first ERP provider only.

## Replacement boundary

If Paperclip is replaced, the Wandora `BusinessSystemReadProvider` contract stays stable.

Only connection/grant/secret implementation, provider-side connector execution and provider bindings migrate.

If VendaERP is replaced, only the ERP adapter/connector implementation and credentials change.

No customer-facing API should need Paperclip or VendaERP identifiers.

## SECOND ADVERSARIAL REVIEW

The first tempting solution was a standalone Paperclip plugin because its SDK already exposes tool registration, secret resolution and outbound HTTP.

That was rejected because it did not independently prove reuse of Paperclip Connection install/grant authority.

The second challenge was to upgrade Paperclip first. That was rejected because v2026.916.1 does not close the generic REST gateway gap.

The remaining native connector pattern survives the review because it:

- reuses the accepted Paperclip operational state rather than introducing another connection authority;
- keeps secret values provider-side;
- keeps execution provider-side;
- can expose only a hardcoded read allowlist;
- can be replaced without changing Wandora customer semantics.

## Effect boundary

This preflight performs no:

- Paperclip upgrade;
- production image build or deployment;
- migration;
- VendaERP Connection;
- Connection Grant/install mutation;
- new secret;
- real credential entry;
- VendaERP request;
- Mastra/model run;
- customer work;
- outbound effect.

## Decision

**PREFLIGHT GREEN.**

The next slice is:

**Paperclip VendaERP Native Read Connector Candidate V1 — CODE ONLY / NO EFFECT**

That slice must implement and test the provider-side connector against the exact pinned Paperclip source without changing production.

A separate activation preflight remains mandatory after the candidate is exact-head GREEN. Only then may 28PRO real credentials be requested.
