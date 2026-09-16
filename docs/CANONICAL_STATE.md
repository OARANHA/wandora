# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI and not a generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, Paperclip, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

Every material decision follows **decision → second adversarial review → execution → validation** and is checked from both paying-customer and Wandora-owner/operator perspectives.

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
5. exactly one active organization may auto-select;
6. with multiple active organizations, no tenant is silently chosen and the human must explicitly select one;
7. the explicit selection is stored only in `sessionStorage` and revalidated against canonical `/api/v1/me`;
8. tenant reads/actions independently re-check active organization + active membership in Core under transaction-local tenant scope and RLS.

`Trabalho`, `Conversas` list and selected-conversation history are connected to canonical tenant-authorized Core contracts. `Trabalho` contains the reviewed two-step Human Send UX and Canonical Confirmation V2 client contract. Runtime outbound is currently OFF after a successful controlled proof.

Other customer surfaces may still contain preview/product-contract placeholders and must not be described as real until their own reviewed contracts are live.

### Empresa Exemplo beta/demo boundary

A canonical `Empresa Exemplo` exists as production beta/demo data, not as a front-end fixture. It has a provisioned human owner, digital employee Ana and sample canonical conversation/work state.

The example messaging connection remains separate from the provider-bound internal proof tenant. Empresa Exemplo remains non-sending and should not be mutated into a real provider test channel merely for convenience.

### Internal supervised-proof tenant

A separate internal organization exists for controlled Human Send proof work. The operator account has explicit tenant membership there; that membership is not Platform Admin authority.

The internal proof tenant owns the provider-bound conversation used for real supervised WhatsApp proof. Real personal destination data is not stored in Git/documentation.

## Platform administration direction — ACCEPTED

ADR 0015 accepts **Wandora Platform Admin** as the first-party owner/operator control plane.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain strongly protected engineering/diagnostics/emergency tools. They are not the normal daily administration workflow and are never a customer dependency.

Customer administration and Platform Admin are separate trust planes.

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
        | Wandora ingress HMAC
        v
private Wandora Core

