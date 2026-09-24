# ADR 0252 — 28PRO VendaERP Product Diagnostic One-Shot V2 Production Execution V1

Status: **COMPLETE / HARD ONE-PROVIDER-CALL BUDGET HONORED / SAFE DIAGNOSTIC RESULT = product-list-shape / ZERO OUTBOUND**  
Date: 2026-09-24

## Objective

Execute exactly one genuine owner-originated 28PRO customer work under the ADR 0251 hard one-provider-call budget, using only:

```text
vendaerp_search_products
{"pageSize":5,"skip":0}
```

The execution goal was to determine whether the already-observed `invalid-provider-response` is caused by:

- `product-list-shape`; or
- `product-name-missing`;

without persisting raw provider payload and without permitting retry or a second provider dispatch.

## Canonical entry

Repository:

```text
main =
dafae1f84ce86c3f00d5d5a9b32500d623cb8f5d

open PRs =
0

post-merge push workflows =
4/4 GREEN
  Core CI
  Messaging Gateway CI
  Platform Admin CI
  Web CI
```

Live runtime at entry:

```text
Core =
  wandora/core:organization-adapter-candidate-46741f8d82d0
  revision 46741f8d82d041b3f3cdde3d209c923e630db968
  healthy / restart 0

Paperclip =
  wandora/paperclip:v2026.916.0
  healthy / restart 0

VendaERP MCP =
  server.mjs sha256 c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b
  source marker sha256 a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

Task Drain =
  OFF / quiescent

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
```

Connection/gateway/catalog remained exactly the ADR 0251-qualified surface:

- Connection active / enabled / local_stdio / health=ok;
- Tool Gateway active / gateway_only;
- exactly 8 active catalog tools;
- all `riskLevel=read`, `isWrite=false`, `isDestructive=false`;
- product catalog entry `165fcdca-8021-41dd-90e5-f0f143adeac3`.

No temporary block/rate-limit policy or counter existed at entry.

## Protected guard installation

A genuine authenticated 28PRO owner browser session was confirmed ready before installing guards.

Paperclip-native Task Drain was started:

```text
startedAt =
2026-09-24T09:54:05.999Z

expiresAt =
2026-09-24T10:04:05.999Z

draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

New execution-specific temporary policies:

```text
block policy =
a2590881-cfe0-4782-9e17-51ce162a806d

rate-limit policy =
7cf746ef-7012-4b6b-8609-42438cbd0902
```

The block policy denied exactly the seven non-product tools.

The rate-limit policy targeted only `vendaerp_search_products` for Ana and the live 28PRO Connection with:

```json
{
  "limit": 1,
  "windowSeconds": 3600,
  "keyBy": ["agent", "tool"]
}
```

## Dry-run gate

Under Task Drain, the eight-tool matrix was tested with:

```text
consumeRateLimit=false
writeAuditEvent=false
```

Result:

```text
7 non-product tools =
deny / deny_policy_block

vendaerp_search_products =
allow / allow_profile
```

Before admission release, the new rate-limit policy had:

```text
counter rows = 0
```

Therefore guard qualification did not consume the sole provider slot.

Task Drain was then explicitly ended through the native Paperclip API:

```text
ended.wasActive=true

final:
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true
```

The two temporary policies remained active for the owner submission.

## Canonical owner submission

The owner submitted exactly one normal Wandora customer work through the authenticated 28PRO UI.

Work:

```text
id =
23a12be5-2e4e-44c8-aeb2-4076d7f16395

title =
Consulta diagnóstica limitada de produtos no VendaERP — V2

provider =
paperclip

provider run =
22ff09f4-d659-4790-89b9-3884ff303a9d
```

No duplicate submission occurred.

No outbound attempt occurred.

## Provider-call budget proof

The native rate-limit counter after execution:

```text
policy =
7cf746ef-7012-4b6b-8609-42438cbd0902

limit =
1

remaining =
0

