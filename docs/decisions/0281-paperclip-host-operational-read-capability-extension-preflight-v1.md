# ADR 0281 — Paperclip Host Operational Read Capability Extension Preflight V1

Status: CODE COMPLETE / FOCUSED CI REQUIRED / NO PRODUCTION EFFECT
Date: 2026-09-25

## Context

ADR 0280 proved that Paperclip v2026.916.1 has useful run-scoped Connection Intents but still lacks a normal-plugin SDK surface for the organization operational facts required by the Wandora Integration Capability Plane.

The missing facts remain Paperclip-owned:

- Tool Connections;
- Connection grants/install availability;
- Tool Catalog;
- effective Tool Profile availability for one agent;
- Tool runtime health.

Core Board credentials, direct provider-DB reads, Wandora mirrors, and plugin.state shadow state were already rejected.

Permanent guardrail:

Portabilidade = desacoplamento do contrato, não duplicação da implementação.
Provider replacement não implica internalização.

## REAL NOW

Before implementation:

- Wandora main = d19aeaa96780a0846a34b73e3faf7c7383fe6b5e;
- production Paperclip remained wandora/paperclip:v2026.916.0;
- Core/Web/Paperclip/JEV/Remote-Ops were healthy;
- Task Drain was OFF with activeRuns=0, pendingWakes=0, quiescent=true;
- no provider/model/customer/outbound effect was authorized or performed.

The implementation laboratory used the exact accepted Paperclip candidate:

- release v2026.916.1;
- commit d554c4789ed3930f8a53ac9fdf6503b3187097da.

## Proven host seam

Paperclip already has the correct enforcement machinery:

1. plugin manifests declare PluginCapability values;
2. worker-to-host methods use typed JSON-RPC over the existing stdio bridge;
3. createHostClientHandlers() gates each method by manifest capability;
4. nested worker-to-host calls carry only a host-issued invocation id;
5. the host reconstructs the invocation company scope and rejects cross-company reads;
6. buildHostServices() is the existing service-adapter boundary for plugin SDK reads.

No second API server, Board impersonation mechanism, or plugin-owned operational store is required.

## Decision

Add one Paperclip host-owned read capability:

tools.operational.read

and one narrow plugin SDK surface:

ctx.toolAccess.readOperationalSnapshot({ companyId, agentId })

The implementation is retained as a patch over the exact Paperclip candidate at:

integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch

Patch SHA-256:

fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb

## Output boundary

The host returns only a bounded operational projection:

- runtime health category;
- connection display label;
- connection status/enabled/health;
- whether an active organization grant exists;
- whether the connection is installed for the requested agent;
- catalog tool name plus risk/status/read/write/destructive flags;
- whether the exact catalog entry is admitted by the agent's effective Tool Profile.

It does not return:

- Board/admin token;
- provider credentials;
- secret refs;
- Connection IDs;
- grant IDs;
- catalog entry IDs;
- Tool Profile IDs;
- mutable admin methods.

The provider/runtime toolName is implementation metadata available only inside the replaceable Paperclip-side adapter so it can map to Wandora BusinessCapability. It must not become a Wandora public/customer semantic.

## Strict read-only correction

The first candidate used Paperclip listCatalog(...).

Adversarial review found that listCatalog(...) may refresh a stale mcp_remote catalog and therefore can perform provider I/O and writes.

That candidate was rejected.

The accepted patch adds listCatalogCached(...), which reads only Paperclip's current persisted Tool Catalog rows and performs no refresh, provider call, remote HTTP, single-flight refresh, or catalog mutation.

This distinction is mandatory. A stale or empty provider cache may make the projection conservative or unknown; the read boundary must never turn observation into refresh.

## Company and agent isolation

The existing host invocation-scope enforcement applies automatically to toolAccess.readOperationalSnapshot.

Additionally, the host service proves the requested agentId belongs to the requested company before reading effective profiles.

Therefore:

- no capability means fail before service call;
- invocation company A requesting company B fails;
- company A requesting agent B fails;
- same-company authorized read is admitted.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora continues to own:

- BusinessCapability;
- customer-facing integration semantics;
- capability projection rules;
- semantic route/Fast Read policy.

### Durable product state

No new Wandora state is introduced.

### Operational authority

Paperclip remains owner of Connections, grants, catalog, Tool Profiles, runtime health, Tool Gateway execution and audit.

### Provider implementation

This patch is a Paperclip provider-side extension. It is not a Wandora operational subsystem.

### Replacement boundary

If Paperclip is replaced, this host read extension and Paperclip-owned state disappear behind the adapter. Wandora BusinessCapability, Fast Read intent and customer integration semantics remain stable.

## Second adversarial review

The implementation was challenged against the required risks.

### SDK surface expansion

Accepted only because the surface is one read method under one explicit capability. No CRUD/admin client was introduced.

### Privilege escalation

Rejected by manifest gating plus host-issued company invocation scope plus exact-agent company verification. No Board authority is minted or forwarded.

### Cross-company reads

Negative coverage exists in the host-client test and real host-service test.

### Credential leakage

The returned type has no credential/secret-ref fields or Paperclip object IDs. Static CI rejects forbidden fields in the bounded snapshot contract.

### Board-equivalent authority

No Board token or Board route is used. The host calls current internal services directly inside Paperclip, which is already the operational authority.

### Internal schema coupling

The plugin does not read Paperclip tables. The host extension uses current Paperclip services. listCatalogCached is added to the Tool Access service itself so persistence details stay behind that service.

### Organization Adapter becoming admin plugin

The capability only reads an operational projection. It exposes no mutations.

### Difficult provider replacement

The patch is pinned, isolated, digest-verified and documented as a replaceable provider delta. It does not change Wandora semantics.

### Snapshot becoming state

No persistence API is introduced. Wandora/plugin.state mirrors remain prohibited.

### Tool names becoming BusinessCapability

Explicitly prohibited. Tool names are adapter-internal mapping evidence only.

## Focused validation

The dedicated CI workflow Paperclip Host Operational Read Extension CI must:

1. checkout exact Paperclip d554c4789ed3930f8a53ac9fdf6503b3187097da;
2. apply the retained patch;
3. run the static boundary verifier;
4. use Node 24 plus pinned pnpm;
5. typecheck the patched plugin SDK;
6. typecheck the patched Paperclip server;
7. run focused SDK capability/company-scope tests;
8. run the embedded-Postgres host-service tenant/leak test.

No production credential, Docker control plane, customer data or live provider is required.

## Effect boundary

Paperclip production patch/upgrade = 0
Paperclip restart = 0
Core/Web/Gateway change = 0
migration/table = 0
Board credential in Core/plugin = 0
direct Paperclip DB contract = 0
Wandora registry/mirror = 0
plugin.state shadow snapshot = 0
provider/model/customer call = 0
customer work = 0
outbound = 0
production effect = 0

## Next gate

After the exact final PR head is GREEN, this preflight may be marked complete and merged.

Only then may a later slice implement the Paperclip-side adapter consumption and the ADR 0279 disposable Integration Capability Projection attestation. Production Paperclip promotion remains a separate effect-authorizing preflight/execution.

ADR 0281 is currently CODE COMPLETE / FOCUSED CI REQUIRED / NO PRODUCTION EFFECT.
