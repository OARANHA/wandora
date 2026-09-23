# ADR 0221 — Per-Task Read Tool Admission + Safe Provider Error Observability V1

Status: **CODE CANDIDATE / NO PRODUCTION EFFECT / LIVE RETRY NOT AUTHORIZED**
Date: 2026-09-23

## Context

ADR 0220 qualified one bounded 28PRO business-semantic read:

```text
tool = vendaerp_search_products
parameters = { "pageSize": 5, "skip": 0 }
```

The execution was attempted concurrently after the preflight and is recorded as Paperclip issue:

```text
id = f68fa4cf-8dfa-4146-8aa0-46e0d6b03fc7
identifier = PRO-4
title = Wandora VendaERP bounded product read proof
final status = cancelled
```

No `wandora-work-v1` marker was present.

## Proven live evidence

The first run:

```text
run = d60c1c90-4c27-4678-96e3-f2287cd26a5a
source = on_demand
run status = succeeded
```

did not satisfy the ADR 0220 execution contract.

The intended call was made with the exact bounded parameters:

```text
vendaerp_search_products
{ "pageSize": 5, "skip": 0 }
```

but Paperclip recorded:

```text
status = failed
errorCode = local_stdio_protocol_error
errorMessage = Local stdio MCP server returned a JSON-RPC error
```

After that failure, the supervised model attempted additional read tools that ADR 0220 had not admitted for this work:

- `vendaerp_probe`;
- `vendaerp_search_parties`;
- `vendaerp_list_price_tables`.

The probe succeeded. The other provider reads failed with the same local stdio protocol error.

Paperclip then created a separate corrective lifecycle run:

```text
run = e571b44d-1603-41d7-be95-fd330b728af0
source = automation
run status = succeeded
```

The intended product read again failed, and subsequent diagnostic reads encountered Paperclip runtime restart backoff / storm suppression.

The issue was later cancelled after Paperclip reported missing-disposition recovery requiring board action.

This execution is **not GREEN**.

## Safety state after the failed proof

The failure did not create Wandora customer work or outbound effects.

At reconciliation:

```text
Wandora work operations = 0
Wandora outbound attempts = 0
Core = healthy / restart 0
Paperclip = healthy / restart 0
```

No write/destructive ERP tool was invoked.

## Gap 1 — prompt-only tool restriction is not an authorization boundary

ADR 0220 instructed the model to use only `vendaerp_search_products`.

The current runtime path nevertheless exposes every Paperclip-authorized connection-backed MCP tool with `risk=read` to Mastra.

Current flow:

```text
Paperclip run
-> Wandora adapter reviewedTask()
-> signed private execution bridge
-> Paperclip Tool Gateway session
-> GET /api/tool-gateway/tools
-> all authorized risk=read tools
-> supervised Mastra
```

Therefore a natural-language instruction can guide tool choice but cannot enforce per-work semantic scope.

The live PRO-4 evidence proves this distinction materially matters.

## Capability Authority / Reuse Gate

Paperclip v2026.916.0 was inspected before designing a correction.

The native run-scoped Tool Gateway session contract binds:

- company;
- agent;
- run;
- optional issue/project;
- TTL.

It does **not** provide a per-session tool-name allowlist.

Paperclip tool descriptors do expose a stable provider tool identity:

```text
upstreamToolName = catalogEntry.toolName
```

Paperclip remains authoritative for:

- ToolApplication / ToolConnection;
- grants and secret custody;
- install/profile;
- catalog;
- policy;
- risk classification;
- Tool Gateway session;
- audit;
- actual MCP execution.

No new Wandora policy engine, connection registry, tool registry, cache or durable state is justified.

## Decision — Wandora semantic narrowing only

Wandora will add an optional reviewed technical marker to Paperclip issue descriptions:

```text
<!-- wandora-read-tools-v1:vendaerp_search_products -->
```

The marker may contain 1–16 comma-separated safe tool names.

This marker is a **narrowing contract**, never a grant.

### Adapter boundary

The Wandora Paperclip adapter:

1. parses the marker after the optional `wandora-work-v1` marker;
2. removes the marker from model-visible task text;
3. places the normalized names into structured `allowedReadToolNames`;
4. sends that structure only inside the existing HMAC-authenticated private execution request.

### Core ingress boundary

Core validates:

- array only;
- 1–16 entries;
- safe tool-name syntax;
- lowercase normalization;
- no duplicates.

Malformed scope fails before Paperclip run identity resolution or runtime execution.

### Tool Gateway bridge boundary

The existing ADR 0211 bridge still asks Paperclip which tools are authorized.

It then applies only:

