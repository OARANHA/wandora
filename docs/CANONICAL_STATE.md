# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-14**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI or generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, RLS, provider IDs, prompts and tokens remain implementation details.

The default SaaS path aims for useful work on the same day. Multi-day assisted implementation may exist as a premium service, but it is not the default dependency.

## Human experience — CURRENT

Public product preview:

- `https://app.wandora.com.br`
- `https://app.wandora.com.br/start`

The product owner has reviewed the current shell and accepted its direction. Customer navigation remains:

- **Início** — what is happening, results and what needs attention;
- **Equipe** — human/digital employees, responsibilities, work and autonomy;
- **Trabalho** — business work rather than technical workflows;
- **Conversas** — provider-neutral conversations;
- **Aprovações** — human decisions beyond employee autonomy;
- **Empresa** — organization administration: company data, people, knowledge, tools/connections and plan/billing.

The current-user menu, not `Empresa`, will own personal preferences, notifications, security and session actions.

The preview is still using mock/product-contract data. It must not be mistaken for a connected production customer account.

## Accepted technology roles

- Cloudflare — public edge/protection and preferred Access layer for privileged surfaces.
- Traefik — VPS ingress/reverse proxy.
- Docker Compose + Portainer — initial operations model; Git remains source of truth.
- Supabase self-hosted — PostgreSQL/Auth/data foundation, not Wandora business backend.
- Mastra — accepted initial Agent Runtime behind Wandora's adapter.
- Evolution API 2.3.7 — accepted initial WhatsApp provider behind Messaging Gateway.
- React 19 + Vite + TanStack Router/Query — accepted customer web shell.
- Model providers — replaceable behind a Wandora-owned boundary; Mistral is a candidate for the first low-cost real-model proof and Chutes/OpenAI remain options.

## Completed foundations

### Supabase Foundation V1 — COMPLETE

Pinned upstream: `self-hosted/v0.8.1` / `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

Public API and operator Studio hostnames are established. PostgreSQL/pooler remain non-public. Production hardening still includes Cloudflare Access for privileged surfaces, SMTP and off-host backup/restore drills.

### Mastra Agent Runtime V1 — COMPLETE

ADR 0005 accepts Mastra behind the provider-neutral Agent Runtime Adapter. Typed workflow/tool execution and adapter isolation were validated. Persistent runtime memory/observability/model-provider wiring remain later operational concerns and do not reopen the boundary.

### Evolution Messaging Gateway V1 — COMPLETE

ADR 0006 accepts Evolution 2.3.7 only behind Wandora's Messaging Gateway. Real inbound and real outbound WhatsApp handset proofs are green. Raw provider payloads/IDs/credentials remain private.

Production hardening still includes durable provider reconciliation, reconnect/backup observability and Cloudflare Access for Manager.

### Core multi-tenant/auth contract V1 — COMPLETE + LIVE DATABASE FOUNDATION

ADR 0007 freezes canonical `organization`, `user`, external identity mapping, `membership` and provider-neutral `messaging_connection` semantics. Initial human roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

Tenant isolation and provider-binding privacy were first proven on disposable Supabase PostgreSQL. The reviewed migration is now applied to the live Wandora Supabase PostgreSQL as part of the Ana V1 database foundation.

### Human Interface / Product Shell V1 — COMPLETE

ADR 0008 accepts React/Vite + TanStack Router/Query, Wandora-owned design language and Docker packaging. Public desktop/mobile browser smoke is green.

### First-Day Customer Journey V1 — COMPLETE

`/start` freezes the path: identify company → choose desired outcome → recommended employee → connect only required tool → teach essential facts → start supervised work.

Learning is progressive; transactional facts remain canonical structured state rather than conversational/model memory.

### Ana inbound new-contact contract V1 — COMPLETE

Ana's first responsibility is narrow: receive a normalized inbound WhatsApp contact, acknowledge/qualify using confirmed company context and keep one understandable qualification work item moving.

A new message does not automatically become a sales opportunity. Duplicate events cannot create duplicate work/sends. Discount, special price, delivery deadline, payment terms and contractual commitments require human approval.

## Ana durable Core vertical slice V1 — LIVE DATABASE FOUNDATION COMPLETE

ADR 0009 promotes the accepted contract into durable Wandora Core code and versioned PostgreSQL migrations.

New product package:

- `apps/core`

Versioned database assets:

- `infra/stacks/supabase/migrations/20260914_001_core_multitenant_auth_v1.sql`
- `infra/stacks/supabase/migrations/20260914_002_ana_vertical_slice_v1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql`

Durable canonical state covers:

- digital employees;
- contacts;
- conversations;
- messages;
- one active qualification work context;
- approvals;
- canonical Wandora audit records.

Private durable state covers normalized inbound-event receipts and outbound-attempt/idempotency state.

Safety semantics:

- tenant relationships use organization-scoped constraints;
- foreign or disabled messaging connections fail before customer-state creation;
- a paused Ana fails before customer-state creation;
- duplicate/in-progress inbound receipt handling is durable and collision-safe;
- the browser has no direct grants to Ana's internal Core tables;
- owner/admin may decide the current V1 commercial approval; another tenant cannot;
- unknown/ambiguous outbound delivery becomes `delivery-uncertain` and work becomes `attention-required`;
- an uncertain idempotency key is never automatically resent;
- runtime failure can mark the inbound receipt failed and allow a safe retry;
- provider/runtime identifiers do not become customer/audit identity.

Reproducible development evidence on 2026-09-14:

```text
ANA_DURABLE_CORE_STATE_V1_OK
Node v22.23.2
TypeScript strict: green
10/10 tests: green
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