createdAt =
2026-09-24T09:55:35.237Z

updatedAt =
2026-09-24T09:55:35.237Z
```

This proves the sole provider slot was consumed exactly once.

Tool Gateway activity increased only:

```text
70 -> 72 events
```

The two new events are:

1. one `policy_decision`;
2. one `call_completed`;

for the same run, same tool and exact request:

```json
{"pageSize":5,"skip":0}
```

No second product dispatch exists.

## Safe provider diagnostic

The single `call_completed` governed result summary contains:

```json
{
  "isError": true,
  "structuredContent": {
    "error": {
      "code": "invalid-provider-response",
      "reason": "product-list-shape"
    }
  }
}
```

Therefore the diagnostic conclusion is:

**The VendaERP product response reached the MCP but the top-level/list shape did not match the parser's currently accepted product-list forms.**

The observed failure is **not** `product-name-missing`.

No raw provider response was persisted or exposed, so the exact unrecognized response shape is not yet proven.

## Lifecycle proof

Paperclip issue:

```text
id =
e1fa7487-5bef-41ef-b8bb-2e60b708cf13

identifier =
PRO-15

status =
blocked
```

Exactly one assignment run exists in the execution window:

```text
run =
22ff09f4-d659-4790-89b9-3884ff303a9d

status =
failed

invocation_source =
assignment

retry_of_run_id =
null

continuation_attempt =
0

scheduled_retry_at =
null

error =
wandora_execution_failed_422

error_code =
adapter_failed
```

Wake evidence:

- one customer-work wake tied to the exact work id, ending failed with the same 422;
- one `issue_execution_same_name` wake was **coalesced** into the same run;
- the coalesced wake created no successor run and no provider dispatch.

Thus:

- no retry run;
- no continuation run;
- no manual wake;
- no duplicate assignment;
- no second provider call.

## Wandora durable result state

The Core correctly failed closed on the MCP semantic tool error.

Current work state:

```text
status =
execution_uncertain

provider_run_ref =
22ff09f4-d659-4790-89b9-3884ff303a9d

execution_id =
null

result_model =
null

result_summary =
null
```

Ana is left truthfully in Paperclip:

```text
status =
error

errorReason =
wandora_execution_failed_422
```

These states were **not** force-rewritten by SQL, operator impersonation or ad-hoc recovery during this execution.

## Cleanup

Before cleanup, all provider-call evidence was captured.

Only the two execution-specific temporary policy IDs were then deleted.

Final readback:

```text
Task Drain =
OFF / quiescent

ADR0252 temporary policies =
0

ADR0252 rate-limit counter residue =
0

active runs =
0

pending wakes =
0

VendaERP activity =
72 events
sha256 =
6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb

work =
2 total

unfinished =
1

outbound =
0
```

The unfinished work is the truthful `execution_uncertain` ADR 0252 work recorded above.

## Capability Authority / Reuse Gate

No new limiter, retry engine, workflow state machine or provider mirror was created.

- Wandora owns customer-work authorization/idempotency and semantic failure handling.
- Paperclip owns tool policy, rate limit, issue/run/wake lifecycle and governed result evidence.
- VendaERP MCP owns provider-specific response parsing.
- Mastra remains replaceable behind the runtime adapter.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Decision

**COMPLETE / HARD ONE-PROVIDER-CALL BUDGET HONORED / SAFE DIAGNOSTIC RESULT = product-list-shape / ZERO OUTBOUND.**

No automatic third provider call is authorized.

The next slice is **NO PROVIDER CALL**:

**VendaERP `Produtos/Pesquisar` Product-List Shape Contract Reconciliation V1.**

That slice must determine the actual documented/accepted response envelope and update only the replaceable VendaERP MCP parser if justified. It must not broaden the parser by guessing and must not add raw provider payload persistence.

Ana/error-state and the ADR 0252 `execution_uncertain` work remain separate reconciliation concerns and must use existing accepted recovery authority rather than ad-hoc mutation.
