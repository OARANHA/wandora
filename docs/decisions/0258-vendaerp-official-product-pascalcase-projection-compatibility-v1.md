# ADR 0258 — VendaERP Official Product PascalCase Projection Compatibility V1

Status: **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**
Date: 2026-09-25

## Objective

Correct the replaceable VendaERP read-only MCP product projection so that the documented official Produto field casing is supported without broadening top-level response acceptance.

## Proven evidence

ADR 0257 proved the live bounded unfiltered call failed as:

`invalid-provider-response / product-list-shape / shape=null`.

The official VendaERP/SIGE integration documentation for `GET /api/request/Produtos/Pesquisar` defines HTTP 200 as a list of Produto and documents PascalCase fields including `ID`, `Nome`, `Codigo`, `Ean`, `Categoria`, `Marca`, `EstoqueUnidade`, `UnidadeComercial`, `PrecoVenda`, `PrecoMinimoVenda` and `EstoqueSaldo`.

The current MCP already accepts a direct array structurally, but previously projected only legacy camelCase spellings. A PascalCase array therefore reached the separate `product-name-missing` branch.

## Capability Authority / Reuse Gate

Provider-specific response parsing remains owned by the replaceable VendaERP MCP adapter. No Wandora table, migration, provider mirror, retry engine, scheduler, lifecycle state or raw-response store is added.

ADR 0168 remains binding: portability means contract decoupling, not implementation duplication.

## Decision

Support only explicit known aliases in the product projection:

- `nome | Nome`
- `id | ID`
- `codigo | Codigo`
- `ean | Ean`
- `categoria | Categoria`
- `marca | Marca`
- `estoqueUnidade | EstoqueUnidade`
- `unidadeComercial | UnidadeComercial`
- `precoVenda | PrecoVenda`
- `precoMinimoVenda | PrecoMinimoVenda`
- `estoqueSaldo | EstoqueSaldo`

No arbitrary case folding is allowed. The top-level `records()` gate is unchanged. JSON `null` remains `invalid-provider-response / product-list-shape / shape=null`.

## Validation

Synthetic/no-network tests only. The previous PascalCase failure test is replaced with a projection test proving the official PascalCase shape maps to the provider-neutral DTO.

No provider/model/outbound call and no production mutation occur in this slice.

## Second adversarial review

JEV approved the bounded projection-only correction. The review explicitly rejected treating `null` as success and rejected wrapper broadening.

## Next

After CI and merge, perform a separate MCP promotion preflight/promotion with no provider call. Only after live bytes are proven should a separately hard-budgeted canonical customer work test a real named product query.
