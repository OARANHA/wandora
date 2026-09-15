# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete implementation has been selected.

Authority order is `AGENTS.md` → accepted ADRs → this document → `docs/CANONICAL_STATE.md` → component README/runbook.

## Product model

The customer should perceive a company operating with human and digital employees. Technical implementation details are intentionally hidden.

```text
Customer Wandora Web             Wandora Platform Admin
        \                           /
         \                         /
          -----> Wandora Core/API <-----
                    |
                    +--> canonical business state / Supabase PostgreSQL
                    +--> Organization Adapter -> Paperclip candidate
                    +--> Agent Runtime Adapter -> Mastra
                    +--> Tool Gateway -> authenticated integrations
                    +--> Messaging Gateway -> Evolution / Meta / other providers
                    +--> Model Provider Gateway -> Mistral / Chutes / others
                    +--> Approval / Policy boundary
```

Wandora is not a CRM-with-AI and not a generic agent builder. Every material product/architecture decision follows **decision → second review → execution** and must work both for the paying business customer and for the Wandora owner/operator.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router/Query. Current navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly.

The first real customer session path is now live. Supabase Auth provides identity/session; Wandora Core provides canonical identity, organization membership and business authorization. The shell derives the visible company/user from `/api/v1/me` rather than hard-coded preview identity.

`Trabalho`, the `Conversas` list and the selected-conversation history now use tenant-authorized canonical Core reads. Other customer surfaces may still contain preview/product-contract placeholders and must be converted only after their own reviewed Core contracts exist.

### Browser authentication

The browser signs in directly against the stable Supabase Auth endpoint using only the public/publishable browser key. Public signup remains disabled. V1 stores session material in `sessionStorage`; closing the tab/browser removes the local persisted session.

A valid Auth session is not itself Wandora authorization. Web sends the Bearer token to Core, which resolves the external `sub` to a canonical Wandora user and authorizes active organization membership.

### Web → Core network direction

Core remains private. There is no generic public Core hostname.

The live human-read direction is:

```text
Browser
  -> https://app.wandora.com.br/api/v1/...
  -> Wandora Web Nginx
  -> private wandora-core network
  -> Wandora Core
```

The Web container joins `wandora-edge` and `wandora-core`. Its Nginx proxies only explicitly reviewed routes, forwards `Authorization`, strips browser cookies before Core and leaves unreviewed `/api/` plus all `/internal/` paths closed.

Current reviewed customer routes are:

