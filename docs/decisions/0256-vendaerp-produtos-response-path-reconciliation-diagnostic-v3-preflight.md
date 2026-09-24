# ADR 0256 — VendaERP Produtos/Pesquisar Response Path Reconciliation + Diagnostic V3 Preflight V1

Status: **PREFLIGHT GREEN / NO EFFECT / NO PROVIDER CALL / V3 EXECUTION REQUIRES SEPARATE SLICE**
Date: 2026-09-24

## Objective

Reconcile why ADR 0252 observed `invalid-provider-response / product-list-shape` through the live chain while an owner-provided VendaERP interface/export sample is described as a direct top-level array of Produto objects with PascalCase fields.

This slice makes no VendaERP provider call and does not broaden the parser.

## Canonical entry state

At session entry, repository evidence confirms:

- `main@d0075258b14d9a9b901c8b23ffb448b1787774b7`;
- ADR 0255 merged;
- the promoted MCP candidate has safe allowlisted `shape` observability;
- ADR 0252 consumed exactly one provider slot and failed before product projection with `reason=product-list-shape`;
- the historical work remains `execution_uncertain`;
- Ana remains truthfully `error / wandora_execution_failed_422`.

Those states are not rewritten here.

## New owner evidence

The handoff describes a VendaERP tool/interface export containing a direct JSON array of product objects with fields such as:

- `ID`;
- `Codigo`;
- `Nome`;
- `Categoria`;
- `Marca`;
- `PrecoVenda`;
- `PrecoMinimoVenda`;
- `EstoqueSaldo`;
- `EstoqueUnidade`;
- `UnidadeComercial`;
- `PrecosTabelas`;
- `Categorias`.

The actual attachment bytes were not available in the current session file index, so this ADR treats that description as owner-provided evidence rather than independently hashed file evidence.

## Response-path reconciliation

The current VendaERP MCP path is:

`fetch(GET) -> response.text() -> JSON.parse(body) -> records(payload)`.

There is no intermediate HTTP-client envelope creation or response re-wrapping between JSON parsing and `records()`.

The exact request contract is frozen and regression-tested:

- method: `GET`;
- path: `/api/request/Produtos/Pesquisar`;
- query: `codigo`, `nome`, `categoria`, `marca`, `ean`, `pageSize`, `skip`;
- headers: `accept: application/json`, `Authorization-Token`, `User`, `App`, fixed Wandora user-agent;
- redirects rejected;
- one bounded fetch per `searchProducts()` invocation;
- no automatic provider retry.

Accepted prior public-contract evidence also records HTTP 200 as a Produto array.

## Decisive structural finding

`records()` accepts any top-level array whose members are non-null JSON objects.

Therefore a direct top-level array of PascalCase Produto objects **cannot** produce `product-list-shape` in the current parser.

A new synthetic regression proof uses a direct PascalCase product array and confirms it passes the list-shape gate. It reaches the separate historical casing gap and fails later as:

`invalid-provider-response / product-name-missing`.

This proves the ADR 0252 parsed payload was structurally different from the owner-described direct array, unless the VendaERP UI/export transformed the HTTP response before presenting/exporting it.

## Casing gap

The current product projection reads historical camelCase provider fields such as `nome`, `codigo`, `precoVenda` and `estoqueSaldo`.

The owner-described sample uses PascalCase.

This is a real secondary compatibility gap, but it did not cause ADR 0252 because ADR 0252 failed before per-product projection.

No casing patch is made in this preflight. A future patch may support both spellings only if it remains explicit, bounded and top-level-shape neutral.

## Hypotheses eliminated

The current code evidence does not support:

- body being double-JSON-decoded by Wandora;
- a fetch-library response envelope being passed to `records()`;
- HTML/text being silently accepted as JSON;
- HTTP 401/403 being treated as a successful product list;
- non-2xx being treated as a successful product list;
- automatic provider retry inside the MCP.

Malformed JSON fails as `invalid-provider-response` before `records()`. 401/403, 429 and other non-2xx responses have distinct normalized failures.

## Remaining gaps

The unresolved difference can still be caused by one or more of:

- the VendaERP interface/export not being the raw response of the exact HTTP request used by the MCP;
- tenant-specific/provider-side response variation;
- credential/header-sensitive response variation;
- HTTP 200 carrying an error-like JSON object;
- another top-level shape already covered by the safe `shape` allowlist.

The ADR 0252 provider call happened before ADR 0255 promoted `shape` observability, so no historical record can acquire a `shape` field retroactively. The exact ADR 0252 envelope therefore remains unknowable from already-persisted evidence alone.

## Runtime reconciliation restored

