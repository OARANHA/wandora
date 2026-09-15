# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-15**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI and not a generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, Paperclip, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

The default SaaS path aims for useful supervised work on the same day. Every material decision follows **decision → second review → execution** and is checked from both paying-customer and Wandora-owner/operator perspectives.

## Human experience — CURRENT

Public preview:

- `https://app.wandora.com.br`
- `https://app.wandora.com.br/start`

Navigation remains `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The current Web shell is still mock/product-contract data. It is not yet a tenant-authenticated customer account. The immediate product objective is to replace `Trabalho` first, then `Conversas`, with tenant-authorized Core data.

## Platform administration direction — ACCEPTED

ADR 0015 accepts **Wandora Platform Admin** as the first-party owner/operator control plane.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain strongly protected engineering/diagnostics/emergency tools. They are not the normal daily administration workflow and are never a customer dependency.

Customer administration and Platform Admin are separate trust planes. A tenant `owner` or `admin` never gains platform-wide access merely because of that tenant role.

## Accepted technology roles

- Cloudflare — public edge/protection and preferred Access layer for privileged surfaces.
- Traefik — VPS ingress/reverse proxy.
- Docker Compose + Portainer — initial operations model; Git remains source of truth.
- Supabase self-hosted — PostgreSQL/Auth/data infrastructure, not the Wandora business backend.
- Wandora Core — canonical business semantics and authorization.
- Mastra — initial Agent Runtime behind a Wandora-owned adapter.
- Paperclip — organization/control-plane candidate behind a Wandora-owned adapter.
- Evolution API 2.3.7 — initial WhatsApp provider behind Messaging Gateway.
- React 19 + Vite + TanStack Router/Query — customer Web shell.
- Model providers — replaceable infrastructure; no real model provider is required by the current deterministic live path.

## Current live topology

```text
WhatsApp / Evolution
        |
        | provider JWT
        v
Wandora Messaging Gateway
        |
        | Wandora HMAC
        v
Wandora Core
        |
        +--> Mastra deterministic Agent Runtime
        |
        +--> wandora_core_runtime + transaction-local tenant scope
        v
