# ADR 0381 — Semantic Fast Read Existing VendaERP Capability Reuse — Stock V1

Date: 2026-10-01

Status: **CANDIDATE / CODE + SYNTHETIC TESTS ONLY / EXACT-HEAD CI PENDING / NO PRODUCTION EFFECT**

## Context

ADR 0380 proved that `business.stock.read` and the provider tool
`vendaerp_get_product_stock` already exist. The current customer-facing
Semantic Fast Read did not bind that capability.

The exact supplied VendaERP OpenAPI contract is decisive:

- `Produtos/GetSaldo` is GET-only;
- `produtoCodigo` is required;
- `deposito` (stock location/deposit name or ID) is required;
- the response is `SaldoDeposito[]` with `deposito`, `saldo` and
  optional `lastUpdate`.

The product schema separately exposes `estoqueSaldo` and `depositoPadrao`,
but the supplied contract does not define `estoqueSaldo` as an aggregate,
sum of deposits, or default-deposit balance.

Therefore Wandora must not silently interpret product `stockBalance` as a
general stock total.

## Capability Authority / Reuse Gate

No new BusinessCapability is created.

Wandora-owned:

- human-language semantic routing;
- the bounded provider-neutral stock selector;
- fail-closed admission and clarification;
- signed `wfri1` authorization;
- normalized presentation.

Paperclip/provider-owned and reused:

- Connection, grants, secrets and Tool Gateway;
- the existing `vendaerp_get_product_stock` tool;
- GET execution against `Produtos/GetSaldo`;
- operational policy, run lifecycle and audit.

VendaERP remains owner of ERP data and endpoint-specific semantics behind the
adapter.

No table, migration, registry, cache, state machine, lifecycle, retry engine,
or second ERP subsystem is introduced.

## Decision

### Canonical Stock V1 meaning

`business.stock.read` V1 means:

> Read the stock quantity for exactly one explicit product code in exactly one
> explicit stock location/deposit.

This is intentionally narrower than a generic “total inventory” concept.

### Requests without a location

Wandora does **not**:

- invent a default deposit;
- sum deposits;
- treat `estoqueSaldo` / `stockBalance` as a total;
- make a hidden fallback read.

Instead the customer receives a deterministic clarification asking for one
product code and one stock location/deposit.

### Requests by product name or barcode

The current VendaERP stock tool requires product code. Stock V1 therefore does
not add an implicit product-search → stock multi-call resolver.

A name-only or barcode-only stock request fails closed into the same bounded
clarification. A later slice may qualify a reusable entity resolver, but this
ADR does not create one.

### Selector

The Wandora-owned semantic selector contract is extended with:

```ts
{
  kind: 'stock',
  product: {
    kind: 'product',
    by: 'code',
    value: string
  },
  location: string
}
```

Both values are bounded and are included in the signed `wfri1` claim.

The Mistral selector provider is reused and may emit this selector only when
both product code and stock location/deposit are explicit. It must not derive a
code from a name/barcode or consult a catalog.

### Existing VendaERP tool binding

The deterministic VendaERP Fast Read adapter maps the exact existing provider
tool `vendaerp_get_product_stock` to `business.stock.read`.

Execution passes exactly:

```json
{
  "productCode": "<explicit code>",
  "location": "<explicit location>"
}
```

No automatic retry or second provider tool call is added.

The result is projected into bounded facts only:

- location;
- quantity;
- optional provider timestamp.

Empty results become `not_found`; absence of a numeric quantity is invalid
provider data and is never converted to zero.

### Product search presentation hardening

Generic product search no longer presents `stockBalance` as “Estoque”.
The underlying provider field may remain available inside the provider adapter,
but it is not used as customer-facing stock semantics until its exact meaning is
proven.

## Second adversarial review

The mandatory pre-execution JEV review was run after the reuse decision and
before code changes.

Primary route: `proceed_fast`.

The result was advisory and moderately confident, so execution stayed within
the narrow contract above. No factual blocker identified by the review remained
unresolved.

## Validation plan

Synthetic tests must prove:

- exact stock tool mapping;
- explicit code + location extraction;
- one stock tool call with exact arguments;
- signed stock selector round-trip;
- missing location clarifies before dispatch;
- name-only stock clarifies with zero dispatch;
- empty stock result is not converted to zero;
- malformed/missing quantity fails closed;
- existing product search/price behavior remains compatible;
- VendaERP adapter still performs GET-only, no retry.

Exact-head CI remains required before this ADR can be marked qualified.

## Production boundary

This slice authorizes **no**:

- production deployment or VPS mutation;
- rollout expansion;
- real TypeSafe/Mistral/VendaERP/customer call;
- WhatsApp/Human Send/outbound;
- WRITE/DESTRUCTIVE operation;
- PR merge.

Any future real stock canary is a separate effect slice and additionally remains
blocked on the production redaction prerequisite recorded by ADR 0379/0380.
