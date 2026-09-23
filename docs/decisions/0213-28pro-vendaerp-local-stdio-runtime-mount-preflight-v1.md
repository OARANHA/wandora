# ADR 0213 — 28PRO VendaERP local_stdio Runtime Mount Preflight V1

Status: **GREEN / REQUIRED ACTIVATION PREREQUISITE / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0212 qualified the Paperclip-owned activation shape for 28PRO VendaERP read-only access.

Before executing that activation, the second adversarial review reconciled the exact live Paperclip container filesystem and found a material operational gap:

```text
approved template command:
node /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs --tenant voepro

live Paperclip mounts:
- paperclip-data -> /paperclip
- Paperclip execution bridge secret
- Paperclip bridge entrypoint
```

Therefore the reviewed adapter path is not currently visible inside `wandora-paperclip`.

Creating ToolApplication/template/connection/grant/secrets before fixing this path would create a known-broken production configuration.

No live activation mutation is permitted until this mount prerequisite is closed.

## REAL NOW

Repository:

```text
main = 0f089122ac46455cad450b9b027123ba56c79ea2
ADR 0212 = merged
```

Live Paperclip:

```text
image = wandora/paperclip:v2026.916.0
health = healthy
restart count = 0
container-visible VendaERP adapter path = absent
```

Effective container mounts were read directly from Docker and do not include the Wandora integration adapter directory.

## Capability Authority / Reuse Gate

This gap does not justify a new execution service, sidecar, Wandora tool runtime or provider fork.

The approved implementation remains Paperclip `local_stdio`.

The missing capability is only deployment packaging: making the already-reviewed stateless adapter file visible to the Paperclip process.

## Decision

The activation execution must first stage the exact reviewed adapter artifact on the host and expose it to Paperclip through a read-only bind mount.

Approved host path:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp/
```

Approved container path:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp/
```

Approved mount:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp:
  /opt/wandora/integrations/vendaerp-readonly-mcp:ro
```

The mount is deployment plumbing only.

The adapter remains:

- stateless;
- GET-only;
- provider-neutral at the tool contract boundary;
- without durable state;
- without credentials on disk;
- without direct Wandora persistence.

## Exact artifact provenance

The staged adapter must come from the exact merged Wandora commit being activated.

At activation time, record:

- Wandora commit SHA;
- source file SHA-256;
- staged file SHA-256;
- Paperclip image/version;
- effective Docker mount.

The staged file must byte-match the reviewed repository artifact.

No ad-hoc editing on the VPS is allowed.

## Ephemeral proof

The exact merged adapter from:

```text
main@0f089122ac46455cad450b9b027123ba56c79ea2
```

was mounted read-only into an ephemeral container using:

```text
wandora/paperclip:v2026.916.0
network = none
credentials = none
```

The process successfully completed MCP initialization and `tools/list`.

Validation result:

```text
EPHEMERAL_MOUNT_MCP_OK tools=8
```

The returned tool set matched exactly:

1. vendaerp_probe
2. vendaerp_list_companies
3. vendaerp_search_products
4. vendaerp_get_product_stock
5. vendaerp_list_price_tables
6. vendaerp_search_price_table_products
7. vendaerp_search_parties
8. vendaerp_search_orders

All eight reported `readOnlyHint=true` and `destructiveHint=false`.

No provider network access was possible because the container used `--network none`.

## SECOND ADVERSARIAL REVIEW

Rejected:

- creating Paperclip connection state before the adapter path is executable;
- copying the adapter into a mutable location inside the running container;
- baking provider credentials into the image or mounted files;
- introducing a new sidecar/executor;
- patching Paperclip core;
- switching back to generic REST execution.

Accepted:

- exact reviewed artifact;
- host-managed deployment path;
- read-only bind mount;
- same path inside the Paperclip container as frozen in ADR 0212;
- container recreation only during the separately authorized activation execution.

ADR 0168 remains preserved: this is deployment wiring, not capability internalization.

ADR 0208 remains preserved: generic `rest_api` Tool Gateway execution is still NO-GO.

## Rollback

If the future mount promotion fails:

1. restore the previous Paperclip compose overlay;
2. recreate Paperclip with the prior mount set;
3. verify health/restart count;
4. remove the staged adapter only after no container references it.

The mount change must happen before any VendaERP ToolConnection/grant/secret activation so rollback can return to the exact pre-ERP state.

## Effect boundary

This preflight performed no:

- production file staging under `/opt/wandora/integrations`;
- compose modification;
- container recreation;
- ToolApplication creation;
- stdio template creation;
- ToolConnection creation;
- grant/install/profile creation;
- VendaERP secret creation;
- provider call;
- model run;
- customer work;
- outbound effect.

Only read-only runtime inspection, an isolated ephemeral container proof, and documentation were performed.

## Decision

**GREEN.**

ADR 0212 remains valid but activation execution gains one mandatory first phase:

```text
stage exact adapter
-> add read-only Paperclip bind mount
-> recreate/health-check Paperclip
-> prove initialize + tools/list locally
-> only then create Paperclip ERP connection/grant/secret resources
```

Next slice remains:

**28PRO VendaERP Read-Only Connection Activation Execution V1**

The Authorization-Token is still required before credential activation and provider probe.