A later continuation restored direct runtime readback through `@MCP_WANDORA_VPS` and reconciled GitHub/runtime before any effect.

Observed state:

- MCP service healthy (`remote-ops-mcp` v1.1.0, OAuth, non-mock);
- `main` still exactly `d0075258b14d9a9b901c8b23ffb448b1787774b7`;
- PR #335 still open/clean/mergeable on exact head `4c5e9931abf09facad7625ac7b5a3578b80418f5`;
- exact-head PR checks = 7/7 GREEN;
- Paperclip `wandora/paperclip:v2026.916.0` healthy with restart count 0;
- Core `wandora/core:organization-adapter-candidate-46741f8d82d0` healthy with restart count 0;
- live MCP `server.mjs` SHA-256 exactly `67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303`;
- live source marker exactly `18549a59a5fd82fe1efbe07902dbc189a3ceb609`, marker SHA-256 `e436a3b5029d30e1614dfaeb2717153361759ee2fdf8fa972f957341c36e5a56`;
- live source contains the ADR 0255 allowlisted structural classifier and does not broaden accepted product-list forms;
- Paperclip logs prove the ADR 0255 protected sequence ended with authenticated Task Drain stop/readback and later authenticated readbacks of Task Drain, policy list, agent and connection activity; the final policy response remained the empty production shape and no later authenticated control-plane mutation/provider dispatch is observed;
- the direct unauthenticated Task Drain probe correctly returned `403 Board access required`; no authentication boundary was bypassed and no secret was read to obtain a stronger readback.

The canonical ADR 0255 snapshot remains the last fully authenticated body-level evidence for Task Drain/activity counters: OFF/quiescent, temporary policies/counters 0, activity 72 with the recorded SHA-256, work=2, unfinished=1, outbound=0. This continuation does not falsely re-hash the protected activity response without Board authority.

Most importantly, the promoted live MCP is now proven capable of emitting only an allowlisted `shape` together with the existing safe `code`/`reason`, and ADR 0251/0252 already prove Paperclip retains MCP `structuredContent.error` through governed/redacted `resultSummary` evidence. Therefore a future post-ADR0255 bounded provider call can recover `shape` without raw-payload persistence.

## Capability Authority / Reuse Gate

No new table, migration, service, retry engine, response store or lifecycle subsystem is justified.

Authority remains:

- VendaERP MCP: provider-specific request/response parsing;
- Paperclip: Connection/secret custody, Tool Gateway execution, policy/rate limit and governed activity evidence;
- Wandora Core: customer-work semantics and fail-closed interpretation;
- Mastra: replaceable runtime execution.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## Decision

**PREFLIGHT GREEN / NO EFFECT. Runtime readback is restored and the ADR 0255 safe `shape` evidence path is available. Existing evidence still cannot identify the historical ADR 0252 envelope without another provider response.**

A third provider call is therefore technically necessary only if resolving that exact live envelope remains a product priority. It is **not executed by this ADR**. Any Diagnostic V3 execution requires a separate effect-authorizing slice and the already-frozen hard budget:

- Paperclip-native `block` for all other VendaERP tools;
- `rate_limit=1` for `vendaerp_search_products`;
- exact arguments `{"pageSize":5,"skip":0}`;
- no retry;
- no second tool;
- no outbound;
- no raw response persistence;
- capture only `code`, `reason`, allowlisted `shape`;
- prove slot `1 -> 0`;
- prove exactly one provider call;
- remove temporary guards afterward.

## Second adversarial review

- Broaden parser based on the owner sample? **No.**
- Assume the VendaERP UI export equals the MCP HTTP body? **No.**
- Fix casing reflexively? **No.**
- Create raw-response storage? **No.**
- Repeat ADR 0252 because the prior work is unfinished? **No.**
- Force-reconcile Ana/work state? **No.**
- Make a third provider call merely because runtime readback returned? **No.**
- Can historical ADR 0252 evidence reveal post-ADR0255 `shape` retroactively? **No.**
- Is a separate one-shot provider read the only remaining way to learn the exact live envelope? **Yes, if that envelope still needs to be resolved.**
- Execute that read inside this preflight? **No.**
- Duplicate Paperclip rate limiting/retry/lifecycle? **No.**

## Validation in this slice

Code-only regression strengthens the exact request assertion and proves the direct PascalCase array reaches `product-name-missing`, not `product-list-shape`.

The exact PR head completed 7/7 GREEN checks before this runtime-readback documentation refresh. The refreshed head must complete its own required CI before merge.

No production mutation and no provider/model/outbound call occurred in this slice. Runtime actions were read-only reconciliation plus a deliberately unauthenticated Task Drain probe that correctly failed with 403.