Only when explicitly enabled:
Core -> directional outbound HMAC -> Messaging Gateway -> private Evolution API
```

Core and Messaging Gateway publish no host ports. Core has no generic public hostname.

Current live containers/images after ADR 0028 promotion and controlled Confirmation V2 proof cleanup:

```text
Core image:    wandora/core:inbound-reopen-384bfee6
Web image:     wandora/web:canonical-confirm-a1ee4755
Gateway image: wandora/messaging-gateway:origin-fix-94cfb4de
Core networks: wandora-core + wandora-data
Web networks:  wandora-edge + wandora-core
Gateway net:   wandora-core
Core health:   healthy / healthz 200 / readyz 200
Web health:    healthy / healthz 200
Gateway health: healthy
Human Send runtime flag: absent
Gateway outbound runtime flag: absent
```

Core/Gateway run non-root with read-only root filesystems, `cap_drop=ALL` and `no-new-privileges`. Core secrets are mounted from operator-controlled files.

## Completed/live foundations

### Supabase Foundation V1

PostgreSQL is non-public. Supavisor remains localhost-only. Supabase is data/auth infrastructure rather than the Wandora business backend.

### Core multi-tenant/auth contract V1

ADR 0007 freezes canonical `organization`, `user`, `user_identity`, `membership` and provider-neutral `messaging_connection` semantics. Initial tenant roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

### Ana durable Core vertical slice V1

Canonical state includes digital employees, contacts, conversations, messages, qualification work, approvals and audit records. Private state includes inbound receipts and outbound-attempt/idempotency state.

### Core runtime database boundary V1

`wandora_core_runtime` is live with least privilege, connection limit 4, no `BYPASSRLS`, and transaction-local tenant scope. Its password exists only in an operator-controlled secret file.

The canonical production Core database secret file is `wandora_core_db_password`; candidate/recreate procedures must not substitute a legacy host filename.

### Security gate #22

The previously affected shared Supabase JWT compatibility material and shared PostgreSQL password were rotated. Old values are invalid and historical copies are recovery evidence only.

### Messaging Gateway → Core Supervised Ingress V1 — LIVE

Provider-side ingress uses Evolution per-instance JWT HS256. Gateway → Core uses a distinct HMAC-SHA256 secret. Unsupported provider events are ignored or rejected before canonical state.

Raw Evolution instance/API-key/server-url/provider payload semantics do not cross the provider-neutral Core contract.

### Core → Mastra Deterministic Supervised Proposal V1 — LIVE

ADR 0014 is live. Mastra is loaded only behind Wandora's `AgentRuntime` adapter. Framework telemetry is forced off.

The deterministic runtime returns Wandora-owned `send-text`, `commitment=none` proposals. No real model credential is configured or needed.

### Canonical Supervised Work Proposal V1 — LIVE

ADR 0016 is implemented and live through migration `20260915_004_supervised_proposal_v1.sql`.

`wandora.work_proposals` is the canonical product state for safe employee proposals awaiting human supervision.

Invariants:

- only `commitment=none` can enter `work_proposals`;
- stronger commitments remain on `wandora.approvals`;
- proposal insert + work transition to `attention-required` + receipt completion occur atomically;
- `authenticated` has no direct table privilege;
- Core RLS requires tenant scope;
- one normalized inbound event can produce at most one canonical proposal;
- browser consumes tenant-authorized Core projections, never private receipts or Core-owned workflow tables directly.

### ADR 0028 — Active supervised work reuse — LIVE

ADR 0028 is implemented in PR #62 / main `384bfee6b340b18d0206ad5e7f9227c0250e3673`.

For a new supervised inbound attached to an existing active work:

- `in-progress` is accepted;
- `attention-required` is accepted;
- `waiting-customer` is accepted;
- all three terminate atomically in `attention-required` with a new canonical proposal;
- the same work is reused rather than duplicated;
- `waiting-approval` remains deliberately fail-closed.

A real WhatsApp inbound that previously produced a canonical `422` was reprocessed after live promotion through the existing private Gateway → Core path, without manual SQL repair.

Observed proof:

```text
receipt            = completed
event_messages     = 1
event_proposals    = 1
conversation_works = 1
work_status        = attention-required
outbound_attempts  = 3
outbound_messages  = 1
```

This proves no duplicate inbound message, no duplicate work and no outbound side effect during replay.

### Human Supervision Read V1 — LIVE

ADR 0017 is active through:

```text
GET /api/v1/organizations/:organizationId/work/attention-required
```

Core validates Supabase human Bearer sessions with public ES256/JWKS, expected issuer/audience and time checks. Private receipt/provider/runtime identifiers remain outside the browser contract.

### Human Session Bootstrap V1 — LIVE

ADR 0018 is active through:

```text
GET /api/v1/me
```

The response contains only canonical Wandora user identity plus active memberships in active organizations.

### Web Human Session V1 + Multi-Organization Selector V1 — LIVE

ADRs 0019 and 0024 are implemented and active.

Exactly one active organization may auto-select; zero gets an explicit empty state; multiple organizations require explicit human selection and never silently resolve by taking the first tenant.

### Conversations Read V1 — LIVE

ADR 0020 remains active through:

```text
GET /api/v1/organizations/:organizationId/conversations
```

It returns at most 100 tenant-authorized conversation summaries ordered by canonical activity and excludes provider/private runtime state.

### Conversation Detail/History Read V1 — LIVE

ADR 0021 remains active through:

```text
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

It returns authorized canonical conversation/contact/active-assignment context plus up to the latest 100 canonical messages, oldest → newest, with `hasEarlierMessages=true` when applicable.

`Conversas` remains read-only even though supervised send exists separately in `Trabalho`.

### Private Messaging Gateway Outbound V1 — CODE LIVE, SWITCH OFF

