# ADR 0202 — Provider-Neutral Business System Contract + VendaERP Read-Only Adapter V1

Status: **ACCEPTED FOR CODE-ONLY IMPLEMENTATION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0201 proved the first real customer-company onboarding end to end. The next product requirement is first-use readiness for a real organization that operates through an ERP and must eventually allow digital employees to consult business data conversationally from mobile channels.

The first concrete provider is VendaERP, customer-facing under the 28PRO white-label experience. The supplied OpenAPI describes 98 paths and requires Authorization-Token, User and App headers. The API documents a limit of 1,000 requests/hour per key and exposes both reads and high-impact mutations.

The product requirement is broader than one vendor:

- an organization may use VendaERP today and another ERP tomorrow;
- employees must reason in terms of products, stock, prices, customers and orders, not provider endpoint names;
- credentials must not become employee state or browser-visible state;
- read capability and external mutation authority must stay separate;
- future WhatsApp/mobile conversational entry does not weaken organization/role/effect authorization.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns the customer-facing meaning of a connected business system, organization authorization, stable product vocabulary, read/write policy, mobile/conversational access semantics and external-effect authorization.

### Durable product state

No new durable integration table is approved by this ADR.

Future minimum state may include a stable connection identity, tenant binding, provider binding/reference, policy and audit/reconciliation evidence only after the specialist connection authority is qualified.

### Operational authority

Paperclip v2026.916.0 already exposes Connections, grants, responsible-user routing and company/user secrets. Canonical capability maps classify Paperclip Connections as the leading candidate authority for organizational connection identity/grants/secrets.

Paperclip Tool Gateway remains quarantined and is not adopted by this ADR.

Mastra remains runtime tool-execution implementation, not connection/grant authority.

### Provider implementation

VendaERP is the first ERP provider adapter only. It is not a Wandora product contract.

### Replacement boundary

Replacing VendaERP must require only adapter/binding/configuration/provider-owned credential changes. Digital employees and customer-facing contracts continue to use provider-neutral business-system operations.

## Decision

Introduce a narrow provider-neutral read contract in Core and a VendaERP read adapter.

V1 operations:

- connection probe;
- list companies;
- search products;
- read product stock;
- list price tables;
- read product prices from a price table;
- search people/customers/suppliers;
- search orders.

All provider responses are projected into bounded Wandora-neutral DTOs. VendaERP-only fields do not cross this adapter contract.

The adapter:

- accepts credentials only through constructor injection;
- does not persist credentials;
- never logs credentials;
- requires HTTPS;
- sends the provider-required Authorization-Token, User and App headers;
- uses bounded page sizes;
- performs no automatic retries;
- distinguishes auth rejection, rate limiting, provider unavailability and invalid provider responses;
- implements GET/read operations only.

No runtime wiring, browser route, Paperclip Connection, secret creation, production environment variable or production API call is authorized here.

## Explicitly deferred

- credential onboarding UI;
- Paperclip Connections/grants/secrets qualification and live binding;
- employee runtime tool exposure;
- fiscal and financial reads;
- product/customer/order writes;
- price changes;
- inventory movements;
- order invoicing;
- NFe/NFCe issue/delete;
- financial/payment/bank effects;
- WhatsApp command execution.

Those are separate slices.

## Mobile / conversational invariant

The future channel identity contract remains:

    channel address
    -> verified Wandora identity/contact
    -> organization relationship/role
    -> capability/effect authorization

A phone number alone is never authorization.

Owner/admin, human employee, customer and supplier relationships may resolve differently for the same channel type. ERP party records may provide commercial mappings, but the ERP is not Wandora identity authority.

## Second adversarial review

Rejected:

- creating a Wandora ERP database or generic secret manager;
- binding digital employees directly to VendaERP endpoints;
- putting provider credentials in employee configuration;
- using Mastra Connect as a competing organizational connection authority;
- depending on quarantined Paperclip Tool Gateway;
- enabling write endpoints merely because the OpenAPI exposes them;
- implementing all 98 endpoints before the first-use contract is proven.

Accepted:

- provider-neutral read contract;
- minimal VendaERP adapter;
- no new persistence;
- no production effect;
- qualify Paperclip Connections before any real credential onboarding.

## Exit criteria

This slice is complete when:

1. strict TypeScript build passes;
2. adapter tests prove header/auth behavior, neutral projection, no provider-only field leakage, no retry and fail-closed errors;
3. no production runtime/config/database state changes;
4. exact-head CI is green;
5. canonical checkpoint records the next slice as **Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1 — NO EFFECT**.
