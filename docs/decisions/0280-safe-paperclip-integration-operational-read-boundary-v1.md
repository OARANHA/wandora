# ADR 0280 — Safe Paperclip Integration Operational Read Boundary V1

Status: **BOUNDARY QUALIFIED / NATIVE CURRENT-STABLE INSUFFICIENT / ADAPTER IMPLEMENTATION DEFERRED / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0279 identified a precise gap: Wandora needs a bounded, read-only, provider-neutral view of Paperclip-owned integration operational state without placing Paperclip Board/admin authority in Core and without mirroring Connections, catalog, grants, profiles or health into Wandora-owned state.

This slice first re-ran the Reuse Gate against a specific acceptable Paperclip release before authorizing any adapter code.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW

Repository/runtime reconciliation before any effect proved:

- Wandora `main@a383cd750e1602f93d4348a47fa0ad96dd612783`;
- PRs open = 0;
- production Paperclip = `wandora/paperclip:v2026.916.0`;
- Core, Paperclip, Web, `wandora-jev-mcp` and Remote-Ops-MCP healthy;
- Paperclip Task Drain OFF, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`;
- no customer/provider/model call or production mutation occurred.

## Native capability qualification

The newest acceptable stable Paperclip release inspected was:

- tag `v2026.916.1`;
- commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- release notes classify it as a patch over `v2026.916.0` with no migrations, configuration changes or API changes.

Exact-tag source inspection proves two distinct capability classes.

### Native run-scoped Connection Intents exist

`v2026.916.1` exposes runtime-authenticated connection intent operations:

- `connections_search`;
- `connection_request`;
- `/runtime-tools/connections/search`;
- `/runtime-tools/connections/request`.

They validate run-scoped runtime claims and are useful for an agent to discover/request a service connection.

Their safe result vocabulary intentionally contains bounded service/availability metadata.

### They do not solve the Integration Capability Plane operational read

The organization-level facts needed by ADR 0278 remain on Board-authenticated routes, including:

- `GET /companies/:companyId/tools/connections`;
- `GET /tool-connections/:connectionId/grants`;
- `GET /tool-connections/:connectionId/catalog`;
- `GET /companies/:companyId/tools/profiles`;
- `GET /companies/:companyId/tools/profiles/effective/agents/:agentId`;
- `GET /companies/:companyId/tools/runtime-health`.

The exact `v2026.916.1` `PluginContext` still has no `connections`, catalog, Tool Profile or runtime-health read client.

Relevant SDK surfaces remain different authorities:

- `ctx.authorization.grants` = principal authorization grants, not Tool Connection grants;
- `ctx.authorization.policies` = principal authorization policy, not Tool Profiles/catalog availability;
- `ctx.tools` = plugin-contributed tool registration, not host Tool Catalog introspection.

Therefore `v2026.916.1` does **not** provide a stable native SDK/API suitable for the complete safe organization operational snapshot.

## Why Connection Intents are not a substitute

Using Connection Intents as the Integration Capability Plane source was rejected because it would:

- require/assume run identity for an organization-level product projection;
- conflate connection discovery/request with operational capability availability;
- omit full catalog/profile/grant/runtime-health evidence;
- still fail to answer the ADR 0278 organization projection contract;
- risk turning a run-scoped capability into organization authority.

Connection Intents remain Paperclip-owned run-time assistance, not Wandora product capability authority.

## Second adversarial review

The design was attacked against the mandatory risks.

### Rejected: Core + Board credential

Still violates the trust/provider boundary and creates unnecessary administrative authority in customer execution.

### Rejected: direct Paperclip database read

Although read-only, direct DB coupling would bind Wandora to Paperclip schema details, bypass Paperclip service policy/filtering and turn provider internals into an implicit contract.

### Rejected: plugin.state or Wandora snapshot persistence

This would create a stale shadow database for Connections/catalog/grants/health.

### Rejected: provider tool names as product semantics

Tool names may be known only inside the eventual provider adapter mapping. They must never become Wandora customer semantics or the `BusinessCapability` registry.

### Rejected: current Organization Adapter pretending generic SDK grants are Connection grants

Those are different authorities and cannot be substituted.

### Accepted boundary shape

The narrowest acceptable boundary is **Paperclip host-owned, read-only, capability-gated operational projection** exposed to a Paperclip-side adapter/plugin integration, with no Board token crossing into Core.

The implementation must read current Paperclip service-owned state at request time and return only bounded normalized facts. It must not persist or mirror the provider state.

Because current stable Paperclip does not expose this host capability to normal plugins, implementing it requires a dedicated provider-side extension/patch qualification. That is a distinct slice and is not smuggled into this ADR.

## Contract that remains stable

Wandora-owned output remains equivalent to:

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

- Board/admin credentials;
- provider credentials or secret refs;
- raw Tool Connection grant IDs;
- raw catalog entry IDs;
- raw provider tool names as product contract;
- Paperclip lifecycle objects as Wandora durable state.

## Required derivation rules

### supportedCapabilities

Derived from the replaceable provider adapter's explicit, versioned mapping of implementation operations/tools to the finite Wandora `BusinessCapability` vocabulary, intersected with what is actually present in the current Paperclip catalog.

This is code/config mapping inside the provider adapter, not a durable Wandora registry.

### organizationEnabledCapabilities

Derived at read time from current Paperclip operational evidence:

- active/enabled connection;
- usable organization grant/install;
- current catalog availability;
- effective profile/policy availability;
- readiness/health fail-closed rules.

It can only narrow `supportedCapabilities`.

### readiness / health

Readiness or health may remove a capability from organization availability. They never grant authorization.

### run authorization

The current run's Tool Gateway authorization remains separate and final. A run may execute Fast Read only when:

```text
provider supports capability
AND organization projection says capability available
AND current run Tool Gateway authorizes the exact runtime read binding
=> Fast Read may execute
```

No organization snapshot can widen run authority.

## Multiple providers

Multiple providers may independently project the same `BusinessCapability`.

Provider identity remains routing/correlation evidence inside the replaceable adapter boundary. Wandora semantic authority remains the capability itself plus Wandora policy. Provider IDs do not become semantic authority.

When more than one provider can satisfy a capability, selection requires an explicit Wandora routing/policy decision; availability alone must not silently choose or broaden authorization.

## Other components

- Wandora API Inspector remains development/qualification tooling only. It has no runtime authority.
- JEV has no role in this operational-read slice.
- `wandora-paperclip-semantic-decision-plugin` requires no change.
- Mastra requires no change.
- VendaERP requires no live call and remains a replaceable business-system implementation.

## Persistence decision

No Wandora-owned persistence is justified.

Required live state remains provider-owned. Wandora may cache nothing durably merely to make the read convenient.

## BusinessCapability non-registry proof

`BusinessCapability` remains a finite semantic vocabulary. It does not store:

- tool name;
- catalog entry ID;
- Connection ID;
- grant ID;
- health state;
- provider credential;
- provider lifecycle.

Tool-to-capability mapping belongs only inside the provider adapter implementation.

## Replacement boundary

If Paperclip is replaced:

- Wandora `BusinessCapability`;
- ADR 0278 capability projection;
- Fast Read intent;
- customer-facing integration semantics

remain unchanged.

Only the operational-read adapter and migration/reconciliation of provider-owned operational state change.

## Decision

**NO-GO for adapter implementation in this slice.**

Reason: current accepted Paperclip stable `v2026.916.1` is still insufficient, and a correct implementation requires a separately qualified Paperclip host/plugin read capability. Implementing a direct DB reader, Core Board client, shadow registry or state mirror would violate the Reuse Gate.

The next slice must be:

**Paperclip Host Operational Read Capability Extension Preflight V1 — CODE ONLY / NO PRODUCTION EFFECT**

It must qualify the smallest provider-side SDK/host extension that can expose safe read-only Connection/catalog/grant/profile/health facts to a normal plugin without Board authority.

Only after that boundary is proven may the ADR 0279 disposable integration-capability attestation be implemented.

## Effect boundary

```text
Paperclip production upgrade = 0
Paperclip production patch   = 0
Core change                  = 0
migration/table              = 0
Board credential in Core     = 0
provider-state mirror        = 0
plugin.state shadow DB       = 0
VendaERP/customer call       = 0
model/JEV call               = 0
customer work                = 0
outbound                     = 0
production effect            = 0
```

ADR 0280 is **BOUNDARY QUALIFIED / NATIVE CURRENT-STABLE INSUFFICIENT / ADAPTER IMPLEMENTATION DEFERRED / NO PRODUCTION EFFECT**.
