# ADR 0384 — Semantic Fast Read Order → Customer Party/Contact Linkage V1

Date: 2026-10-01

Status: **QUALIFIED / EXACT CODE HEAD 12/12 WORKFLOWS GREEN / POST-GATE CANDIDATE ATTEMPT 2 GREEN / CODE + SYNTHETIC TESTS ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0383 qualified the narrow customer-facing order read over the existing
`business.orders.search` / `vendaerp_search_orders` boundary. ADR 0382 had
already qualified narrow party lookup over `business.parties.search` /
`vendaerp_search_parties`.

The next product question is narrower than fiscal or messaging work: given one
already-explicit order code, can Wandora deterministically prove which customer
party is related to that order and whether that party has a registered telephone
and/or cellular contact, without exposing the raw sensitive values?

This slice is **code only**. It does not authorize a real customer request,
provider call, fiscal fetch, DANFE/SEFAZ lookup, WhatsApp destination choice,
Human Send, outbound delivery, rollout activation or production mutation.

ADR 0168 remains permanent: portability is contract decoupling, not provider
implementation duplication. The provider tools, Paperclip operational
authority and VendaERP data remain behind replaceable provider boundaries.

## REAL NOW / proven Git state

Before implementation and again before documentation, the canonical bootstrap,
`AGENTS.md`, relevant ADRs, `CAPABILITY_AUTHORITY.md`,
`architecture.md`, `CANONICAL_STATE.md`, component runbooks and real GitHub
state were reconciled.

At documentation time:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #384 is draft/open/unmerged and mergeable;
- PR #384 is stacked on PR #383 through base branch
  `feat/semantic-fast-read-orders-v1`;
- exact code head is
  `3835cb61d66e12f3012e78aa17377e537851f949`;
- no production/VPS/runtime state is required by this code-only qualification.

## Provider contract evidence

The supplied VendaERP OpenAPI contract proves:

- `GET /api/request/Pedidos/Pesquisar` returns `Pedido[]`;
- raw `Pedido` includes the customer tax identity field `clienteCNPJ`;
- raw `Pedido` does not contain `telefone` or `celular`;
- `GET /api/request/Pessoas/Pesquisar` accepts the customer CPF/CNPJ filter;
- raw `Pessoa` contains `telefone`, `celular` and other sensitive fields;
- the supplied Pessoas contract does not prove a bounded direct search by
  `Pedido.pessoaID` or `clienteID`.

The provider contract also documents CPF/CNPJ as the existing-person identity
used by the Pessoas save semantics. Therefore this slice uses CPF/CNPJ as the
only proven provider identity bridge and does not invent ID lookup semantics
that are absent from the supplied read contract.

## Capability Authority / Reuse Gate

### Wandora semantic authority

Wandora owns the product meaning:

> for one exact order code, determine whether exactly one customer party can be
> linked by an exact provider-proven customer identity, then report only whether
> registered contact data exists and which contact kinds are available.

That meaning is represented by the new Wandora-owned composite capability:

`business.orders.customer_contact.read`

This is a semantic composition contract, not a new provider implementation.

### Provider and operational authority reused

The slice reuses exactly the existing provider tools:

- `vendaerp_search_orders`;
- `vendaerp_search_parties`.

Paperclip remains authority for Connection/grant/secret/catalog/profile state,
Tool Gateway authorization, tool execution, run lifecycle and audit. VendaERP
remains the source of ERP data.

No new VendaERP endpoint, MCP tool, second ERP adapter, secret system, registry,
table, migration, cache, durable party/order shadow state, workflow engine,
retry engine, lifecycle service, retrieval subsystem or alternate Tool Gateway
is created.

### Replacement boundary

A replacement ERP may implement the same provider-neutral order and party
contracts behind adapters. The composite semantic capability remains
Wandora-owned while provider execution remains specialist-provider-owned.

## Decision

### 1. Exact order code remains the only customer selector

The signed semantic selector remains the existing narrow order selector:

```ts
{
  kind: 'order',
  by: 'code',
  value: number
}
```

No CPF/CNPJ, phone, cellular number, e-mail, address or provider ID is added to
the signed customer selector.

### 2. Identity bridge is exact order code → exact customer tax identity

Execution is bounded as follows:

1. call `vendaerp_search_orders` once with the exact order code,
   `pageSize=5`, `skip=0`;
2. exact-post-filter the bounded rows by order code;
3. require exactly one exact order;
4. read its internal `customerTaxId`, projected only from raw
   `Pedido.clienteCNPJ`;
5. normalize to digits and require exactly 11 or 14 digits;
6. call `vendaerp_search_parties` once with that tax identity,
   `customer=true`, `pageSize=5`, `skip=0`;
7. exact-post-filter returned customers by the same normalized tax identity;
8. require exactly one exact customer party.

Wandora does **not** use customer-name matching, fuzzy matching, provider row
order, first-row trust, automatic retry, fallback lookup, a third provider
lookup, `pessoaID`, or `clienteID`.

### 3. Fail closed on missing or ambiguous identity

- no exact order -> `not_found`;
- multiple exact order rows -> clarification/fail-closed;
- missing or malformed order customer tax identity -> clarification/fail-closed
  after the first tool read, with no party call;
- no exact customer party -> `not_found`;
- multiple exact customer parties -> clarification/fail-closed;
- malformed sensitive provider fields -> invalid provider response/fail-closed.

No ambiguity is resolved by choosing a row automatically.

### 4. At most two already-authorized reads

The deterministic runtime now truthfully supports a binding execution reporting
one or two tool calls.

The composite binding performs:

- one read when the order stage itself terminates safely; or
- two reads when exact party resolution is required.

