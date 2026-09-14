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

### Core multi-tenant/auth contract V1 — COMPLETE

ADR 0007 freezes canonical `organization`, `user`, external identity mapping, `membership` and provider-neutral `messaging_connection` semantics. Initial human roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

Tenant isolation and provider-binding privacy were proven on disposable Supabase PostgreSQL. The accepted schema has now been promoted into a reviewed migration file, but has **not yet been applied to the live database**.

### Human Interface / Product Shell V1 — COMPLETE

ADR 0008 accepts React/Vite + TanStack Router/Query, Wandora-owned design language and Docker packaging. Public desktop/mobile browser smoke is green.

### First-Day Customer Journey V1 — COMPLETE

`/start` freezes the path: identify company → choose desired outcome → recommended employee → connect only required tool → teach essential facts → start supervised work.

Learning is progressive; transactional facts remain canonical structured state rather than conversational/model memory.

### Ana inbound new-contact contract V1 — COMPLETE

Ana's first responsibility is narrow: receive a normalized inbound WhatsApp contact, acknowledge/qualify using confirmed company context and keep one understandable qualification work item moving.

A new message does not automatically become a sales opportunity. Duplicate events cannot create duplicate work/sends. Discount, special price, delivery deadline, payment terms and contractual commitments require human approval.

## Ana durable Core vertical slice V1 — COMPLETE AS REVIEWED CODE / NOT LIVE

ADR 0009 promotes the accepted contract into durable Wandora Core code and versioned PostgreSQL migrations.

New product package:

- `apps/core`

Versioned database assets:

- `infra/stacks/supabase/migrations/20260914_001_core_multitenant_auth_v1.sql`
- `infra/stacks/supabase/migrations/20260914_002_ana_vertical_slice_v1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql`

Durable canonical state now covers:

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

Reproducible evidence on 2026-09-14:

```text
ANA_DURABLE_CORE_STATE_V1_OK
Node v22.23.2
TypeScript strict: green
10/10 tests: green
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

The verifier uses disposable `supabase/postgres:17.6.1.136` and pinned Node 22.23.2. The live Wandora Supabase database was not modified by this validation.

## Model provider / memory status

No Mistral token is required yet. Current Core tests use deterministic/fake Agent Runtime implementations so business contracts can be proven without provider cost/credentials.

Ask the product owner for a Mistral token only when the first real supervised model call is materially required. Chutes subscription/token remains deferred until a concrete model/cost/privacy need justifies it.

Structured business facts remain PostgreSQL truth. Knowledge/RAG and employee experiential memory are separate concerns. Mastra Memory is the initial memory candidate; Letta may later be evaluated behind a Wandora-owned memory boundary if long-horizon evidence justifies it.

## Immediate next executable slice

**ANA SUPERVISED REAL-PATH WIRING V1**

Goal: connect the now-durable Core to the already validated provider-neutral runtime and messaging boundaries without enabling unsupervised customer traffic.

Expected order:

1. review/merge the durable Core branch and keep docs synchronized;
2. prepare live Supabase migration preflight, backup/reversibility plan and post-verifier;
3. apply the reviewed migrations to live Supabase only as a controlled deployment step;
4. provision a private Core database role/credential path without exposing PostgreSQL;
5. wire normalized Messaging Gateway inbound events to Wandora Core;
6. wire the existing Mastra Agent Runtime Adapter using a deterministic/fake model path first where possible;
7. expose tenant-authorized Core reads/actions to Wandora Web;
8. prove a supervised real path end-to-end;
9. only then request the Mistral token for the first real model-backed Ana proposal if needed;
10. do not enable unsupervised production traffic until policy/operations explicitly approve it.

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
- Git is infrastructure/source-of-truth.
- Never commit secrets.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Ana durable Core V1 is reviewed-code complete but not applied live. Continue with the supervised real-path wiring sequence; do not ask for a Mistral token until the first real model call is actually required.