```text
Paperclip-authorized risk=read tools
INTERSECT
Wandora reviewed per-task upstreamToolName allowlist
```

A name in the Wandora marker cannot create access to a tool Paperclip did not authorize.

If no marker exists, legacy behavior remains unchanged.

No provider secret, catalog implementation or Paperclip policy is copied into Wandora.

## Gap 2 — provider error cause was hidden by the transport boundary

PRO-4 exposed only Paperclip's normalized error:

```text
local_stdio_protocol_error
```

That does not distinguish safe adapter categories such as:

- `unauthorized`;
- `rate-limited`;
- `provider-unavailable`;
- `invalid-provider-response`;
- `invalid-input`.

Without that distinction, repeating a live call is unjustified.

## Public contract verification

No additional 28PRO provider call was made during diagnosis.

The public VendaERP API documentation bundle at `apiv1-docs.vendaerp.com.br` was inspected instead.

It confirms for `/api/request/Produtos/Pesquisar`:

- method = GET;
- required headers = `Authorization-Token`, `User`, `App`;
- pagination parameters = `pageSize`, `skip`;
- HTTP 200 response = array of `Produto`.

The public `Produto` schema includes the fields the current provider-neutral projection expects, including:

- `nome`;
- `codigo`;
- `categoria`;
- `marca`;
- `estoqueUnidade`;
- `unidadeComercial`;
- `precoVenda`;
- `precoMinimoVenda`;
- `estoqueSaldo`.

Therefore the live failure is not presently proven to be an endpoint/method/schema-definition mistake.

A new live attempt must first have safe error-code observability.

## Decision — safe MCP error observability

On a VendaERP MCP `tools/call` failure, stderr records only:

```json
{
  "event": "wandora.vendaerp-readonly.tool-error",
  "tool": "<known tool name>",
  "code": "<normalized adapter error code>"
}
```

It does **not** log:

- authorization token;
- User/App credentials;
- provider URL;
- request arguments;
- provider response body;
- raw provider data.

JSON-RPC failure semantics remain unchanged.

## Second adversarial review

- New Wandora table? **No.**
- New durable runtime state? **No.**
- New cache or retrieval subsystem? **No.**
- Duplicate Paperclip grants/policy? **No.**
- Can Wandora marker grant a tool? **No; it only intersects with Paperclip-authorized tools.**
- Can prompt text alone broaden access? **No.**
- Does a malformed marker fail closed? **Yes.**
- Are provider credentials logged? **No.**
- Is raw provider data logged? **No.**
- Are write/destructive tools admitted? **No; ADR 0211 still requires connection-backed MCP risk=read.**
- Does this authorize a new live VendaERP call? **No.**
- Does this alter production in this ADR? **No.**

ADR 0168 remains preserved: portability is contract decoupling, not provider implementation duplication.

ADR 0208 remains preserved: generic REST Tool Gateway execution is NO-GO.

## Validation completed on the code candidate

Local, no-effect validation on the exact branch head:

### Wandora Paperclip adapter

```text
3/3 tests GREEN
```

This includes marker stripping and structured scope forwarding.

### VendaERP read-only MCP

```text
10/10 tests GREEN
```

This includes a stdio failure test proving the safe stderr event contains only normalized event/tool/code and does not contain synthetic credentials or request arguments.

### Core

```text
typecheck = GREEN
build = GREEN
focused tests = 9/9 GREEN
```

The focused tests prove:

- reviewed scope reaches Core ingress;
- malformed/duplicate scopes fail closed;
- Paperclip-authorized reads are intersected by stable `upstreamToolName`;
- a visible `vendaerp_probe` is hidden when only `vendaerp_search_products` is admitted;
- ADR 0218 duplicate-call collapse remains intact;
- denied identical reads remain non-retried.

A Core integration test also records the expected service handoff from `allowedReadToolNames` to `allowedUpstreamToolNames`; GitHub-hosted Core CI remains authoritative for its DB-backed fixture execution.

## Effect boundary

This slice does not:

- promote Core;
- change Paperclip runtime;
- replace the staged VendaERP MCP;
- create or modify Paperclip connections/grants/secrets/profiles;
- call the VendaERP tenant;
- create customer work;
- create outbound attempts;
- apply migrations.

## Decision

**GO for code qualification only.**

The failed ADR 0220 execution must not be retried against 28PRO until:

1. this code is reviewed and merged;
2. exact-head CI is GREEN;
3. the fixed Core and fixed VendaERP MCP runtime are separately qualified/promoted;
4. a new read-only retry preflight confirms the per-task marker admits only `vendaerp_search_products`;
5. safe adapter error-code observability is present in the live MCP runtime.

Only then may a separately authorized bounded product read be attempted again.
