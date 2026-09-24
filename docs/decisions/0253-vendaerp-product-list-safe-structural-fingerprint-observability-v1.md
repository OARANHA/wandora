# ADR 0253 — VendaERP Product-List Safe Structural Fingerprint Observability V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**  
Date: 2026-09-24

## Objective

Narrow the remaining Produtos/Pesquisar ambiguity after ADR 0252 without broadening the VendaERP parser and without making another provider request.

ADR 0252 proved, under a hard native one-call budget, that the live 28PRO response fails as:

    invalid-provider-response
    reason = product-list-shape

It also proved that the failure is not product-name-missing.

The raw provider response was intentionally not persisted, so the exact unexpected envelope is still unknown.

## Proven evidence entering this slice

Canonical production state after ADR 0252:

    main = 27e844da6f88964cc0959191ddcf312594976878
    post-merge push workflows = 4/4 GREEN
    Task Drain = OFF / quiescent
    ADR0252 temporary policies = 0
    VendaERP activity = 72 events
    sha256 = 6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb
    work = 2 total
    unfinished = 1
    outbound = 0
    Ana = error / wandora_execution_failed_422

The unfinished work and Ana error state are truthful consequences of the bounded diagnostic failure and are not rewritten in this slice.

## Public contract reconciliation

Accepted ADRs 0221 and 0223 already record the public VendaERP contract for GET /api/request/Produtos/Pesquisar as an HTTP 200 array of Produto.

Current public documentation still describes the endpoint as returning a product list and documents product properties including ID, Nome, Codigo, Categoria, Marca, EstoqueUnidade, UnidadeComercial, PrecoVenda, PrecoMinimoVenda and EstoqueSaldo.

The current MCP parser accepts only a top-level array whose members are JSON objects.

ADR 0252 therefore proves a real divergence between the documented list contract and the live 28PRO response shape.

The current production evidence is not sufficient to decide whether the live response is:

- a known list wrapper;
- an error-like JSON object returned with HTTP 200;
- an array containing a non-object member;
- null;
- another scalar;
- or an unrecognized object shape.

No parser change is justified by guesswork.

The documented field casing also differs from the current provider projection assumptions, but ADR 0252 failed before per-product field projection. Casing changes are therefore explicitly out of scope until the top-level shape is proven.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- VendaERP MCP owns provider-specific response parsing.
- Paperclip owns Tool Gateway execution/audit and retains the safe MCP structuredContent.error in governed resultSummary.
- Wandora Core owns customer-work semantics and fails closed on semantic read-tool error.
- Mastra remains replaceable behind the runtime adapter.

No new Wandora table, retry system, lifecycle state machine, provider mirror or raw-response store is authorized.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Decision

Add one optional, allowlisted shape diagnostic to the existing MCP semantic error only when:

    code = invalid-provider-response
    reason = product-list-shape

The existing text MCP error remains byte-for-byte compatible:

    {"error":"invalid-provider-response"}

No parser acceptance is added.

No provider response value is logged or persisted.

## Safe shape allowlist

Only these fixed values may be emitted:

    null
    string
    number
    boolean
    array-non-object

    object-data-array
    object-Data-array
    object-items-array
    object-Items-array
    object-produtos-array
    object-Produtos-array
    object-result-array
    object-Result-array
    object-results-array
    object-Results-array
    object-value-array
    object-Value-array
    object-response-array
    object-Response-array

    object-error
    object-Error
    object-errors
    object-Errors
    object-message
    object-Message

    object-other

The adapter does not emit arbitrary provider key names, key values, product fields, request arguments, tenant URL, credentials, raw response bytes, body content or provider error text.

Wrapper names are recognized only from the frozen allowlist above. Unknown object structures collapse to object-other.

## Implementation

Only the replaceable VendaERP MCP candidate changes:

    integrations/paperclip/mcp-vendaerp-readonly-v1/server.mjs
    integrations/paperclip/mcp-vendaerp-readonly-v1/test/server.test.mjs

VendaErpAdapterError gains a safely filtered optional shape.

searchProducts() preserves the parsed JSON value only in process memory long enough to:

1. attempt the existing records() check;
2. if it fails, classify the top-level structure through the allowlist;
3. throw the same normalized provider error.

The existing read parser is unchanged.

structuredContent.error may now contain a normalized object with code, reason and shape. The MCP text content remains exactly {"error":"invalid-provider-response"}.

The same allowlisted shape may appear in the existing safe stderr event.

## Validation

Local synthetic validation only; no network/provider/model call.

    npm test = 12/12 GREEN
    npm run verify = GREEN
    static verifier = WANDORA_VENDAERP_READONLY_MCP_V1_OK

Synthetic tests prove:

- object wrapper with items array => object-items-array;
- array containing a non-object => array-non-object;
- object with allowlisted Message key => object-Message;
- null => null;
- string => string;
- arbitrary requested shape is discarded;
- existing reason allowlist remains enforced;
- text MCP error remains unchanged;
- structured content contains only normalized code/reason/shape;
- product values and credentials do not appear in stderr.

## Production effect

None.

Specifically:

- live MCP bytes are unchanged;
- no Paperclip/Core restart;
- no Task Drain;
- no policy/rate-limit mutation;
- no provider call;
- no model call;
- no customer work;
- no outbound;
- no migration;
- no secret/Connection/template/grant/install/profile/catalog mutation.

## Second adversarial review

- Does this start accepting undocumented envelopes? **No.**
- Does it guess that items, data, Produtos, etc. are valid provider wrappers? **No. They are diagnostic labels only.**
- Does it persist raw provider payload? **No.**
- Can arbitrary provider keys leak? **No.**
- Does the model-visible text error change? **No.**
- Does this duplicate Paperclip audit capability? **No. Paperclip remains the governed evidence carrier.**
- Is another provider call made in this slice? **No.**
- Are Ana/error-state or execution_uncertain work force-reconciled? **No.**

## Decision state

**CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED.**

After merge, the required sequence is:

1. separate MCP promotion preflight — **NO PROVIDER CALL**;
2. separate atomic MCP file promotion under native Task Drain — **NO PROVIDER CALL**;
3. post-promotion no-network/synthetic re-attestation;
4. only after those gates, consider a separately approved hard-budget diagnostic work to learn the allowlisted shape.

No automatic third provider call is authorized.
