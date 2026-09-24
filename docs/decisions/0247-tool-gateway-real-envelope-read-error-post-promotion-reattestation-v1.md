# ADR 0247 — Tool Gateway Real Envelope Read-Error Post-Promotion Re-Attestation V1

Status: **GREEN / NO EFFECT / LIVE FAILURE SEMANTICS PROVEN / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Re-attest the ADR 0244 Tool Gateway execution-envelope failure semantics after the ADR 0246 Core production promotion, without creating customer work, invoking a model, or calling VendaERP.

## Canonical entry

```text
main = 86b963d3a42a7a7f5764cba442147a3ca71e4613
PR #320 = MERGED
ADR 0246 = COMPLETE / GREEN / CORE-ONLY PRODUCTION PROMOTION EXECUTED
```

The executable Core revision remains:

```text
46741f8d82d041b3f3cdde3d209c923e630db968
```

The later repository commits are documentation-only relative to the promoted Core artifact.

## Live production identity

Core:

```text
container =
72b05d68245862e5bfc3c8e61bb96e3aacddc117332305081ea1ff7ae7ab0178

image =
wandora/core:organization-adapter-candidate-46741f8d82d0

image id =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

health = healthy
restart = 0
healthz = 200
readyz = 200
```

Paperclip remains:

```text
container =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5

image =
wandora/paperclip:v2026.916.0

healthy / restart 0
```

Task Drain is OFF/quiescent with zero active runs and pending wakes.

Ana is idle / `wandora_mastra`.

## Live executable byte inspection

The running Core contains:

```text
/app/dist/paperclip-execution/tool-gateway-read-bridge.js
```

Direct inspection of that live file proved the promoted executable contains both required guards:

```text
if (responseBody.status !== 'completed') {
  ...
}

if (data?.isError === true ||
    result.error === 'MCP tool returned an error result') {
  ...
}
```

Therefore the promoted runtime is not merely label-addressed to the correction; the compiled executable bytes contain the expected envelope and semantic-error logic.

## Synthetic live-runtime semantic-error proof

A synthetic harness was executed **inside the live Core container** importing the compiled production module directly.

All I/O was supplied by an injected in-memory `fetchImpl`; no network request was made.

The synthetic Tool Gateway response matched the real execution-envelope shape:

```json
{
  "invocationId": "synthetic-invocation",
  "status": "completed",
  "tool": "vendaerp_search_products",
  "result": {
    "data": {
      "isError": true,
      "structuredContent": {
        "error": {
          "code": "invalid-provider-response"
        }
      }
    },
    "error": "MCP tool returned an error result"
  }
}
```

The live bridge result was:

```text
PaperclipToolGatewayReadBridgeError.code = tool-failed
```

The same read was then invoked again with the exact same parameters in different object-key order.

Observed:

```text
syntheticGatewayCalls = 1
identicalCallsCollapsed = true
```

Therefore the live same-parameter per-run failure latch/dedupe boundary remains intact.

## Additional envelope boundaries

A second synthetic harness against the same live compiled module proved:

1. a Tool Gateway execution envelope with `status=pending` fails closed as `tool-failed`;
2. a valid `status=completed` success envelope returns only the inner `result.data`, not the outer execution envelope.

Observed:

```json
{
  "nonCompleted": "tool-failed",
  "completedSuccess": "inner-data",
  "network": "synthetic-only"
}
```

## No-effect production readback

After both synthetic re-attestations:

```text
Task Drain = OFF / quiescent
activeRuns = 0
pendingWakes = 0

Ana = idle / wandora_mastra
temporary policies = 0
temporary rate counters = 0

28PRO work = 1
unfinished work = 0
outbound = 0

VendaERP activity events = 70
VendaERP activity sha256 =
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

The provider activity is byte-identical to the ADR 0246 final state.

No customer work, Paperclip issue/run, wake, model call, Tool Gateway provider dispatch, VendaERP HTTP request, migration or outbound effect occurred.

## Capability Authority / Reuse Gate

The re-attested behavior remains at the correct Wandora-owned semantic boundary:

- Paperclip owns Tool Gateway transport/execution envelope, lifecycle, policy, rate limiting and audit.
- Wandora Core owns translation from Paperclip's execution-envelope result into runtime read-tool semantic success/failure.
- Mastra remains the replaceable supervised runtime.
- VendaERP MCP remains the replaceable provider adapter.

No provider implementation is duplicated.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review

- Live image/revision exact promoted candidate? **Yes.**
- Compiled live bytes contain envelope guard? **Yes.**
- Completed MCP `isError=true` maps to `tool-failed`? **Yes.**
- Non-completed envelope fails closed? **Yes.**
- Successful completed envelope unwraps inner data? **Yes.**
- Repeated identical semantic failure collapses to one call? **Yes.**
- Any real network/provider/model call used in proof? **No.**
- VendaERP activity changed? **No.**
- New work/outbound created? **No.**
- Paperclip/Mastra/MCP changed? **No.**

## Decision

**GREEN / NO EFFECT / LIVE FAILURE SEMANTICS PROVEN / NO PROVIDER CALL.**

The ADR 0244 envelope correction is now both promoted and re-attested in production.

The remaining business gap is the provider-side `invalid-provider-response`. Existing safe evidence does not distinguish whether the response was:
- not the documented top-level array shape; or
- an array containing a product without the required `nome`.

A second real provider read remains prohibited until that ambiguity is made safely observable without persisting raw business payloads.

Next slice:

**VendaERP Product Invalid-Provider-Response Safe Subreason Observability V1 — NO PROVIDER CALL.**
