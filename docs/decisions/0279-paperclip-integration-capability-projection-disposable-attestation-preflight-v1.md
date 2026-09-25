# ADR 0279 — Paperclip Integration Capability Projection + Disposable Attestation Preflight V1

Status: **PREFLIGHT COMPLETE / SAFE READ BOUNDARY GAP IDENTIFIED / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0278 established the Wandora-owned Integration Capability Plane as a projection rather than a registry.

The next question is how to populate that projection from Paperclip-native operational state while preserving the permanent provider-pluggability guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

The target operational facts are already Paperclip-owned:

- Tool Applications;
- Tool Connections;
- Connection grants;
- installs;
- Tool Catalog;
- Tool Profiles / policy;
- connection health/readiness;
- run-scoped Tool Gateway authorization and audit.

The desired output remains Wandora-owned and provider-neutral:

- which business-system capabilities the integration implementation supports;
- which capabilities are currently available to the organization;
- which capabilities survive the final run-scoped authorization intersection for Fast Read.

## REAL NOW / proven evidence

Before this preflight:

- Wandora `main@f5ab044433427248ee4402fbb451f70e3305db8a`;
- PR #363 merged from exact head `9b67e60873617eee2edd9d5e7b4f7e96fc22c517`;
- exact PR head completed 8/8 GitHub-hosted workflows GREEN under ADR 0158;
- no production deployment or runtime mutation occurred;
- Core, Paperclip, Web, Messaging Gateway, `wandora-jev-mcp` and Remote-Ops-MCP were healthy;
- Paperclip Task Drain was OFF/quiescent with zero active runs and zero pending wakes;
- 28PRO had no temporary Tool Policies remaining.

Pinned production Paperclip source proves Board-authenticated read routes for:

- `GET /api/companies/:companyId/tools/applications`;
- `GET /api/companies/:companyId/tools/connections`;
- `GET /api/tool-connections/:connectionId/grants`;
- `GET /api/tool-connections/:connectionId/catalog`;
- connection health/check/activity routes;
- Tool Profile routes.

The pinned Paperclip plugin SDK `PluginContext` does **not** expose a Tool Connection/catalog/health read client.

Relevant SDK surfaces are:

- `ctx.authorization.grants`: principal permission grants, not Tool Connection grants;
- `ctx.authorization.policies`: authorization policy records, not Tool Profiles/Connection catalog;
- `ctx.tools.register`: registers plugin-contributed agent tools only.

Therefore neither the Organization Adapter plugin nor another normal Paperclip plugin can currently derive the full Integration Capability Projection through stable SDK calls.

## Reuse Gate

### Semantic authority — Wandora

Wandora continues to own:

- provider-neutral integration meaning;
- `BusinessCapability`;
- customer/product capability projection;
- semantic route/Fast Read policy;
- the rule that runtime authorization can only narrow capability availability.

### Durable product state

No new durable state is justified.

This ADR does not authorize:

- integration table;
- connection mirror;
- health/readiness table;
- grants mirror;
- Tool Catalog copy;
- Tool Profile copy;
- tool-to-capability registry state;
- secret/credential copy.

### Operational authority — Paperclip

Paperclip remains authority for all connection/tool operational state.

### Provider implementation

VendaERP/MCP remains the first business-system implementation only.

### Replacement boundary

A future Paperclip-safe read adapter may change if Paperclip is replaced. Wandora `BusinessCapability` and customer projection remain stable.

## Gap

There is a real read-boundary gap:

```text
Paperclip operational integration state
  -> currently readable through Board-auth routes
  X no stable plugin SDK read surface for Connections/catalog/Tool Profiles/health
  -> Wandora integration capability projection
```

The absence of a convenient read surface is **not** evidence that Wandora should internalize the operational state.

## Decision

### NO-GO — Core with Board credential

Wandora Core must not gain a Paperclip Board/admin credential merely to read Applications/Connections/catalog/grants/health.

Reasons:

- widens the Core trust boundary;
- bypasses the intended provider adapter boundary;
- couples Core to Paperclip Board API authorization semantics;
- creates a high-value administrative credential in a customer execution service;
- weakens provider replaceability.

### NO-GO — plugin state mirror

The Organization Adapter must not periodically copy Paperclip Connections/catalog/health/grants into `plugin.state` or a Wandora table.

That would create a second source of truth and stale lifecycle/readiness semantics.

### NO-GO — new Wandora registry

