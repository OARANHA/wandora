# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete implementation has been selected.

Authority order is `AGENTS.md` → accepted ADRs → this document → `docs/CANONICAL_STATE.md` → component README/runbook.

Every material product/architecture decision follows **decision → second adversarial review → execution → validation** and must work both for the paying business customer and for the Wandora owner/operator.

## Product model

Wandora is a company-operating layer built around human and digital employees. It is not a CRM-with-AI and not a generic agent builder.

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

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router/Query. Current navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The real customer session path is live. Supabase Auth provides identity/session; Wandora Core provides canonical identity, organization membership and business authorization. The shell derives visible company/user state from `/api/v1/me` rather than hard-coded preview identity.

`Trabalho`, `Conversas` list and conversation history use tenant-authorized Core reads. `Trabalho` contains the reviewed two-step Human Send UX and Canonical Confirmation V2 contract. The runtime currently keeps Human Send disabled unless an operator explicitly activates the accepted overlays.

### Browser authentication

The browser signs in against the stable Supabase Auth endpoint using only the public/publishable browser key. Public signup remains disabled. V1 stores session material in `sessionStorage`.

A valid Auth session is not itself Wandora authorization. Web sends the Bearer token to Core, which validates ES256/JWKS, resolves the external `sub` to a canonical Wandora user and authorizes active organization membership.

### Multi-organization selection

ADR 0024 is live:

- one active organization may auto-select;
- multiple active organizations require explicit human choice;
- selection is stored only in `sessionStorage`;
- a stored selector is accepted only if it still appears in canonical `/api/v1/me`;
- sign-out clears the selector;
- organization IDs remain selectors only and Core independently reauthorizes every tenant request.

Platform administration and tenant administration remain separate trust planes.

### Web → Core network direction

Core remains private. There is no generic public Core hostname.

```text
Browser
  -> https://app.wandora.com.br/api/v1/...
  -> Wandora Web Nginx
  -> private wandora-core network
  -> Wandora Core
```

The Web container joins `wandora-edge` and `wandora-core`. Nginx proxies only explicitly reviewed routes, forwards `Authorization`, strips browser cookies before Core and leaves generic/unreviewed `/api/` plus all `/internal/` paths closed.

Current reviewed customer routes:

```text
GET  /api/v1/me
GET  /api/v1/organizations/:organizationId/work/attention-required
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
GET  /api/v1/organizations/:organizationId/conversations
GET  /api/v1/organizations/:organizationId/conversations/:conversationId
```

The Human Send POST being allow-listed does not activate the capability. Core returns it unavailable while Human Send is disabled by runtime configuration.

## Wandora Platform Admin

ADR 0015 defines Wandora Platform Admin as the first-party owner/operator control plane. Customer administration and platform administration are separate trust planes.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic/emergency surfaces, not customer dependencies or the daily product operating model.

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

Accepted boundaries include ADRs 0007, 0009, 0010, 0011, 0012, 0014 through 0028. ADR 0028 adds the reviewed active-work reuse behavior for repeat supervised inbound.

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

Do not replace this role with a broader Supabase role to simplify integration.

## Current Core private runtime

Current live Core after ADR 0028 promotion and post-proof shutdown of external-effect switches:

