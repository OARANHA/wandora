# ADR 0380 — VendaERP Read Capability Coverage V1

Status: **ACCEPTED AS INVENTORY + REUSE DECISION / NO PRODUCTION EFFECT**
Date: 2026-10-01

## Context

ADR 0378 proved one real owner-browser Semantic Fast Read for product price.
ADR 0379 qualified a Paperclip-native fix for Tool Gateway session-token log redaction in code/CI only; that candidate has not been promoted to production.

The next product goal is to make Ana useful for ordinary commercial/administrative reads without requiring the owner to know ERP endpoints, tools, Paperclip, or technical interfaces.

This ADR decides the coverage map and reuse order. It does not authorize a new customer call, production rollout expansion, WRITE capability, or Paperclip promotion.

Detailed evidence and the complete operation-by-operation matrix live in:

`docs/research/vendaerp-read-capability-coverage-v1.md`

## Real now

Repository anchors at the start of this decision:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #378 remains draft/open/unmerged;
- PR #379 contains the qualified provider-native Tool Gateway log-redaction change;
- exact redaction code/CI head: `0d47451737d3f7000352b7c289e4e5838ebb62f2`;
- ADR 0379 was added as a documentation-only descendant of that qualified head.

No new VendaERP customer call was made during this inventory.

## Source provenance

The supplied project Swagger is:

- OpenAPI `3.0.1`;
- title `API de Integração`;
- version `v1`;
- SHA-256 `7e686ad743b4263d0aee53b50c7983c6c5cfcbabfc36573903eb15e7ed4089`;
- **98 paths / 107 operations**.

The 98-path count matches ADR 0202.

A current public-doc cross-check of `apiv1-docs.vendaerp.com.br` exposes the same API family but an indexed **104-operation** surface. The supplied project artifact contains three operations not present in that public index:

- `ContasBancarias/GetTodasContasBancarias`;
- `Fiscal/ConsultarNfePeriodo`;
- `Fiscal/CalcularImpostos`.

Those three are retained in the inventory because they exist in the exact supplied Swagger, but they are not implementation-ready solely from that evidence. Any future provider extension using them must first reconfirm current provider support.

## Exact inventory

HTTP methods:

- GET: **56**;
- POST: **34**;
- PUT: **10**;
- DELETE: **7**.

Primary semantic classification:

- READ_SAFE: **11**;
- READ_SENSITIVE: **42**;
- WRITE: **38**;
- DESTRUCTIVE: **11**;
- OUT_OF_SCOPE: **4**;
- QUARANTINE: **1**.

Therefore:

- proven commercially useful non-mutating reads/computes: **53**;
- useful read operations already represented by the current VendaERP MCP boundary: **8**;
- useful read operations absent from the current MCP boundary: **45**;
- total mutating operations, including destructive effects and the out-of-scope user-photo upload: **50**.

Classification is semantic, not verb-based:

- `Contratos/Renovar` is WRITE despite GET;
- `Fiscal/CalcularImpostos` is non-persisting compute despite POST;
- `TranferenciasBancarias/Pesquisar` is read despite POST;
- `Lancamentos/GetLinkPagamento` remains quarantined because the supplied Swagger does not prove side-effect semantics.

## Capability Authority / Reuse Gate

### Semantic authority — Wandora-owned

Wandora owns:

- human intent and language;
- canonical `BusinessCapability`;
- tenant authorization;
- employee capability admission;
- product rollout;
- effect authorization;
- provider-neutral presentation.

### Durable product state

No new durable state is justified.

Products, stock, parties, orders, fiscal records, finance records, provider credentials and provider runtime state must not be copied into a new Wandora persistence layer merely to make reads convenient.

On-demand provider reads remain the default.

### Operational authority — Paperclip/provider-owned

Paperclip remains operational authority for:

- Connections;
- credential custody;
- grants;
- effective tool policy;
- tool inventory;
- Tool Gateway;
- run/tool execution;
- tool audit.

### Provider implementation — VendaERP-owned

VendaERP owns the ERP API and ERP data.

Provider-specific request/response details stay behind the existing VendaERP adapter/tool boundary.

### Replacement boundary

Replacing VendaERP must not change the customer-facing BusinessCapability vocabulary except where the new provider genuinely lacks a capability.

Replacing Paperclip must not require internalizing its Connection, Tool Gateway, tool policy, lifecycle or audit implementation.

ADR 0168 remains binding.

## Current provider support versus Ana support

The current VendaERP MCP package exposes **8 tools** across **9 HTTP GET paths**:

1. `vendaerp_probe`;
2. `vendaerp_list_companies`;
3. `vendaerp_search_products`;
4. `vendaerp_get_product_stock`;
5. `vendaerp_list_price_tables`;
6. `vendaerp_search_price_table_products`;
7. `vendaerp_search_parties`;
8. `vendaerp_search_orders`.

The Organization Adapter already projects **9 canonical BusinessCapability values**:

