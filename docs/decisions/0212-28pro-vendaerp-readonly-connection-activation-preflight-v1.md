# ADR 0212 — 28PRO VendaERP Read-Only Connection Activation Preflight V1

Status: **GREEN / READY FOR SEPARATE ACTIVATION EXECUTION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0210 qualified the stateless VendaERP read-only MCP adapter behind Paperclip `local_stdio`.
ADR 0211 qualified the run-scoped Paperclip Tool Gateway bridge into supervised Mastra execution.
This preflight closes the remaining production-shape questions for 28PRO without creating any live ERP connection, grant, install, secret, provider call or work.

ADR 0208 remains binding: generic `rest_api` Tool Gateway execution is NO-GO.

## REAL NOW

Repository:

```text
main = 798317e80ebabae407235d2ff1ffaacaa64177a2
open PRs = 0 at preflight entry
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

Live Paperclip:

```text
image = wandora/paperclip:v2026.916.0
health = healthy
restart count = 0

28PRO company = 5d7ec217-118c-4292-8136-0a9ab16926ea
ToolApplications = 0
ToolConnections = 0
custom VendaERP stdio template = ABSENT
tool profiles = 0
tool policies = 0

company secrets = exactly 1
existing secret = wandora.organization-adapter.hmac / active / local_encrypted

Ana = 428b6730-3df4-4b92-b90a-a87f87c401f9
status = idle
adapter = wandora_mastra
last heartbeat = null
```

Every other current Paperclip company also has zero ToolConnections.

Live Wandora 28PRO:

```text
organization = 7a531811-9fea-4395-b0b2-2e2b0fce0570
Ana = 7b401163-8102-42db-b595-3a2017f54003
Ana = active + supervised
control-plane binding = exactly 1 / Paperclip
employee/provider binding = exactly 1
starter hire = exactly 1 / completed
work operations = 0
outbound attempts = 0
```

The future adapter executable path is currently absent:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs = ABSENT
```

No ERP state was created by this preflight.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns:

- provider-neutral Business System semantics;
- tenant authorization;
- read/write policy;
- external-effect authorization;
- stable product contract.

### Durable product state

No new Wandora table, migration, connection registry, secret registry or tool registry is required.

### Operational authority

Paperclip owns:

- ToolApplication;
- approved stdio template;
- ToolConnection;
- install;
- grant;
- secret custody;
- catalog;
- profiles/policy;
- Tool Gateway session identity;
- audit;
- MCP execution.

### Provider implementation

VendaERP remains a replaceable ERP provider behind the stateless MCP adapter.

Mastra materializes only the ephemeral read tools admitted by the Wandora bridge.

### Replacement boundary

Replacing VendaERP changes provider adapter/template/connection/provider-owned secret state only.
Replacing Paperclip changes the control-plane adapter/binding and legitimately provider-owned state.
Neither replacement requires internalizing connection, secret, grant or tool execution into Wandora.

## Frozen future Paperclip shape

### ToolApplication

Create one 28PRO-scoped application:

```text
type = mcp_stdio
status = active
applicationKey = wandora.vendaerp-readonly-v1
name = Wandora VendaERP Read-Only V1
```

### Approved stdio template

Create exactly one company-scoped approved template:

```text
templateId/templateKey = wandora.vendaerp-readonly-v1
command = node
args =
  /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs
  --tenant
  voepro

envKeys =
  VENDAERP_AUTHORIZATION_TOKEN
  VENDAERP_USER
  VENDAERP_APP
```

The tenant is fixed by operator-approved template/configuration, never by an agent or tool argument.

Derived provider origin:

```text
https://voepro.vendaerp.com.br
```

### ToolConnection

Create one 28PRO company-scoped connection:

```text
connectionPurpose = tool
transport = local_stdio
authKind = none
credentialPolicy = shared
ownership = customer
status = active
enabled = true
config.templateId = wandora.vendaerp-readonly-v1
```

No URL, host, HTTP method, path, token or provider credential belongs in connection config.

### Secret custody

Create exactly three 28PRO company-scoped Paperclip `local_encrypted` secrets at activation time:

```text
VENDAERP_AUTHORIZATION_TOKEN
VENDAERP_USER
VENDAERP_APP
```

The known non-token values remain owner-provided activation inputs:

```text
VENDAERP_USER = 28zero8marketing@gmail.com
VENDAERP_APP  = 28pro
```

The Authorization-Token remains absent until explicitly supplied for the separate activation execution.

The organization grant references the three secrets only through:

```text
env.VENDAERP_AUTHORIZATION_TOKEN
env.VENDAERP_USER
env.VENDAERP_APP
```

Paperclip resolves the plaintext only while spawning the approved child process.
No plaintext credential enters Wandora Core/Web/tables/configuration, Mastra input or model messages.

## Install + grant target

The credential is a 28PRO organization credential, so the grant is an **organization grant** with `credentialPolicy=shared`.

The connection install is **agent-targeted only to the existing 28PRO Ana**:

```text
targetType = agent
targetId = 428b6730-3df4-4b92-b90a-a87f87c401f9
```

No company-wide install is approved.

This separates credential ownership from tool assignment:

