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

The current public shell still uses preview/mock data. The next integration boundary is a tenant-authorized Core supervision read model. The first real-data target is `Trabalho`, then `Conversas`.

### Web → Core network direction

Core remains private. Do not create a generic public Core hostname merely to support the Web.

The reviewed direction for the first human API is:

```text
Browser
  -> https://app.wandora.com.br/api/v1/...
  -> Wandora Web Nginx
  -> private wandora-core network
  -> Wandora Core
```

The Web container may join both `wandora-edge` and `wandora-core` so its Nginx can proxy only explicitly reviewed human API routes. A generic proxy must not expose internal Core routes such as `/internal/v1/gateway/inbound`.

Same-origin routing avoids unnecessary browser CORS policy while preserving the Core service as private infrastructure.

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

Accepted boundaries include ADR 0007 identity/tenancy, ADR 0009 durable Ana state, ADR 0010 least-privilege DB identity, ADR 0011 private runtime, ADR 0012 authenticated Gateway ingress, ADR 0014 Mastra deterministic runtime, ADR 0015 Platform Admin direction and ADR 0016 canonical supervised proposals.

## Identity and human-session direction

Supabase Auth issues human sessions. Its JWT `sub` is external identity data, not a Wandora business user ID.

Live Auth currently publishes an EC/ES256 key through its JWKS endpoint with:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

Therefore human Core APIs should validate Bearer access tokens using public JWKS + issuer/audience checks. Do **not** give Core `service_role` or the shared JWT signing secret solely to validate sessions.

After cryptographic validation:

1. JWT `sub` resolves to canonical Wandora `user.id` through a narrow Core identity boundary;
2. a browser-supplied organization ID is treated only as a selector;
3. Core opens that organization scope under `wandora_core_runtime`;
4. active organization + active membership for the resolved user are required;
5. only then may the tenant read proceed.

Invalid tokens, unknown identities, cross-tenant access, suspended membership and suspended organizations must fail closed.

## Core database runtime boundary

`wandora_core_runtime` remains the deployed Core PostgreSQL identity:

- no `BYPASSRLS`;
- no role/database administration;
- no provider-binding access;
- connection limit 4;
- secrets only through operator-controlled mounted files;
- each organization-scoped transaction sets `wandora.organization_id` transaction-locally;
- RLS independently enforces tenant isolation;
- pooled connections must return unscoped after commit/rollback.

Do not replace this role with a broader Supabase role to simplify human API implementation.

## Core private runtime

Current live Core:

```text
container: wandora-core
image: wandora/core:canonical-proposal-79b5b082
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

ADR 0016 is live through migration `20260915_004_supervised_proposal_v1.sql` and Core image `wandora/core:canonical-proposal-79b5b082`.

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

The private receipt continues to contain replay evidence, but it is no longer the product proposal model.

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

Current live full-chain proof shows one canonical proposal after replay, zero approvals, zero outbound attempts, zero outbound messages, and no provider-private sentinel leakage.

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

## Human Supervision Read V1 — next

The first human read contract should expose only the business context required by `Trabalho`:

- work ID/kind/status/update time;
- employee ID/display name;
- contact/conversation business identity;
- latest inbound customer text/time;
- canonical proposal ID/kind/text/rationale/time.

Do not expose receipt IDs/results, provider IDs, Mastra run/workflow IDs, provider payloads or database implementation details.

The first slice is read-only. Send, edit-send and dismiss are separate reviewed actions and must not be smuggled into a read endpoint.

## Model provider status

Deterministic Mastra mode requires no model credential. The previously Git-exposed Mistral token is compromised and must never be reused. Request a fresh token only when the first real model call is materially required. Chutes remains deferred.

## Operator/infrastructure boundary

Cloudflare is public edge and Traefik is VPS ingress. Git is infrastructure source of truth. PostgreSQL, Docker socket, Core internal ports, Paperclip/Mastra internals and provider management APIs remain private.

Versioned DB migrations live under `infra/stacks/supabase/migrations/`; live-safe verifiers live under `infra/stacks/supabase/verifiers/`. Mutation-heavy behavioral verifiers run only in disposable environments.

## Near-term execution sequence

1. keep canonical documentation synchronized;
2. implement human Supabase JWT verification in Core using public ES256/JWKS;
3. resolve canonical human identity without widening Core DB grants;
4. expose a tenant-authorized read-only `attention-required` work/proposal projection;
5. prove invalid token, unknown identity, cross-tenant, suspended-member and suspended-org denial;
6. expose only the explicit human API path through the Web Nginx onto private `wandora-core`;
7. replace `Trabalho` mocks with the proven read contract;
8. connect `Conversas` next;
9. separately define send/edit-send/dismiss and prove human-supervised outbound;
10. add Platform Admin vertical slices around stable Wandora contracts;
11. add a real model provider only when materially useful.

## Non-goals for the current phase

- autonomous outbound messaging;
- public generic Core hostname;
- direct browser access to workflow/private DB state;
- building the whole Platform Admin before the customer loop is visible;
- generic customer prompt/workflow builder;
- customer access to provider consoles;
- requesting a model token before it is needed.