### Live application evidence — 2026-09-14

Before live application, a fresh logical backup was created with restrictive file permissions. A logical snapshot of the live database was also restored into disposable `supabase/postgres:17.6.1.136`, where the exact reviewed migration blobs passed before any production write.

The exact live application completed with:

```text
MIGRATION_001_LIVE_OK
MIGRATION_002_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
SUPABASE_POST_MIGRATION_HEALTH_OK
ANA_LIVE_MIGRATION_V1_OK
```

Post-migration state:

```text
wandora tables: 12
wandora_private tables: 3
organizations: 0
contacts: 0
messages: 0
approvals: 0
```

No synthetic verifier data was inserted into production. The live verifier runs inside `SET TRANSACTION READ ONLY`.

Public post-migration smoke also remained correct:

```text
supabase.wandora.com.br root: HTTP 404 (intentional)
studio.wandora.com.br unauthenticated: HTTP 401
SUPABASE_PUBLIC_POST_MIGRATION_SMOKE_OK
```

The database schema is live, but the production Wandora Core service credential, Gateway-to-Core wiring, real Agent Runtime call and customer traffic are still pending.

## CI / decision discipline status

GitHub Actions `Core CI` is active for every pull request and push to `main`. It runs the disposable PostgreSQL migration/verifier path, the production-safe read-only verifier, strict TypeScript and the Ana Core integration tests.

`AGENTS.md` now requires a second-pass review before material product, architecture, infrastructure, security or deployment decisions are executed.

Branch protection requiring the CI check remains an administrative pending item because the currently available GitHub integration cannot mutate branch-protection settings. CI itself is active and green.

## Model provider / memory status

No usable Mistral token is configured or required yet. Current Core tests use deterministic/fake Agent Runtime implementations so business contracts can be proven without provider cost/credentials.

A previously supplied Mistral token was accidentally committed to Git. It was removed from the current repository tree and the path is now ignored, but Git history may retain it. That token is therefore compromised and must never be reused. When the first real supervised model call becomes materially necessary, revoke the old token, generate a fresh replacement and configure it only through an approved operator-controlled secret path — not Git and not chat.

Chutes subscription/token remains deferred until a concrete model/cost/privacy need justifies it.

Structured business facts remain PostgreSQL truth. Knowledge/RAG and employee experiential memory are separate concerns. Mastra Memory is the initial memory candidate; Letta may later be evaluated behind a Wandora-owned memory boundary if long-horizon evidence justifies it.

## Immediate next executable slice

**ANA SUPERVISED REAL-PATH WIRING V1**

Goal: connect the now-live durable database foundation to the already validated provider-neutral runtime and messaging boundaries without enabling unsupervised customer traffic.

Expected order:

1. provision a private, least-privilege production Wandora Core database role/credential path without exposing PostgreSQL;
2. wire normalized Messaging Gateway inbound events to Wandora Core;
3. wire the existing Mastra Agent Runtime Adapter using a deterministic/fake model path first where possible;
4. expose tenant-authorized Core reads/actions to Wandora Web;
5. prove a supervised real path end-to-end;
6. only then, if the first real model-backed Ana proposal is required, revoke the compromised Mistral token and configure a fresh token securely;
7. do not enable unsupervised production traffic until policy/operations explicitly approve it;
8. add real customer authentication/onboarding around the proven path;
9. add social login and broader integrations only when a validated customer workflow requires them.

## Human-experience guardrails

Before implementing a capability, answer:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization/tenant membership.
- Agent memory/RAG is not canonical storage for transactional facts.
- Provider identifiers never become public Wandora identities without an explicit boundary decision.
- Sensitive employee actions require human approval until explicit product policy changes that boundary.
- Management consoles are operator-only and require stronger protection.
- Git is infrastructure/source-of-truth, but never a secret store.
- Any credential that enters Git history is considered compromised and must be rotated before use.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Ana durable Core V1 database foundation is applied live and read-only post-verified. Continue with production Core DB role/credential provisioning and supervised real-path wiring. Do not use the previously Git-exposed Mistral token; only request a fresh replacement when the first real model call is actually required.
