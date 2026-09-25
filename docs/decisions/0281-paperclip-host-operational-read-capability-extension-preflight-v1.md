# ADR 0281 — Paperclip Host Operational Read Capability Extension Preflight V1

Status: **CODE COMPLETE / HOST EXTENSION QUALIFIED FOR CI / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0280 proved that Paperclip v2026.916.1 does not expose a stable plugin SDK read surface for the organization-level operational facts required by the Wandora Integration Capability Plane. Board credentials in Core, direct Paperclip database reads, provider-state mirrors, plugin.state snapshots and a Wandora integration registry remain prohibited.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

This slice qualifies the smallest Paperclip host-owned, read-only, capability-gated extension that closes the provider-side read gap without granting Board/admin authority to a plugin.

## REAL NOW

Before implementation:

- Wandora main = `d19aeaa96780a0846a34b73e3faf7c7383fe6b5e`;
- open PR #365 = no longer open / previously merged;
- production Paperclip = `wandora/paperclip:v2026.916.0`, healthy;
- Core, Web, JEV, Messaging Gateway and Remote-Ops-MCP = healthy;
- Paperclip Task Drain = OFF;
- `activeRuns=0`;
- `pendingWakes=0`;
- `quiescent=true`;
- production remained unchanged throughout this slice.

The extension qualification source is exactly:

`paperclipai/paperclip@d554c4789ed3930f8a53ac9fdf6503b3187097da`  
tag: `v2026.916.1`

## Proven host primitives

The existing Paperclip plugin architecture already contains the security boundary required for this extension:

1. worker -> host JSON-RPC over the existing plugin protocol;
2. manifest-declared `PluginCapability`;
3. host-side method-to-capability enforcement;
4. host-issued invocation company scope;
5. rejection of cross-company nested worker calls before service dispatch;
6. existing `toolAccessService` as operational authority for Connections, grants, catalog, profiles and runtime health.

Therefore no new service, database, lifecycle or administrative API is required.

## Critical read-only finding

The existing `listCatalog()` API is not safe for this snapshot because a stale remote-MCP catalog may trigger `refreshCatalog()`, causing provider I/O and possible operational mutation.

The extension therefore adds a separate `listCatalogCached()` host-internal read that:

- reads only the currently persisted Paperclip catalog;
- performs no discovery;
- performs no refresh;
- resolves no provider credential;
- performs no health check;
- performs no provider/network call.

This distinction is required for the host capability to remain truly read-only.

## Decision

Add one Paperclip plugin capability:

`tools.operational.read`

Add one worker->host RPC:

`toolAccess.readOperationalSnapshot`

Expose it in the SDK as:

`ctx.toolAccess.readOperationalSnapshot(companyId, { agentId? })`

The name is provider implementation detail and not a Wandora public contract.

## Snapshot boundary

The host returns only a bounded operational projection:

- runtime status and aggregate connection/audit-health counters;
- active connection name/application key/display evidence;
- enabled/status/health state;
- organization/agent install presence;
- grant kind/status/default flag;
- cached catalog tool name, risk and read/write/destructive/status flags;
- optional agent effective tool names.

The snapshot deliberately excludes:

- Board/admin credentials;
- provider credentials;
- secret refs;
- raw grant IDs;
- raw catalog IDs;
- Connection IDs/UIDs;
- profile IDs;
- database rows;
- provider payloads;
- provider health messages;
- mutation handles.

Tool names and application keys are visible only inside the replaceable Paperclip-side adapter implementation so it can map provider operations to the finite Wandora `BusinessCapability` vocabulary. They are not Wandora semantics and must not become customer/API contract.

## Authority split

### Semantic authority — Wandora

Wandora continues to own:

- `BusinessCapability`;
- Integration Capability Plane product meaning;
- provider-neutral availability projection;
- semantic route/Fast Read decisions.

### Durable product state

No new Wandora durable state is introduced.

### Operational authority — Paperclip

Paperclip remains authority for:

- Connections;
- grants/installations;
- catalog;
- Tool Profiles;
- runtime health;
- Tool Gateway run authorization.

