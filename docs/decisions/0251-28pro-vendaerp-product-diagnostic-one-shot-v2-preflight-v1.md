# ADR 0251 — 28PRO VendaERP Product Diagnostic One-Shot V2 Preflight V1

Status: **GREEN / NO EFFECT / HARD ONE-PROVIDER-CALL BUDGET REUSED / OWNER SESSION REQUIRED FOR EXECUTION / NO PROVIDER CALL**  
Date: 2026-09-24

## Objective

Qualify a second and final bounded diagnostic product read for 28PRO after ADR 0250 promoted safe VendaERP product-error subreasons.

The execution goal is narrow:

- submit exactly one genuine owner-originated Wandora customer work;
- allow only `vendaerp_search_products`;
- force exactly `{"pageSize":5,"skip":0}`;
- permit at most one provider dispatch;
- prohibit retry, duplicate work, manual wake or alternate VendaERP tool;
- if the read succeeds, return the bounded product projection;
- if it fails as `invalid-provider-response`, capture the safe `reason` from Paperclip evidence before cleanup;
- stop after that single outcome.

This ADR is preflight only. It performs no provider/model call and creates no production policy, work, issue, run, wake or outbound effect.

## Canonical entry

Repository:

```text
main =
3170144a202371527fda6f6154515be317a91679

ADR 0250 =
COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL

open PRs =
0

post-merge push workflows =
4/4 GREEN
  Core CI
  Messaging Gateway CI
  Platform Admin CI
  Web CI
```

ADR 0250's Task Drain exit was reconciled from real tool history:

```text
first native stop ~08:22:05Z:
  wasActive=true
  final draining=false / quiescent

second idempotent stop ~08:22:11Z:
  wasActive=false
```

The TTL remained a backstop and did not restore admission.

## Current production baseline

Paperclip:

```text
container =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5

image =
wandora/paperclip:v2026.916.0

health = healthy
restart = 0
```

Core:

```text
container =
72b05d68245862e5bfc3c8e61bb96e3aacddc117332305081ea1ff7ae7ab0178

image =
wandora/core:organization-adapter-candidate-46741f8d82d0

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

health = healthy
restart = 0
```

Live VendaERP MCP:

```text
server.mjs sha256 =
c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

WANDORA_SOURCE_COMMIT sha256 =
a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

source marker =
c697c9c803ac03dfafa52bf730a7e28c6191fda6
```

The live MCP is the ADR 0248/0250 version that safely classifies:

```text
invalid-provider-response / product-list-shape
invalid-provider-response / product-name-missing
```

without persisting raw provider payloads.

28PRO durable baseline:

```text
work = 1
unfinished = 0
outbound = 0
```

The one existing work is the already-completed first one-shot.

## Paperclip live admission baseline

Current native Task Drain:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

Ana:

```text
id =
428b6730-3df4-4b92-b90a-a87f87c401f9

status =
idle

adapterType =
wandora_mastra
```

No enabled temporary `block` or `rate_limit` policy is present.

No residual one-shot rate-limit counter is present through an active temporary policy.

## Existing Connection / gateway / catalog identity

28PRO VendaERP Connection:

```text
id =
8e2c23f4-73f5-444a-8647-71428819ea91

status = active
enabled = true
transport = local_stdio
healthStatus = ok
```

Tool Gateway:

```text
id =
67d89d09-87eb-4991-bfce-11d318f8d635

status = active
defaultProfileMode = gateway_only

profileId =
6b5a8519-81b0-4bad-9135-db3166b21af4
```

Exactly eight active catalog entries remain bound to the same application. All are:

```text
riskLevel = read
isWrite = false
isDestructive = false
```

Tools:

```text
vendaerp_get_product_stock
vendaerp_list_companies
vendaerp_list_price_tables
vendaerp_probe
vendaerp_search_orders
vendaerp_search_parties
vendaerp_search_price_table_products
vendaerp_search_products
```

The product catalog entry remains:

```text
165fcdca-8021-41dd-90e5-f0f143adeac3
```

No template, Connection, install, grant, profile or catalog mutation is required.

## VendaERP activity baseline

Current Tool Connection activity:

```text
events =
70

sha256 =
e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
```

The first real one-shot's final `call_completed` event proves Paperclip persists the MCP result through its governed/redacted `resultSummary`.

Its stored summary contains the old safe MCP structure:

```json
{
  "isError": true,
  "structuredContent": {
    "error": {
      "code": "invalid-provider-response"
    }
  }
}
```

The live ADR 0250 MCP adds only an allowlisted `reason` to that same `structuredContent.error` object.