```text
GET /api/v1/me
GET /api/v1/organizations/:organizationId/work/attention-required
GET /api/v1/organizations/:organizationId/conversations
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

`/internal/v1/gateway/inbound` remains private and is not reachable through the customer Web.

## Wandora Platform Admin

ADR 0015 defines Wandora Platform Admin as the first-party owner/operator control plane. Customer administration and platform administration are separate trust planes.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic/emergency surfaces. They do not become the daily product operating model and are never required by customers.

## Wandora Core/API

Core owns product semantics and business authorization:

- organizations/tenants;
- canonical human users, external identity mapping, memberships and roles;
- digital employees and autonomy;
- contacts, conversations, messages and work;
- canonical supervised proposals;
- approvals and policy decisions;
- audit-facing events;
- provider-neutral adapter contracts.

Accepted boundaries now include ADR 0007 identity/tenancy, ADR 0009 durable Ana state, ADR 0010 least-privilege DB identity, ADR 0011 private runtime, ADR 0012 authenticated Gateway ingress, ADR 0014 Mastra deterministic runtime, ADR 0015 Platform Admin direction, ADR 0016 canonical supervised proposals, ADR 0017 Human Supervision Read V1, ADR 0018 Human Session Bootstrap V1, ADR 0019 Web Human Session V1, ADR 0020 Conversations Read V1 and ADR 0021 Conversation Detail/History Read V1.

## Identity and human session — live

Supabase Auth issues human sessions. Its JWT `sub` is external identity data, not a Wandora business user ID.

Live Auth publishes an EC/ES256 key through its JWKS endpoint with:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

Human Core APIs validate Bearer access tokens using public JWKS plus issuer/audience/time checks. Core does **not** receive `service_role` or a JWT signing secret merely to validate sessions.

After cryptographic validation:

1. JWT `sub` resolves to canonical Wandora `user.id` through a narrow Core identity boundary;
2. `/api/v1/me` returns only canonical Wandora user plus active memberships in active organizations;
3. a browser-supplied organization ID is only a selector;
4. Core opens that organization scope under `wandora_core_runtime`;
5. active organization + active membership for the resolved user are required;
6. only then may the tenant read proceed.

Invalid tokens, unknown identities, cross-tenant access, suspended membership and suspended organizations fail closed. A user with zero active organizations gets an explicit empty state; Web never silently selects between multiple active organizations.

## Core database runtime boundary

`wandora_core_runtime` remains the deployed Core PostgreSQL identity:

- no `BYPASSRLS`;
- no role/database administration;
- no provider-binding access;
- connection limit 4;
- secrets only through operator-controlled mounted files;
- each organization-scoped transaction sets `wandora.organization_id` transaction-locally;
- RLS independently enforces tenant isolation;
- pooled connections return unscoped after commit/rollback.

Do not replace this role with a broader Supabase role to simplify human API implementation.

## Core private runtime

Current live Core:

```text
container: wandora-core
image: wandora/core:conversation-history-2105f6e3
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
networks: wandora-core + wandora-data
published host ports: none
healthz: 200
readyz: 200
```

The Core database secret is mounted from the canonical operator file `wandora_core_db_password`; a legacy host filename must not be substituted during recreate/candidate operations.

## Canonical business state

Supabase self-hosted provides PostgreSQL/Auth/data infrastructure. It is not the Wandora business backend.

Live canonical state includes:

- organizations, users, external identities and memberships;
- provider-neutral messaging connections;
- digital employees;
- contacts;
- conversations;
- inbound/outbound messages;
- qualification work items;
- `work_proposals` for safe supervised employee proposals;
- approvals for stronger commitments;
- canonical audit records.

Private state includes provider bindings, normalized inbound receipts and outbound-attempt/idempotency state.

Browser clients do not read Core-owned workflow/proposal/private tables directly.

## Canonical supervised proposal boundary

ADR 0016 is live through migration `20260915_004_supervised_proposal_v1.sql`.

```text
Inbound customer message
      |
      v
work item -> Mastra deterministic proposal
      |
      v
wandora.work_proposals
      |
      +--> commitment must be none
      +--> exactly one per normalized inbound event
      +--> Core SELECT + INSERT only
      +--> authenticated direct DB access denied
      |
      v
work = attention-required
```

Proposal insertion, `attention-required` transition and receipt completion are one DB transaction. Stronger commitments such as discount, special price, delivery deadline, payment terms or contractual promises remain on `wandora.approvals`.

The private receipt continues to contain replay evidence, but it is not the product proposal model.

## Ana supervised inbound path

```text
Evolution webhook
      |
      v
Messaging Gateway
  -> verify provider JWT
  -> normalize supported inbound text
      |
      v
private Core ingress
  -> verify Gateway HMAC
  -> validate tenant / connection / employee
  -> persist contact / conversation / inbound message / work
      |
      v
Mastra Agent Runtime Adapter
  -> deterministic safe proposal
      |
      v
canonical work_proposals
  -> work attention-required
  -> receipt completed / supervision-required
  -> no outbound side effect
