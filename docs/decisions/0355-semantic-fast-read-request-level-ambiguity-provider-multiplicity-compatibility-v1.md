# ADR 0355 — Semantic Fast Read Request-Level Ambiguity vs Provider Multiplicity Compatibility V1

Date: 2026-09-30

Status: **CODE-ONLY IMPLEMENTATION / CI PENDING / PRODUCTION CLOSED**

## Objective

Close the request-level ambiguity gap proven by the bounded production attestation for:

`Qual é o preço do produto PREMIUM PLUS?`

without weakening fail-closed ambiguity policy and without moving product-catalog authority into Wandora.

This slice is **CODE+CI ONLY / NO PRODUCTION EFFECT**.

## REAL NOW

At slice start:

- `refs/heads/main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 branch `feat/semantic-fast-read-runtime-wiring-v1` head = `7fe5665b35f4019193e32e9f954d766fb57d3bd7`;
- `refs/pull/369/merge=9d28094b3bc5da4bd0589649444a454aa413abb2`;
- merge parents are exactly current main + PR head;
- the prior head was 17/17 GREEN;
- production was already returned to the exact `a49504c...` 14-file gates-OFF baseline after the bounded request;
- no production mutation is authorized by this ADR.

## PROVEN EVIDENCE

The legitimate browser-owned owner/admin request returned HTTP 200 with:

`fastRead.kind=fallback`
`fastRead.reason=ambiguous`

Paperclip recorded the Organization Adapter `employee-capabilities` read, but no `employee-fast-read` webhook and no `vendaerp_search_products` execution. The stop therefore occurred before the business-system lookup.

The current route-decision ambiguity question says `multiple_matches` when the request “plausibly refers to multiple entities or values”. That wording permits the semantic provider to speculate about possible duplicate provider records even when the customer request names exactly one product.

The existing VendaERP Fast Read adapter already owns the correct downstream behavior after one authorized product read:

- zero exact matches => `not_found`;
- exactly one exact match => return the selected product result;
- more than one exact match => bounded `clarification` with options;
- no second provider read.

An existing regression already proves multiple normalized exact `PREMIUM PLUS` rows return clarification after exactly one provider call.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

- Wandora owns semantic contracts, admission policy, selector vocabulary, signed `wfri1` and deterministic post-filtering.
- TypeSafe/System One remains the replaceable route-decision provider.
- Mastra + Mistral remain the replaceable selector implementation.
- Paperclip remains operational authority for run/tool execution.
- VendaERP remains concrete business-system authority for real catalog multiplicity.

Rejected:

- changing gate ordering;
- lowering thresholds;
- adding regex/product parsing in Core;
- creating a Wandora product catalog/cache;
- pre-reading VendaERP for candidate discovery;
- adding a second ERP read;
- treating possible provider duplicates as request ambiguity.

## DECISION

Clarify only the TypeSafe/JEV `ambiguity` question semantics:

- ambiguity is classified from the **customer request itself**;
- one explicit product name/code/barcode is not request-level ambiguity merely because the external provider may contain duplicate records;
- actual provider multiplicity remains resolved after the single authorized read by the existing deterministic exact-match post-filter;
- a request that itself names alternatives, omits the entity, or uses a vague reference remains fail-closed.

No deterministic gate implementation, ordering or threshold changes.

## SECOND ADVERSARIAL REVIEW

Fresh JEV route review selected:

- `proceed_fast=0.81`;
- `deep_review=0.16`;
- `split_task=0.02`;
- `block=0.01`;
- confidence `0.74`.

Constraints included no production effect, no gate reordering, no parser/cache, no ERP pre-read, no second ERP read and request-level ambiguity remaining fail-closed.

## NON-PRODUCTION QUALIFICATION

Using JEV 1.13.0 on the ambiguity question only:

For `Qual é o preço do produto PREMIUM PLUS?`:

- current wording: `none=0.45`, `multiple_matches=0.31`;
- clarified wording: `none=1.00`.

For `Qual é o preço do produto PREMIUM PLUS ou PREMIUM FOSCO?` under the clarified wording:

- `multiple_matches=1.00`.

These are qualification measurements only and are not production business data.

## EXECUTION

This code-only change modifies:

- `apps/core/src/semantic-routing/typesafe-jev-provider.ts` — ambiguity question wording only;
- `apps/core/test/typesafe-jev-semantic-decision-provider.test.ts` — exact product-name request asserts the provider boundary forbids catalog-duplicate speculation;
- `apps/core/test/human-digital-employee-fast-read.test.ts` — true request-level ambiguity still stops before selector and dispatch.

No service, gate, selector, Paperclip adapter or VendaERP implementation changes.

## VALIDATION

Pending exact-head CI.

## PRODUCTION EFFECT BOUNDARY

No deployment, Core recreation, attestation opening, provider/business-system call, Human Fast Read, Human Send, Gateway outbound, WhatsApp, database mutation or migration is authorized by this code-only slice.

## NEXT BOUNDARY

Require exact-head CI GREEN before any production consideration. A later production retry is a new bounded attestation slice with fresh provenance/runtime/rollback/provider/custody/browser gates and mandatory close.
