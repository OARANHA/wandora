# ADR 0210 — Paperclip VendaERP Read-Only MCP Adapter Candidate V1

Status: **CODE ONLY / GREEN / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0208 proved that Paperclip v2026.916.0 does not provide generic `rest_api` Tool Gateway execution. ADR 0209 correctly preserved Paperclip as connection/grant/secret authority and selected a provider-side execution boundary, but named a native connector contribution as the intended implementation.

The second adversarial review for the code slice found a narrower reuse path already fully supported by the exact pinned Paperclip version: an approved `local_stdio` MCP connection.

This ADR records the candidate and narrows ADR 0209 before any production activation.

## REAL NOW

At entry:

```text
main = e133ad7c326b0c48aa3beb180d0f1e4146c12fea
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
Paperclip pinned source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
28PRO Tool Connections = 0
28PRO Connection Grants = 0
```

No VendaERP credential exists and no VendaERP provider request has been made.
## New evidence that narrows ADR 0209

Pinned Paperclip's native `connector-runtime` contributes direct connector tools to the `paperclip_runner` tool authority.

The current Wandora Ana does not use `paperclip_runner`; she uses the external `wandora_mastra` adapter.

For external adapters, Paperclip can deliver connector skill instructions, but the direct native connector execution authority is not the same execution channel.

Therefore a connector-runtime-only implementation would not by itself make VendaERP tools executable by the current Wandora runtime.

This invalidates the implementation mechanism proposed by ADR 0209, not its authority split.

## Reuse gate — local_stdio MCP

Pinned Paperclip v2026.916.0 already provides the required operational boundary for `local_stdio` MCP connections:

- company-owned `ToolConnection`;
- organization/user/agent grants;
- company/agent installs;
- approved company-scoped stdio command templates;
- grant-scoped secret references;
- projection of `env.<KEY>` secret refs into a minimal child-process environment;
- MCP `initialize`, `tools/list` and `tools/call`;
- run-scoped Tool Gateway sessions;
- Tool Gateway policy, invocation journal and audit;
- external-adapter access through the same Tool Gateway session/call contract.

No new Paperclip control-plane state model is required.
## Candidate

The candidate lives at:

```text
integrations/paperclip/mcp-vendaerp-readonly-v1/
```

It is a stateless MCP process intended for a future approved Paperclip `local_stdio` template.

It owns no connection state, credential state, grant state, employee state or business-system durable state.

The fixed provider origin is:

```text
https://whitelabel.vendaerp.com.br
```

This value was verified against the current official VendaERP API explorer used by the provider documentation.

The candidate accepts no URL or HTTP method from the caller.

## Exact tool surface

The MCP server exposes exactly eight tools:

1. `vendaerp_probe`;
2. `vendaerp_list_companies`;
3. `vendaerp_search_products`;
4. `vendaerp_get_product_stock`;
5. `vendaerp_list_price_tables`;
6. `vendaerp_search_price_table_products`;
7. `vendaerp_search_parties`;
8. `vendaerp_search_orders`.

These map one-to-one to ADR 0202's frozen provider-neutral read operations.
All tools declare:

```text
readOnlyHint = true
destructiveHint = false
openWorldHint = true
```

The annotations are not the security boundary. The adapter itself contains only a fixed GET allowlist.

## Exact provider allowlist

The only provider paths are:

```text
GET /api/request/Public/ping
GET /api/request/Empresas/GetTodasEmpresas
GET /api/request/Produtos/Pesquisar
GET /api/request/Produtos/GetSaldo
GET /api/request/TabelasPreco/Pesquisar
GET /api/request/TabelasPreco/Produtos
GET /api/request/Pessoas/Pesquisar
GET /api/request/Pedidos/Pesquisar
```

The implementation contains no POST, PUT, PATCH or DELETE provider request.

Pagination is bounded to `pageSize 1..100` and non-negative `skip`.

There is no automatic retry.

Redirects fail closed.

The request timeout defaults to 5 seconds and is bounded to 1–15 seconds.

HTTP 401/403, 429 and provider failures are normalized without returning provider credential material.
## Credential boundary

The future Paperclip stdio template permits exactly these environment keys:

