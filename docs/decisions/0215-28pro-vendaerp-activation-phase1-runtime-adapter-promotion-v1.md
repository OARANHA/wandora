# ADR 0215 — 28PRO VendaERP Activation Phase 1 Runtime Adapter Promotion V1

Status: **EXECUTED / GREEN / PROVIDER NOT CALLED**
Date: 2026-09-23

## Scope

This ADR records the first effectful phase of **28PRO VendaERP Read-Only Connection Activation Execution V1**.

Phase 1 is limited to making the already-reviewed stateless VendaERP MCP adapter executable by the live Paperclip container.

It does **not** create VendaERP application/connection/grant/install/profile/secrets and does not call the VendaERP provider.

## Canonical input

Activation source:

```text
main = 3bf7ccc0efb2a0b365fdd8896b9e4edffd477502
Paperclip image = wandora/paperclip:v2026.916.0
```

Reviewed adapter:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs
sha256 = 3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92
```

## Executed production change

Host staging path:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
```

Container path:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp
```

Effective bind mount:

```text
type = bind
mode = ro
rw = false
source = /opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
destination = /opt/wandora/integrations/vendaerp-readonly-mcp
```

A source-commit provenance file was staged alongside the adapter:

```text
WANDORA_SOURCE_COMMIT = 3bf7ccc0efb2a0b365fdd8896b9e4edffd477502
```

The staged adapter SHA-256 matches the reviewed repository source exactly.

## Paperclip post-promotion state

Container reconciliation after promotion:

```text
created = 2026-09-23T13:18:51.628413967Z
status = running
health = healthy
restart count = 0
image = wandora/paperclip:v2026.916.0
```

The container was not recreated a second time after reconciliation proved the mount was already active.

## Live local MCP proof

The live Paperclip container executed:

```text
node /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs --tenant voepro
```

Only MCP `initialize` and `tools/list` were invoked.

No credential env vars were supplied and no provider tool was called.

Result:

```text
LIVE_CONTAINER_MCP_OK tools=8
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

Every returned tool satisfies:

```text
readOnlyHint = true
destructiveHint = false
```

## Effect boundary

Phase 1 performed:

- exact adapter staging;
- Paperclip read-only bind mount promotion;
- Paperclip container replacement by the existing Compose project;
- health validation;
- local MCP initialize/tools-list validation.

Phase 1 did **not** perform:

- ToolApplication creation;
- approved stdio template creation;
- ToolConnection creation;
- grant creation;
- install/profile creation;
- VendaERP secret creation;
- credential custody;
- VendaERP provider call;
- model run;
- customer work;
- outbound effect;
- migration;
- Ana lifecycle mutation.

## Rollback evidence

Pre-change Paperclip execution-bridge overlay backups exist under:

```text
/opt/wandora/stacks/paperclip/compose.paperclip-execution-bridge.yaml.bak.*
```

If phase 1 must be reverted before ERP connection activation:

1. restore the immediately-preceding overlay backup;
2. recreate the Paperclip project with the same two Compose files;
3. confirm Paperclip health and restart count;
4. confirm the VendaERP mount is absent;
5. remove the staged adapter directory only after no container references it.

## Decision

**Phase 1 GREEN.**

The activation may proceed to the Paperclip-owned connection/credential phase only after the owner supplies the real VendaERP `Authorization-Token` through an approved secret-custody path.

The token must not be persisted in Wandora, committed to Git, written to the adapter files, or sent to Mastra/model prompts.