Do not introduce an integration registry or tool registry to compensate for the missing safe read surface.

### GO — explicit operational read adapter boundary

The next implementation, if pursued, must be one of:

1. a Paperclip-supported stable read capability/API specifically suitable for service/plugin integration;
2. a narrowly scoped provider-side adapter that reads Paperclip-owned operational state without exposing Board authority to Core;
3. a newer Paperclip SDK surface exposing the required read-only facts;
4. another accepted specialist provider boundary with equivalent semantics.

The adapter output must be a bounded, provider-neutral snapshot consumed by ADR 0278's projection contract.

## Minimum safe adapter contract

A future provider-side snapshot may expose only normalized facts such as:

```ts
type IntegrationOperationalSnapshot = {
  integrationKind: 'business_system';
  displayName: string;
  readiness: 'ready' | 'not_ready' | 'unknown';
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  supportedCapabilities: BusinessCapability[];
  organizationEnabledCapabilities: BusinessCapability[];
};
```

It must not expose:

- Paperclip Board token;
- secrets or secret refs;
- raw grant IDs;
- raw catalog entry IDs;
- provider credentials;
- raw provider tool names as customer contract.

Provider-specific tool names may exist inside the adapter implementation solely to map operational catalog entries to `BusinessCapability`.

## Runtime authorization remains separate

Even when an organization-level snapshot exists, Fast Read still uses the current run's Tool Gateway-authorized tools as the final operational gate.

```text
integration supports capability
  AND organization projection says available
  AND current run Tool Gateway authorizes exactly one binding
  => Fast Read may execute
```

Organization availability never grants runtime authority by itself.

## Wandora API Inspector / OpenAPI role

The retained VendaERP OpenAPI and Wandora API Inspector remain development-time provider evidence:

- discover provider operations;
- verify method/schema/casing;
- support provider-tool-to-`BusinessCapability` mapping.

They do not become runtime connection, grant, health or authorization authority.

## Semantic decision plugin / JEV role

`wandora-paperclip-semantic-decision-plugin` remains post-Issue/advisory.

`wandora-jev-mcp` remains outside the Integration Capability Plane operational path.

Neither is a substitute for Paperclip connection/catalog/readiness state.

## Second adversarial review

The proposed direct implementation was challenged with:

- Can the Organization Adapter read Connections/catalog safely through the Paperclip SDK?
- Are generic `ctx.authorization.grants` equivalent to Tool Connection grants?
- Does `ctx.tools` provide catalog introspection?
- Would Core need Board/admin authority?
- Would mirroring into `plugin.state` create a second source of truth?
- Would a new Wandora registry merely hide the same duplication?

Findings:

- plugin SDK has no equivalent Connection/catalog/health read surface;
- generic authorization grants are a different authority;
- `ctx.tools` is registration-only;
- Core Board credential would violate the intended trust/provider boundary;
- state mirroring would duplicate operational authority.

Therefore implementation was intentionally stopped before code.

## Smallest disposable attestation still required

Once a safe operational read adapter exists, the minimum disposable E2E must prove:

1. one synthetic Paperclip Application/Connection/catalog/grant/profile setup exists only in disposable Paperclip state;
2. the safe adapter returns a bounded provider-neutral operational snapshot;
3. ADR 0278 projects canonical `BusinessCapability[]`;
4. not-ready/revoked provider state projects zero available organization capabilities without any Wandora write;
5. a run-scoped Tool Gateway session returns currently authorized read tools;
6. runtime capability is the strict intersection with organization availability;
7. zero model call;
8. zero provider/customer call;
9. zero Wandora persistence;
10. teardown leaves no operational state.

## Effect boundary

```text
code implementation = 0
new migration/table = 0
new integration registry = 0
new tool registry = 0
Core Board credential = 0
plugin state mirror = 0
Paperclip mutation = 0
VendaERP call = 0
JEV/model call = 0
customer work = 0
outbound = 0
production effect = 0
```

## Next decision

Before implementing the disposable attestation, qualify the **safe Paperclip operational read boundary**.

Preferred order:

1. check whether a newer accepted Paperclip release/SDK already exposes read-only Connections/catalog/profile/health access;
2. if not, design the narrowest Paperclip-side read adapter without copying operational state and without Board authority leaking into Core;
3. only then implement the disposable integration capability attestation.

ADR 0279 is **PREFLIGHT COMPLETE / SAFE READ BOUNDARY GAP IDENTIFIED / NO PRODUCTION EFFECT**.
