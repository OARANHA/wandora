# ADR 0350 — Semantic Fast Read Explicit Product Context / Selector Admission Compatibility V1

Date: 2026-09-30

Status: **CODE QUALIFIED / 17/17 EXACT CODE-HEAD CI GREEN / DOCUMENTATION HEAD CI REQUIRED / NO PRODUCTION EFFECT**

## Objective

Close the semantic admission gap proven by ADR 0349 without lowering Wandora safety thresholds or moving product parsing/catalog state into Core.

The exact customer request remains:

`Qual é o preço do produto PREMIUM PLUS?`

This slice is **CODE+CI ONLY / NO PRODUCTION EFFECT**.

## REAL NOW

At slice start:

- canonical `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 branch = `feat/semantic-fast-read-runtime-wiring-v1`;
- entry documentation head = `dc6a55673ccf9a1a09a00a2109fba3f7fabbc46b`;
- that entry head was **17/17 workflows GREEN**;
- production Core remained exact `wandora/core:organization-adapter-candidate-14534e57256f` / revision `14534e57256f0a73c49feb3944a1068921468f94`, healthy, restart 0;
- Core startup remained `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip remained `wandora/paperclip:v2026.916.1`, healthy;
- Gateway remained healthy with `outboundEnabled=false`;
- Task Drain remained `false / 0 / 0 / quiescent=true`.

No production mutation was required or performed.

## PROVEN EVIDENCE

ADR 0349 proved that the prior production request returned `needs-more-context`, reached `employee-capabilities`, did not reach `employee-fast-read`, created no new Paperclip run and made no VendaERP call.

The exact numeric **production** `needsMoreContext` value was not preserved and is not reconstructed here.

A fresh **non-production** reproduction using the exact current TypeSafe/JEV question contract, JEV `1.13.0`, the exact request above and available capabilities `business.products.search` + `business.products.price` returned:

- mode = `deterministic_read`, confidence `0.98`;
- capability = `business.products.price`, confidence `1.00`;
- `needsDataOrToolLookup = 0.94`;
- `needsMoreContext = 0.53`;
- `needsHumanReview = 0.04`;
- ambiguity choice = `none`.

Under the unchanged Wandora policy `maximumNeedsMoreContext = 0.10`, only the context gate blocked this reproduction before the existing `missing-selector` path.

The current TypeSafe question used broad wording:

- important context or identification missing = true;
- request sufficiently specific = false.

That wording did not distinguish customer/business context actually absent from the request from a structured `ProductSelector` that has not yet been materialized by the separately-qualified selector provider.

## GAPS

The existing architecture already had all required execution boundaries:

1. TypeSafe/JEV chooses route/capability and advisory uncertainty;
2. Wandora gates the route;
3. when the only gate failure is `missing-selector`, the existing `SemanticSelectorProvider` may be called once;
4. selector confidence can only narrow route confidence;
5. selector ambiguity can only preserve/block, never relax;
6. Wandora reruns the same deterministic gate;
7. only then can it issue the signed `wfri1` and dispatch through Paperclip.

The missing compatibility was therefore semantic wording at the route-decision provider boundary, not a missing parser, catalog, state machine, tool, ERP lookup or orchestration subsystem.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

Authority remains:

- **Wandora** — `BusinessCapability`, semantic contract, thresholds, admission policy, `SemanticSelector` contract, signed `wfri1`, customer/effect policy;
- **TypeSafe/System One + JEV** — replaceable semantic route-decision provider;
- **Mastra + Mistral** — replaceable bounded selector implementation behind `SemanticSelectorProvider`;
- **Paperclip** — run lifecycle, Connections/grants/secrets, Tool Gateway authorization/execution/audit and terminal result;
- **VendaERP** — concrete read provider.

Explicitly rejected:

- lowering `maximumNeedsMoreContext` below the existing safety contract for convenience;
- Core regex/entity/product parser;
- Wandora product catalog/cache;
- pre-reading VendaERP to generate selector candidates;
- second ERP read;
- provider registry or new semantic subsystem;
- bypassing or reordering gate reasons;
- allowing selector output to issue an intent without the second Wandora gate.

## DECISION

Clarify only the TypeSafe/JEV `needsMoreContext` question semantics:

> `needsMoreContext` measures material business/customer context missing from the request itself. The absence of a structured selector object is not itself missing context when the request explicitly names or identifies one product; structured selector materialization remains a separate bounded semantic-provider step after route admission.