```text
container: wandora-core
image: wandora/core:inbound-reopen-384bfee6
mode: database
agent runtime: mastra-deterministic
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

The Core database secret remains mounted from the canonical operator file `wandora_core_db_password`.

## Canonical business state

Supabase self-hosted provides PostgreSQL/Auth/data infrastructure. It is not the Wandora business backend.

Live canonical state includes organizations, users, external identities, memberships, provider-neutral messaging connections, digital employees, contacts, conversations, inbound/outbound messages, work items, `work_proposals`, approvals and audit records.

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

Proposal insertion, `attention-required` transition and receipt completion remain one transaction. Stronger commitments remain on `wandora.approvals`.

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

ADR 0028 refines repeat inbound behavior for the same active supervised work:

- `in-progress`, `attention-required` and `waiting-customer` may transition atomically to `attention-required` with a fresh canonical proposal;
- the same active work is reused instead of duplicated;
- `waiting-approval` remains fail-closed;
- receipt completion, proposal persistence and work transition remain atomic.

A real previously failed WhatsApp inbound was replayed through the normal private Gateway → Core path after promotion. The same event completed with one inbound message, one work, one new proposal, and no outbound effect.

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

ADR 0022 defines the private Core → Gateway outbound route with a different directional HMAC. When enabled, Gateway alone maps provider-neutral send-text requests to Evolution and reads the Evolution API key from an operator-controlled secret file.

ADR 0025 pins the internal server-to-server Origin used by outbound requests. Wildcard CORS is not accepted.

Provider-native identifiers do not become public Core contracts.

## Human supervision reads — live

### Trabalho

`GET /api/v1/organizations/:organizationId/work/attention-required` exposes only the business context required for supervision, including the current canonical proposal and normalized Human Send action state when that capability is enabled and the user is eligible.

### Conversas

`GET /api/v1/organizations/:organizationId/conversations` returns tenant-authorized conversation summaries.

`GET /api/v1/organizations/:organizationId/conversations/:conversationId` returns authorized canonical conversation context and at most the latest 100 messages, oldest → newest for display.

Organization authorization happens before conversation lookup. A foreign or missing conversation under an authorized organization is exposed only as generic `404`. Tenant-scoped reads execute under transaction-local tenant scope + RLS.

`Conversas` remains read-only; Human Send is exposed through the reviewed `Trabalho` proposal boundary rather than a generic free-text composer.

## Human Send Proposal + Canonical Confirmation V2

ADRs 0023, 0026 and 0027 define the first customer-facing external-effect boundary.

V1 permits sending only an existing canonical proposal that is `kind=send-text`, `commitment=none`, attached to the selected tenant/work/conversation, current/latest-inbound aligned, on active state and authorized by an active `owner` or `admin` human session.

The browser cannot supply recipient, connection, provider, text or idempotency key.

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

The snapshot is frozen locally when the human opens the dialog. At final send, Core reloads and reauthorizes canonical state, recomputes the version and fails `confirmation-stale` before durable attempt/Gateway call if the reviewed effect no longer matches.

Durable outbound semantics remain conservative:

- one attempt per canonical proposal;
- human actor/proposal linkage is durable;
- success creates one canonical outbound message idempotently;
- `uncertain` is not blind-retried;
- newer inbound state is not overwritten by a late completion;
- stronger commercial commitments stay on `wandora.approvals`.

## Confirmation V2 real end-to-end proof — COMPLETE

A separately reviewed controlled activation was executed after ADR 0028 live validation.

Observed sequence:

```text
real inbound event
  -> same active work reused
  -> receipt completed
  -> canonical proposal created
  -> human reviewed Confirmation V2 snapshot
  -> explicit human confirmation
  -> Core durable attempt
  -> private Gateway outbound
  -> Evolution
  -> WhatsApp received on authorized handset
  -> work = waiting-customer
```

Observed state changed exactly once:

```text
before send: outbound_attempts = 3, outbound_messages = 1
after send:  outbound_attempts = 4, outbound_messages = 2
new attempt status = succeeded
```

The successful attempt is linked to the exact proposal/work/source event. The proposal remained `commitment=none`.

After the proof, both runtime effect switches were explicitly returned to fail-closed:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

See:

- `docs/infra/human-send-canonical-confirmation-v2-live.md`
- `docs/infra/inbound-reopen-confirmation-v2-live-20260916.md`

## Current production state of external effects

Production currently keeps both explicit effect switches absent. Current canonical evidence is:

```text
outbound_attempts total = 4
uncertain              = 2
succeeded              = 2
canonical outbound messages = 2
```

The two `uncertain` attempts are historical and must not be blindly retried. The two successful attempts are controlled human-supervised proofs. No provider/private destination data is recorded in Git documentation.

Empresa Exemplo remains non-sending and separate from the provider-bound internal proof tenant.

## Model provider status

Deterministic Mastra mode requires no model credential. The previously Git-exposed Mistral token is compromised and must never be reused. Request a fresh token only when the first real model call is materially required. Chutes remains deferred.

## Operator/infrastructure boundary

Cloudflare is public edge and Traefik is VPS ingress. Git is infrastructure source of truth. PostgreSQL, Docker socket, Core internal ports, Paperclip/Mastra internals and provider management APIs remain private.

Versioned DB migrations live under `infra/stacks/supabase/migrations/`; live-safe verifiers live under `infra/stacks/supabase/verifiers/`. Mutation-heavy behavioral verifiers run only in disposable environments.

Rollback metadata was captured before both the ADR 0028 Core promotion and the controlled Confirmation V2 activation.

## Near-term execution sequence

1. keep canonical documentation synchronized with live state;
2. preserve Human Session, explicit multi-organization selection, `Trabalho` and `Conversas` authorization boundaries;
3. keep Human Send and Gateway outbound OFF by default after the successful controlled Confirmation V2 proof;
4. define the smallest normal-beta outbound policy instead of enabling autonomous traffic;
5. preserve exactly-once durable attempt semantics and never retry historical `uncertain` attempts blindly;
6. keep stronger commercial commitments on the approval boundary;
7. expose only exact reviewed Web action routes and preserve generic `/api/` + all `/internal/` closure;
8. add Platform Admin vertical slices around already-stable Wandora contracts;
9. add customer onboarding, password recovery/OAuth and broader customer lifecycle flows around the proven authorization path;
10. add a real model provider only when materially useful and only with a newly issued credential.

## Non-goals for the current phase

- autonomous outbound messaging;
- free-text generic WhatsApp composer outside a reviewed contract;
- public generic Core hostname;
- direct browser access to workflow/private DB state;
- generic customer prompt/workflow builder;
- customer access to provider consoles;
- requesting a model token before it is needed.
