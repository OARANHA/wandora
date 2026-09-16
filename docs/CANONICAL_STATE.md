# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI and not a generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, Paperclip, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

The default SaaS path aims for useful supervised work on the same day. Every material decision follows **decision → second adversarial review → execution → validation** and is checked from both paying-customer and Wandora-owner/operator perspectives.

The second review is deliberately adversarial: assume the first decision may be wrong and search for a concrete reason it is too broad, unsafe, duplicated, irreversible or based on a weak/unproven premise. If a material objection is found, revise the decision and challenge it again before execution. Validation happens after execution and must prove the actual resulting state.

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

The shell displays canonical user/company identity rather than hard-coded preview identity.

`Trabalho`, the `Conversas` list and selected-conversation history are connected to canonical tenant-authorized Core contracts. `Trabalho` also contains the reviewed two-step Human Send UX and Canonical Confirmation V2 client contract, but the live runtime currently keeps real outbound disabled.

Other customer surfaces may still contain preview/product-contract placeholders and must not be described as real until their own reviewed contracts are live.

### Empresa Exemplo beta/demo boundary

A canonical `Empresa Exemplo` exists as production beta/demo data, not as a front-end fixture. It has a provisioned human owner, digital employee Ana and sample canonical conversation/work state.

The example messaging connection is deliberately kept separate from the provider-bound internal proof tenant. Empresa Exemplo remains non-sending and should not be mutated into a real provider test channel merely for convenience.

### Internal supervised-proof tenant

A separate internal organization exists for controlled Human Send proof work. The operator account has an explicit tenant membership there; that membership is not Platform Admin authority and does not weaken the tenant/platform separation.

The internal proof tenant owns the provider-bound conversation used for real supervised WhatsApp proof. Real personal destination data used for the controlled proof is not stored in Git/documentation.

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
        | Wandora ingress HMAC
        v
private Wandora Core

When explicitly enabled only:
Core -> directional outbound HMAC -> Messaging Gateway -> private Evolution API
```

Core and Messaging Gateway publish no host ports. Core has no generic public hostname.

Current live containers/images after Confirmation V2 promotion:

```text
Runtime application source head: a1ee475570c9314198068537003918a6022d8490
Core image:    wandora/core:canonical-confirm-a1ee4755
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

Pre-Confirmation-V2 rollback snapshot:

```text
/home/wandora-admin/backups/canonical-confirm-v2-20260916T061650Z
```

Previous live images recorded there:

```text
Core: wandora/core:human-send-capable-72b1c49a
Web:  wandora/web:send-confirmation-49a21303
```

Gateway was not changed by the Confirmation V2 promotion.

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

### Messaging Gateway → Core Supervised Ingress V1 — LIVE

Provider-side ingress uses Evolution per-instance JWT HS256. Gateway → Core uses a distinct HMAC-SHA256 secret. Unsupported provider events are ignored or rejected before canonical state.

Raw Evolution instance/API-key/server-url/provider payload semantics do not cross the provider-neutral Core contract.

### Core → Mastra Deterministic Supervised Proposal V1 — LIVE

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
- `wandora_core_runtime` has only reviewed privileges;
- Core RLS requires tenant scope;
- one normalized inbound event can produce at most one canonical proposal;
- the browser consumes tenant-authorized Core projections, never private receipts or Core-owned workflow tables directly.

### Human Supervision Read V1 — LIVE

ADR 0017 is implemented and active.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/work/attention-required
```

Core validates Supabase human Bearer sessions with public ES256/JWKS, expected issuer/audience and time checks. It does not receive `service_role` or JWT signing material for this purpose.

The response contains only Wandora-owned supervision context; private receipt/provider/runtime identifiers remain outside the browser contract.

### Human Session Bootstrap V1 — LIVE

ADR 0018 is implemented and active through:

```text
GET /api/v1/me
```

The response contains only canonical Wandora user identity plus active memberships in active organizations. Supabase external identity metadata is not returned as product identity.

Unknown external identities fail closed. A linked Wandora user with no active organizations receives `organizations: []`.

### Web Human Session V1 + Multi-Organization Selector V1 — LIVE

ADRs 0019 and 0024 are implemented and active.

The browser signs in directly to the stable Supabase Auth endpoint using only the public/publishable key. Public signup remains disabled. Web stores V1 session material in `sessionStorage`, refreshes through Supabase Auth and uses Bearer authorization for reviewed Core human routes.

Exactly one active organization may auto-select; zero gets an explicit empty state; multiple organizations require explicit human selection and never silently resolve by taking the first tenant.

### Conversations Read V1 — LIVE

ADR 0020 is implemented in PR #45 / main `ae6177a3732b58c2d6f14403f9dc029a174c1712` and remains part of the active customer read path.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/conversations
```