The Wandora threshold remains exactly `maximumNeedsMoreContext = 0.10`.

No gate implementation or ordering changes.

### Non-production qualification of the clarified contract

With only that question wording changed, the same JEV/model/request returned:

- `needsMoreContext = 0.08`;
- route = `deterministic_read`;
- capability = `business.products.price`;
- tool lookup and human-review answers remained compatible with the existing policy.

This permits the existing gate to reach `missing-selector` naturally; it does not create a special case in Core.

Negative probes remained fail-closed:

- `Qual é o preço do produto PREMIUM PLUS ou PREMIUM FOSCO?`
  - ambiguity = `multiple_matches`;
  - `needsMoreContext = 0.12`;
- `Qual é o preço do produto?`
  - ambiguity = `missing_entity`;
  - `needsMoreContext = 0.91`.

These values are non-production qualification evidence only.

## SECOND ADVERSARIAL REVIEW

Before code mutation, the exact narrowed decision was reviewed with these constraints:

- no production effect;
- keep all thresholds unchanged;
- no parser/catalog/cache;
- no ERP pre-read;
- no new subsystem;
- selector at most once;
- ambiguity fail-closed;
- zero ERP read before admission.

JEV 1.13.0 returned:

- `proceed_fast = 0.59`;
- `deep_review = 0.37`;
- `block = 0.01`.

The accepted implementation remained the minimal wording correction plus regression proof.

## EXECUTION

Exact code head:

`1b28df19eef190ec54bded54c9b1cc830a131d0b`

Changed only:

- `apps/core/src/semantic-routing/typesafe-jev-provider.ts`;
- `apps/core/test/typesafe-jev-semantic-decision-provider.test.ts`;
- `apps/core/test/human-digital-employee-fast-read.test.ts`.

The provider change modifies only the `needsMoreContext` question instructions/criteria.

The service, deterministic gate, selector provider, signed intent, Paperclip adapter and VendaERP implementation are unchanged.

Regression coverage proves:

1. the exact production phrase is preserved in tests;
2. a context-compatible product-price route can invoke the selector exactly once;
3. the selector value `PREMIUM PLUS` enters the signed intent only after the second gate;
4. `needsMoreContext = 0.53` still returns `needs-more-context` with selector calls = 0 and dispatch calls = 0;
5. selector ambiguity returns `ambiguous` with selector calls = 1 and dispatch calls = 0;
6. no ERP pre-read path was added.

## VALIDATION

Exact code head `1b28df19eef190ec54bded54c9b1cc830a131d0b` completed **17/17 workflows GREEN**.

Key runs:

- Semantic Fast Read CI `36666104756` — GREEN;
  - Core typecheck GREEN;
  - focused Fast Read Core tests GREEN;
  - adapter contract tests GREEN;
  - Organization Adapter package qualification GREEN;
  - disposable Semantic Fast Read E2E GREEN.
- Core CI `36666104804` — GREEN.
- all remaining PR workflows — GREEN.

The first Core Candidate Artifact job finished before both primary gates. After Semantic Fast Read CI and Core CI were GREEN, only that job was rerun. Core Candidate Artifact run `36666104676`, attempt-2 job `109731998468`, completed GREEN.

No failed workflow was retried and no workflow was restarted merely because status polling was delayed.

## PRODUCTION EFFECT BOUNDARY

This slice performed no:

- deploy or Core recreation;
- production Compose/env change;
- production TypeSafe/Mistral customer-path call;
- Human Fast Read;
- Paperclip Fast Read run;
- VendaERP read/write;
- customer work;
- Human Send;
- Gateway outbound;
- WhatsApp effect;
- migration/table/state-machine creation.

Production remains closed/inert for Semantic Fast Read.

## NEXT BOUNDARY

After this documentation head itself is exact-head CI GREEN, stop.

A future production retry is a **new Semantic Fast Read bounded production attestation** slice. It requires fresh:

1. repository/main/PR/merge provenance;
2. exact live runtime and rollback readiness;
3. Paperclip/OA/Tool Policy/operational-read freshness;
4. custody metadata;
5. legitimate browser-owned owner/admin boundary;
6. opening decision and second adversarial review;
7. fresh approvals;
8. exactly one browser request;
9. mandatory close.

This ADR does **not** authorize deploy, production reopening or another browser request.
