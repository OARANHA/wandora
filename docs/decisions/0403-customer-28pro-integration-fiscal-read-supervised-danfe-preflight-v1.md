# ADR 0403 — Customer 28PRO Integration + Fiscal Read + Supervised DANFE Delivery Preflight V1

Status: **PREFLIGHT QUALIFIED / AUTHORITY BOUNDARIES FROZEN / IMPLEMENTATION DETAILS DEFERRED / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

Date: 2026-10-02

## Context

WANDORA needs an urgent customer vertical in which each organization can manage its own customer-facing **28PRO** integration from `app.wandora.com.br`, use a digital employee to consult fiscal information from a mobile experience, open a DANFE, and later send that DANFE to a customer under explicit human supervision.

The customer-facing product name is **28PRO**. VendaERP is one concrete ERP/provider implementation and must remain behind provider-neutral Wandora contracts.

This checkpoint is intentionally independent from the open Dynamic Managed Employee chain (#396 → #401). It does not alter, rebase, merge or depend on that chain. The dynamic-employee work remains separately recoverable.

Permanent guardrail from ADR 0168:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply implementation internalization.

This ADR performs no production mutation, migration, ERP/provider/customer call, secret change, outbound, deploy or merge.

## REAL NOW

Fresh reconciliation before decision proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PRs #396, #397, #398, #399, #400 and #401 are open, draft, mergeable and unmerged;
- #396 → #401 is one stacked Dynamic Managed Employee chain;
- #401 head is `ed978396db91bf367fa432d837d1c9f5b51e6d52` and contains ADR 0402;
- this fiscal/customer-integration vertical must not be mixed into that stack;
- one initial CI read was issued for the requested heads and no polling/rerun was performed; this ADR does not promote or reinterpret any CI status from those unrelated PRs;
- current visible runtime shows Core, Paperclip and Messaging Gateway healthy;
- Messaging Gateway is currently `provider=evolution` with `outboundEnabled=false`;
- the current Remote-Ops-visible host does not expose a local Evolution container/version, so the exact live Evolution version is **not proven** by this preflight.

## PROVEN EVIDENCE

### Existing 28PRO / business-system authority

ADRs 0202, 0203, 0208–0212, 0216, 0219 and 0260 establish the existing authority split:

- Wandora owns customer/business semantics, tenant/effect authorization and provider-neutral business capabilities;
- Paperclip owns operational Tool Connections, grants/installs, company-scoped secrets, Tool Profiles/policies, Tool Gateway authorization/execution and audit;
- VendaERP is a replaceable ERP provider implementation;
- the VendaERP MCP adapter is stateless and GET-only;
- the three credential values `Authorization-Token`, `User` and `App` are already modeled as Paperclip-custodied secret-backed inputs and must not become Wandora durable state;
- Core/Web/model/employee configuration must not read back or persist those plaintext values;
- the existing production 28PRO connection and product-read path have been proven previously;
- ADR 0260 proves one real product read end to end with one tool call, zero retry and zero outbound;
- that product proof must **not** be generalized into a claim that every other VendaERP response family has individually been proven against real customer data.

The current VendaERP MCP surface exposes exactly the already-qualified read families:

- connection probe;
- companies;
- products;
- stock;
- price tables;
- price-table products/prices;
- parties;
- orders.

Current Core semantic authority contains no fiscal BusinessCapability yet.

### Existing order reuse opportunity

The current VendaERP order adapter projects provider field `numeroNFe` as provider-neutral `invoiceNumber`.

The open Semantic Fast Read Orders V1 branch also implements an exact one-call order lookup that can present that invoice number.

Therefore a request equivalent to:

> “qual a nota do pedido X?”

must first reuse the existing order-read path when the invoice number is already sufficient.

This is a reuse opportunity, not a claim that Prorevest order responses have already been individually proven in production.

### Fiscal HTTP contract from owner-supplied OpenAPI

The reviewed owner/project Swagger is:

- OpenAPI title: `API de Integração`;
- version: `v1`;
- reviewed file SHA-256:
  `7e686ad743b4263d0aee53b50c7983c6c5b5cfcbabfc36573903eb15e7ed4089`.

It proves these eligible fiscal READ operations:

1. `GET /api/request/Fiscal/InformacoesVenda`
   - required query: `Codigo` — integer/int64, documented as **Código da Venda**;
   - required headers: `Authorization-Token`, `User`, `App`.

2. `GET /api/request/Fiscal/ConsultarNFE`
   - required query: `CodigoNFe` — integer/int32, documented as **Número da NFe/NFCe**;
   - required headers: `Authorization-Token`, `User`, `App`.

3. `GET /api/request/Fiscal/ConsultarNfePeriodo`
   - required `DataInicial`;
   - required `DataFinal`;
   - `pageSize` default 50 and documented as limited to 50;
   - `skip` default 0;
   - required headers: `Authorization-Token`, `User`, `App`.

The Swagger declares only `200 Success` for these three responses. It does **not** publish a response-body schema for them.

Therefore the observed customer/provider fields such as fiscal number, series, access key, issue date, status, DANFE URL and XML remain empirical response evidence until captured as a reviewed fixture or separately authorized controlled read proof.

This preflight must not invent a response DTO from undocumented fields.

### Explicitly forbidden ERP/fiscal writes

The same Swagger exposes fiscal mutations such as:

- `POST /api/request/Fiscal/EmitirNFCE`;
- `POST /api/request/Fiscal/EmitirNFE`;
- `DELETE /api/request/Fiscal/ExcluirNFE`;
- `POST /api/request/Fiscal/CalcularImpostos`.

They are **not authorized** by this vertical.

This ADR also does not authorize stock mutation, order creation/update or any other ERP write/destructive operation.

### Existing capability-plane / Fast Read reuse

ADRs 0275–0283 establish:

- Wandora `BusinessCapability` as semantic authority;
- Integration Capability Plane as a **projection, not a registry**;
- signed/stateless Fast Read admission;
- Paperclip as run/Connection/grant/secret/Tool Gateway operational authority;
- no second lifecycle, tool registry, connection mirror, secret store or ERP executor.

Any fiscal read must reuse those same boundaries.

### Existing messaging authority

Current Messaging Gateway code supports outbound **text** only.

The existing path already owns/reuses:

- Core → Gateway HMAC;
- connection validation;
- idempotency fingerprinting;
- fail-closed `delivery-uncertain` semantics;
- no blind resend after an uncertain transport outcome.

Core already owns the durable supervised outbound-attempt state. Gateway-local attempt memory is defense in depth, not the durable source of truth.

Open messaging qualification work also provides an important conservative constraint: a canonical Conversation carries exactly one `messaging_connection_id` after bootstrap, while pre-Conversation selection of a customer messaging account is not yet a generally proven product policy.

Employee responsibility is not messaging identity and is not generic effect authority.

### Evolution source capability vs live runtime proof

Official upstream source at `evolution-foundation/evolution-api@cd800f2` identifies package version `2.3.7` and exposes the `sendMedia` route.

That source supports media type `document` and accepts media through URL or Base64, while the route also accepts multipart upload.

This proves provider capability in that source version.

It does **not** prove that the currently connected live Evolution deployment is exactly 2.3.7 or that a real 28PRO DANFE URL is directly usable/safe through that provider.

Both facts remain future gates.

## GAPS

### Customer 28PRO self-service

There is no current customer-facing Wandora command surface that safely performs the full Paperclip-owned create/rotate/disconnect lifecycle for this ERP connection.

The pinned Paperclip plugin SDK `ctx.secrets` client exposes secret-reference **resolution**, not generic company secret creation/rotation.

Paperclip server/control-plane services do own secret create/rotate/remove and Connection/grant/install operations.

Therefore the next slice must qualify the narrowest provider-owned command boundary before any self-service credential write is implemented.

It is forbidden to solve this gap by:

- giving Board/admin credentials to the browser;
- giving broad Board/admin authority to Core by convenience;
- adding a Wandora secret store;
- copying Paperclip Connection/grant state into a Wandora registry;
- placing credentials in localStorage, prompts, employee state, logs or read APIs.

### Fiscal response contract

The HTTP request shapes are proven, but fiscal response schemas are not.

Before fiscal adapter code freezes response DTOs, the project needs one of:

- reviewed owner-provided raw/fixture samples whose provenance is clear; or
- a separately authorized bounded Prorevest READ proof.

No provider call is authorized by this ADR.

### Order → sale-code semantics

`Fiscal/InformacoesVenda` accepts a documented **Código da Venda**.

This ADR does not assume that a Wandora “pedido X” identifier is automatically that sale code.

The mapping must be proven before this endpoint is used from an order selector.

### Mobile fiscal presentation

A customer-safe mobile presentation contract is not yet frozen.

Raw fiscal XML is potentially large/sensitive and is not part of the default V1 presentation.

### DANFE source semantics

The real DANFE URL origin, lifetime, authentication requirement, content type and direct-fetch behavior are not yet qualified.

No SSRF-capable generic URL fetcher or media proxy is authorized by this ADR.

### Supervised document outbound

Gateway does not yet have a document command.

The exact live Evolution version/capability is not proven.

A pre-Conversation rule for selecting a messaging account must not be invented as part of DANFE delivery.

## CAPABILITY AUTHORITY / REUSE GATE

### Wandora-owned semantic/product authority

Wandora owns:

- customer-facing **28PRO** naming and UX;
- tenant/owner/admin admission;
- provider-neutral business/fiscal meaning;
- read-vs-write/effect policy;
- customer-safe projection;
- human confirmation semantics;
- canonical Conversation/Message/OutboundAttempt product state already justified by messaging;
- replacement boundaries for ERP and messaging providers.

### Durable product state

This preflight proves **no new durable integration/secret/grant/tool state** is required.

The future self-service slice must first attempt to reuse:

- existing organization → Paperclip company binding;
- Paperclip Connection identity;
- Paperclip secret/grant/install state;
- existing Wandora Integration Capability Projection.

If a stable Wandora-owned integration identity/state is later claimed necessary, that necessity must be proven separately before any table/migration is introduced.

### Paperclip operational authority

Paperclip remains authority for:

- Tool Connection;
- company-scoped secret custody;
- grants/install assignment;
- catalog/profile/policy;
- Tool Gateway execution and audit;
- operational connection health/readiness.

### ERP provider implementation

The existing VendaERP/28PRO MCP adapter remains the provider implementation for ERP reads.

Fiscal read extends that same bounded GET-only adapter surface only after response qualification.

### Messaging provider implementation

Messaging Gateway remains the Wandora provider boundary.

Evolution remains a replaceable transport/provider behind it.

No second messaging subsystem is authorized.

## DECISION

### 1. Customer 28PRO self-service is a command façade over Paperclip authority

Future customer UX is:

`Empresa → Integrações → 28PRO`.

The customer may enter:

- App;
- User;
- Authorization-Token.

The browser may send those values only in an authenticated owner/admin configuration request over the existing product boundary.

After submission:

- Wandora must not persist the values;
- Wandora must not return them;
- customer read APIs must expose only non-secret status/health/capability evidence;
- secret custody must end in Paperclip.

The exact provider-owned command primitive for create/rotate/disconnect is **not frozen here**.

The next slice must qualify it. If no narrow safe boundary exists, that slice blocks rather than internalizing Paperclip or broadening admin authority.

### 2. Fiscal Read reuses the existing GET-only ERP execution path

The eligible semantic families are:

- fiscal information linked to a verified sale code;
- one NF-e/NFC-e lookup;
- bounded NF-e period lookup.

Exact new Wandora `BusinessCapability` identifiers are intentionally **not frozen** in this preflight.

They must be chosen in the Fiscal Read slice after the response fixture and selector semantics are proven.

For “qual a nota do pedido X?”, reuse order `invoiceNumber` first when sufficient.

Only when fiscal details/DANFE are needed, or the order result does not answer the question, may a qualified fiscal capability be considered.

No hidden multi-call chain is authorized by this ADR.

### 3. Fiscal response DTOs are fixture-first

No fiscal provider DTO is frozen from undocumented Swagger response bodies.

The Fiscal Read slice must:

1. freeze reviewed response evidence;
2. project only an explicit allowlist;
3. keep provider-only fields behind the adapter;
4. treat raw XML as excluded from default customer-safe presentation unless separately justified.

### 4. “Open DANFE” is presentation over a qualified fiscal result

Opening a DANFE does not become an ERP write or a second messaging capability.

The Mobile Fiscal Result slice may expose a bounded customer action only after the DANFE URL/source properties are qualified.

No generic URL proxy/fetch service is introduced by default.

### 5. DANFE sending extends existing supervised outbound; it does not create a new messaging system

The future document outbound must reuse:

`Core Human Send / durable outbound attempt → Core→Gateway HMAC → Messaging Gateway → Evolution sendMedia`.

It must preserve:

- explicit human confirmation;
- exact tenant/Conversation/Connection authorization;
- durable attempt/idempotency semantics;
- `sending / succeeded / uncertain` handling;
- no blind retry.

The first V1 is constrained to an **already existing canonical Conversation with an already qualified MessagingConnection and destination**.

If that prerequisite is absent, V1 fails closed.

Gateway must not choose “Comercial vs Suporte”, infer WhatsApp from a mobile number, or create a pre-Conversation messaging policy.

The exact provider media strategy — direct URL, Base64, multipart upload, or a separately qualified retrieval step — is intentionally **not frozen** here.

### 6. Live Evolution proof is a mandatory later preflight gate

Before document-send implementation/promotion can be considered complete, the relevant slice must prove:

- exact live Evolution version;
- exact `sendMedia` capability on that deployment;
- document filename/content-type expectations;
- DANFE source compatibility;
- failure/timeout semantics required for `uncertain` handling.

No live provider call is authorized by this ADR.

### 7. Dynamic employee work remains separate

No file in this branch may implement or modify the #396→#401 Dynamic Managed Employee slice.

Fiscal/customer-integration PRs must not be stacked on #401 merely for convenience.

Each implementation slice must choose the smallest real dependency/base after a fresh reconciliation.

## SECOND ADVERSARIAL REVIEW

The first review of the broader decision returned:

- `deep_review = 0.52`;
- `proceed_fast = 0.24`;
- `split_task = 0.17`;
- `block = 0.07`.

A focused second pass, after removing unsupported assumptions, remained conservative:

- `deep_review = 0.41`;
- `proceed_fast = 0.25`;
- `split_task = 0.21`;
- `block = 0.13`.

The objection was accepted: this preflight must not prematurely freeze fiscal capability names, a secret-write implementation inside the Organization Adapter plugin, or one DANFE media transport.

After narrowing the checkpoint to authority boundaries, prohibitions and mandatory future gates, the final focused review returned:

- `proceed_fast = 0.93`;
- `deep_review = 0.03`;
- `split_task = 0.03`;
- `block = 0.01`;
- confidence `0.91`.

This ADR records that narrowed decision only.

## Minimal slice plan

### Slice A — Customer 28PRO Self-Service Connection V1

First qualify the provider-owned command boundary for:

- configure/connect;
- test;
- update/rotate credentials;
- disconnect/revoke;
- secret-free status/health/capability projection.

Reuse Paperclip custody and fail closed if the narrow mutation boundary cannot be proven.

**No production effect initially.**

### Slice B — 28PRO Fiscal Read V1 — Prorevest

- freeze fiscal response fixture/evidence;
- define provider-neutral fiscal semantic contracts;
- extend the same stateless GET-only MCP adapter;
- map only the three eligible fiscal GETs as justified;
- preserve one-call/no-retry behavior;
- keep every ERP/fiscal write unavailable.

The existing Prorevest Paperclip-owned 28PRO connection means this slice is **not technically dependent** on completion of Slice A, even though Slice A is the first customer-product slice in the roadmap.

### Slice C — Customer Mobile Fiscal Result V1

- authenticated mobile-friendly 28PRO presentation;
- fiscal summary only from qualified safe projection;
- no provider IDs/credentials;
- no raw XML by default;
- “open DANFE” only after source qualification;
- no messaging effect.

### Slice D — Supervised DANFE Document Outbound V1

- require existing canonical Conversation/qualified MessagingConnection;
- show recipient/document facts before confirmation;
- explicit human confirmation;
- reuse Core durable outbound attempt;
- additive Gateway document command;
- Evolution `sendMedia` adapter;
- no blind retry;
- uncertain stays uncertain;
- no autonomous destination/channel selection.

## Explicit NO-GO

This preflight does not authorize:

- production deploy;
- migration;
- new Wandora secret store;
- new Wandora Connection/grant/tool registry;
- Paperclip Board/admin credential exposure to browser/Core;
- real VendaERP call;
- real fiscal call;
- secret creation/rotation/revocation;
- NF-e/NFC-e emission;
- NF-e deletion;
- fiscal tax-calculation POST;
- stock mutation;
- order create/update;
- customer work;
- Human Send activation;
- Messaging Gateway outbound activation;
- DANFE send;
- Evolution provider call;
- merge of this PR or any existing dynamic-employee PR.

## Next executable boundary

The next slice is:

**Customer 28PRO Self-Service Connection V1 — Provider Command Boundary Qualification / NO PRODUCTION EFFECT**

It must begin again from REAL NOW and prove the narrow Paperclip-owned mutation boundary before any secret-bearing customer configuration command is implemented.

Fiscal Read V1 may proceed independently after a fresh decision if commercial urgency favors the already-connected Prorevest tenant, but it must not bypass the response-fixture and read-only gates above.
