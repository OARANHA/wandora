# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-14**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI or generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, RLS, provider IDs, prompts and tokens remain implementation details.

The default SaaS path aims for useful work on the same day. Multi-day assisted implementation may exist as a premium service, but it is not the default dependency.

Every material product/customer-journey decision must be checked from two perspectives before execution: a paying business customer asking whether the value is understandable and worth paying for, and the Wandora owner/operator asking whether the capability is secure, supportable, scalable, observable and commercially coherent.

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
- React 19 + Vite with TanStack Router/Query — accepted customer web shell.
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

Current reproducible development evidence on 2026-09-14:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_DURABLE_CORE_STATE_V1_OK
Node v22.23.2
TypeScript strict: green
12/12 tests: green
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

### Live Ana foundation application evidence — 2026-09-14

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

## Core runtime database boundary V1 — LIVE, CREDENTIAL DISABLED

ADR 0010 defines the dedicated PostgreSQL identity for deployed Wandora Core code.

Versioned assets:

- `infra/stacks/supabase/migrations/20260914_003_core_runtime_role_v1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql`
- `docs/infra/core-runtime-role-v1.md`

The boundary provides:

- dedicated `wandora_core_runtime` role;
- no `BYPASSRLS`, database/role administration or provider-binding access;
- transaction-local `wandora.organization_id` scope for Core repository transactions;
- organization-scoped RLS policies for the runtime;
- narrow table/column write privileges;
- no direct read/write access to canonical audit rows;
- tenant-checked append-only audit function `wandora.append_core_audit(...)`;
- browser member policies explicitly restricted to `authenticated`;
- removal of generic `PUBLIC` `net` schema usage while preserving explicit Supabase service grants.

### Live application evidence — 2026-09-14

PR #20 was merged to `main` at:

```text
3d16d807ece7765dac356abcd0879006d7a0f13e
```

Core CI passed on the PR head and on the resulting `main` push.

A fresh pre-003 logical backup was created with mode `0600`, checksum-validated and restore-tested. The snapshot was restored into disposable `supabase/postgres:17.6.1.136`; the exact migration was applied there before production and passed:

```text
RESTORE_CORE_ROLE_003_LIVE_SNAPSHOT_OK
MIGRATION_003_ON_LIVE_CLONE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
ANA_DURABLE_CORE_STATE_V1_OK
CORE_ROLE_003_LIVE_CLONE_FULL_VERIFY_OK
```

The exact reviewed migration was then applied live and returned:

```text
MIGRATION_003_LIVE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
CORE_ROLE_003_LIVE_POSTVERIFY_OK
CORE_ROLE_003_POST_HEALTH_OK
```

Current live role state:

```text
wandora_core_runtime
LOGIN: true
CONNECTION LIMIT: 0
BYPASSRLS: false
password: absent
```

The role therefore exists but **cannot yet be used by a production service**. This is intentional. No Core database password should be generated until the Core service and operator-controlled secret-injection path are deployed together.

No customer data was created. PostgreSQL remained non-public, all Supabase services remained healthy, `supabase.wandora.com.br` root remained the intentional HTTP 404 and unauthenticated Studio remained HTTP 401.

## CI / decision discipline status

GitHub Actions `Core CI` is active for every pull request and push to `main`. It runs the disposable PostgreSQL migration/verifier path, production-safe read-only verifiers, strict TypeScript and the Ana Core integration tests.

`AGENTS.md` requires both:

- **dual business perspective** — paying business customer + Wandora owner/operator;
- **decision → second review → execution** before material product, architecture, infrastructure, security or deployment changes.

Branch protection requiring the CI check remains an administrative pending item because the currently available GitHub integration cannot mutate branch-protection settings. CI itself is active and green.

## Model provider / memory status

No usable Mistral token is configured or required yet. Current Core tests use deterministic/fake Agent Runtime implementations so business contracts can be proven without provider cost/credentials.

A previously supplied Mistral token was accidentally committed to Git. It was removed from the current repository tree and the path is now ignored, but Git history may retain it. That token is therefore compromised and must never be reused. When the first real supervised model call becomes materially necessary, revoke the old token, generate a fresh replacement and configure it only through an approved operator-controlled secret path — not Git and not chat.

Chutes subscription/token remains deferred until a concrete model/cost/privacy need justifies it.

Structured business facts remain PostgreSQL truth. Knowledge/RAG and employee experiential memory are separate concerns. Mastra Memory is the initial memory candidate; Letta may later be evaluated behind a Wandora-owned memory boundary if long-horizon evidence justifies it.

## Immediate next executable slice

**WANDORA CORE PRIVATE RUNTIME V1**

Goal: make Wandora Core exist as a deployable private service with a controlled secret path before any real database credential or customer traffic is introduced.

Expected order:

1. package the current `apps/core` runtime as a versioned Docker service suitable for the existing Compose/Portainer operating model;
2. define the private network/service boundary and health/readiness behavior without exposing PostgreSQL or internal runtime surfaces publicly;
3. define an operator-controlled secret-injection path for the Core database credential, with no secret committed to Git/chat;
4. prove the service boots with a deterministic/fake dependency path before enabling any real model provider;
5. only then generate a fresh Core database credential outside Git/chat, change `wandora_core_runtime` from connection limit `0` to the smallest justified non-zero limit and inject that secret into the deployed Core service;
6. prove the deployed service connects as `wandora_core_runtime`, cannot use administrative/service credentials and retains transaction-local tenant RLS behavior;
7. wire normalized Messaging Gateway inbound events to Core in supervised mode;
8. wire the accepted Mastra Agent Runtime Adapter using a deterministic/fake model path first;
9. expose tenant-authorized Core reads/actions to Wandora Web;
10. prove the complete supervised real path end-to-end before any autonomous customer traffic;
11. only when the first real model-backed Ana proposal is materially required, revoke the compromised Mistral token and configure a fresh model-provider credential securely;
12. add real customer authentication/onboarding around the proven path, then broader integrations only when validated by a customer workflow.

## Human-experience guardrails

Before implementing a capability, answer from both customer and owner/operator viewpoints:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?
- would a normal business owner reasonably pay for the result?
- can Wandora operate, support, secure and scale it without disproportionate manual effort?

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization/tenant membership.
- Agent memory/RAG is not canonical storage for transactional facts.
- Provider identifiers never become public Wandora identities without an explicit boundary decision.
- Sensitive employee actions require human approval until explicit product policy changes that boundary.
- Management consoles are operator-only and require stronger protection.
- Git is infrastructure/source-of-truth, but never a secret store.
- Any credential that enters Git history is considered compromised and must be rotated before use.
- The live `wandora_core_runtime` role must remain passwordless with connection limit zero until the reviewed Core service/secret path is ready to consume the credential immediately.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Ana durable Core V1 database foundation and the least-privilege Core runtime database boundary are both applied live and read-only post-verified. `wandora_core_runtime` exists but intentionally has no password and connection limit zero. Do not reapply migration `003` and do not create the credential early. Continue with **Wandora Core Private Runtime V1**: package/deploy Core privately, define the operator-controlled secret path, then provision the database credential only as part of that deployment. Keep the paying-business-customer + Wandora-owner dual perspective and the decision → second review → execution discipline. Do not use the previously Git-exposed Mistral token; only request a fresh replacement when the first real model call is actually required.
