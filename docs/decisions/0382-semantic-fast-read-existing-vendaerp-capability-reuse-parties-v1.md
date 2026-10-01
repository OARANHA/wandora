# ADR 0382 — Semantic Fast Read Existing VendaERP Capability Reuse — Parties V1

Date: 2026-10-01

Status: **QUALIFIED / CODE HEAD 9/9 RELEVANT WORKFLOWS GREEN / CODE + SYNTHETIC TESTS ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0380 proved that `business.parties.search` and the provider tool
`vendaerp_search_parties` already exist. ADR 0381 established the reuse-first
pattern for extending Semantic Fast Read without duplicating provider
capabilities.

The supplied VendaERP OpenAPI contract and the existing read-only adapter prove
that `GET /api/request/Pessoas/Pesquisar` supports bounded party searches by,
among other fields, name, CPF/CNPJ, e-mail and customer/supplier flags. The
current tool exposes only the provider-neutral subset `displayName`, `taxId`,
`email`, `customer`, `supplier`, `pageSize` and `skip`.

The operation is classified **READ_SENSITIVE** by ADR 0380. Raw `Pessoa`
responses contain materially broader PII/provider fields than a customer-facing
Fast Read result may expose.

## Proven current authority

The exact pre-implementation chain was reconciled before code:

