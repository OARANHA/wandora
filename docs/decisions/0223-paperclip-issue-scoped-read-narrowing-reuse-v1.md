# ADR 0223 — Paperclip Issue-Scoped Read Narrowing Reuse V1

Status: **CANDIDATE / NO PRODUCTION EFFECT / SUPERSEDES ADR 0221 NARROWING + ADR 0222 PROMOTION PLAN**
Date: 2026-09-23

## Context

ADR 0220 authorized one bounded semantic read for 28PRO:

```text
vendaerp_search_products
{ "pageSize": 5, "skip": 0 }
```

The live proof `PRO-4` failed.

The intended product read was attempted, but the supervised model also attempted other read tools after the failure:

- `vendaerp_probe`;
- `vendaerp_search_parties`;
- `vendaerp_list_price_tables`.

The intended and diagnostic provider reads failed with Paperclip-normalized:

```text
local_stdio_protocol_error
Local stdio MCP server returned a JSON-RPC error
```

The probe succeeded.

Wandora work operations and outbound attempts remained 0/0. No write/destructive tool was invoked.

ADR 0221 responded by adding a Wandora-owned per-task marker and intersecting Paperclip-authorized tools inside the ADR 0211 bridge.

ADR 0222 subsequently qualified promotion of that code. A concurrent production execution then partially applied that plan before this deeper capability review completed.

Live reconciliation on 2026-09-23 proves:

```text
Core
  image    = wandora/core:organization-adapter-candidate-41801d40228f
  revision = 41801d40228f1781bb0025a1522e9206dcb97fa2
  health   = healthy
  restarts = 0

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
  source marker     = 87bf5d51a694389900bb81d5efbfcc15a8e12557

wandora_mastra
  version     = 0.4.0
  loaded      = true
  package     = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
```

Therefore the ADR 0221 promotion occurred only partially:

- Core per-task narrowing code is live;
- safe VendaERP MCP error logging is live;
- the ADR 0221 `wandora_mastra` marker-forwarding candidate was **not** installed.

Because the live adapter does not emit the ADR 0221 marker contract, the Core narrowing code is dormant in the current production path.

## New proven provider evidence

A deeper Paperclip v2026.916.0 capability review found a native capability not considered by ADR 0221.

Paperclip tool profile bindings support:

```text
company
agent
project
routine
issue
gateway
```

Paperclip's canonical precedence is:

```text
gateway
> issue
> routine
> agent
> project
> company
```

For ordinary profiles, Paperclip uses the narrowest matching scope.

The pinned Paperclip source includes tests proving:

- issue-scoped profiles override company defaults;
- issue-scoped allow profiles can admit a tool while broader defaults deny;
- agent scope overrides project scope;
- run context issue identity is checked against the stored heartbeat context.

The existing 28PRO VendaERP profile created by the connection install is agent-scoped and is not an additive `app_gallery_finish` profile.

Therefore an issue-bound profile can narrow the existing Ana agent profile for one proof issue without creating a second execution authority.

## Capability Authority / Reuse Gate

The semantic requirement is real:

```text
this task may use exactly one already-authorized read capability
```

But the operational implementation already exists in Paperclip.

Therefore Wandora must not duplicate it with:

- a task marker that behaves as a second policy language;
- a Core-side tool allowlist registry;
- a second authorization engine;
- durable task-tool state.

Paperclip remains authoritative for:

- profile binding;
- run/issue identity;
- catalog entries;
- policy evaluation;
- Tool Gateway visibility;
- audit;
- MCP execution.

Wandora remains authoritative for deciding which business capability is appropriate for the slice.

## Decision

The per-task read narrowing introduced by ADR 0221 is superseded and must be removed from the production Core path.

Because a concurrent execution already promoted the ADR 0221 Core candidate, the next convergence promotion must restore the Core to the ADR 0218 behavior represented by this ADR 0223 branch.

The following candidate changes are removed before production promotion:

