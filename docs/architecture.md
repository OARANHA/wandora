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

Wandora is not a CRM-with-AI and not a generic agent builder. Every material product/architecture decision follows **decision → second adversarial review → execution → validation** and must work both for the paying business customer and for the Wandora owner/operator.

The adversarial review is not a confirmation ritual. It deliberately searches for a concrete reason the first decision is wrong, too broad, unsafe, duplicated, irreversible or based on an unproven premise. Execution proceeds only if that challenge fails to invalidate the decision, and validation then proves the executed state rather than assuming it.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router/Query. Current navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly.

The real customer session path is live. Supabase Auth provides identity/session; Wandora Core provides canonical identity, organization membership and business authorization. The shell derives the visible company/user from `/api/v1/me` rather than hard-coded preview identity.

`Trabalho`, the `Conversas` list and the selected-conversation history use tenant-authorized canonical Core reads. `Trabalho` also contains the reviewed two-step Human Send UI, but the live runtime currently keeps Human Send disabled unless an operator explicitly activates the accepted overlays.

Other customer surfaces may still contain preview/product-contract placeholders and must be converted only after their own reviewed Core contracts exist.

### Browser authentication

The browser signs in directly against the stable Supabase Auth endpoint using only the public/publishable browser key. Public signup remains disabled. V1 stores session material in `sessionStorage`; closing the tab/browser removes the local persisted session.

A valid Auth session is not itself Wandora authorization. Web sends the Bearer token to Core, which resolves the external `sub` to a canonical Wandora user and authorizes active organization membership.

### Multi-organization selection

ADR 0024 is live.

- exactly one active organization may auto-select;
- multiple active organizations require an explicit human choice;
- the choice is stored only in `sessionStorage`;
- a stored selector is accepted only if it still appears in canonical `/api/v1/me`;
- sign-out clears the selector;
- organization IDs remain selectors only and Core independently reauthorizes every tenant request.

Platform administration and tenant administration remain separate trust planes. Membership in an internal proof tenant is explicit and does not imply platform-wide authorization.

### Web → Core network direction

Core remains private. There is no generic public Core hostname.

The live direction is:

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
GET  /api/v1/me
GET  /api/v1/organizations/:organizationId/work/attention-required
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
GET  /api/v1/organizations/:organizationId/conversations
GET  /api/v1/organizations/:organizationId/conversations/:conversationId
```

The POST route being present in the Web allow-list does not mean the capability is active. Core returns it unavailable while Human Send is disabled by runtime configuration.

`/internal/v1/gateway/inbound` and the private outbound Gateway route remain private and are not reachable through the customer Web.

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
- human supervised-send authorization and confirmation versioning;
- approvals and policy decisions;
- audit-facing events;
- provider-neutral adapter contracts.

Accepted boundaries now include ADR 0007 identity/tenancy, ADR 0009 durable Ana state, ADR 0010 least-privilege DB identity, ADR 0011 private runtime, ADR 0012 authenticated Gateway ingress, ADR 0014 Mastra deterministic runtime, ADR 0015 Platform Admin direction, ADR 0016 canonical supervised proposals, ADR 0017 Human Supervision Read V1, ADR 0018 Human Session Bootstrap V1, ADR 0019 Web Human Session V1, ADR 0020 Conversations Read V1, ADR 0021 Conversation Detail/History Read V1, ADR 0022 private Gateway outbound, ADR 0023 Human Send Proposal V1, ADR 0024 multi-organization selection, ADR 0025 private Evolution outbound Origin, ADR 0026 explicit human confirmation and ADR 0027 canonical confirmation V2.

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
6. only then may the tenant operation proceed.

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

Current live Core after ADR 0027 promotion:

```text
container: wandora-core
image: wandora/core:canonical-confirm-a1ee4755
runtime application source head: a1ee475570c9314198068537003918a6022d8490
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
human API: enabled
Human Send Proposal: disabled by absence of enable flag
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
  -> no automatic outbound side effect
