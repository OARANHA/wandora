# ADR 0383 — Semantic Fast Read Existing VendaERP Capability Reuse — Orders V1

Date: 2026-10-01

Status: **QUALIFIED / CODE HEAD 9/9 WORKFLOWS GREEN / EXISTING CAPABILITY + TOOL REUSE / CODE + SYNTHETIC TESTS ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0380 proved that the canonical capability `business.orders.search`, the
existing provider tool `vendaerp_search_orders`, its VendaERP GET
implementation and its Organization Adapter projection already existed before
this slice. ADR 0382 left orders as the next reuse-first candidate but did not
authorize it.

The target product direction is eventually:

`pedido -> nota/documento fiscal -> cliente -> telefone/WhatsApp cadastrado -> preview seguro -> aprovação humana -> Human Send/WhatsApp provider -> auditoria`.

This ADR qualifies only the first narrow customer-facing order read. It does
not implement the chain above.

ADR 0168 remains permanent: provider portability means contract decoupling, not
implementation duplication. Provider replacement does not imply internalizing
provider lifecycle, runtime memory, retrieval, workflow execution, tool
execution or other operational mechanics already owned by an accepted provider.

## REAL NOW / proven Git state

The pre-implementation authority was reconciled from the canonical bootstrap,
`AGENTS.md`, relevant ADRs, `CAPABILITY_AUTHORITY.md`, architecture,
`CANONICAL_STATE.md`, the VendaERP read-only README/runbook, GitHub and the
supplied Swagger.

At implementation time:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #382 remained draft/open/unmerged;
- PR #382 / `feat/semantic-fast-read-parties-v1` head was
  `7cb9c1add0cd6611bd0ebbcd0b52e951fe11c013`;
- #382 exact head had its relevant workflows GREEN;
- the new branch `feat/semantic-fast-read-orders-v1` was created exactly from
  that #382 head;
- draft PR #383 is stacked on #382.

No prior chat state was used as authority for these refs.

## Exact VendaERP contract

The supplied OpenAPI operation is:

- endpoint: `/api/request/Pedidos/Pesquisar`;
- HTTP method: `GET`;
- operation: `Pedidos_Pesquisar`;
- response: `Pedido[]`;
- classification: **READ_SENSITIVE**.

The supplied operation accepts these query filters:

- `codigo`;
- `origem`;
- `status`;
- `statuscliente`;
- `categoria`;
- `cliente`;
- `pageSize`;
- `skip`;
- `cpf_cnpj`;
- `alteradoApos`;
- `dataInicial`;
- `dataFinal`;
- `filtrarPor`;
- `empresa`;
- `numeroNFe`;
- `vendedor`;
- `transportadora`;
- `possuiNotaFiscal`;
- `incluirImpostos`.

Credential headers remain provider-operational input and never become a Wandora
semantic selector.

The raw `Pedido` model is materially broader than the customer-facing Fast
Read boundary. It includes provider IDs, customer identifiers/tax/e-mail,
addresses, item lines, payment/freight/banking/commission fields, invoice
number, NFe access key, DANFE URL and SEFAZ URL, among other provider fields.

The raw `Pedido` schema does **not** contain phone/celular. The supplied
`Pessoa` schema does contain `telefone` and `celular`, so customer contact
requires a separately governed party/contact read rather than pretending the
order payload already contains a WhatsApp destination.

## Existing provider/tool contract

The already-existing `vendaerp_search_orders` tool is narrower than the raw
Swagger surface. Its admitted input is:

- `code`;
- `customerName`;
- `customerTaxId`;
- `status`;
- `createdFrom`;
- `createdTo`;
- `pageSize`;
- `skip`.

The provider implementation performs GET-only
`/api/request/Pedidos/Pesquisar`, uses no automatic retry and projects only:

- `code`;
- `externalRef`;
- `customerName`;
- `status`;
- `total`;
- `createdAt`;
- `invoiceNumber`.

Although the raw Swagger operation accepts `numeroNFe`, the current canonical
tool does not expose that filter. Therefore the request “qual pedido está
relacionado a esta nota?” is not supported by Orders V1.

## Capability Authority / Reuse Gate

### Already existed and is reused

- canonical `business.orders.search`;
- provider tool `vendaerp_search_orders`;
- VendaERP GET provider implementation;
- canonical business-system order/search contract;
- Organization Adapter projection
  `vendaerp_search_orders -> business.orders.search`;
- Paperclip Connection/grant/Tool Gateway execution boundary;
- generic Paperclip Fast Read flow;
- signed `wfri1` deterministic admission;
- owner/admin tenant authorization before Fast Read projection/dispatch.

### Wandora-owned semantics

Wandora owns only the provider-neutral customer contract:

- semantic interpretation that this is an order lookup;
- bounded order selector;
- fail-closed admission;
- signed authorization;
- exact result post-filter;
- customer-safe presentation.

### Durable product state

Orders V1 creates no ERP shadow copy and no durable order lifecycle. VendaERP
remains the source of order data.

### Operational authority

Paperclip remains authority for provider Connections, grants, secrets, tool
catalog/profile/policy, run/tool execution and audit. Orders V1 does not add a
parallel execution or orchestration path.

### Replacement boundary

Replacing VendaERP means replacing the provider adapter/tool implementation
behind the stable `business.orders.search` contract. It does not require
internalizing Paperclip operational mechanics.

No new table, migration, registry, cache, lifecycle, state machine, service,
provider, retry engine, workflow engine, retrieval layer or Paperclip flow was
justified or created.

## Decision