```text
VENDAERP_AUTHORIZATION_TOKEN
VENDAERP_USER
VENDAERP_APP
```

The future Paperclip Connection Grant must reference them through:

```text
env.VENDAERP_AUTHORIZATION_TOKEN
env.VENDAERP_USER
env.VENDAERP_APP
```

Paperclip resolves the secret values at tool execution time and injects them into the child process.

The MCP adapter does not persist credentials and does not return them in tool results.

The employee does not own the credentials.

No secret value is stored in Wandora Core, Web, a Wandora table, a model prompt or this repository.

## Provider-neutral output boundary

Provider responses are projected before leaving the adapter into the same bounded business DTO semantics already established by ADR 0202:

- company;
- product;
- stock;
- price table;
- product price;
- party;
- order;
- connection status.

Unrecognized VendaERP fields are not passed through automatically.
## Validation

Candidate-local validation is GREEN:

```text
8 tests / 8 passed
WANDORA_VENDAERP_READONLY_MCP_V1_OK
WANDORA_PAPERCLIP_V916_LOCAL_STDIO_CONTRACT_OK
```

The tests prove:

- exactly eight tools;
- no transport parameters in tool input;
- fixed provider origin;
- GET-only dispatch;
- exact three credential headers;
- frozen eight-path allowlist;
- bounded pagination;
- failure normalization;
- provider-neutral projection;
- no credential echo through projected results;
- MCP initialize + tools/list works without provider access.

The Paperclip compatibility verifier requires the exact pin
`dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
and proves the source still contains:

- local_stdio connected-gateway eligibility;
- approved stdio template resolution;
- grant secret projection from `env.<KEY>`;
- grant re-resolution at execution;
- approved-template process spawn;
- MCP tools/call dispatch;
- run-scoped gateway session/list/call routes.
No real VendaERP call was used for any validation.

## SECOND ADVERSARIAL REVIEW

Three candidate mechanisms were considered.

### Generic REST Tool Gateway

Still rejected by ADR 0208. The candidate does not add or emulate generic REST execution.

### Paperclip native connector-runtime contribution

Rejected for this slice because direct connector tool execution is tied to the native Paperclip runner, while Wandora's Ana uses `wandora_mastra`.

### local_stdio MCP adapter

Selected because the exact pinned Paperclip already owns the complete connection/grant/secret/gateway machinery for this transport and external adapters can use the run-scoped gateway.

This is a smaller replacement boundary than patching Paperclip core and does not create a new Wandora tool engine.

## Capability authority

Wandora continues to own:

- Business System semantic operations;
- tenant authorization;
- read/write policy;
- customer/mobile authorization;
- external-effect authorization.

Paperclip continues to own:

- connection identity;
- installs/grants;
- secret custody;
- stdio command-template approval;
- tool catalog;
- Tool Gateway policy and audit.

Mastra remains the current general agent/runtime execution implementation.

VendaERP remains a replaceable ERP provider.
## Effect boundary

This slice performed no:

- production deployment;
- Paperclip source modification;
- Paperclip upgrade;
- migration;
- stdio template registration in production;
- Tool Connection creation;
- Connection Grant/install creation;
- secret creation or rotation;
- real credential entry;
- VendaERP API request;
- Mastra/model run;
- customer work;
- outbound effect.

## Decision

**CANDIDATE GREEN / CODE ONLY.**

ADR 0209 is narrowed as follows:

> Preserve its authority/reuse conclusion, but supersede the planned native connector-runtime implementation with the already-supported Paperclip `local_stdio` MCP boundary for VendaERP read operations.

ADR 0208 remains unchanged: generic `rest_api` Tool Gateway execution is still quarantined/NO-GO.

## Next safe slice

**Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1 — CODE ONLY / NO EFFECT**

The current `wandora_mastra` adapter already forwards the exact Paperclip run JWT to the private Core execution bridge. The next slice must prove a narrow bridge that uses that run identity to create/use a Paperclip Tool Gateway session and exposes only authorized read tools to the Mastra runtime.

It must not fetch Paperclip secret plaintext into Core or Mastra.

Only after that bridge is GREEN may **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT** begin.