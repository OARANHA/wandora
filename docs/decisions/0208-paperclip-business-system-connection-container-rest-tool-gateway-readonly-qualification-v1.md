# ADR 0208 — Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1

Status: **NO-GO FOR REST TOOL GATEWAY / CONNECTION CUSTODY REUSE REMAINS VALID / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0202 established the provider-neutral Business System read contract and VendaERP read-only adapter. ADR 0203 proved that Paperclip v2026.916.0 can own company-scoped Connections, grants and secret custody, including the three VendaERP credentials as secret-backed header references. ADR 0207 made 28PRO starter-workforce ready.

This slice asked whether Paperclip's REST Tool Gateway can be promoted from quarantine for the exact ADR 0202 read-only surface, without arbitrary URL/method access, mutation exposure, provider-schema leakage or secret leakage.

The slice is CODE ONLY / NO EFFECT. No real VendaERP credential, provider call, connection, grant, work item or outbound effect is authorized.

## REAL NOW

Canonical repository at entry:

- main = `83fed6beb4bdaebb63dad04e8e0fbfc54472f97a`;
- PR #271 = merged;
- open PRs = 0;
- Paperclip production image = `wandora/paperclip:v2026.916.0`;
- pinned Paperclip source = `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`.

Production services reconciled healthy: Core, Web, Paperclip, Messaging Gateway and Supabase database. No production mutation was performed during qualification.

28PRO live state was independently re-read:

- Wandora organization = active;
- exactly one Ana = active + supervised;
- exactly one control-plane provider binding;
- exactly one completed `ana-commercial-v1` hire;
- exactly one employee/provider binding;
- work items = 0;
- Paperclip company = active;
- Paperclip Ana = idle;
- Paperclip Tool Connections = 0;
- Paperclip Connection Grants = 0;
- Paperclip company secrets = 1, the existing Organization Adapter HMAC secret.

Therefore the ERP path starts from the already-existing 28PRO company and employee. No second company or employee container is required.

## PROVEN PAPERCLIP CONNECTION CAPABILITY

Pinned Paperclip v2026.916.0 supports:

- `ToolConnection.transport = rest_api`;
- company-scoped Connections;
- organization/user/agent grant kinds;
- installs;
- multiple credential references;
- secret-backed credential references;
- header credential placement;
- company-scoped `local_encrypted` secrets;
- validation that rejects sensitive values in ordinary connection config.

The ADR 0203 VendaERP shape remains valid:

```text
Authorization-Token -> Paperclip secret -> header credential ref
User                -> Paperclip secret -> header credential ref
App                 -> Paperclip secret -> header credential ref
```

This is sufficient evidence to continue treating Paperclip Connections/grants/secrets as the preferred operational authority for business-system connection identity and credential custody.

## MATERIAL EXECUTION GAP

The pinned Tool Gateway does **not** expose generic `rest_api` Connections as executable gateway tools.

Direct source inspection proves:

1. `connectedMcpToolsForCompany(...)` filters connection transport to exactly `mcp_remote` and `local_stdio`;
2. the eligible application types are `mcp_http` and `mcp_stdio`;
3. `resolveConnectedRemoteTool(...)` rejects any connection whose transport is not `mcp_remote`;
4. `executeTestCall(...)` resolves tools through `connectedMcpToolsForConnection(...)`, the same MCP-only execution catalog;
5. remote Tool Gateway dispatch is MCP JSON-RPC `tools/call` over HTTP POST, not an arbitrary or templated REST operation executor;
6. existing `rest_api` branches in the reviewed code are provider-specific flows such as Composio parent connections or AgentMail channel handling, not a generic safe REST business-system tool runtime.

Therefore the fact that `rest_api` exists in the Connection schema does not prove a generic REST Tool Gateway execution capability.

## CAPABILITY AUTHORITY / REUSE GATE

Authority remains:

- Wandora = provider-neutral Business System semantics, tenant authorization, read/write policy and external-effect authorization;
- Paperclip = preferred connection identity/grants/secret custody;
- Mastra = runtime/tool execution authority behind Wandora runtime contracts;
- VendaERP = replaceable ERP provider implementation;
- Paperclip Tool Gateway = provider execution infrastructure only where its exact pinned capability is proven.

No new Wandora secret manager, connection database, REST engine, URL router, generic HTTP executor or duplicate tool runtime is authorized.

## DECISION

**NO-GO** for promoting Paperclip REST Tool Gateway for VendaERP on v2026.916.0.

The connection/custody half of the design remains accepted, but the execution half is not available through the reviewed generic REST gateway boundary.

Accordingly:

- do not create a live VendaERP Connection yet;
- do not enter the real Authorization-Token, User or App values;
- do not create organization/agent grants for VendaERP yet;
- do not call VendaERP;
- do not expose the Core VendaERP adapter to plaintext Paperclip secrets;
- do not implement a Wandora-native REST executor to fill this provider gap;
- do not misrepresent MCP execution as generic REST execution.

Paperclip Tool Gateway remains QUARANTINED for this use.

## SECOND ADVERSARIAL REVIEW

The initial hypothesis was that Paperclip could already combine its Connection secret custody with its Tool Gateway to call the bounded VendaERP REST read surface.

That hypothesis was actively challenged against the exact v2026.916.0 source.

Rejected alternatives:

- treating the `rest_api` enum as proof of executable REST support;
- using Board/company APIs to recover plaintext secrets into Core;
- storing credentials in Wandora tables or employee config;
- creating a generic REST proxy/executor in Core;
- wrapping arbitrary URL + method inside a nominally read-only Wandora endpoint;
- using Tool Gateway test-call routes as a bypass; they resolve the same MCP-only catalog;
- entering real credentials before an execution boundary is qualified.

The material objection survives review, so the NO-GO decision stands.

## VALIDATION / EFFECT BOUNDARY

This qualification performed only:

- Git/main/PR reconciliation;
- read-only runtime/container inspection;
- read-only Wandora and Paperclip database reconciliation;
- exact pinned Paperclip source review;
- documentation.

It performed no:

- migration;
- production deployment;
- Connection creation;
- Connection Grant creation;
- secret creation/rotation;
- VendaERP credential entry;
- VendaERP network request;
- work/Mastra run;
- outbound message;
- ERP mutation.

28PRO remains starter-workforce ready and ERP-unconnected.

## Replacement boundary

The desired stable flow remains:

```text
Wandora Business System operation
-> tenant/capability authorization
-> digital employee/runtime
-> provider-owned connection + secret/grant boundary
-> qualified read execution adapter/gateway
-> VendaERP or replacement ERP
```

A future Paperclip version, provider-side Paperclip plugin/adapter, or another accepted specialist execution provider may satisfy the execution boundary. Provider replacement does not imply Wandora internalization.

## Next safe slice

**Business-System Read Execution Boundary Capability Preflight V1 — NO EFFECT**

That preflight must compare only provider-side/reuse options, in this order:

1. whether a newer accepted Paperclip version provides a stable generic REST execution boundary for Connections;
2. whether Paperclip's plugin/adapter SDK can expose a narrowly allowlisted provider-side Business System read tool while resolving Paperclip-custodied secrets internally;
3. whether an existing accepted specialist runtime can execute the provider-neutral operation without introducing a competing connection/secret authority.

It must preserve ADR 0168 and stop again if no narrow provider-owned execution boundary can be proven.

Only after that boundary closes GREEN may the project proceed to **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT**.
