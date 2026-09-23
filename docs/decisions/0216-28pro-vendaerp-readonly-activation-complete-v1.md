# ADR 0216 — 28PRO VendaERP Read-Only Activation Complete V1

Status: **PRODUCTION GREEN / READ-ONLY ACTIVATED**
Date: 2026-09-23

## Scope

This ADR records completion of **28PRO VendaERP Read-Only Connection Activation Execution V1**.

It starts from ADR 0215 Phase 1, where the reviewed stateless VendaERP MCP adapter had already been mounted read-only into production Paperclip and validated locally without provider access.

This phase activates the Paperclip-owned control-plane state, proves least-privilege visibility, and performs exactly one GET-only provider probe.

No model run, customer work, outbound action, ERP write, migration, or Ana lifecycle change is authorized or performed here.

## Entry state

Canonical repository:

```text
main = f664a0d575fd3a7c277374f45d0581ede8c94dd7
ADR 0215 = merged
```

Paperclip runtime before control-plane activation:

```text
image = wandora/paperclip:v2026.916.0
VendaERP adapter mount = active / read-only
MCP initialize + tools/list = 8 approved read-only tools
VendaERP provider call count = 0
```

## Secret custody

The owner entered the real VendaERP Authorization-Token directly in the VPS terminal.

The token was never pasted into ChatGPT, Git, Wandora tables/configuration, Mastra/model input, or adapter files.

Paperclip now owns exactly three active company-scoped secrets for 28PRO:

```text
wandora.vendaerp.authorization-token
wandora.vendaerp.user
wandora.vendaerp.app
```

All three are:

```text
provider = local_encrypted
managedMode = paperclip_managed
status = active
latestVersion = 1
```

Plaintext values were not read back during validation.

## ToolApplication and ToolConnection

Created:

```text
ToolApplication
id = 6c1b0189-06cb-431d-8efe-fa84a2f2573a
applicationKey = wandora.vendaerp-readonly-v1
type = mcp_stdio
status = active
```

Created:

```text
ToolConnection
id = 8e2c23f4-73f5-444a-8647-71428819ea91
name = 28PRO VendaERP Read-Only V1
transport = local_stdio
credentialPolicy = shared
ownership = customer
status = active
enabled = true
healthStatus = ok
```

## Approved template correction

The first approved stdio template was created with the correct command/env binding but with an empty `tools` declaration.

Paperclip's pinned `local_stdio` catalog implementation does not execute MCP `tools/list` during `catalog/refresh`. It projects the catalog from the approved template's declared `tools`.

Therefore the first refresh produced zero catalog entries even though the live adapter itself exposed eight tools.

No provider call had occurred.

The empty template was superseded safely:

```text
wandora.vendaerp-readonly-v1
status = disabled
tools = 0
```

The active reviewed revision is:

```text
templateId = wandora.vendaerp-readonly-v1-r1
status = active
command = node
args =
  /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs
  --tenant
  voepro
envKeys =
  VENDAERP_AUTHORIZATION_TOKEN
  VENDAERP_USER
  VENDAERP_APP
tools = exactly 8
```

The Connection now points to `wandora.vendaerp-readonly-v1-r1`.

This correction changes only Paperclip-owned provider runtime metadata. The stable Wandora semantic/tool contract remains ADR 0202/0210 V1.

## Grant and credential projection

Paperclip automatically created an empty default organization grant when the shared Connection was created.

Before credentials were attached, that empty grant was revoked and replaced by exactly one active default organization grant:

```text
grant id = a44da2e3-9957-47f7-91e9-153d1c511e37
kind = organization
status = active
isDefault = true
credential refs = 3
```

The three secret refs project only:

```text
env.VENDAERP_AUTHORIZATION_TOKEN
env.VENDAERP_USER
env.VENDAERP_APP
```

All refs are required and resolve `latest`.

No plaintext credential is stored on the ToolConnection.

## Ana-only install

The Connection has exactly one install:

```text
targetType = agent
targetId = 428b6730-3df4-4b92-b90a-a87f87c401f9
agent = Ana / 28PRO
```

There is no company-wide install.

28PRO currently has exactly one Paperclip agent: Ana.

## Catalog