- `allowedReadToolNames` execution payload contract;
- `wandora-read-tools-v1` Paperclip issue marker;
- Core ingress validation for that marker;
- Core Tool Gateway intersection by task marker;
- adapter parsing/forwarding of that marker.

The ADR 0211 bridge remains unchanged from its ADR 0218 production-qualified behavior.

### Native Paperclip narrowing for the next proof

A future bounded retry must:

1. create a temporary Paperclip-only issue;
2. create or reuse a temporary active profile with `defaultAction=deny`;
3. include exactly the catalog entry for `vendaerp_search_products`;
4. bind that profile to the issue ID with `targetType=issue`;
5. prove effective access for that issue exposes only the product-search tool;
6. run Ana through the native Paperclip run lifecycle;
7. remove the issue binding/profile after reconciliation.

The issue-scoped profile is a Paperclip operational capability, not Wandora product state.

## Safe provider error observability remains accepted

ADR 0221 also added safe VendaERP MCP stderr metadata:

```json
{
  "event": "wandora.vendaerp-readonly.tool-error",
  "tool": "<known tool>",
  "code": "<normalized adapter error code>"
}
```

This change remains approved because it does not duplicate Paperclip authority and does not expose:

- provider credentials;
- request arguments;
- URL/tenant;
- raw provider response;
- business payload.

The live MCP **has already been promoted** to this safe-logging version and must be retained as-is.

No MCP replacement is required by ADR 0223.

Core and `wandora_mastra` do not need ADR 0221 narrowing promotion.

## Provider error gap

Public VendaERP documentation was verified without a new 28PRO call.

For `/api/request/Produtos/Pesquisar` it confirms:

- GET;
- required `Authorization-Token`, `User`, `App`;
- `pageSize` and `skip`;
- HTTP 200 array of `Produto`.

The public schema includes fields used by the current projection.

The existing live failure therefore remains unclassified.

The current MCP adapter safely knows normalized categories such as:

- `unauthorized`;
- `rate-limited`;
- `provider-unavailable`;
- `invalid-provider-response`;
- `invalid-input`.

Paperclip currently normalizes JSON-RPC tool failures to `local_stdio_protocol_error`, so live safe stderr logging is required before retry.

## Second adversarial review

- Are we recreating Paperclip profile/policy capability? **No; the Wandora duplicate is removed.**
- Is any new Wandora table/state needed? **No.**
- Can issue scope broaden access? **No; the profile includes only an already-authorized catalog entry.**
- Does issue scope override the Ana agent profile? **Yes, proven by pinned Paperclip precedence/tests.**
- Are write/destructive tools admitted? **No.**
- Does this authorize a provider retry? **No.**
- Was production already partially changed concurrently before this ADR closed? **Yes: Core + MCP only, proven by live readback.**
- Does this ADR itself perform a new production mutation? **No.**
- Does safe logging expose provider data? **No.**
- Does ADR 0168 remain preserved? **Yes.**

## Effect boundary

This slice performs no:

- Core promotion;
- adapter replacement;
- MCP production staging;
- Paperclip profile mutation;
- provider call;
- model run;
- customer work;
- outbound;
- migration.

## Decision

**GREEN for architectural correction and code qualification.**

ADR 0221 is superseded only for its Wandora-owned per-task narrowing implementation.

ADR 0222's three-artifact promotion plan must not be repeated.

The next safe runtime slice is:

**ADR 0223 Core Convergence Promotion V1 — NO PROVIDER CALL**

That slice may:

1. promote only the ADR 0223 Core candidate that removes the dormant Wandora-owned per-task narrowing;
2. leave the already-live `wandora_mastra` package unchanged;
3. leave the already-live VendaERP MCP safe logging unchanged;
4. require Core/Paperclip healthy and work/outbound 0/0.

After Core convergence, a separate retry preflight may create a temporary Paperclip issue-scoped profile containing exactly `vendaerp_search_products`, prove effective one-tool visibility, and only then authorize one new bounded provider read.
