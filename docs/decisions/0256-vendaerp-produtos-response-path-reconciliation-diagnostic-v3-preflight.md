# ADR 0256 — VendaERP Produtos/Pesquisar Response Path Reconciliation + Diagnostic V3 Preflight V1

Status: **PREFLIGHT PARTIAL / NO EFFECT / NO PROVIDER CALL / V3 EXECUTION NOT YET AUTHORIZED**  
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

The exact live `shape` value after ADR 0255 must be read back through the Paperclip governed evidence path before any Diagnostic V3 execution.

## Runtime reconciliation limitation

During this session the registered `wandora-vps-01` Desktop Commander device was offline.

Because live runtime could not be independently re-read, this preflight does **not** claim current live `shape` evidence availability solely from historical chat state.

GitHub `main` remained at ADR 0255 when checked.

## Capability Authority / Reuse Gate

No new table, migration, service, retry engine, response store or lifecycle subsystem is justified.

Authority remains:

- VendaERP MCP: provider-specific request/response parsing;
- Paperclip: Connection/secret custody, Tool Gateway execution, policy/rate limit and governed activity evidence;
- Wandora Core: customer-work semantics and fail-closed interpretation;
- Mastra: replaceable runtime execution.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## Decision

**NO-GO for a third provider call until live runtime readback is restored and proves the ADR 0255 `shape` evidence path is available.**

Once that readback is GREEN, a separate Diagnostic V3 execution may be authorized only with the already-frozen hard budget:

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
- Make a third provider call while runtime evidence is unavailable? **No.**
- Duplicate Paperclip rate limiting/retry/lifecycle? **No.**

## Validation in this slice

Code-only regression strengthens the exact request assertion and proves the direct PascalCase array reaches `product-name-missing`, not `product-list-shape`.

CI is required before merge.

No production effect and no provider/model/outbound call occurred in this slice.