It returns at most 100 tenant-authorized conversation summaries ordered by canonical activity and deliberately excludes provider/private runtime state.

### Conversation Detail/History Read V1 — LIVE

ADR 0021 is implemented in PR #47 / main `2105f6e3c7f4ad07924210ccc039d5ff91ce5a79` and remains active inside the newer Core/Web images.

Reviewed route:

```text
GET /api/v1/organizations/:organizationId/conversations/:conversationId
```

It returns canonical authorized conversation/contact/active-assignment context plus up to the latest 100 canonical messages, ordered oldest → newest for display, with `hasEarlierMessages=true` when older history exists.

V1 invariants remain:

- organization authorization happens before conversation lookup;
- browser organization/conversation IDs are selectors only;
- foreign/missing conversation inside an authorized organization returns generic `404`;
- tenant-scoped human reads run under `REPEATABLE READ READ ONLY`, transaction-local tenant scope and RLS;
- source/provider/private identifiers remain absent;
- no generic free-text composer is part of this read route.

`Conversas` remains read-only even though a separately reviewed supervised send exists in `Trabalho`.

### Private Messaging Gateway Outbound V1 — CODE LIVE, SWITCH OFF

ADR 0022 is implemented.

Private route:

```text
POST /internal/v1/core/outbound/text
```

Core → Gateway uses a dedicated directional HMAC distinct from ingress/provider credentials. The Gateway accepts only its configured canonical Wandora connection and a private pinned Evolution target. Provider-native identifiers never enter the browser/Core result contract.

When `WANDORA_GATEWAY_OUTBOUND_ENABLED` is absent/false, the route is structurally unavailable and outbound-only secrets are not required by the running process.

### Evolution Private Outbound Origin V1 — LIVE

ADR 0025 fixed the first controlled outbound proof's CORS failure without widening CORS globally.

Gateway outbound sends the code-pinned internal Origin:

```text
http://wandora-messaging-gateway:8787
```

Evolution accepts that exact internal Origin; wildcard CORS remains forbidden. The earlier ambiguous attempts remain historical evidence and are not reset/retried.

### Human Send Proposal V1 — CODE LIVE, SWITCH OFF

ADR 0023 is implemented, including migration `007` human linkage for outbound attempts and the exact reviewed Web/Core route:

```text
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
```

When explicitly enabled, V1 permits only an existing canonical `send-text`, `commitment=none` proposal that is current, latest-inbound aligned and attached to active tenant/work/conversation/employee/connection state. `owner`/`admin` human authorization is required.

The browser cannot choose text, recipient, connection, provider or idempotency key. The Core records durable human/proposal linkage before external effect and preserves conservative `uncertain` semantics.

### Human Send Explicit Confirmation V1 — LIVE UX

ADR 0026 introduced two explicit human steps:

```text
Revisar e enviar
Confirmar e enviar
```

The first click cannot call the send endpoint. Post-success feedback remains visible even when the work item leaves `attention-required`.

### Human Send Canonical Confirmation V2 — LIVE CODE, SWITCH OFF

ADR 0027 is production-deployed through Core PR #58 and Web PR #59, runtime application source head:

```text
a1ee475570c9314198068537003918a6022d8490
```

For `state=ready`, Core owns the reviewed confirmation snapshot:

```text
recipientMasked
text
version = sha256:<64 hex>
```

The fingerprint binds effect-critical canonical state and authenticated human actor. Web freezes the reviewed snapshot locally. The final POST may carry only `confirmationVersion`; it does not carry recipient/text/provider/connection overrides.

At send time Core reauthenticates/re-authorizes, reloads canonical state and compares the fingerprint before creating any durable attempt. Malformed/widened confirmation bodies fail closed; a valid but outdated version fails `confirmation-stale` before Gateway/provider effect.

The V2 deployment validation proved:

