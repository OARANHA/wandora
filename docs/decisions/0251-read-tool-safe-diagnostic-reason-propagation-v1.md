# ADR 0251 — Read-Tool Safe Diagnostic Reason Propagation V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**  
Date: 2026-09-24

## Objective

Preserve the safe, allowlisted VendaERP product parser subreason introduced by ADR 0248 across the existing Paperclip Tool Gateway execution-envelope boundary and the existing Core private execution bridge, without changing lifecycle authority, retry behavior, durable product state or provider execution.

The existing terminal error remains:

```text
HTTP 422
error = read-tool-failed
```

When and only when the MCP error is:

```text
structuredContent.error.code = invalid-provider-response
```

Core may additionally expose one of two bounded reasons:

```text
product-list-shape
product-name-missing
```

All other reason strings are discarded.

## REAL NOW

Canonical repository at development baseline:

```text
main =
3170144a202371527fda6f6154515be317a91679

ADR 0250 =
COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL
```

Production remains:

```text
Core =
  wandora/core:organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy / restart 0

Paperclip =
  wandora/paperclip:v2026.916.0
  same container 4b187dc595ea...
  healthy / restart 0

Task Drain =
  OFF
  activeRuns=0
  pendingWakes=0
  quiescent=true

Ana =
  idle / wandora_mastra

work =
  1 completed

unfinished =
  0

outbound =
  0

VendaERP activity =
  70 events
  sha256 e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b

VendaERP MCP live server.mjs =
  sha256 c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b
```

No provider/model call occurred during this slice.

## Proven gap

ADR 0250 made the provider-specific parser classification safe and observable at the MCP result boundary:

```text
structuredContent.error = {
  code: invalid-provider-response,
  reason: product-list-shape | product-name-missing
}
```

Pinned/live-equivalent Paperclip proves `normalizeMcpToolResult()` preserves that structure in:

```text
result.data.structuredContent
```

The current Core Tool Gateway read bridge correctly unwraps the real Paperclip execution envelope and recognizes:

```text
result.data.isError === true
or
result.error === MCP tool returned an error result
```

but then throws only:

```text
PaperclipToolGatewayReadBridgeError('tool-failed')
```

The private execution handler consequently returns only:

```json
{"error":"read-tool-failed"}
```

Paperclip persists a redacted result summary/hash, not the full structured MCP result. Normal local-stdio stderr is captured transiently inside the Tool Gateway process and is not durably exposed for a successful JSON-RPC response.

Therefore another real product read at this point could spend the one allowed provider call and still lose the diagnostic reason before the durable customer-work failure boundary.

That is **NO-GO**.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- VendaERP MCP owns provider-response parsing and emits only safe normalized parser reasons.
- Wandora Core owns semantic consumption of Tool Gateway results and the bounded private execution-bridge error contract.
- Paperclip owns Tool Gateway transport, lifecycle, policy, rate limiting and audit.
- `wandora_mastra` remains the replaceable supervised adapter and maps the existing `422 read-tool-failed` to Paperclip-native `blocked`.
- no new durable state, retry engine, lifecycle machine, provider mirror or invocation counter is introduced.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Decision

Extend only the existing Core boundary.

### Bridge contract

`PaperclipToolGatewayReadBridgeError` gains an optional bounded reason:

```text
product-list-shape
product-name-missing
```

Core reads the reason only from:

```text
result.data.structuredContent.error.reason
```

and only when:

```text
result.data.structuredContent.error.code == invalid-provider-response
```

Any other code/reason is dropped.

### Private HTTP contract

Existing behavior is preserved:

```json
{"error":"read-tool-failed"}
```

When the bounded reason exists:

```json
{"error":"read-tool-failed","reason":"product-list-shape"}
```

or:

```json
{"error":"read-tool-failed","reason":"product-name-missing"}
```

The top-level `error` value does not change.

### Mastra lifecycle compatibility

`wandora_mastra@0.5.0` already decides the terminal failure mapping using only:

```text
HTTP status == 422
failure.error == read-tool-failed
canonical customer work is present
```

It ignores unrelated extra JSON fields.

A focused adapter test now proves the same issue is still moved to Paperclip-native `blocked` when the 422 includes an allowlisted reason.

No adapter runtime code change is required.

## Second adversarial review

Rejected:

1. persisting raw provider payload for diagnosis;
2. logging product values;
3. modifying Paperclip Tool Gateway persistence to retain full MCP payloads;
4. modifying Paperclip local-stdio stderr behavior;
5. adding a Wandora diagnostic table;
6. performing a direct operator Tool Gateway provider call outside canonical customer work;
7. spending another provider call before the reason can survive the existing semantic boundary;
8. trusting arbitrary MCP reason strings.

The minimum safe change is the existing Core contract extension above.

## Validation

Focused Core tests:

```text
paperclip-execution-bridge.test.ts
paperclip-tool-gateway-read-bridge.test.ts

12/12 GREEN
```

Proven:

- real Tool Gateway execution envelope is still unwrapped;
- MCP `isError=true` still fails closed;
- `product-list-shape` crosses the bridge;
- repeated identical failed reads still dedupe to one Tool Gateway call;
- an unapproved reason string is discarded;
- the original no-reason 422 shape remains unchanged.

Core build validation:

```text
npm run typecheck = GREEN
npm run build = GREEN
```

The local dependency source used for typecheck/build had a byte-identical Core `package.json`; no dependency download was required.

Adapter contract:

```text
wandora_mastra-v1
9/9 GREEN
```

The canonical customer-work failure test uses:

```json
{"error":"read-tool-failed","reason":"product-list-shape"}
```

and still proves exact Paperclip-native blocking plus failed adapter run.

## Production effects

None.

Specifically:

- no VendaERP call;
- no model call;
- no customer work;
- no Paperclip issue/run/wakeup;
- no Task Drain mutation;
- no Tool Gateway policy mutation;
- no outbound;
- no migration;
- no runtime restart;
- no live Core/MCP/adapter replacement.

Final activity remains exactly 70 events.

## Decision status

**CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED.**

A second real provider read remains **NO-GO** until:

1. this change is merged;
2. the corresponding Core candidate is qualified;
3. the Core-only promotion is executed;
4. the live private 422 reason propagation is re-attested synthetically;
5. a fresh one-shot preflight reuses ADR 0242's native Paperclip block + `rate_limit=1` controls.

Only then may a genuine owner-originated 28PRO customer work spend exactly one provider call.