It can never report or execute a hidden third lookup. Existing single-tool
bindings retain their one-call behavior.

This minimal composition extension is not a new orchestration subsystem.
Wandora binds product semantics; the two provider calls still execute through
Paperclip Tool Gateway authority.

### 5. Telephone and cellular remain separate internal facts

The provider projection no longer collapses `celular ?? telefone` into one
ambiguous phone value.

Internally the party DTO preserves:

- `telephone`;
- `mobilePhone`.

The deterministic customer presentation never emits either raw value.

For exactly one linked party it may emit only:

- customer name;
- `Contato cadastrado: Sim` or `Não`;
- available kind labels:
  - `Telefone`;
  - `Celular`;
  - `Telefone e Celular`.

If both exist, Wandora does not choose one. No value is designated as a
WhatsApp destination.

## Signed intent and privacy boundary

The `wfri1` authorization continues to sign only the existing exact order
selector for this capability. Tests prove the signed claims do not carry
customer tax identity, telephone, cellular number or legacy phone fields.

The normalized customer-facing result strips:

- CPF/CNPJ/customer tax identity;
- raw telephone/cellular values;
- e-mail;
- address;
- provider/external IDs;
- raw provider payload.

The underlying provider reads remain **READ_SENSITIVE** even though the
presentation is deliberately minimized.

## Organization Adapter composition

The Organization Adapter derives
`business.orders.customer_contact.read` only when both exact existing provider
read tools are present for the same connection.

The composite capability is operationally enabled only when both constituent
tools satisfy the existing active/read-only/non-destructive/effective-profile
gates. If either constituent tool is unavailable or denied, the composite is
not enabled.

No second capability registry or provider-state mirror is introduced.

## Second adversarial review

Before implementation, the initial JEV review requested deeper review around
identity strength and multi-call accounting.

The focused review resolved those facts:

- exact CPF/CNPJ is the only provider-proven identity bridge used;
- the composition is explicit Wandora semantic binding over two existing
  authorized Paperclip tools;
- deterministic execution reports the real one-or-two-call count;
- telephone and cellular remain separate and are not auto-selected;
- no new provider endpoint/tool or production effect is introduced.

After code-head CI and post-gate Candidate precedence were proven, the completion
review classified the objective `complete` with probability **0.69**
(confidence **0.54**) and identified no new factual blocker.

JEV remains advisory under ADR 0377; deterministic Wandora evidence remains the
qualification authority.

## Implementation

Exact code commit:

`3835cb61d66e12f3012e78aa17377e537851f949`

The implementation:

- adds the composite BusinessCapability;
- preserves internal order `customerTaxId`;
- separates party `telephone` and `mobilePhone`;
- adds explicit composed runtime bindings over the exact existing order and
  party tools;
- extends deterministic tool-call accounting from exactly one to one-or-two;
- adds fail-closed exact identity resolution;
- adds safe contact-presence/kind presentation;
- extends semantic selector/provider descriptions without broadening the
  customer selector;
- derives supported/enabled composite capability from the two constituent
  provider reads in the Organization Adapter.

## Synthetic validation

Coverage proves at least:

- exact order -> exact customer identity -> exact party linkage;
- missing/malformed order identity stops after one read;
- zero, one and multiple exact party matches;
- no arbitrary first-row selection;
- zero contact values;
- telephone only;
- cellular only;
- both telephone and cellular without auto-selection;
- malformed sensitive contact fields fail closed;
- raw CPF/CNPJ, telephone/cellular, e-mail and provider IDs do not reach the
  normalized customer result;
- signed `wfri1` contains only the order selector;
- composite binding exists only with exactly one authorized order tool and one
  authorized party tool;
- deterministic execution accounts for two calls when two reads occur;
- Organization Adapter does not enable the composite if either constituent tool
  is operationally denied.

## CI qualification

The exact code head
`3835cb61d66e12f3012e78aa17377e537851f949` completed **12/12 workflow runs
GREEN**:

- Paperclip OpenAPI Compatibility — `36943730677`;
- VendaERP Read-Only MCP CI — `36943730663`;
- Messaging Gateway CI — `36943730773`;
- Platform Admin CI — `36943730644`;
- Web CI — `36943730679`;
- Semantic Fast Read CI — `36943730723`;
- Paperclip Mastra Adapter CI — `36943730646`;
- Organization Adapter Plugin CI — `36943730656`;
- Integration Capability Projection CI — `36943730583`;
- Core Candidate Artifact — `36943730619`;
- Core CI — `36943730634`;
- Paperclip Fast Read Patch Composition CI — `36943730808`.

The first Candidate Artifact attempt completed before both primary Core CI and
Semantic Fast Read CI gates, so that attempt was not accepted for precedence.

After those two gates were GREEN, only the Candidate job was rerun. Workflow run
`36943730619`, **attempt 2**, started at `2026-10-02T01:04:53Z` and completed
GREEN at `2026-10-02T01:06:09Z` on the same exact code head.

## No-effect statement

This slice performed no:

- production or VPS mutation;
- real VendaERP/provider request;
- customer/browser Fast Read;
- fiscal/NFe/DANFE/SEFAZ lookup;
- WhatsApp destination selection;
- Human Send or outbound message;
- migration or secret access/change;
- rollout expansion;
- PR merge.

PR #384 remains draft/unmerged.

## Consequence / next boundary

The linkage contract is qualified in code and synthetic CI only.

A later slice may consider a safe preview or a separately governed real canary,
but must begin from fresh REAL NOW and independently prove rollout/admission,
privacy, provider operational authority and any effect boundary required at that
time. This ADR does not authorize fiscal work, WhatsApp, Human Send, outbound,
production promotion or merge by implication.
