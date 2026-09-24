# ADR 0248 — VendaERP Product Invalid-Provider-Response Safe Subreason Observability V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**
Date: 2026-09-24

## Objective

Make the next bounded VendaERP product read diagnostically useful without persisting raw provider payloads, changing Paperclip, or exposing business data.

ADR 0244 proved one real product read failed safely with top-level code `invalid-provider-response`, but existing evidence cannot distinguish two adapter branches:

- the provider response is not the documented top-level array-of-objects shape;
- the response is an array but at least one product lacks required `nome`.

A second real provider call remains prohibited until that ambiguity can be distinguished safely.

## Canonical entry

At implementation entry:

```text
main = 9264dcffdb340d434e754760702615d2111bafe2
ADR 0247 = GREEN / NO EFFECT / LIVE FAILURE SEMANTICS PROVEN
open PRs = 0
```

Production remains on Core revision `46741f8d82d0...` with the envelope fix live and re-attested.

## Capability Authority / Reuse Gate

No new subsystem, table, state machine, logger, retry mechanism or provider mirror is required.

- Paperclip remains Tool Gateway transport, policy, audit, rate-limit and lifecycle authority.
- VendaERP MCP remains the replaceable provider adapter and is the correct place to classify provider-response parsing failures.
- Wandora Core remains responsible only for mapping a provider/tool semantic failure to runtime failure.
- Mastra remains the replaceable supervised runtime.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## Decision

Keep the existing normalized top-level code exactly:

```text
invalid-provider-response
```

Add an optional safe `reason` only from a fixed allowlist:

```text
product-list-shape
product-name-missing
```

Unknown/arbitrary reason values are discarded before they reach any serialized result or log.

The two product parsing branches map as follows:

```text
response not array-of-objects -> product-list-shape
product missing non-empty nome -> product-name-missing
```

## Contract surface

The model/text-facing MCP content remains byte-shape compatible:

```json
{"error":"invalid-provider-response"}
```

The safe diagnostic reason is added only to structured MCP metadata:

```json
{
  "error": {
    "code": "invalid-provider-response",
    "reason": "product-list-shape"
  }
}
```

and to the existing safe stderr event:

```json
{
  "event": "wandora.vendaerp-readonly.tool-error",
  "tool": "vendaerp_search_products",
  "code": "invalid-provider-response",
  "reason": "product-list-shape"
}
```

No URL, tenant, request arguments, credentials, raw response body, product fields, provider identifiers or business payload is included.

Pinned Paperclip already summarizes the complete MCP result through its redaction pipeline, so `structuredContent` is sufficient for governed audit evidence without changing the text content contract.

## Code scope

Only the existing VendaERP MCP adapter and its tests change:

- `integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs`
- `integrations/paperclip/mcp-vendaerp-readonly-v1/test/server.test.mjs`

No Core, Paperclip, Mastra adapter, schema, migration, connection, grant, secret or production config change belongs to this ADR.

## Validation

Local no-network validation after rebase on canonical main:

```text
npm run verify
12/12 tests GREEN
WANDORA_VENDAERP_READONLY_MCP_V1_OK
git diff --check = GREEN
```

Tests prove:

- documented successful product projection is unchanged;
- non-array product response -> `invalid-provider-response / product-list-shape`;
- missing product name -> `invalid-provider-response / product-name-missing`;
- arbitrary unapproved reason -> omitted;
- structured MCP tool error contains only normalized code + safe reason;
- text content preserves the previous `{"error":"..."}` shape;
- stderr includes only event/tool/code/reason;
- synthetic provider payload and credentials do not appear in stderr;
- all eight tools remain read-only and the endpoint allowlist remains frozen.

All tests use injected synthetic fetch functions. No VendaERP request is made.

## Production no-effect readback

After implementation/testing:

```text
Core = organization-adapter-candidate-46741f8d82d0 / healthy / restart 0
healthz = 200
readyz = 200
Task Drain = OFF / quiescent
Ana = idle / wandora_mastra
temporary guards/counters = 0
work = 1
unfinished = 0
outbound = 0
VendaERP activity = 70 events
VendaERP activity sha256 =
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
live VendaERP MCP server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

The production MCP bytes are intentionally unchanged by this code-only slice.

## Second adversarial review

- Does this expose raw provider data? **No.**
- Can arbitrary strings become a reason? **No; allowlist only.**
- Does it change the existing top-level error code? **No.**
- Does it change model/text MCP content for existing errors? **No.**
- Does it add retry or lifecycle behavior? **No.**
- Does it change Paperclip semantics? **No.**
- Does it create Wandora-owned provider state? **No.**
- Was a provider/model call used to implement or test it? **No.**
- Is production changed? **No.**

## Decision status

**CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED.**

After merge, a separate no-provider promotion preflight must qualify the exact MCP artifact/runtime replacement. A second real VendaERP read remains prohibited until promotion and post-promotion re-attestation are complete.

Next slice:

**VendaERP Product Safe Subreason MCP Promotion Preflight V1 — NO PROVIDER CALL.**