- organization grant = 28PRO owns the ERP credential;
- agent install/profile = only Ana receives the capability.

## Exact read-only profile

After the connection catalog is materialized, create an Ana-bound Tool Profile:

```text
profileKey = wandora.vendaerp-readonly-28pro-v1
defaultAction = deny
status = active
binding target = agent / 428b6730-3df4-4b92-b90a-a87f87c401f9
```

Include exactly the eight catalog entries generated from ADR 0210:

1. `vendaerp_probe`
2. `vendaerp_list_companies`
3. `vendaerp_search_products`
4. `vendaerp_get_product_stock`
5. `vendaerp_list_price_tables`
6. `vendaerp_search_price_table_products`
7. `vendaerp_search_parties`
8. `vendaerp_search_orders`

Use `selectorType=catalog_entry` for the eight exact catalog IDs.

Do not use a broad company allow profile.
New catalog tools remain denied by default until separately reviewed.

The Wandora ADR 0211 bridge is a second independent guard and only admits:

- connection-backed tools;
- MCP transports;
- `risk=read`;
- valid connection/catalog IDs.

It rejects write/destructive/approval-bearing tools and `paperclip_self`.

## Health / probe strategy

Activation health is two-stage and write-free.

### Structural MCP health

Before provider access:

- approved template resolves;
- MCP child starts;
- `initialize` succeeds;
- `tools/list` returns exactly the expected eight tools;
- catalog projection marks all eight read-only and none write/destructive.

This does not require a VendaERP provider call.

### Provider health

Only in the separate activation execution, after credential custody is complete, perform at most one explicit:

```text
vendaerp_probe
-> GET /api/request/Public/ping
```

No write endpoint is a health check.

No automatic retry is permitted.

## Fail-closed and isolation proofs

### Missing/revoked grant

Pinned Paperclip resolves the organization grant at execution time.
If no active default organization grant exists, Tool Gateway fails with:

```text
409 organization_authorization_required
```

Secret values are re-resolved per execution; an absent/unresolvable secret fails with:

```text
422 local_stdio_missing_secret
```

Therefore grant/secret revocation is fail-closed without a Wandora fallback.

### Other agents / companies

The future state is scoped by:

- Paperclip company ownership for application/template/connection/secrets/grant/catalog;
- Ana-only connection install;
- Ana-only default-deny Tool Profile;
- exact eight catalog-entry includes;
- run-scoped Tool Gateway company/agent identity;
- Wandora bridge validation of connection-backed MCP read tools.

No second company can see the 28PRO company-scoped resources.
No second 28PRO agent is approved to receive the install/profile.

## Rollback / revoke

If future activation fails, stop before any customer work.

Rollback order:

1. remove/unbind the Ana Tool Profile;
2. remove the Ana connection install;
3. revoke the organization grant;
4. disable/archive the ToolConnection;
5. disable the custom stdio template if no longer needed;
6. retire/delete the three VendaERP secrets only after references are gone;
7. remove the staged adapter artifact only after Paperclip no longer references it.

Revoking grant or making required secrets unavailable prevents execution immediately because the grant/secrets are resolved at call time.

No Core/Mastra rollback is required because ADR 0211 is already live-capable and contains no provider credential.

## SECOND ADVERSARIAL REVIEW

Questions required by the slice were answered as follows:

- Reusing Paperclip connection/install/grant/secret/policy/audit? **Yes.**
- Credential leaves Paperclip for Core/Mastra/model? **No.**
- New Wandora state needed? **No.**
- `tenant=voepro` operator-controlled? **Yes, fixed in approved template.**
- Arbitrary URL/method/path possible? **No.**
- Write/destructive VendaERP tool present? **No; candidate contains fixed GET allowlist only.**
- Can Ana receive tools beyond the eight? **Not under the approved default-deny exact-catalog profile; ADR 0211 also filters to read-only.**
- Could another agent/company inherit by mistake? **Not under company scope + Ana-only install/profile.**
- Does revoke fail closed? **Yes; grant and required secrets are resolved at execution time.**
- ADR 0208 preserved? **Yes; generic REST remains NO-GO.**
- ADR 0168 preserved? **Yes; no provider capability is internalized.**
- Can the preflight be completed without provider call or live mutation? **Yes, and it was.**

One important refinement from the adversarial review: the organization grant is intentionally company-owned, but that alone is not treated as the agent authorization boundary. Agent assignment is narrowed independently by the Ana-only install plus the default-deny exact-catalog Tool Profile.

## Effect boundary

This preflight performed no:

- ToolApplication creation;
- approved stdio template creation;
- ToolConnection creation;
- ConnectionGrant creation;
- install;
- Tool Profile/policy creation;
- VendaERP secret creation;
- credential entry;
- provider request;
- deployment;
- migration;
- model run;
- customer work;
- outbound effect;
- Ana lifecycle change.

## Decision

**GREEN / GO FOR A SEPARATE ACTIVATION EXECUTION.**

The future effectful slice is:

**28PRO VendaERP Read-Only Connection Activation Execution V1**

That slice must reconcile live state again, stage the exact reviewed adapter, receive/custody the Authorization-Token through the approved Paperclip secret path, then create the Paperclip-owned resources in the frozen order. It must stop before any employee work or external write.