After switching to the catalog-declared template revision, `catalog/refresh` produced exactly eight entries.

All eight are:

```text
status = active
riskLevel = read
isWrite = false
isDestructive = false
```

Exact tool set:

1. `vendaerp_probe`
2. `vendaerp_list_companies`
3. `vendaerp_search_products`
4. `vendaerp_get_product_stock`
5. `vendaerp_list_price_tables`
6. `vendaerp_search_price_table_products`
7. `vendaerp_search_parties`
8. `vendaerp_search_orders`

No write/destructive catalog entry exists.

## Profile authority and duplicate-state correction

Paperclip's native agent install automatically created an agent-bound profile for this connection.

That native profile is:

```text
source = tool_connection_install
defaultAction = deny
entries = 8 exact catalog_entry includes
binding = Ana only
allowedToolCount = 8
totalToolCount = 8
```

A second manual default-deny profile was briefly created during activation before this native behavior was reconciled.

The second adversarial review identified it as duplicate operational state.

It was unbound and deleted.

Final effective state contains exactly one profile: the Paperclip-native install profile.

This preserves ADR 0168: reuse provider capability instead of duplicating it.

## Isolation proof

Connection install:

```text
count = 1
target = Ana / 28PRO
```

Ana access evaluation:

```text
HTTP 200
toolCount = 8
allowedCount = 8
askFirstCount = 0
offCount = 0
all risks = read
all decisions = allowed by profile
```

A Paperclip agent from MEDICSPRO was evaluated against the 28PRO Connection:

```text
HTTP 403
error = This agent is not available for testing
```

Therefore the Connection is not cross-company usable through the tested Paperclip access boundary.

## Single provider probe

Only after secret custody, grant, Ana-only install, exact read catalog and isolation were proven, one explicit provider test call was made:

```text
agent = Ana
tool = vendaerp_probe
parameters = {}
```

Paperclip Tool Gateway result:

```text
HTTP 200
decision = allowed
transport = local_stdio
spawnedLocalProcess = true
isError = false
connected = true
```

The adapter implements this probe as the fixed GET-only health request defined by ADR 0210.

No automatic retry was performed.

## Post-effect state

Paperclip:

```text
Application = active / mcp_stdio
Connection = active / local_stdio / enabled
Connection health = ok
active VendaERP template = wandora.vendaerp-readonly-v1-r1 / 8 tools
active organization grant = exactly 1 / 3 required secret refs
install = exactly 1 / Ana
effective profile = exactly 1 / default deny / 8 entries
catalog = exactly 8 / all risk=read / no write/destructive
Ana = idle / wandora_mastra
```

Wandora:

```text
Ana = active + supervised
digital employee work operations = 0
outbound attempts = 0
```

No customer work or model run was used to validate the ERP connection.

## Capability authority

No authority was internalized.

- Wandora owns product semantics, tenant/effect authorization and provider-neutral contracts.
- Paperclip owns application/connection/template/grant/secret/install/profile/catalog/audit/MCP execution.
- Mastra remains the ephemeral supervised runtime consumer of already-authorized read tools.
- VendaERP remains a replaceable provider behind the MCP adapter.

ADR 0208 remains preserved: generic `rest_api` Tool Gateway execution is still NO-GO.

## Rollback

To revoke ERP access without changing Wandora:

1. remove the Ana connection install;
2. revoke the active organization grant;
3. disable/archive the ToolConnection;
4. disable the active `wandora.vendaerp-readonly-v1-r1` template if no longer needed;
5. retire/delete the three VendaERP Paperclip secrets after references are removed;
6. leave the read-only runtime mount until no active Paperclip state references it, then optionally roll back ADR 0215's mount.

Grant/secret resolution remains execution-time fail-closed.

## Decision

**28PRO VendaERP Read-Only Connection Activation Execution V1 = GREEN.**

The 28PRO Paperclip control plane now has a working, least-privilege, read-only VendaERP connection assigned only to Ana.

The next separate slice may validate the end-to-end Wandora → Paperclip Tool Gateway → supervised Mastra read-tool path with a deliberately bounded non-customer-work proof.

That future proof must not authorize ERP writes or customer outbound effects.