Therefore a second bounded failure can be diagnosed from Paperclip's governed activity evidence as:

```text
product-list-shape
```

or:

```text
product-name-missing
```

without requiring raw provider payload persistence or a third provider call.

## Reuse Gate / Capability Authority

No new limiter, scheduler, retry engine, lifecycle service, work state machine or provider mirror is justified.

Reuse the already-qualified Paperclip-native controls from ADR 0242 and proven by ADR 0244:

- native Tool Gateway `block` policy;
- native Tool Gateway `rate_limit` policy;
- native authoritative rate-limit counter;
- native Task Drain for guard installation;
- Paperclip issue/run/wake lifecycle;
- existing gateway-only profile;
- existing local-stdio VendaERP Connection.

Authority remains:

- Wandora owns customer-work authorization/idempotency and semantic result handling;
- Paperclip owns tool admission, rate limiting, lifecycle, audit and dispatch;
- VendaERP MCP owns provider-specific request/response translation;
- Mastra remains the replaceable supervised runtime.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Hard provider-call budget

The execution must reuse the exact one-call budget pattern already proven in production.

### Temporary block policy

Target:

```text
agentId =
428b6730-3df4-4b92-b90a-a87f87c401f9

connectionId =
8e2c23f4-73f5-444a-8647-71428819ea91
```

Block exactly the seven non-product tools:

```text
vendaerp_get_product_stock
vendaerp_list_companies
vendaerp_list_price_tables
vendaerp_probe
vendaerp_search_orders
vendaerp_search_parties
vendaerp_search_price_table_products
```

### Product rate-limit policy

Selectors:

```text
agentId =
428b6730-3df4-4b92-b90a-a87f87c401f9

connectionId =
8e2c23f4-73f5-444a-8647-71428819ea91

catalogEntryId =
165fcdca-8021-41dd-90e5-f0f143adeac3

toolName =
vendaerp_search_products
```

Config:

```json
{
  "limit": 1,
  "windowSeconds": 3600,
  "keyBy": ["agent", "tool"]
}
```

The execution must use new execution-specific policy names and delete only those exact temporary policy IDs after evidence capture.

No ADR0243 policy name or stale policy object should be reused.

## Dry-run gate

While Task Drain is ON/quiescent, the execution must test the complete eight-tool matrix with:

```text
consumeRateLimit = false
writeAuditEvent = false
```

Required matrix:

```text
7 non-product tools =
deny / deny_policy_block

vendaerp_search_products =
allow / allow_profile
```

Before Task Drain release, the native rate-limit counter for the new temporary product policy must have **no row**.

This proves guard qualification itself did not consume the one provider slot.

## Frozen provider request

The sole admissible business read is:

```text
tool =
vendaerp_search_products

arguments =
{"pageSize":5,"skip":0}
```

No other filter or tool argument is authorized for this diagnostic work.

The live VendaERP MCP remains GET-only, bounded-timeout and automatic-retry-free. The first real execution already proved one admitted product MCP call maps to at most one upstream HTTP GET.

## Core / Mastra failure semantics

The live Core already contains ADR 0244's real Tool Gateway execution-envelope fix.

ADR 0247 re-attested against the live compiled bytes:

- completed envelope + MCP `isError=true` -> `tool-failed`;
- non-completed envelope -> fail closed;
- identical same-parameter calls collapse in the per-run bridge;
- successful completed envelope returns inner data.

`wandora_mastra@0.5.0` remains Paperclip-native lifecycle/disposition compatible and no retry/successor provider-call path is authorized.

No new Core/Mastra diagnostic propagation is required to execute this one-shot because the safe `reason` is already durably observable in Paperclip's governed Tool Gateway activity result summary.

## Rejected parallel branch

A non-canonical remote branch exists:

```text
feat/adr0251-read-tool-safe-diagnostic-reason-propagation-v1
```

It proposes carrying the optional provider diagnostic reason through Core's private `422 read-tool-failed` response and into the Mastra adapter error string.

This preflight does **not** select that branch.

Reason:

- its motivating claim that another provider call could lose the diagnostic reason is contradicted by current live evidence;
- Paperclip already persists the MCP `structuredContent.error` inside the governed/redacted Tool Gateway `resultSummary`;
- ADR 0250's reason is therefore recoverable operationally after one bounded call;
- widening the Core/Mastra contract before learning the actual provider shape is not required for the immediate product goal.

The branch remains non-canonical and must not be merged merely as a prerequisite for this one-shot.

This is a reuse/minimal-change decision, not a claim that safe diagnostic propagation could never be useful later.

## Owner-session boundary

Canonical customer work still requires a genuine authenticated human owner session:

```text
Authorization
-> HumanSupervisionReadService.getSessionContext(...)
-> session.user.id
-> actorUserId
-> OrganizationAdapterService.ensureCatalogEmployeeWork(...)
```

The execution must not use:

- admin/service-role impersonation;
- operator-minted owner JWT;
- extracted/persisted customer session tokens;
- direct SQL work creation;
- direct Organization Adapter invocation;
- synthetic Paperclip issue creation.

The owner must submit one work through the normal Wandora UI.

## Second adversarial review

- Core/Paperclip healthy and stable? **Yes.**
- Task Drain OFF/quiescent at preflight? **Yes.**
- Ana idle? **Yes.**
- Unfinished work? **0.**
- Outbound attempts? **0.**
- Temporary block/rate-limit policies? **0.**
- Connection healthy? **Yes.**
- Exactly eight active read-only tools? **Yes.**
- Product catalog entry unchanged? **Yes.**
- Tool Gateway remains gateway-only? **Yes.**
- MCP safe-reason bytes live? **Yes.**
- Activity still byte-identical at 70 events? **Yes.**
- Safe reason recoverable through Paperclip governed result summary? **Yes.**
- Hard one-call rate limit already production-proven? **Yes.**
- MCP automatic retry? **No.**
- Need a new Wandora-owned limiter/lifecycle? **No.**
- Need the parallel Core/Mastra diagnostic branch before one-shot? **No.**
- Provider/model call performed by this preflight? **No.**
- Production mutation performed by this preflight? **No.**

## Frozen execution sequence

The separate execution must occur only after the 28PRO owner confirms a genuine browser session is still authenticated.

Then:

1. reconcile exact main, open PRs, runtime, live MCP hash, work/outbound/activity;
2. require Ana idle and no active run/wake;
3. require no residual temporary block/rate-limit policy;
4. start bounded Paperclip-native Task Drain;
5. require `draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`;
6. create a new seven-tool `block` policy;
7. create a new product `rate_limit=1` policy;
8. run the eight-tool policy matrix with `consumeRateLimit=false`;
9. prove the new rate-limit counter has no row;
10. re-prove Task Drain quiescent;
11. explicitly end Task Drain through the native Paperclip contract;
12. require Task Drain OFF/quiescent;
13. immediately have the authenticated 28PRO owner submit exactly one new canonical customer work;
14. do not retry, resubmit, manually wake, or create a second work;
15. permit only `vendaerp_search_products {"pageSize":5,"skip":0}`;
16. capture the authoritative native rate counter before cleanup;
17. require `limit=1 / remaining=0` if a product provider dispatch occurred;
18. capture the new Tool Gateway activity events and result summary before cleanup;
19. if successful, validate only the bounded provider-neutral product projection;
20. if `invalid-provider-response`, extract only the allowlisted structured `reason`;
21. prove exactly one work, one issue, one assignment run, zero retry/successor/manual wake for the new execution;
22. prove zero outbound delta;
23. delete only the two new temporary policy IDs;
24. require final no active run/wake, no temporary policy/counter residue, and STOP.

No automatic third provider attempt is authorized regardless of outcome.

## Canonical work text

The owner-facing work must remain narrowly bounded:

```text
Título:
Consulta diagnóstica limitada de produtos no VendaERP — V2

Descrição:
Consulte o VendaERP e mostre até 5 produtos do catálogo com as informações comerciais básicas disponíveis.

Para esta tarefa, use somente vendaerp_search_products, com exatamente pageSize=5 e skip=0. Não use nenhuma outra ferramenta.

Não crie, altere ou exclua dados. Não envie mensagens e não realize nenhuma ação externa.

Retorne somente dados efetivamente fornecidos pelo VendaERP e, quando disponíveis, limite o resultado a: nome, código, categoria, marca, unidade, preço de venda e saldo de estoque.

Não invente campos ausentes e não exponha externalRef, código de barras, preço mínimo, payload bruto, credenciais ou identificadores internos.

Se a consulta não puder ser interpretada com segurança, falhe sem tentar novamente.
```

The user must click submit exactly once.

## Decision

**GREEN / NO EFFECT / HARD ONE-PROVIDER-CALL BUDGET REUSED / OWNER SESSION REQUIRED FOR EXECUTION / NO PROVIDER CALL.**

The next slice is:

**ADR 0252 — 28PRO VendaERP Product Diagnostic One-Shot V2 Production Execution V1 — HARD PROVIDER CALL BUDGET / EXACTLY ONE OWNER SUBMISSION.**

Do not install temporary guards until the owner session is confirmed ready.