ADR 0022 defines:

```text
POST /internal/v1/core/outbound/text
```

Core → Gateway uses a dedicated directional HMAC distinct from ingress/provider credentials. The Gateway accepts only its configured canonical Wandora connection and private pinned Evolution target.

When `WANDORA_GATEWAY_OUTBOUND_ENABLED` is absent/false, the route is structurally unavailable and outbound-only secrets are not required by the running process.

### Evolution Private Outbound Origin V1 — LIVE

ADR 0025 pins the internal Gateway Origin:

```text
http://wandora-messaging-gateway:8787
```

Evolution accepts that exact internal Origin; wildcard CORS remains forbidden. Earlier ambiguous attempts remain historical evidence and are not reset/retried.

### Human Send Proposal V1 — CODE LIVE, SWITCH OFF

ADR 0023 is implemented, including migration `007` human linkage for outbound attempts and the reviewed route:

```text
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
```

When enabled, V1 permits only an existing canonical `send-text`, `commitment=none` proposal that is current, latest-inbound aligned and attached to active tenant/work/conversation/employee/connection state. `owner`/`admin` human authorization is required.

The browser cannot choose text, recipient, connection, provider or idempotency key.

### Human Send Explicit Confirmation V1 — LIVE UX

ADR 0026 introduced two explicit human steps:

```text
Revisar e enviar
Confirmar e enviar
```

The first click cannot call the send endpoint.

### Human Send Canonical Confirmation V2 — LIVE CODE, SWITCH OFF AFTER PROOF

ADR 0027 is production-deployed through Core PR #58 and Web PR #59.

For `state=ready`, Core owns the reviewed confirmation snapshot:

```text
recipientMasked
text
version = sha256:<64 hex>
```

The fingerprint binds effect-critical canonical state and authenticated human actor. Web freezes the reviewed snapshot locally. The final POST may carry only `confirmationVersion`.

At send time Core reauthenticates/re-authorizes, reloads canonical state and compares the fingerprint before creating any durable attempt. Malformed/widened confirmation bodies fail closed; stale versions fail before provider effect.

### Controlled Confirmation V2 activation proof — COMPLETE

The separately reviewed end-to-end proof requested by the previous handoff is now complete.

After ADR 0028 live replay, the canonical proposal remained `commitment=none`. Gateway outbound was enabled first; Core Human Send was enabled second. Both services returned healthy and merely enabling the switches created no outbound effect.

The human then reviewed and explicitly confirmed the Canonical Confirmation V2 snapshot in Wandora Web. The WhatsApp message was observed on the authorized handset.

Post-send canonical state:

```text
outbound_attempts total = 4
canonical outbound messages = 2
new attempt status = succeeded
work status = waiting-customer
```

The new successful attempt is durably linked to the exact canonical proposal, same work and source inbound event. The proposal remained `commitment=none`.

After proof completion, both effect switches were returned to fail-closed:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

Evidence:

- `docs/infra/human-send-canonical-confirmation-v2-live.md`
- `docs/infra/inbound-reopen-confirmation-v2-live-20260916.md`
- PR #63 / main `2f3e8933b5479854a561c127788124cd2c67bbc2`

## Controlled outbound evidence — historical and immutable

Current production evidence:

```text
outbound_attempts total = 4
uncertain              = 2
succeeded              = 2
canonical outbound messages = 2
```

The two `uncertain` attempts are historical and are not blindly retryable. The two `succeeded` attempts are controlled real human-supervised deliveries. No provider/private destination data is recorded in Git documentation.

## Current Auth evidence

Live Supabase Auth is `supabase/gotrue:v2.196.0` and publishes an EC / ES256 signing key through its stable JWKS endpoint.

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

Do not put passwords, access tokens, refresh tokens, real phone numbers or private identity metadata into Git/operator notes.

## Current customer API allow-list

Wandora Web Nginx may expose only the exact reviewed customer routes:

