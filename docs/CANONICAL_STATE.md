# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-15**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI and not a generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, Paperclip, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

The default SaaS path aims for useful supervised work on the same day. Every material decision follows **decision → second review → execution** and is checked from both paying-customer and Wandora-owner/operator perspectives.

## Human experience — CURRENT

Public customer application:

- `https://app.wandora.com.br`
- public login at `/login`;
- public start/preview route at `/start` remains available where intentionally preserved.

Navigation remains `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The browser session path is real:

1. an already-provisioned user signs in against Supabase Auth;
2. Web keeps V1 session material in `sessionStorage`;
3. Web calls same-origin `/api/v1/me` with Bearer authorization;
4. Core validates ES256/JWKS, resolves canonical Wandora identity and returns active organizations;
5. with exactly one active organization, Web selects it automatically;
6. tenant reads still independently re-check active organization + active membership in Core under transaction-local tenant scope and RLS.

The shell displays canonical user/company identity rather than hard-coded preview identity.

`Trabalho`, the `Conversas` list and the selected-conversation history are connected to canonical tenant-authorized Core reads. Other customer surfaces may still contain preview/product-contract placeholders and must not be described as real until their own reviewed contracts are live.

### Empresa Exemplo beta proof

A canonical `Empresa Exemplo` exists as production beta/demo data, not as a front-end fixture. It has a provisioned human owner, digital employee Ana and sample canonical conversation/work state.

The example messaging connection has no provider binding, so the example cannot accidentally route to Evolution.

The authenticated browser proof succeeded with canonical shell identity, canonical conversation list and canonical read-only history for `Mariana Exemplo` / `Ana`.

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
- React 19 + Vite + TanStack Router/Query — customer Web.
- Model providers — replaceable infrastructure; no real model provider is required by the current deterministic live path.

## Current live topology

```text
Human browser
   |\
   | \-> Supabase Auth (identity/session only)
   |
   v
app.wandora.com.br / Wandora Web
   |
   | exact reviewed /api/v1 routes only
   v
private Wandora Core
   |
   +--> wandora_core_runtime + tenant scope + RLS
   +--> Mastra deterministic Agent Runtime
   v
Supabase PostgreSQL

WhatsApp / Evolution
        |
        | provider JWT
        v
Wandora Messaging Gateway
        |
        | Wandora HMAC
        v
private Wandora Core
```

Core and Messaging Gateway publish no host ports. Core has no generic public hostname.

Current live containers/images:

```text
Core image:    wandora/core:conversation-history-2105f6e3
Web image:     wandora/web:conversation-history-2105f6e3
Gateway image: wandora/messaging-gateway:inbound-v1-2a49c066
Core networks: wandora-core + wandora-data
Web networks:  wandora-edge + wandora-core
Gateway net:   wandora-core
Core health:   200
Core ready:    200
Web health:    200
Gateway health: 200
```

Core/Gateway run non-root with read-only root filesystems, `cap_drop=ALL` and `no-new-privileges`. Core secrets are mounted from operator-controlled files.

Rollback preserved for the Conversation Detail/History Read V1 activation:

```text
Core previous: wandora/core:conversations-read-ae6177a3
Web previous:  wandora/web:conversations-read-ae6177a3
Operator snapshot: /home/wandora-admin/backups/conversation-history-20260915T214558Z
```

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

The canonical production Core database secret file is `wandora_core_db_password`; candidate/recreate procedures must not substitute a legacy host filename.

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

ADR 0016 is implemented and live through migration `20260915_004_supervised_proposal_v1.sql`.

`wandora.work_proposals` is the canonical product state for safe employee proposals awaiting human supervision.

V1 invariants:

- only `commitment=none` can enter `work_proposals`;
- discounts, special prices, delivery deadlines, payment terms and contractual commitments remain on `wandora.approvals`;
- proposal insert + work transition to `attention-required` + receipt completion occur atomically;
- `authenticated` has no direct table privilege;
- `wandora_core_runtime` has SELECT + INSERT only where reviewed;
- Core RLS requires tenant scope;
- one normalized inbound event can produce at most one canonical proposal;
- the browser consumes tenant-authorized Core projections, never private receipts or Core-owned workflow tables directly.

Direct-Core and full Gateway live proofs established:

```text
work: attention-required
proposal: exactly 1 / send-text / commitment none
receipt: completed / supervision-required
approvals: 0
outbound attempts: 0
outbound messages: 0
replay: idempotent
```

### Human Supervision Read V1 — LIVE

ADR 0017 is implemented and active.

Core validates Supabase human Bearer sessions with public ES256/JWKS, expected issuer/audience and time checks. It does not receive `service_role` or JWT signing material for this purpose.

The reviewed tenant route is:

```text
GET /api/v1/organizations/:organizationId/work/attention-required
```

It returns only Wandora-owned supervision context needed by `Trabalho` and exposes no private receipt/provider/Mastra runtime identifiers.

### Human Session Bootstrap V1 — LIVE

ADR 0018 is implemented and active through:

```text
GET /api/v1/me
```

The response contains only canonical Wandora user identity plus active memberships in active organizations. Supabase external identity metadata is not returned as product identity.

Unknown external identities fail closed. A linked Wandora user with no active organizations receives `organizations: []`.

### Web Human Session V1 — LIVE

ADR 0019 is implemented and active.

The browser signs in directly to the stable Supabase Auth endpoint using only the public/publishable key. Public signup remains disabled. Web stores V1 session material in `sessionStorage`, refreshes through Supabase Auth and uses Bearer authorization for reviewed Core human routes.

Exactly one active organization is auto-selected; zero gets an explicit empty state; multiple organizations are never silently resolved by taking the first tenant.

`Trabalho` reads real canonical data. No send/edit-send/dismiss/outbound action is exposed by this slice.

### Conversations Read V1 — LIVE

ADR 0020 is implemented in PR #45 / main `ae6177a3732b58c2d6f14403f9dc029a174c1712` and remains part of the active customer read path.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/conversations
```