```

Current live full-chain proof shows one canonical proposal after replay, zero approvals, zero outbound attempts, zero outbound messages and no provider-private sentinel leakage.

## Messaging Gateway

Current live Gateway:

```text
container: wandora-messaging-gateway
image: wandora/messaging-gateway:inbound-v1-2a49c066
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
network: wandora-core
published host ports: none
healthz: 200
```

Evolution → Gateway uses per-instance JWT HS256. Gateway → Core uses a distinct Wandora HMAC-SHA256 secret.

Raw provider instance/API-key/server-url/provider message identifiers do not become public Core contracts.

## Human supervision reads — live

### Trabalho

`GET /api/v1/organizations/:organizationId/work/attention-required` exposes only the business context required for supervision:

- work ID/kind/status/update time;
- employee ID/display name;
- contact/conversation canonical identity;
- latest inbound customer text/time;
- canonical proposal ID/kind/text/rationale/time when present.

### Conversas — list

`GET /api/v1/organizations/:organizationId/conversations` returns at most 100 conversations ordered by canonical activity with:

- canonical conversation ID/status/activity time;
- canonical contact ID/business-facing label;
- latest canonical message direction/text/time when present;
- latest active work-assignment employee ID/name when present.

### Conversas — detail/history

`GET /api/v1/organizations/:organizationId/conversations/:conversationId` returns the authorized canonical conversation context and at most the latest 100 messages, ordered oldest → newest for display. The response includes only inbound/outbound direction, message text and occurrence time plus a `hasEarlierMessages` flag when earlier history exists.

Organization authorization happens before conversation lookup. A foreign or missing conversation under an already-authorized organization is exposed only as generic `404`. Tenant-scoped human reads execute in `REPEATABLE READ READ ONLY` transactions with transaction-local tenant scope + RLS.

The Web renders this history with an explicit `Somente leitura` state. No composer, reply, send, edit-send, dismiss, takeover, approval action, provider identifier or private runtime state is exposed.

The production activation was proven through an authenticated browser with Empresa Exemplo and still produced zero approvals, zero outbound attempts, zero outbound messages and zero provider bindings. See `docs/infra/conversation-history-live-v1.md`.

## Next customer-action boundary

The next customer-path slice is a separately reviewed **Human Conversation Response Action V1** (name may be refined by its ADR). Sufficient read-only context now exists; outbound effect still does not.

Before any send/edit-then-send/dismiss capability is exposed, the contract must define at minimum authorization, relationship to the canonical proposal, idempotency, audit evidence, delivery uncertainty/reconciliation, failure semantics and the stronger approval path for discounts, prices, deadlines, payment terms or contractual commitments.

Do not smuggle response controls into a read contract and do not enable autonomous customer traffic as part of the first human response slice.

## Model provider status

Deterministic Mastra mode requires no model credential. The previously Git-exposed Mistral token is compromised and must never be reused. Request a fresh token only when the first real model call is materially required. Chutes remains deferred.

## Operator/infrastructure boundary

Cloudflare is public edge and Traefik is VPS ingress. Git is infrastructure source of truth. PostgreSQL, Docker socket, Core internal ports, Paperclip/Mastra internals and provider management APIs remain private.

Versioned DB migrations live under `infra/stacks/supabase/migrations/`; live-safe verifiers live under `infra/stacks/supabase/verifiers/`. Mutation-heavy behavioral verifiers run only in disposable environments.

## Near-term execution sequence

1. keep canonical documentation synchronized with live state;
2. preserve Human Session + `Trabalho` + `Conversas` list/history reads as read-only customer context;
3. separately define the smallest human conversation response action contract;
4. prove authorization, canonical proposal relationship, idempotency, audit and delivery-uncertainty handling before any outbound effect;
5. keep stronger commercial commitments on the existing approval boundary;
6. expose only exact reviewed Web action routes and preserve generic `/api/` + all `/internal/` closure;
7. prove the complete supervised human action path before enabling any autonomous customer traffic;
8. add Platform Admin vertical slices around already-stable Wandora contracts;
9. add customer onboarding, broader login options and organization switching around the proven auth/read journey;
10. add a real model provider only when materially useful and only with a newly issued credential.

## Non-goals for the current phase

- autonomous outbound messaging;
- public generic Core hostname;
- direct browser access to workflow/private DB state;
- building the whole Platform Admin before the customer loop is visible;
- generic customer prompt/workflow builder;
- customer access to provider consoles;
- requesting a model token before it is needed.
