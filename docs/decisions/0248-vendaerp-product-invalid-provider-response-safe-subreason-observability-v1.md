# ADR 0248 — VendaERP Product Invalid-Provider-Response Safe Subreason Observability V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / OBSERVE, DO NOT NORMALIZE**  
Date: 2026-09-24

## Objective

Make the existing VendaERP product `invalid-provider-response` failure diagnostically useful without logging provider payloads, business values, credentials, request parameters, URLs, or customer data.

This slice does not call VendaERP and does not change production.

## Entry state

Canonical repository entry:

```text
main = 9264dcffdb340d434e754760702615d2111bafe2
ADR 0247 = GREEN / NO EFFECT / LIVE FAILURE SEMANTICS PROVEN
open PRs = 0
post-merge main workflows = 4/4 GREEN
```

Production remains:

```text
Core revision = 46741f8d82d041b3f3cdde3d209c923e630db968
Core = healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
Task Drain = OFF / quiescent
Ana = idle / wandora_mastra
28PRO work = 1
unfinished = 0
outbound = 0
VendaERP activity = 70 events
VendaERP activity sha256 =
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

No second real VendaERP read has occurred.

## Proven gap

ADR 0244's single canonical product read returned the safe MCP error code:

```text
invalid-provider-response
```

The current product adapter can produce that same code from at least two distinct branches:

1. the provider response is not a direct array of objects;
2. the provider returns an array, but a product has no usable lowercase `nome`.

The existing safe stderr event logs only:

```json
{
  "event": "wandora.vendaerp-readonly.tool-error",
  "tool": "vendaerp_search_products",
  "code": "invalid-provider-response"
}
```

Therefore the durable/safe evidence cannot distinguish the two branches.

The repository does not establish any canonical identity between VendaERP and another public ERP API. External schema similarities are therefore treated only as hypotheses and are not authority to change normalization.

## Capability Authority / Reuse Gate

No new subsystem, state, table, service, cache, retry path or provider mirror is required.

Authority remains:

- VendaERP MCP owns provider-specific request/response adaptation and safe provider error normalization.
- Paperclip owns Tool Gateway transport, policy, rate limiting, audit and lifecycle.
- Wandora Core owns Tool Gateway result-to-runtime semantic translation.
- Mastra remains the replaceable supervised runtime.

The required capability is only **safe provider-adapter observability**, so the existing VendaERP MCP is the correct owner.

ADR 0168 remains binding.

## Decision

Add a closed, allowlisted `subreason` to the existing internal `VendaErpAdapterError`, but expose it only in the adapter's structured stderr event.

Allowed values for this slice are exactly:

```text
product-list-shape-invalid
product-name-missing
product-name-pascal-case-present
```

No arbitrary `error.message` is logged.

### Product list shape

If `Produtos/Pesquisar` does not normalize as the current direct array-of-objects contract:

```text
code = invalid-provider-response
subreason = product-list-shape-invalid
```

### Missing lowercase name

If a product row is an object but lowercase `nome` is absent/unusable:

- if fixed schema key `Nome` contains a non-empty string, log:
  `product-name-pascal-case-present`;
- otherwise log:
  `product-name-missing`.

The value of `Nome` is never logged.

## Important non-decision

This ADR does **not** authorize accepting `Nome`, `Codigo`, `PrecoVenda` or any other alternate-cased provider field.

Even when `Nome` is detected, the read still fails with the existing public code:

```text
invalid-provider-response
```

Normalization may be changed only after real evidence proves the provider shape.

## Public MCP contract remains unchanged

`rpcToolErrorResult` still returns only the generic normalized code:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"invalid-provider-response\"}"
    }
  ],
  "structuredContent": {
    "error": {
      "code": "invalid-provider-response"
    }
  },
  "isError": true
}
```

`subreason` is not placed in MCP content or structuredContent.

No tool definition, endpoint allowlist, request parameter, credential behavior, risk annotation or network path changes.

## Validation

Local exact candidate validation:

```text
node --test integrations/paperclip/mcp-vendaerp-readonly-v1/test/server.test.mjs

tests = 11
pass = 11
fail = 0
```

New synthetic cases prove:

- object envelope instead of direct product array -> `product-list-shape-invalid`;
- product object with no lowercase or PascalCase name -> `product-name-missing`;
- product with `Nome` but no `nome` -> `product-name-pascal-case-present`.

Static verifier:

```text
WANDORA_VENDAERP_READONLY_MCP_V1_OK
```

`git diff --check` is clean.

Exact candidate blobs:

```text
server.mjs =
5e9b88202fab30fbb4284eb4224f4b7c34db625d

test/server.test.mjs =
dc4bb54c9cd8fac6d3a80a1c7c99bfa262783ff9
```

The GitHub branch contains those exact blob IDs.

## Second adversarial review

- Does the patch log raw provider payload? **No.**
- Does it log product names/codes/prices/stock? **No.**
- Does it log credentials, headers, URLs or request parameters? **No.**
- Can arbitrary error messages become subreasons? **No; logging is allowlisted.**
- Does `subreason` escape through MCP output? **No.**
- Does the patch accept PascalCase provider data? **No.**
- Does it broaden tools or endpoint allowlists? **No.**
- Does it add retries/provider calls? **No.**
- Does it create new durable state? **No.**
- Was VendaERP called during development or validation? **No.**

## Decision

**CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / OBSERVE, DO NOT NORMALIZE.**

A real provider read remains prohibited until this observability patch passes CI and is separately promoted to the live VendaERP MCP.

Next slice after merge:

**ADR 0249 — VendaERP Product Safe Subreason MCP Production Promotion Preflight V1 — NO PROVIDER CALL.**
