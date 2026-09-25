# ADR 0258 — VendaERP Product Listing GetAll Routing + Real Wire Casing Compatibility V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**
Date: 2026-09-25

## Objective

Unblock the existing `vendaerp_search_products` read capability using the real VendaERP contract and 28PRO wire evidence, without creating a new tool or duplicating Paperclip/Wandora capability.

## Proven evidence

ADR 0257 proved one canonical Ana run invoked `vendaerp_search_products({"pageSize":5,"skip":0})` exactly once and the provider path failed safely as:

`invalid-provider-response / product-list-shape / shape=null`.

The owner then executed the VendaERP Swagger UI directly against:

`GET https://cw.vendaerp.com.br/api/request/Produtos/GetAll?pageSize=100&skip=0`

with the 28PRO integration headers. VendaERP returned HTTP 200 and a real product array containing the current 28PRO catalog, including products such as PREMIUM PLUS, USUÁRIO ADICIONAL, EMISSÃO NFSE and Site Institucional.

That real response serializes product properties in PascalCase, including `ID`, `Codigo`, `Nome`, `Categoria`, `Marca`, `PrecoVenda`, `PrecoMinimoVenda`, `EstoqueSaldo`, `EstoqueUnidade` and `UnidadeComercial`.

The authoritative VendaERP Swagger at `https://cw.vendaerp.com.br/api/swagger/v1/swagger.json` exposes both:

- `GET /api/request/Produtos/Pesquisar`, for filtered product search;
- `GET /api/request/Produtos/GetAll`, with `pageSize` and `skip`, for product listing.

The OpenAPI schema uses camelCase property names while the direct 28PRO wire response from GetAll is PascalCase. The adapter must therefore be explicit about the two proven spellings rather than relying on schema casing alone.

## Capability Authority / Reuse Gate

No new Wandora table, migration, service, state machine, tool, catalog entry, policy subsystem, retry engine or provider mirror is created.

The existing Wandora/Paperclip capability remains `vendaerp_search_products`.

Provider-specific routing and response projection remain owned by the replaceable VendaERP MCP adapter, consistent with ADR 0168.

## Decision

Keep the existing tool contract and route exactly one provider GET per invocation:

- when any supported filter is present (`code`, `name`, `category`, `brand`, `barcode`), call `/api/request/Produtos/Pesquisar`;
- when only pagination is supplied, call `/api/request/Produtos/GetAll`.

No automatic retry is added.

For product projection, accept only the explicit proven aliases:

- `id | ID`
- `codigo | Codigo`
- `ean | Ean | EAN`
- `nome | Nome`
- `categoria | Categoria`
- `marca | Marca`
- `estoqueUnidade | EstoqueUnidade`
- `unidadeComercial | UnidadeComercial`
- `precoVenda | PrecoVenda`
- `precoMinimoVenda | PrecoMinimoVenda`
- `estoqueSaldo | EstoqueSaldo`

No arbitrary case folding, wrapper acceptance or raw response persistence is introduced.

JSON `null` remains fail-closed as `invalid-provider-response / product-list-shape / shape=null`.

## Validation

Synthetic/no-network validation on a clean checkout:

- 14/14 tests GREEN;
- static verifier: `WANDORA_VENDAERP_READONLY_MCP_V1_OK`;
- explicit test proves pagination-only search routes to GetAll;
- explicit test proves filtered search remains on Pesquisar;
- explicit test projects the real PascalCase wire shape;
- one provider request per invocation remains frozen.

No VendaERP/model/outbound call and no production mutation occurred in this code slice.

## Second adversarial review

JEV reviewed and approved the minimal provider-adapter correction.

Rejected alternatives:

- add a new product-list tool/catalog capability;
- treat `null` as an empty list;
- accept arbitrary casing/wrappers;
- add retries;
- move provider routing into Wandora Core.

## Next

After CI and merge, perform a separate no-provider-call production promotion of the VendaERP MCP bytes, re-attest the live marker/tests, and only then execute one bounded canonical Ana customer work using the existing `vendaerp_search_products` capability.