### Provider implementation

This extension remains inside Paperclip and reuses Paperclip service-layer reads.

### Replacement boundary

If Paperclip is replaced, this patch/client disappears with the Paperclip adapter. Wandora product contracts remain unchanged.

## Second adversarial review

### Excessive SDK surface

Rejected broad Connection/catalog CRUD clients. The accepted surface is one bounded snapshot method behind one explicit capability.

### Plugin privilege escalation

A plugin must declare `tools.operational.read`. The host capability gate runs before the service. No Board token or Board-equivalent mutation is exposed.

### Cross-company reads

The existing host invocation-scope enforcement classifies the RPC as company-scoped from its `companyId` parameter. A requested company different from the host-issued invocation company fails before service execution.

When `agentId` is supplied, the existing effective-profile service also verifies that the agent belongs to the requested company.

### Credential leakage

The projection does not return `credentialSecretRefs`, `credentialRefs`, provider token material, grant providerTenant metadata or health messages.

### Accidental provider I/O

The snapshot does not use normal `listCatalog()`; it uses the new cached-only read. It does not call `checkHealth`, `refreshCatalog`, secret resolution or provider discovery.

### Board-equivalent authority

No admin route/token is introduced. The plugin receives only the bounded result of host-side service reads.

### Internal schema coupling

The plugin never reads Paperclip DB tables. Schema/service coupling remains inside Paperclip itself, where it belongs. The patch consumes the existing service boundary.

### Organization Adapter becoming an admin plugin

Rejected. The adapter gains a narrow operational read capability only. It receives no mutation method or general Tool Access client.

### Snapshot becoming state

No persistence path is added. The snapshot is recomputed on each host call and returned to the caller.

### Tool names leaking into BusinessCapability

Explicitly prohibited. Tool names are provider-adapter mapping evidence only. The Wandora projection remains `BusinessCapability[]`.

## Code artifact

The Wandora repository retains the provider-side extension as:

`integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch`

The patch is anchored to exact upstream commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`.

This is intentionally preferable to silently internalizing Paperclip or maintaining an unqualified permanent fork.

## Focused tests included in the patch

The patch includes tests proving:

1. `tools.operational.read` is mandatory;
2. cross-company reads fail before the Tool Access service is called;
3. a same-company host-issued invocation can read the bounded snapshot;
4. `listCatalogCached()` returns persisted catalog after TTL expiry without provider/network refresh.

## CI qualification

`.github/workflows/paperclip-host-operational-read-extension-ci.yml`:

1. checks out exact Paperclip commit `d554c478...`;
2. applies the retained patch with `git apply --check`;
3. runs `git diff --check`;
4. uses Node 24.21.0 and pnpm 9.15.4;
5. runs the plugin host capability/tenant-boundary tests;
6. runs the cached-catalog no-provider-I/O test;
7. typechecks the patched plugin SDK and Paperclip server.

Normal CI runs on GitHub-hosted `ubuntu-24.04` under ADR 0158.

## Production boundary

This slice does **not** authorize installation or deployment of the patched Paperclip host.

Production Paperclip remains v2026.916.0 until a separate upgrade/activation preflight proves the exact candidate artifact and rollback path.

No Organization Adapter manifest in production is changed in this slice.

## Effect boundary

```text
production Paperclip patch      = 0
production Paperclip upgrade    = 0
production restart              = 0
Core change                     = 0
migration/table                 = 0
Board credential in Core        = 0
provider-state mirror           = 0
plugin.state snapshot           = 0
provider/customer call          = 0
model/JEV call                  = 0
customer work                   = 0
outbound                        = 0
production effect               = 0
```

## Next gate

After exact PR-head CI is GREEN, the next slice may implement the disposable ADR 0279 integration-capability attestation using this host capability in an isolated Paperclip candidate/lab only.

Production activation remains a separate decision.

ADR 0281 is **CODE COMPLETE / CI REQUIRED / NO PRODUCTION EFFECT**.