Supabase PostgreSQL
```

Core and Messaging Gateway publish no host ports. Core has no public hostname merely for internal Gateway traffic.

Current live containers:

```text
Core image:    wandora/core:canonical-proposal-79b5b082
Gateway image: wandora/messaging-gateway:inbound-v1-2a49c066
Core networks: wandora-core + wandora-data
Gateway net:   wandora-core
Core health:   200
Core ready:    200
Gateway health: 200
```

Both services run as non-root `node`, read-only root filesystems, `cap_drop=ALL`, `no-new-privileges`, with secrets mounted from operator-controlled files.

## Completed/live foundations

### Supabase Foundation V1

PostgreSQL is non-public. Supavisor remains localhost-only. Supabase is data/auth infrastructure rather than the Wandora business backend.

### Core multi-tenant/auth contract V1

ADR 0007 freezes canonical `organization`, `user`, `user_identity`, `membership` and provider-neutral `messaging_connection` semantics. Initial tenant roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

### Ana durable Core vertical slice V1

Canonical state includes digital employees, contacts, conversations, messages, qualification work, approvals and audit records. Private state includes inbound receipts and outbound-attempt/idempotency state.

### Core runtime database boundary V1

`wandora_core_runtime` is live with:

```text
LOGIN true
CONNECTION LIMIT 4
SUPERUSER false
CREATEDB false
CREATEROLE false
INHERIT false
REPLICATION false
BYPASSRLS false
```

Its password exists only in an operator-controlled secret file. Every organization-scoped Core transaction sets `wandora.organization_id` transaction-locally and RLS independently enforces tenant isolation.

### Security gate #22

The previously affected shared Supabase JWT compatibility material and shared PostgreSQL password were rotated. Old values are invalid and historical copies are recovery evidence only.

### Messaging Gateway → Core Supervised V1

Provider-side ingress uses Evolution per-instance JWT HS256. Gateway → Core uses a distinct HMAC-SHA256 secret. Unsupported provider events are ignored or rejected before canonical state.

Raw Evolution instance/API-key/server-url/provider payload semantics do not cross the provider-neutral Core contract.

### Core → Mastra Deterministic Supervised Proposal V1

ADR 0014 is live. Mastra is loaded only behind Wandora's `AgentRuntime` adapter. Framework telemetry is forced off.

The deterministic runtime receives only normalized customer text and returns a Wandora-owned proposal:

```text
kind: send-text
commitment: none
text: deterministic qualification proposal
rationale: Wandora-owned explanation
```

No real model credential is configured or needed.

### Canonical Supervised Work Proposal V1 — LIVE

ADR 0016 is implemented and live.

Merged implementation:

```text
PR #36
main: 79b5b08266acb0e92d65af3a7c7f547558e9cf6d
migration: 20260915_004_supervised_proposal_v1.sql
Core image: wandora/core:canonical-proposal-79b5b082
```

`wandora.work_proposals` is now the canonical product state for safe employee proposals awaiting human supervision.

V1 invariants:

- only `commitment=none` can enter `work_proposals`;
- discounts, special prices, delivery deadlines, payment terms and contractual commitments remain on `wandora.approvals`;
- proposal insert + work transition to `attention-required` + receipt completion occur atomically;
- `authenticated` has no direct table privilege;
- `wandora_core_runtime` has SELECT + INSERT only;
- Core RLS requires tenant scope;
- one normalized inbound event can produce at most one canonical proposal;
- the browser must consume a tenant-authorized Core projection, never this table or private receipts directly.

Production migration procedure included a fresh logical backup, checksum validation, restored-schema rehearsal from `template0`, live application and structural verifier:

```text
SUPERVISED_PROPOSAL_V1_LIVE_OK
```

The new Core image was built from a 16/16 Git-blob-verified context, tested in a parallel private candidate and promoted with rollback available to the prior Mastra image.

Direct-Core and full Gateway live proofs both established:

```text
work: attention-required
proposal: exactly 1 / send-text / commitment none
receipt: completed / supervision-required
approvals: 0
outbound attempts: 0
outbound messages: 0
replay: idempotent
```

A provider-private sentinel injected into the full Gateway proof had zero hits in canonical receipt/message state.

## Current Auth evidence

Live Supabase Auth is `supabase/gotrue:v2.196.0`.

The public JWKS endpoint is available at the stable Supabase auth URL and currently exposes one **EC / ES256** signing key. Auth issuer/audience are:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

`auth.users` currently contains zero real users.

This allows the next Core human-auth slice to verify user sessions with public asymmetric JWKS material instead of giving Core `service_role` or a JWT signing secret.

## Next executable slice — Human Supervision Read V1

Goal: let a valid tenant human read `attention-required` work and the canonical proposal through Core, without provider/private-schema leakage and without any outbound action.

Reviewed direction:

1. browser obtains a Supabase Auth session;
2. Core validates Bearer JWT using ES256/JWKS, expected issuer and audience;
3. JWT `sub` maps to canonical Wandora user through a narrow Core identity-resolution boundary;
4. an organization ID supplied by the browser is only a selector, never authorization evidence;
5. Core opens the selected tenant scope and requires active organization + active membership;
6. Core returns a small Wandora-owned read projection joining work, employee, contact/conversation, latest inbound customer message and canonical proposal;
7. private receipts, provider IDs, source provider metadata and Mastra runtime IDs remain absent;
8. invalid token, unknown identity, cross-tenant access, suspended membership and suspended organization must all deny before Web integration;
9. the customer Web should expose the human API same-origin through its Nginx and the private `wandora-core` network, rather than creating a generic public Core hostname;
10. only the explicit reviewed human API path may be proxied; `/internal/v1/gateway/inbound` must remain private;
11. first Web integration target is `Trabalho`, then `Conversas`.

No send/edit-send/dismiss action belongs in this first read-only slice.

## Model provider status

The previously Git-exposed Mistral token is compromised and must never be reused. Do not request a replacement until the first real model call is materially required. Chutes remains deferred.

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization.
- Browser-supplied tenant IDs are selectors only after canonical membership authorization.
- Do not give Core `service_role` or a JWT signing secret just to validate human sessions.
- Private receipt state is not a customer-facing proposal model.
- `work_proposals` is canonical, but direct browser DB access remains forbidden.
- Sensitive/commitment-bearing employee actions remain on the stronger approval boundary.
- `wandora_core_runtime` must not be replaced with a broader role to simplify integration.
- Core remains private; do not expose a generic Core hostname merely for Web access.
- Provider/runtime identifiers never become public Wandora identities without an explicit boundary decision.
- Git is never a secret store.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and this file. Security gate #22, least-privilege Core DB activation, private Messaging Gateway → Core ingress, Mastra deterministic supervision and canonical `wandora.work_proposals` are live. Core image is `wandora/core:canonical-proposal-79b5b082`; Gateway is `wandora/messaging-gateway:inbound-v1-2a49c066`; both are private and healthy. Migration 004 is live and verified. Full Gateway replay proof shows exactly one safe canonical proposal and zero approvals/outbound effects, with provider-private sentinel absent from canonical state. Web remains mock. Live Auth exposes ES256 JWKS and has zero real users. The next slice is **Human Supervision Read V1**: verify Supabase human JWTs in Core using public JWKS, resolve canonical identity, enforce active tenant membership, prove denial cases, then expose only the reviewed human API path through `app.wandora.com.br` and connect `Trabalho` before `Conversas`. No real model token or outbound action is required yet.