### Orders V1 is code-only lookup by one explicit order code

The only admitted selector is:

```ts
{
  kind: 'order',
  by: 'code',
  value: number
}
```

The code must be one explicit positive JavaScript safe integer.

Orders V1 deliberately does **not** admit:

- customer-name lookup;
- CPF/CNPJ/customer-tax-ID lookup;
- status-only lookup;
- date/period-only lookup;
- invoice/NFe-number lookup;
- fuzzy matching;
- unfiltered listing;
- first-result selection.

Missing or ambiguous order identity fails closed into bounded clarification
before deterministic dispatch.

### Exactly one existing provider-tool call

An authorized lookup performs exactly one call:

```json
{
  "code": 1542,
  "pageSize": 5,
  "skip": 0
}
```

There is no hidden retry, fallback provider lookup or improvised second ERP
call.

The returned bounded rows are post-filtered by exact numeric equality
`result.code === selector.value`:

- zero exact matches -> `not_found`;
- one exact match -> bounded facts;
- multiple exact rows with the same code -> clarification/fail-closed;
- Wandora never trusts or chooses the first provider row.

### Customer-safe presentation

The customer-facing normalized result may contain only:

- order code;
- customer name, when returned;
- status, when returned;
- invoice number, when returned.

If `invoiceNumber` is absent, the result states that the invoice was not
informed in this bounded query. It does not infer that no invoice exists and it
does not fetch another fiscal endpoint.

The presentation does not expose:

- `externalRef` or provider IDs;
- CPF/CNPJ/tax ID;
- e-mail;
- phone/celular;
- addresses;
- order items;
- payments;
- bank/freight/commission data;
- fiscal access key;
- DANFE URL;
- SEFAZ URL;
- raw provider payload.

## Future relation: order, fiscal document and contact

The current order read can surface an `invoiceNumber` when the existing
provider projection returns it. Detailed fiscal document retrieval remains a
separate READ_SENSITIVE boundary.

A future order-to-contact chain also needs a separately qualified deterministic
link from the order's customer identity to a `Pessoa` result. The current
bounded order projection does not expose phone, and the current Parties V1
customer presentation intentionally strips phone. No contact selector or hidden
second lookup is added here.

WhatsApp/Human Send remains a separate operational outbound capability behind a
Wandora-owned contract. VendaERP is not coupled directly to outbound.

## Second adversarial review

Before implementation, the mandatory JEV review was given the exact Git,
Swagger, tool/provider, authorization and replacement-boundary evidence.

It returned:

- route: `proceed_fast`;
- probability: `0.71`;
- `deep_review=0.25`;
- `block=0.04`;
- confidence: `0.61`.

No unresolved factual blocker remained. The moderate confidence reinforced the
decision to keep Orders V1 code-only and narrower than both the existing tool
and the raw Swagger operation.

## Execution

Draft PR #383 was created on
`feat/semantic-fast-read-orders-v1`, stacked directly on #382.

The first code commit was
`4f9c4da64afda01393ac9c5f8ac37cf48410cf3a`.

The first Semantic Fast Read disposable E2E exposed a stale **negative test
fixture**: its unauthorized-capability sentinel was
`business.orders.search` with `selector=null`. Once Orders V1 correctly made
orders selector-required, the signed intent rejected that fixture before the
test's intended unbound-capability boundary.

The failing workflow was not blindly rerun. The exact failure was inspected,
and only the fixture sentinel was changed to selector-neutral
`business.companies.list`. No product gate was weakened.

Corrected exact code head:

`fc9fc149d4f8f28fe7b7c555b160ce86badc19ef`

## Validation

The corrected code head completed **9/9 workflows GREEN**:

- Core CI: run `36939956238`;
- Semantic Fast Read CI: run `36939956373`;
- Core Candidate Artifact: run `36939956266`;
- Paperclip Mastra Adapter CI: run `36939956418`;
- Integration Capability Projection CI: run `36939956282`;
- Paperclip OpenAPI Compatibility: run `36939956241`;
- Web CI: run `36939956355`;
- Messaging Gateway CI: run `36939956366`;
- Platform Admin CI: run `36939956255`.

On the corrected head, Semantic Fast Read CI proved Core typecheck, focused Fast
Read tests, adapter contract tests, Organization Adapter qualification and the
dedicated disposable E2E GREEN.

The first Candidate Artifact job completed before Core CI + Semantic Fast Read
CI, so it was not accepted for gate precedence. After both primary gates were
GREEN, only the Candidate job was rerun. Post-gate job
`110630324910` completed GREEN.

Post-validation JEV completion review classified the slice:

- `complete=0.94`;
- `verify_more=0.05`;
- `incomplete=0.01`;
- confidence `0.91`.

## Production boundary

This ADR authorizes and performed **no**:

- deployment or VPS mutation;
- rollout change/promotion;
- real VendaERP/provider/customer call;
- production canary;
- Paperclip mutation;
- migration;
- secret read/change;
- fiscal-document fetch;
- WhatsApp/Human Send/outbound;
- PR merge.

PR #383 remains draft/unmerged.

## Next boundary

The next slice must start from fresh REAL NOW rather than inheriting permission
from this ADR.

The likely next dependency toward “mandar a nota para o WhatsApp cadastrado do
cliente” is not outbound. It is a deterministic, separately reviewed
**order -> customer party/contact linkage** plus a safe sensitive contact-read
projection, while preserving the fiscal-document boundary separately.

Only after those reads are proven should a later slice compose safe preview,
human approval and the already-separated Human Send/WhatsApp capability.