```text
GET  /api/v1/me
GET  /api/v1/organizations/:organizationId/work/attention-required
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
GET  /api/v1/organizations/:organizationId/conversations
GET  /api/v1/organizations/:organizationId/conversations/:conversationId
```

It forwards `Authorization`, strips cookies before Core and leaves generic/unreviewed `/api/` plus all `/internal/` routes closed. The Human Send POST allow-list entry does not activate Human Send.

## Current executable next step

The ADR 0028 live replay and the separately reviewed Confirmation V2 end-to-end proof are **complete**. Do not repeat them and do not redesign the same outbound boundary without new evidence.

The next product decision is to define the **smallest normal-beta outbound policy** on top of the proven supervised contract while keeping autonomous outbound out of scope.

Decision criteria for that slice:

1. preserve explicit human confirmation for external effects;
2. keep Human Send/Gateway outbound disabled by default until the selected beta policy deliberately activates them;
3. do not broaden provider bindings or tenant scope merely for convenience;
4. do not retry historical `uncertain` attempts;
5. preserve one durable attempt per canonical proposal and conservative uncertain semantics;
6. keep stronger commitments on `wandora.approvals`;
7. prefer the smallest reversible operational policy before adding more features;
8. separately evaluate whether Platform Admin, onboarding/account recovery, or a model-backed Ana produces more customer value than expanding outbound autonomy.

The next implementation slice should be chosen only after this policy decision and its second adversarial review. Autonomous customer traffic remains out of scope.

## Model provider status

The previously Git-exposed Mistral token is compromised and must never be reused. Do not request a replacement until the first real model call is materially required. Chutes remains deferred.

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization.
- Browser-supplied tenant/conversation/work/proposal IDs are selectors only after canonical authorization.
- Do not give Core `service_role` or a JWT signing secret merely to validate human sessions.
- Private receipt state is not a customer-facing proposal model.
- `work_proposals` is canonical, but direct browser DB access remains forbidden.
- Human Send browser requests cannot override recipient, text, provider, connection or idempotency key.
- Confirmation V2 fingerprinting is concurrency evidence, not authorization.
- Historical `uncertain` outbound attempts are never blindly retried.
- Sensitive/commitment-bearing employee actions remain on the stronger approval boundary.
- `wandora_core_runtime` must not be replaced with a broader role to simplify integration.
- Core remains private; do not expose a generic Core hostname merely for Web access.
- Provider/runtime identifiers never become public Wandora identities without an explicit boundary decision.
- Git is never a secret store.
- Exact reviewed Web routes only; generic `/api/` and all `/internal/` paths remain closed.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs through ADR 0028, `docs/architecture.md`, this file, `docs/infra/human-send-canonical-confirmation-v2-live.md` and `docs/infra/inbound-reopen-confirmation-v2-live-20260916.md`. Security gate #22, least-privilege Core DB activation, private Messaging Gateway → Core ingress, Mastra deterministic supervision, canonical `wandora.work_proposals`, Human Supervision Read, Human Session, explicit multi-organization selection, Conversations list/history, private Gateway outbound, Human Send Proposal, Canonical Confirmation V2 and ADR 0028 active-work reuse are implemented. Production currently runs Core `wandora/core:inbound-reopen-384bfee6`, Web `wandora/web:canonical-confirm-a1ee4755` and Gateway `wandora/messaging-gateway:origin-fix-94cfb4de`; all are healthy. Human Send and Gateway outbound enable flags are absent, so real outbound is OFF. Current historical proof state is 4 outbound attempts (2 uncertain, 2 succeeded) and 2 canonical outbound messages; never retry uncertain attempts blindly. The real ADR 0028 replay and Confirmation V2 handset delivery proof are complete and must not be repeated as the next gate. The next decision is the smallest normal-beta outbound policy versus the next higher-value product slice, using **decision → second adversarial review → execution → validation**. Do not ask the user to reconstruct already-recorded decisions and do not enable autonomous outbound.