- `business.products.search`;
- `business.products.price`;
- `business.stock.read`;
- `business.price_tables.list`;
- `business.price_tables.products.read`;
- `business.parties.search`;
- `business.orders.search`;
- `business.companies.list`;
- `business.connection.probe`.

However, the owner/customer deterministic Fast Read adapter currently binds only:

- `business.products.search`;
- `business.products.price`.

Therefore the first important gap is **not 45 missing endpoints**. It is that Ana's deterministic semantic execution currently uses only 2 of 9 already-canonical capabilities.

## Data-minimization decision

Raw provider objects are not acceptable as Ana results.

Concrete evidence:

- raw `Pessoa` includes broad PII and provider fields named `senha` and `salt`;
- raw `Produto` includes cost, margin/profit and extensive fiscal fields;
- raw `Pedido` includes customer identifiers, addresses, payment/freight data, item lines, fiscal keys and invoice URLs.

Every capability admitted to Ana must use a bounded provider-neutral projection.

The existing bounded product, party and order projections are the preferred pattern.

## Decision

Do **not** expand the provider endpoint surface first.

Instead:

1. reuse existing canonical capabilities and current tools;
2. extend the deterministic Fast Read semantic layer in small slices;
3. add provider endpoints only when a concrete customer intent cannot be satisfied safely by the existing bounded provider tools;
4. keep finance/fiscal reads behind a separate sensitive-data decision;
5. keep WRITE and destructive operations outside this program;
6. keep `Lancamentos/GetLinkPagamento` quarantined until its semantics are proven.

No second VendaERP subsystem, Wandora tool registry, ERP replica table, or generic provider-state database is approved.

## Priority order

### P0 — product / price / availability

Already proven:

- product search;
- product price.

Next:

- `business.stock.read`, reusing the existing provider boundary;
- then price-table reads only if a real customer workflow needs them.

Before stock implementation, one semantic question must be decided deterministically:

- aggregate product balance;
- per-deposit balance;
- or fail-closed clarification when deposit context is absent.

Do not hide that ambiguity behind a silent fallback.

### P1 — customer / supplier / order / status

Reuse existing:

- `business.parties.search`;
- `business.orders.search`;
- `business.companies.list` where relevant.

The order projection already includes `invoiceNumber`, so a simple question such as whether an order has a note should first reuse `business.orders.search` rather than immediately introducing fiscal API reads.

### P2 — sensitive fiscal / financial reads

Separate qualification is required for:

- NFe/fiscal details;
- receivables/boletos;
- financial entries;
- delinquency;
- bank accounts;
- bank balances/transfers;
- tax calculation.

This family requires explicit role/data-minimization policy before provider extensions.

### P3 — specialist/lower-frequency reads

Later evaluation:

- contracts;
- equipment;
- fulfillment;
- POS operations;
- opportunities;
- production orders;
- e-commerce catalog support;
- product media.

## Natural-language test contract

Every capability implementation must prove:

human question
→ semantic capability
→ selector
→ exact authorized tool
→ exact parameters
→ bounded provider-neutral result
→ understandable response.

Ambiguity fails closed.
No silent capability fallback.
No automatic provider retry.

## Real-call policy

Do not execute broad real-provider coverage tests.

First use:

- source review;
- fixtures;
- contract tests;
- provider tests;
- semantic tests;
- CI.

A future real canary is justified only where synthetic evidence cannot prove the runtime/provider contract.

Any real canary must be:

- one bounded read;
- explicitly authorized;
- no retry;
- no fallback;
- reconciled afterward.

Before any new real canary, the ADR 0379 redaction correction must be separately promoted and revalidated in production.

## Second adversarial review

TypeSafe JEV returned `proceed_fast` and did not identify a new factual blocker.

The deterministic Wandora decision remains authoritative.

Rejected:

- exposing all Swagger GETs automatically;
- treating HTTP GET as proof of read-only semantics;
- creating a second VendaERP integration subsystem;
- adding persistence for ERP data;
- exposing raw Pessoa/Produto/Pedido payloads;
- bundling fiscal/finance reads into P0/P1;
- making a new customer call to prove the inventory;
- enabling any WRITE or destructive endpoint.

Accepted:

- complete inventory;
- provider/tool reuse first;
- bounded provider-neutral DTOs;
- small semantic slices;
- separate sensitive-read governance.

## Exit condition

This slice is complete when:

1. all 107 operations are accounted for;
2. exact class totals reconcile to 107;
3. existing tool and BusinessCapability coverage is distinguished from Ana's current end-to-end Fast Read coverage;
4. public-doc versus supplied-Swagger version delta is recorded;
5. the next slice is explicit and does not require provider expansion by default.

All five conditions are satisfied.

## Next slice

**Semantic Fast Read Existing VendaERP Capability Reuse — Stock V1**

Start with a fresh REAL NOW and decide the product/location selector semantics before writing code.

No production effect is authorized by this ADR.
