# ADR 0363 — Semantic Fast Read Paperclip Upstream Tool Identity Compatibility V1

Date: 2026-09-30

Status: **INCIDENT RECONCILED / CODE FIX QUALIFIED / 17/17 CI GREEN / PRODUCTION CLOSED**

## Objective

Reconcile the single supervised production Fast Read attempt performed after ADR 0362, identify the exact fail-closed boundary behind the returned HTTP 500, and correct only the existing Wandora Core ↔ Paperclip Tool Gateway adapter contract without duplicating Paperclip operational capability or performing a second real request.

ADR 0168 remains binding:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW

At the qualified code checkpoint:

- live `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head = `b15743a17162b4e14ad863d8f41fd5ca69ee9acf`;
- merge ref = `deac494c48a2367589d1d1c3fc91777918819668`;
- merge-ref parents are exactly current main + PR head;
- exact source head completed **17/17 workflows GREEN**, zero failures;
- Core Candidate Artifact run `36803695852` produced artifact id `11137080605`, name `core-organization-adapter-candidate-deac494c48a2367589d1d1c3fc91777918819668`, digest `sha256:b11a3f95323d3b1e302f7b9a3bd2be902b39130dbd243ea4a32dcc367a660513`.

Production is not running this candidate.

Current production remains:

- Core `wandora/core:organization-adapter-candidate-f279acc98687`;
- image id `sha256:c8994cc7b9a6bff15b212eba215d5a1360ee217b84df18a1b59409fb9fd1a4d8`;
- revision `f279acc98687da894a1ce6570273b5949552a8c7`;
- exact 14-file gates-OFF Compose chain;
- Core healthy/restart 0;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- Paperclip healthy;
- Messaging Gateway healthy with `outboundEnabled=false`;
- Task Drain `false / 0 / 0 / quiescent=true`.

The ADR 0362 Rollback Freeze V2 receipt remains the current live-baseline rollback evidence.

## The one real request

The legitimate Wandora browser owner boundary selected:

- organization = `28PRO`;
- Wandora organization id = `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- role = `owner`;
- employee = `Ana`;
- Wandora employee id = `7b401163-8102-42db-b595-3a2017f54003`;
- employee status = `active`;
- request = `Qual é o preço do produto PREMIUM PLUS?`.

Exactly one Human Fast Read POST was executed.

Browser result:

- HTTP = `500`;
- body = `{"error":"internal-error"}`.

No retry and no second browser request occurred.

The already-prepared mandatory-close operation was then explicitly approved and executed. Post-close readback proved the exact f279acc 14-file gates-OFF baseline, healthy Core/Paperclip/Gateway, Task Drain quiescent and outbound still OFF.

## Proven Paperclip execution path

Persistent Paperclip evidence for the request proves:

- exactly one Fast Read run = `e97f51a7-ef74-4646-8664-5f770ca8f590`;
- the external `wandora_mastra@0.6.0` path reached Wandora Core;
- Core successfully created a Paperclip Tool Gateway session;
- Core successfully listed the run-authorized Tool Gateway tools;
- the execution then failed once with `wandora_execution_failed_409`;
- the failure occurred before a Tool Gateway `tools/call`.

Governed Tool Connection activity for:

- Paperclip company `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- VendaERP Connection `8e2c23f4-73f5-444a-8647-71428819ea91`;
- run `e97f51a7-ef74-4646-8664-5f770ca8f590`;
- tool `vendaerp_search_products`;

returned zero matching events.

Therefore the real attempt did **not** call VendaERP.

Messaging Gateway remained outbound-disabled; no Human Send, WhatsApp or other outbound effect occurred.

## Root cause

Pinned Paperclip `v2026.916.1 / d554c4789ed3930f8a53ac9fdf6503b3187097da` represents a connected MCP tool with two distinct identities:

- `name` = unique Tool Gateway execution alias, namespaced by application/connection, for example `mcp.<connection-namespace>:vendaerp-search-products`;
- `upstreamToolName` = provider/catalog tool identity, here `vendaerp_search_products`.

The same `upstreamToolName` contract already exists in the prior qualified Paperclip `v2026.916.0 / dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`.

The existing Core bridge preserved `descriptor.name` but dropped `descriptor.upstreamToolName`.

The VendaERP Fast Read capability adapter then required:

`RuntimeReadTool.name === "vendaerp_search_products"`.

With a real Paperclip connected MCP descriptor, that comparison is false because `name` is the namespaced gateway alias. The deterministic capability binder therefore found zero valid bindings for `business.products.price` and failed closed with `fast-read-capability-unavailable`, surfaced through the private execution path as HTTP 409 and ultimately browser HTTP 500.

This explains all observed evidence:

- Tool Gateway session creation succeeded;
- Tool Gateway listing succeeded;
- no Tool Gateway call occurred;
- zero VendaERP activity occurred.

## CAPABILITY AUTHORITY / REUSE GATE

No new subsystem or durable state is justified.

Paperclip remains operational authority for:

- connection identity;
- catalog identity;
- grants/installs;
- policy;
- run-scoped Tool Gateway session;
- execution alias;
- invocation/audit;
- MCP execution.

Wandora remains semantic authority for:

- provider-neutral Business Capability semantics;
- deterministic Fast Read admission;
- exact product selector semantics;
- read/write/effect policy.

The fix is translation at the existing adapter boundary only.

Rejected:

- suffix/prefix matching against the Paperclip gateway alias;
- hard-coding the production Connection UUID;
- copying the Paperclip catalog into Wandora;
- introducing a tool registry, cache, lifecycle or state machine;
- changing Paperclip's execution alias;
- retrying the real request.

## Decision

Extend the ephemeral `RuntimeReadTool` contract with optional:

`providerToolName?: string`.

For connection-backed read tools, the Paperclip Tool Gateway bridge:

1. continues to preserve the unique namespaced Paperclip `name` as `RuntimeReadTool.name`;
2. validates and carries `upstreamToolName` as `RuntimeReadTool.providerToolName`;
3. continues to execute `POST /api/tool-gateway/tools/call` using the original namespaced `tool.name`.

The VendaERP Fast Read adapter recognizes its existing provider tool only when:

`providerToolName === "vendaerp_search_products"`.

It does not use substring/suffix inference.

If more than one authorized runtime tool exposes the same semantic capability, the existing deterministic binder still requires exactly one binding and fails closed.

No provider identifier is promoted into customer-facing product semantics or durable Wandora state.

## Second adversarial review

The first review requested deeper review because changing tool identity could create collisions or weaken the provider boundary.

Additional evidence proved:

- Mastra keys runtime tools by `RuntimeReadTool.name`, so replacing the namespaced alias with the upstream name would be unsafe;
- both Paperclip 916.0 and 916.1 already expose `upstreamToolName`;
- preserving the gateway alias for execution avoids collisions;
- using the upstream identity only for provider-adapter capability recognition does not bypass Paperclip policy or execution;
- duplicate semantic bindings remain fail-closed.

The revised action review returned `allow` as the leading decision.

## Execution

The code-only correction changes exactly:

1. `apps/core/src/agent-runtime/task-runtime.ts`;
2. `apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts`;
3. `apps/core/src/business-system/vendaerp-fast-read.ts`;
4. `apps/core/test/paperclip-tool-gateway-read-bridge.test.ts`;
5. `apps/core/test/vendaerp-fast-read.test.ts`.

Regression coverage now uses the real Paperclip descriptor shape:

- namespaced gateway alias in `name`;
- exact `vendaerp_search_products` in `upstreamToolName`;
- Tool Gateway call still submits the namespaced alias;
- VendaERP semantic binding is driven by exact upstream identity;
- wrong upstream identity remains rejected.

## Validation

Exact source head `b15743a17162b4e14ad863d8f41fd5ca69ee9acf` completed **17/17 workflows GREEN**.

Relevant proofs include:

- Core typecheck GREEN;
- focused Fast Read Core tests GREEN;
- Paperclip adapter contract tests GREEN;
- dedicated disposable Semantic Fast Read E2E GREEN;
- Core CI GREEN;
- Paperclip Mastra Adapter CI GREEN;
- Paperclip Fast Read Run Result Read CI GREEN;
- Paperclip Host Operational Read Extension CI GREEN;
- Paperclip Synchronous Webhook Response CI GREEN;
- Paperclip Fast Read Patch Composition CI GREEN;
- Paperclip Fast Read Production Candidate CI GREEN;
- deterministic Core candidate artifact produced for merge ref `deac494c48a2367589d1d1c3fc91777918819668`.

## Production boundary

This compatibility correction performs no:

- Core deployment;
- Core recreation;
- Paperclip mutation;
- adapter reinstall/reload;
- Task Drain mutation;
- migration;
- second Human Fast Read;
- TypeSafe/Mistral customer request;
- VendaERP call;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp effect.

The production window from the failed request is closed and remains closed.

## Next boundary

**Core Paperclip Upstream Tool Identity Compatibility Promotion V1 — GATES OFF / NO HUMAN FAST READ.**

Before any promotion:

1. reconcile current Git/PR/merge provenance;
2. qualify the exact Core Candidate Artifact bytes;
3. re-prove current production/rollback baseline;
4. run decision + second adversarial review;
5. promote only the exact Core candidate with the 14-file gates-OFF composition;
6. validate exact image/revision, health, hardening, Fast Read/Semantic/Human Send OFF and Gateway outbound OFF.

Because a new live Core revision would make the ADR 0362 receipt historical for the prior f279acc baseline, current-baseline rollback readiness must then be refreshed before any later supervised Fast Read opening.

Do not perform a second real Ana request as part of the promotion slice.
