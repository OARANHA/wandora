# ADR 0220 — 28PRO VendaERP Bounded Business-Semantic Read Preflight V1

Status: **GREEN / READY FOR SEPARATE READ-ONLY EXECUTION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Objective

Move from connectivity proof to one bounded owner-facing business read through the already-proven production path:

```text
Paperclip native run identity
-> Wandora Core
-> Paperclip Tool Gateway
-> supervised Mastra
-> authorized VendaERP read tool
-> provider-neutral result
```

This preflight performs no provider call.

## Canonical entry state

```text
main = fc19f0f4174abaf40532ebae777f98b451bf4d04
ADR 0219 = PRODUCTION GREEN
Core = wandora/core:organization-adapter-candidate-3b39a14f5c23 / healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
VendaERP catalog = 8 active risk=read entries / 0 write-destructive
Wandora 28PRO work operations = 0
Wandora 28PRO outbound attempts = 0
```

## Selected business question

Use the least-sensitive useful business read first: product catalog.

Owner-facing intent:

```text
Consulte o VendaERP e mostre até 5 produtos do catálogo com as informações comerciais básicas disponíveis.
```

The runtime instruction must require exactly this admitted tool and bounded parameters:

```text
tool = vendaerp_search_products
parameters = {
  "pageSize": 5,
  "skip": 0
}
```

No filter is supplied, so this is a bounded first-page catalog read rather than a customer/order lookup.

## Why products first

The alternative reads include parties and orders, which can contain customer identity or transactional data.

Product catalog data is the lower-privacy proof because the provider-neutral DTO contains product/commercial fields rather than customer PII.

This preflight therefore explicitly does **not** use:

- `vendaerp_search_parties`;
- `vendaerp_search_orders`;
- customer tax IDs;
- customer email/phone;
- invoice/customer history.

## Output contract

The supervised result may summarize only these provider-neutral fields when present:

- `name`;
- `code`;
- `category`;
- `brand`;
- `unit`;
- `salePrice`;
- `stockBalance`.

The response must not surface unless separately justified:

- provider `externalRef`;
- barcode;
- minimum sale price;
- raw provider payload;
- credentials;
- Paperclip IDs;
- Tool Gateway/session/run tokens;
- internal audit IDs.

If a field is absent, the model must not invent it.

If the provider returns no products, the result must say that no products were returned by the bounded query.

No interpretation such as "in stock", "low stock", "best seller" or "recommended price" may be inferred unless the required business rule exists in official grounding.

## Effect boundary

This proof remains read-only.

It must not:

- create/update/delete products;
- change price or stock;
- create orders;
- issue invoices;
- create financial effects;
- send messages;
- create Wandora customer work;
- create outbound attempts;
- apply migrations;
- change Ana lifecycle;
- alter Paperclip connection/grant/secret/profile state.

## Execution shape

Use one synthetic Paperclip-only issue with:

- no `wandora-work-v1` marker;
- Ana as the assigned agent;
- an explicit instruction to use only `vendaerp_search_products`;
- exact bounded parameters `pageSize=5, skip=0`;
- no other tool.

Paperclip may create a lifecycle handoff run. ADR 0218 applies per run; each run may cause at most one actual identical Tool Gateway call.

The execution must record:

- issue ID/identifier;
- run IDs and lifecycle reason;
- Tool Gateway invocation count per run;
- exact admitted tool/risk;
- provider-neutral result shape;
- final supervised summary;
- post-proof work/outbound counts.

## Capability Authority / Reuse Gate

No new subsystem is required.

- Paperclip continues to own connection/grant/secret/profile/policy/audit/MCP execution and lifecycle.
- Wandora continues to own the provider-neutral semantic/output contract.
- Mastra remains the ephemeral supervised runtime.
- VendaERP remains a replaceable provider adapter.

No product cache, ERP mirror, vector store, runtime-memory service or new durable integration state is authorized.

## SECOND ADVERSARIAL REVIEW

- Is this using an already-approved read capability? **Yes: `vendaerp_search_products`.**
- Is the query bounded? **Yes: 5 rows maximum, skip 0.**
- Does it require customer PII? **No.**
- Does it allow arbitrary provider URL/method/path? **No.**
- Can it mutate ERP state? **No.**
- Does it require a new Wandora table/service? **No.**
- Are credentials exposed to Mastra/model? **No.**
- Could model output leak provider/internal IDs unnecessarily? **The output contract explicitly excludes them.**
- Could the model infer commercial conclusions not present in data? **The output contract forbids that.**
- Is Paperclip lifecycle preserved rather than recreated? **Yes.**
- Are ADR 0168, 0208, 0211 and 0219 preserved? **Yes.**

## Rollback / cleanup

No ERP rollback is needed because the provider operation is GET-only.

After proof:

1. reconcile all runs for the synthetic issue;
2. confirm only the approved read tool was invoked;
3. confirm work/outbound remain 0/0;
4. close/delete the synthetic issue according to the evidence-retention decision for the execution slice.

## Decision

**GREEN / GO for a separate READ-ONLY execution.**

Next slice:

**28PRO VendaERP Bounded Business-Semantic Read Execution V1**

It may execute only the frozen product query above and must stop on any unexpected tool, write/destructive risk, PII expansion, provider error or customer-work/outbound creation.