- `main`: `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #379, #380 and #381 remained open/draft/unmerged;
- PR #381 head/base for this slice:
  `3bce0b71a6466cde2dac3f0f3c0ad84df949c31c`;
- that #381 head had 12/12 workflows GREEN;
- `business.parties.search` already existed in the canonical capability
  contract;
- Organization Adapter already projected
  `vendaerp_search_parties -> business.parties.search`;
- Fast Read capability projection and dispatch already require an active
  `owner` or `admin` through the existing Organization Adapter boundary.

Runtime/VPS evidence was not required for this code-only decision and no runtime
access was used.

## Capability Authority / Reuse Gate

No new BusinessCapability, provider endpoint or provider tool is created.

Wandora-owned:

- human-language semantic routing;
- the bounded provider-neutral party selector;
- fail-closed admission/clarification;
- signed `wfri1` authorization;
- exact-match post-filtering;
- safe customer presentation.

Paperclip/provider-owned and reused:

- Connection, grants, secrets and Tool Gateway;
- the existing `vendaerp_search_parties` tool;
- GET execution against `Pessoas/Pesquisar`;
- operational policy, run lifecycle and audit.

VendaERP remains owner of ERP data and endpoint-specific behavior behind the
adapter.

No table, migration, registry, cache, state machine, lifecycle service, retry
engine, second ERP adapter, second Tool Gateway, secret manager, grant system,
or orchestration/retrieval/agent subsystem is introduced.

## Decision

### Canonical Parties V1 meaning

`business.parties.search` V1 means:

> Search for exactly one explicitly named business party, with exactly one
> explicit business role: customer or supplier.

The provider-neutral selector is:

```ts
{
  kind: 'party',
  by: 'name',
  value: string,
  role: 'customer' | 'supplier'
}
```

`customer` and `supplier` are already provider-neutral business semantics in
the canonical party DTO; raw VendaERP field names do not cross the semantic
contract.

### Deliberately excluded sensitive selectors

Although the existing provider/tool can filter by CPF/CNPJ and e-mail, Parties
V1 does **not** authorize those selector modes or present those fields.

Requests for CPF/CNPJ/document, e-mail, phone, address or other sensitive party
details fail closed into clarification before deterministic dispatch.

Phone is not a search filter of the supplied `Pessoas/Pesquisar` operation.
`codigoIdentificadorUnico`, city, UF and changed-after exist in the supplied
provider contract but are not exposed by the current tool and are not added in
this slice.

A later dedicated sensitive-party-identifiers slice would need to qualify any
such expansion independently.

### Customer vs supplier

The exact existing tool already supports explicit `customer` and `supplier`
booleans. Both Core and MCP query builders were proven to serialize boolean
`false`, so a request for one role does not silently fall back to the Swagger
default `true` for the other role.

Execution therefore emits exactly one bounded input:

```json
{
  "displayName": "<explicit name>",
  "customer": true,
  "supplier": false,
  "pageSize": 5,
  "skip": 0
}
```

or the corresponding supplier form with the booleans reversed.

### Exact matching and ambiguity

Provider results are post-filtered by normalized exact equality against
`displayName` or `legalName`, plus the selected role.

Wandora does not:

- fuzzy-rank;
- trust the first provider row;
- perform a second lookup;
- resolve ambiguity with another endpoint;
- retry automatically.

Zero exact matches become `not_found`.

One exact match becomes bounded facts.

Multiple exact matches return a bounded safe list. No match is automatically
selected.

### Safe presentation

Customer-facing normalized output may contain only:

- display name;
- legal name when distinct;
- provider-proven customer/supplier role as a human-readable type.

It must not expose:

- provider/external IDs;
- CPF/CNPJ/tax ID;
- e-mail;
- phone;
- password/salt fields;
- raw provider payload;
- any other provider-private field.

## Semantic selector and signed authorization

`SemanticSelector` is extended only with the narrow `PartySelector` above.

The existing Mistral-backed selector boundary is reused. For Parties V1 it may
emit a selector only when one party name and one customer/supplier role are
explicit and the requested operation stays within the safe basic lookup
contract.

The existing `wfri1` intent already signs the canonical selector, so no new
authorization mechanism is added. Missing/invalid/ambiguous party selectors
fail closed before provider dispatch.

## Second adversarial review

The mandatory pre-execution JEV review first returned `deep_review`
(probability 0.77). The focused review then proved that explicit false role
booleans are preserved by both query builders, rechecked owner/admin
authorization and confirmed no new provider/state subsystem was needed.

The second focused review returned `proceed_fast` with probability 0.68
(`deep_review` 0.28). No unresolved factual blocker remained before code
changes.

## Validation

Draft PR #382 was created on branch
`feat/semantic-fast-read-parties-v1`, stacked directly on PR #381.

Exact code head:

`1c8d15cc3fd45ac255aeabb472f4536935099a09`

The code head completed **9/9 relevant pull-request workflows GREEN**, with zero
failures and zero pending runs.

Key qualification runs:

- VendaERP Read-Only MCP CI: `36935243724` — GREEN;
- Integration Capability Projection CI: `36935243787` — GREEN;
- Semantic Fast Read CI: `36935243758` — GREEN;
- Core CI: `36935243847` — GREEN;
- Core Candidate Artifact workflow: `36935243828`.

The Candidate Artifact completed before the two primary gates and therefore was
not accepted for precedence. After Core CI and Semantic Fast Read CI were both
GREEN, only the Candidate job was rerun. Post-gate job
`110615339488` completed GREEN.

Synthetic coverage proves:

- exact existing party tool identity;
- canonical capability projection;
- one bounded provider call with exact role booleans/page arguments;
- zero implicit retry;
- zero, one and multiple exact matches;
- no automatic first-row choice;
- malformed and over-bounded responses fail closed;
- missing selector produces zero provider calls;
- provider-private/PII fields do not cross customer presentation;
- signed party selector round-trip;
- ambiguous and sensitive party requests clarify before dispatch;
- existing product search, price and stock behavior remains compatible;
- the MCP serializes `customer/supplier=false` rather than omitting it.

Post-validation JEV completion review classified the slice as `complete` with
probability 0.96.

## Production boundary

This ADR authorizes **no**:

- production deployment or VPS mutation;
- rollout expansion or canary;
- real TypeSafe/Mistral/VendaERP/customer call;
- WhatsApp/Human Send/outbound;
- WRITE/DESTRUCTIVE operation;
- migration or secret change;
- PR merge.

ADR 0379/0380 production redaction prerequisites remain separate from this
code-only qualification.

## Next boundary

The next reuse-first candidate should be selected fresh from ADR 0380 after a
new REAL NOW. `business.orders.search` is the next already-existing capability
in the previously recorded sequence, but it must not be assumed authorized by
this ADR. Its query/PII semantics require an independent slice and second
adversarial review.