```

The inbound path remains independently safe even though a separate human-authorized outbound capability now exists in code.

## Messaging Gateway

Current live Gateway:

```text
container: wandora-messaging-gateway
image: wandora/messaging-gateway:origin-fix-94cfb4de
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
network: wandora-core
published host ports: none
healthz: 200
outbound capability: disabled by absence of enable flag
```

Evolution → Gateway uses per-instance JWT HS256. Gateway → Core ingress uses a distinct Wandora HMAC-SHA256 secret.

ADR 0022 additionally defines a private Core → Gateway outbound route authenticated by a different directional HMAC. The route is structurally unavailable when outbound is disabled. When explicitly enabled, the Gateway alone maps provider-neutral send-text requests to Evolution and reads the Evolution API key from an operator-controlled secret file.

ADR 0025 pins the internal server-to-server Origin used by outbound requests and adds only that exact internal Origin to Evolution's allow-list; wildcard CORS is not accepted.

Raw provider instance/API-key/server-url/provider message identifiers do not become public Core contracts.

## Human supervision reads — live

### Trabalho

`GET /api/v1/organizations/:organizationId/work/attention-required` exposes only the business context required for supervision:

- work ID/kind/status/update time;
- employee ID/display name;
- contact/conversation canonical identity;
- latest inbound customer text/time;
- canonical proposal ID/kind/text/rationale/time when present;
- normalized Human Send action state when the runtime capability is enabled and the user is eligible.

### Conversas — list

`GET /api/v1/organizations/:organizationId/conversations` returns at most 100 conversations ordered by canonical activity with:

- canonical conversation ID/status/activity time;
- canonical contact ID/business-facing label;
- latest canonical message direction/text/time when present;
- latest active work-assignment employee ID/name when present.

### Conversas — detail/history

`GET /api/v1/organizations/:organizationId/conversations/:conversationId` returns the authorized canonical conversation context and at most the latest 100 messages, ordered oldest → newest for display. The response includes only inbound/outbound direction, message text and occurrence time plus a `hasEarlierMessages` flag when earlier history exists.

Organization authorization happens before conversation lookup. A foreign or missing conversation under an already-authorized organization is exposed only as generic `404`. Tenant-scoped human reads execute in `REPEATABLE READ READ ONLY` transactions with transaction-local tenant scope + RLS.

`Conversas` remains a read-only history surface. Human Send is deliberately exposed through the reviewed `Trabalho` proposal boundary rather than by adding a generic free-text composer to the read contract.

## Human Send Proposal + Canonical Confirmation V2

ADRs 0023, 0026 and 0027 define the first customer-facing external-effect boundary.

V1 only permits sending an existing canonical proposal that is:

- `kind=send-text`;
- `commitment=none`;
- attached to the selected tenant/work/conversation;
- newest/current and aligned with the latest inbound event;
- on an active conversation/employee/connection;
- authorized by an active `owner` or `admin` human session.

The browser cannot supply recipient, connection, provider, text or idempotency key.

The Web uses an explicit two-step flow:

```text
Revisar e enviar
      |
      v
Core-issued confirmation snapshot
  -> recipientMasked
  -> exact canonical text
  -> sha256 confirmation version
      |
      v
Confirmar e enviar
  -> POST carries only confirmationVersion
```

The snapshot is frozen locally when the human opens the dialog. A background refetch cannot silently replace what the person is reviewing.

At final send, Core reloads and reauthorizes canonical state, recomputes the version and fails `confirmation-stale` before durable attempt/Gateway call if the reviewed effect no longer matches. Malformed/widened bodies fail before the send service.

Durable outbound semantics remain conservative:

- one attempt per canonical proposal;
- human actor/proposal linkage is durable;
- success creates one canonical outbound message idempotently;
- `uncertain` is not blind-retried;
- newer inbound state is not overwritten by a late completion;
- stronger commercial commitments stay on `wandora.approvals`.

The controlled internal proof before ADR 0027 established a real human-supervised WhatsApp delivery to an explicitly authorized handset. Historical attempts remain immutable. Confirmation V2 was then deployed with outbound switched back OFF; its deployment created no new attempt/message.

See `docs/infra/human-send-canonical-confirmation-v2-live.md`.

## Current production state of external effects

The code paths for private Gateway outbound, Human Send Proposal and Confirmation V2 are deployed, but production currently runs with both explicit effect switches absent:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

Observed state after Confirmation V2 promotion:

```text
outbound_attempts total = 3
uncertain              = 2
succeeded              = 1
canonical outbound messages = 1
```

Those rows are historical evidence from controlled internal proof work; no new outbound effect was produced by the V2 candidate or production promotion.

Empresa Exemplo remains non-sending and has no need to become the provider-bound proof tenant.

## Model provider status

Deterministic Mastra mode requires no model credential. The previously Git-exposed Mistral token is compromised and must never be reused. Request a fresh token only when the first real model call is materially required. Chutes remains deferred.

## Operator/infrastructure boundary

Cloudflare is public edge and Traefik is VPS ingress. Git is infrastructure source of truth. PostgreSQL, Docker socket, Core internal ports, Paperclip/Mastra internals and provider management APIs remain private.

Versioned DB migrations live under `infra/stacks/supabase/migrations/`; live-safe verifiers live under `infra/stacks/supabase/verifiers/`. Mutation-heavy behavioral verifiers run only in disposable environments.

The Confirmation V2 pre-promotion operator snapshot is:

```text
/home/wandora-admin/backups/canonical-confirm-v2-20260916T061650Z
```

## Near-term execution sequence

1. keep canonical documentation synchronized with the live state;
2. preserve Human Session, explicit multi-organization selection, `Trabalho` and `Conversas` authorization boundaries;
3. keep Confirmation V2 code live with outbound OFF until a separately reviewed controlled V2 activation proof is intentionally requested/executed;
4. before that proof, run the full **decision → second adversarial review → execution → validation** cycle and reject activation if any capability/config/binding/rollback premise is weak;
5. preserve exactly-once durable attempt semantics and never retry historical `uncertain` attempts blindly;
6. keep stronger commercial commitments on the existing approval boundary;
7. expose only exact reviewed Web action routes and preserve generic `/api/` + all `/internal/` closure;
8. after the V2 controlled proof, decide the smallest normal-beta outbound policy rather than enabling autonomous traffic by default;
9. add Platform Admin vertical slices around already-stable Wandora contracts;
10. add customer onboarding, password recovery/OAuth and broader customer lifecycle flows around the proven authorization path;
11. add a real model provider only when materially useful and only with a newly issued credential.

## Non-goals for the current phase

- autonomous outbound messaging;
- free-text generic WhatsApp composer outside a reviewed contract;
- public generic Core hostname;
- direct browser access to workflow/private DB state;
- building the whole Platform Admin before the customer loop is operationally clear;
- generic customer prompt/workflow builder;
- customer access to provider consoles;
- requesting a model token before it is needed.