```text
Core /healthz = 200
Core /readyz  = 200
GET /api/v1/me without Bearer = 401
reviewed Trabalho route without Bearer = 401
unreviewed /api route = 404
Web /internal route = 404
live bundle contains confirmationVersion + stale UX + send-success feedback
```

No new outbound attempt/message was created by candidate or deployment work.

See `docs/infra/human-send-canonical-confirmation-v2-live.md`.

## Controlled outbound evidence — historical and immutable

The internal proof path produced one real successful human-supervised WhatsApp delivery to an explicitly authorized handset before Confirmation V2 deployment. The delivered proof message was observed on the handset and Core persisted one canonical outbound message.

At the time of Confirmation V2 post-promotion validation:

```text
outbound_attempts total = 3
uncertain              = 2
succeeded              = 1
canonical outbound messages = 1
```

The two `uncertain` attempts predate Confirmation V2 candidate/promotion work and are not blindly retryable. The one `succeeded` attempt is the controlled real delivery proof. No provider/private destination data is recorded in Git documentation.

This replaces the old global `outbound_attempts=0 / outbound_messages=0` statement, which was true only for earlier read-only/proposal foundation proofs.

## Current Auth evidence

Live Supabase Auth is `supabase/gotrue:v2.196.0` and publishes an **EC / ES256** signing key through its stable JWKS endpoint.

Auth issuer/audience are:

```text
issuer: https://supabase.wandora.com.br/auth/v1
audience: authenticated
```

A provisioned beta Auth identity is linked to canonical tenant memberships. Do not put passwords, access tokens, refresh tokens, real phone numbers or private identity metadata into Git/operator notes.

## Current customer API allow-list

Wandora Web Nginx may expose only the exact reviewed customer routes:

```text
GET  /api/v1/me
GET  /api/v1/organizations/:organizationId/work/attention-required
POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send
GET  /api/v1/organizations/:organizationId/conversations
GET  /api/v1/organizations/:organizationId/conversations/:conversationId
```

It forwards `Authorization`, strips cookies before Core and leaves generic/unreviewed `/api/` plus all `/internal/` routes closed. The Human Send POST allow-list entry does not activate Human Send; capability activation remains a separate Core/Gateway runtime decision.

## Current executable next step

The immediate product gate is **not** to redesign outbound again. The Human Send/Confirmation V2 contract is already deployed.

Before normal beta outbound can be enabled, run one separately reviewed controlled Confirmation V2 activation proof:

1. decision — define the exact controlled proof and its allowed tenant/connection;
2. second adversarial review — actively seek a reason activation is wrong/unsafe/duplicated or based on stale assumptions;
3. execution — enable only the existing reviewed Core/Gateway overlays if the adversarial review fails to invalidate activation;
4. validation — prove the exact confirmation shown to the human matches the Core effect, exactly one provider delivery occurs, durable audit/state are correct, and switches are returned to the intended final state.

Do not reuse historical `uncertain` attempts. Do not broaden provider bindings or convert Empresa Exemplo into the proof channel.

Only after that V2 end-to-end proof should a normal-beta outbound policy be chosen. Autonomous customer traffic remains out of scope.

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

> Read `AGENTS.md`, accepted ADRs through ADR 0027, `docs/architecture.md`, this file and `docs/infra/human-send-canonical-confirmation-v2-live.md`. Security gate #22, least-privilege Core DB activation, private Messaging Gateway → Core ingress, Mastra deterministic supervision, canonical `wandora.work_proposals`, Human Supervision Read, Human Session, explicit multi-organization selection, Conversations list/history, private Gateway outbound, Human Send Proposal and Canonical Confirmation V2 are implemented. Production currently runs Core `wandora/core:canonical-confirm-a1ee4755`, Web `wandora/web:canonical-confirm-a1ee4755` and Gateway `wandora/messaging-gateway:origin-fix-94cfb4de`; all are healthy. Human Send and Gateway outbound enable flags are currently absent, so real outbound is OFF. Historical controlled proof state is 3 outbound attempts (2 uncertain, 1 succeeded) and 1 canonical outbound message; do not retry uncertain attempts. Generic/unreviewed `/api/` and all Web `/internal/` paths remain closed. The next gate is a separately reviewed controlled Confirmation V2 activation proof, using **decision → second adversarial review → execution → validation**. Do not ask the user to reconstruct already-recorded decisions and do not enable autonomous outbound.
