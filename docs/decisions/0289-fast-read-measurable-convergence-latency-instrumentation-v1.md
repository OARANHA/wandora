# ADR 0289 — Fast Read Measurable Convergence + Latency Instrumentation V1

Status: **QUALIFIED / 16/16 PR WORKFLOWS GREEN / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0288 wired the qualified `SemanticDecisionProvider` into Core runtime behind disabled-by-default configuration. The next required step was measurement before optimization.

The target commercial flow is eventually:

```text
WhatsApp/Gateway ingress
-> Core auth/context
-> JEV semantic decision
-> Paperclip dispatch
-> VendaERP read tool/API
-> Paperclip terminal result
-> Core response
-> WhatsApp outbound
```

REAL NOW proved that this is not yet one composed live path: WhatsApp currently enters the supervised Gateway/Core workflow, while Semantic Fast Read is exposed through the authenticated Human API route. The measurement slice therefore had to instrument the real boundaries without fabricating a trace across paths that are not wired together.

## Capability Authority / Reuse Gate

### Wandora-owned

- provider-neutral semantic timing vocabulary;
- `BusinessCapability`;
- semantic admission policy;
- customer/product-facing evidence needed to reason about latency.

### Paperclip-owned

- run lifecycle;
- issue-less invoke;
- run status/result;
- Connections, grants and secret custody;
- Tool Gateway session, tool authorization, execution and audit.

### Provider-owned

VendaERP remains one concrete read-only business-system provider. Its HTTP timing belongs to the provider adapter boundary, not to a new Wandora ERP subsystem.

### Rejected

- new latency table;
- durable trace/run store;
- OpenTelemetry/collector subsystem before proving need;
- new global trace-id contract;
- run/result mirror;
- Connection/grant/secret/tool registry;
- lifecycle/orchestration duplication;
- production enablement merely to obtain measurements.

## Decision

Add only `wandora.latency.v1` structured ephemeral events at existing code boundaries.

Use monotonic time for elapsed duration. Reuse existing correlation IDs only where they already have semantic authority. Do not log customer text, phone, credentials, provider payloads, organization IDs, employee IDs, provider run IDs or provider-private object IDs.

Recorder failure must never affect execution semantics.

### Instrumented boundaries

Core:

- `core.auth_context`;
- `core.capability_projection`;
- `jev.semantic_decision`;
- `paperclip.dispatch_roundtrip`;
- `paperclip.tool_gateway`;
- `paperclip.read_tool`;
- `core.response`.

Paperclip Organization Adapter:

- `paperclip.dispatch`;
- `paperclip.terminal_result`.

Messaging Gateway:

- `whatsapp.gateway_ingress`;
- `whatsapp.outbound`.

VendaERP read-only MCP:

- `vendaerp.tool_api` with bounded operation labels only.

The VendaERP MCP emits latency to stderr so stdout remains a valid JSON-RPC transport.

## Validation

Exact code head:

`fafa3f8e8697a510aa51f3d464c50aff89c6b44c`

All **16/16** PR workflows completed GREEN.

Directly affected gates included:

- Core CI — GREEN;
- Semantic Fast Read CI — GREEN;
- Organization Adapter Plugin CI — GREEN;
- Messaging Gateway CI — GREEN;
- VendaERP Read-Only MCP CI — GREEN;
- Core Candidate Artifact — GREEN on attempt 2.

Tests additionally prove:

- bounded non-negative durations;
- no customer/request/phone/credential/provider payload leakage;
- no organization/employee/provider IDs in latency events;
- existing correlation IDs reused instead of a new cross-provider trace contract;
- observer failure cannot change business behavior;
- WhatsApp and Semantic Fast Read remain explicitly separate current paths.

## Adversarial review

The first routing review did not block but was close between `proceed_fast` and `deep_review`.

A focused second review selected:

- one bounded instrumentation slice;
- stateless boundary structured events;
- reuse of existing correlation IDs;
- separate WhatsApp-path evidence instead of a synthetic end-to-end trace.

The key focused choices returned 1.00 confidence except correlation reuse, which remained strongly preferred.

## Production effect

```text
migration/table = 0
durable telemetry store = 0
new lifecycle/run state = 0
Connection/grant/secret/tool registry = 0
production deploy = 0
VPS/Compose mutation = 0
live TypeSafe activation = 0
live VendaERP call = 0
customer work = 0
WhatsApp outbound = 0
```

`WANDORA_SEMANTIC_FAST_READ_ENABLED` remains disabled by default.

## Next minimum preflight

**ProRevest Product Selector + Price Fast Read V1 — CODE ONLY / NO PRODUCTION EFFECT.**

Why this comes before WhatsApp admission:

1. Paperclip already projects `business.products.price` from the existing VendaERP product read tool.
2. Core Fast Read currently advertises only `business.products.search`.
3. Core currently invokes the product tool with `{ pageSize: 5, skip: 0 }`, ignoring the requested product identity.
4. Wiring WhatsApp now would therefore make natural product-price questions appear supported while the exact requested product is not safely selected.

The next preflight must prove a bounded provider-neutral product selector/query contract and exact Product+Price execution using the existing authorized read tool. No new tool service, price service, query table or provider registry is justified.

The selector must be bound into the Wandora-owned authorization contract so tool execution cannot reinterpret raw free-form customer text into a broader query after admission.

After selector/price disposable attestation is GREEN:

1. wire authenticated WhatsApp ingress to Semantic Fast Read;
2. prove product+price over real read-only provider evidence;
3. reuse existing bounded WhatsApp outbound;
4. then implement Quote V1 with deterministic arithmetic over qualified item identity/unit price and no ERP write.