It returns at most 100 tenant-authorized conversation summaries ordered by canonical activity:

- canonical conversation ID/status/activity time;
- canonical contact ID/business-facing label;
- latest canonical message direction/text/time when present;
- latest active work-assignment employee ID/name when present.

It deliberately does not expose unread/read state, provider bindings, provider payloads, receipt internals, outbound-attempt state or Mastra runtime identifiers.

### Conversation Detail/History Read V1 — LIVE

ADR 0021 is implemented in PR #47 / main `2105f6e3c7f4ad07924210ccc039d5ff91ce5a79` and production-active through Core/Web image `conversation-history-2105f6e3`.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

It returns canonical authorized conversation/contact/active-assignment context plus up to the latest 100 canonical messages, ordered oldest → newest for display, with `hasEarlierMessages=true` when older history exists.

V1 invariants:

- organization authorization happens before conversation lookup;
- browser organization/conversation IDs are selectors only;
- foreign/missing conversation inside an authorized organization returns generic `404`;
- tenant-scoped human reads run under `REPEATABLE READ READ ONLY`, transaction-local tenant scope and RLS;
- source/provider/private identifiers remain absent;
- no message ID is exposed because V1 has no action requiring one;
- no composer, reply, send, edit-send, dismiss, takeover or approval action is exposed.

Authenticated production proof established:

```text
GET /api/v1/me = 200
GET /api/v1/organizations/<Empresa Exemplo>/conversations = 200
GET /api/v1/organizations/<Empresa Exemplo>/conversations/<conversation> = 200
UI = Mariana Exemplo + Ana + canonical received history + Somente leitura
```

Post-read no-side-effect proof:

```text
approvals = 0
outbound_attempts = 0
outbound_messages = 0
provider_bindings = 0
```

See `docs/infra/conversation-history-live-v1.md`.

## Current Auth evidence

Live Supabase Auth is `supabase/gotrue:v2.196.0` and publishes an **EC / ES256** signing key through its stable JWKS endpoint.

Auth issuer/audience are:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

A provisioned beta Auth identity is linked to the canonical Empresa Exemplo owner. Do not put the user's password, access token, refresh token or private identity metadata into Git or operator notes.

## Current customer API allow-list

Wandora Web Nginx may expose only the exact reviewed customer routes:

```text
GET /api/v1/me
GET /api/v1/organizations/:organizationId/work/attention-required
GET /api/v1/organizations/:organizationId/conversations
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

It forwards `Authorization`, strips cookies before Core and leaves generic/unreviewed `/api/` plus all `/internal/` routes closed. The nearby unreviewed `/conversations/:conversationId/messages` path remains `404`.

## Next executable slice — Human Conversation Response Action V1

The customer now has enough canonical context to inspect the recent conversation before deciding on a response. The next product-path slice must remain separately reviewed because it is the first customer-facing outbound-effect boundary.

Required design direction:

1. define the exact human action vocabulary first — e.g. send proposal as-is, edit-then-send, dismiss/no-send — without silently adding autonomous behavior;
2. require the existing ES256/JWKS human session and independent active organization/membership authorization;
3. bind any send action to canonical conversation/work/proposal state rather than provider IDs;
4. define idempotency before calling the Messaging Gateway;
5. create durable Wandora audit evidence for human decision and outbound attempt/result;
6. preserve conservative `delivery-uncertain` behavior and reconciliation; never blind-retry an unknown provider outcome;
7. keep discounts, prices, delivery deadlines, payment terms and contractual commitments on the stronger approval boundary;
8. expose only exact reviewed Web action routes; generic `/api/` and all `/internal/` paths stay closed;
9. prove cross-tenant, suspended-state, replay/idempotency and uncertain-delivery behavior in disposable tests before production;
10. do not enable autonomous customer traffic as part of the first human response slice.

## Model provider status

The previously Git-exposed Mistral token is compromised and must never be reused. Do not request a replacement until the first real model call is materially required. Chutes remains deferred.

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization.
- Browser-supplied tenant/conversation IDs are selectors only after canonical membership authorization.
- Do not give Core `service_role` or a JWT signing secret merely to validate human sessions.
- Private receipt state is not a customer-facing proposal model.
- `work_proposals` is canonical, but direct browser DB access remains forbidden.
- Sensitive/commitment-bearing employee actions remain on the stronger approval boundary.
- `wandora_core_runtime` must not be replaced with a broader role to simplify integration.
- Core remains private; do not expose a generic Core hostname merely for Web access.
- Provider/runtime identifiers never become public Wandora identities without an explicit boundary decision.
- Git is never a secret store.
- Read slices do not silently grow outbound effects.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs through ADR 0021, `docs/architecture.md` and this file. Security gate #22, least-privilege Core DB activation, private Messaging Gateway → Core ingress, Mastra deterministic supervision, canonical `wandora.work_proposals`, Human Supervision Read V1, Human Session Bootstrap V1, Web Human Session V1, Conversations Read V1 and Conversation Detail/History Read V1 are live. Core and Web currently run `conversation-history-2105f6e3`; Gateway remains `inbound-v1-2a49c066`. Authenticated Empresa Exemplo browser proof is green: `/api/v1/me=200`, conversations list `=200`, conversation detail `=200`, canonical Mariana/Ana history renders as `Somente leitura`, and approvals/outbound attempts/outbound messages/provider bindings all remain zero. Generic `/api/` and `/internal/` paths remain closed. The next product-path slice is a separately reviewed human conversation response action contract. Do not add outbound/autonomous behavior or a model token implicitly.
