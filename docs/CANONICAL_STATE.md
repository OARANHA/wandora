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

The current-user menu, not `Empresa`, owns personal preferences, notifications, security and session actions.

The preview still uses mock/product-contract data. It must not be mistaken for a connected production customer account.

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

Public API and operator Studio hostnames are established. PostgreSQL remains non-public and Supavisor remains localhost-only. Production hardening still includes Cloudflare Access for privileged surfaces, SMTP and off-host backup/restore drills.

### Mastra Agent Runtime V1 — COMPLETE

ADR 0005 accepts Mastra behind the provider-neutral Agent Runtime Adapter. Typed workflow/tool execution and adapter isolation were validated. Current Core behavior can use deterministic/fake runtime implementations; a real model credential is not yet required.

### Evolution Messaging Gateway V1 — COMPLETE

ADR 0006 accepts Evolution 2.3.7 only behind Wandora's Messaging Gateway. Real inbound and outbound WhatsApp handset proofs are green. Raw provider payloads/IDs/credentials remain private.

### Core multi-tenant/auth contract V1 — COMPLETE + LIVE DATABASE FOUNDATION

ADR 0007 freezes canonical `organization`, `user`, external identity mapping, `membership` and provider-neutral `messaging_connection` semantics. Initial human roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

### Human Interface / Product Shell V1 — COMPLETE

ADR 0008 accepts React/Vite + TanStack Router/Query, Wandora-owned design language and Docker packaging. Public desktop/mobile browser smoke is green.

### First-Day Customer Journey V1 — COMPLETE

`/start` freezes the path: identify company → choose desired outcome → recommended employee → connect only required tool → teach essential facts → start supervised work.

### Ana inbound new-contact contract V1 — COMPLETE

Ana's first responsibility is narrow: receive a normalized inbound WhatsApp contact, acknowledge/qualify using confirmed company context and keep one understandable qualification work item moving.

A new message does not automatically become a sales opportunity. Duplicate events cannot create duplicate work/sends. Discount, special price, delivery deadline, payment terms and contractual commitments require human approval.

## Ana durable Core vertical slice V1 — LIVE DATABASE FOUNDATION COMPLETE

ADR 0009 promotes the accepted contract into durable Wandora Core code and versioned PostgreSQL migrations.

Versioned database assets include:

- `infra/stacks/supabase/migrations/20260914_001_core_multitenant_auth_v1.sql`
- `infra/stacks/supabase/migrations/20260914_002_ana_vertical_slice_v1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql`

Durable canonical state covers digital employees, contacts, conversations, messages, qualification work, approvals and canonical audit records. Private durable state covers normalized inbound-event receipts and outbound-attempt/idempotency state.

Safety semantics remain:

- tenant relationships use organization-scoped constraints;
- foreign or disabled messaging connections fail before customer-state creation;
- paused employees fail before customer-state creation;
- duplicate/in-progress inbound receipt handling is durable and collision-safe;
- browser clients have no direct grants to Ana's internal Core state;
- commercial commitments require human approval;
- unknown/ambiguous outbound delivery becomes `delivery-uncertain` and is not automatically resent;
- provider/runtime identifiers do not become customer/audit identity.

Current reproducible CI evidence:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
CORE_RUNTIME_ACTIVATED_V1_LIVE_OK
ANA_DURABLE_CORE_STATE_V1_OK
Node v22.23.2
TypeScript strict: green
17/17 tests: green
production build: green
WANDORA_CORE_PRIVATE_RUNTIME_V1_OK
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

The live database foundation was applied after fresh logical backups and restored-snapshot rehearsals. No synthetic verifier/customer rows were inserted into production.

## Core runtime database boundary V1 — LIVE + ACTIVATED

ADR 0010 defines the dedicated PostgreSQL identity for deployed Wandora Core code.

Versioned assets:

- `infra/stacks/supabase/migrations/20260914_003_core_runtime_role_v1.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql`
- `infra/stacks/supabase/verifiers/VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql`
- `docs/infra/core-runtime-role-v1.md`
- `docs/infra/core-runtime-database-activation-v1.md`

The boundary provides:

- dedicated `wandora_core_runtime` role;
- no `BYPASSRLS`, superuser, database/role administration or provider-binding access;
- transaction-local `wandora.organization_id` scope;
- organization-scoped RLS policies;
- narrow table/column privileges;
- no direct canonical audit-table access;
- tenant-checked `wandora.append_core_audit(...)`;
- browser member policies restricted to `authenticated`;
- no generic Core access to the `net` schema.

Migration `003` intentionally leaves the role credential-disabled. That state remains independently verified by `VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql` in migration/disposable contexts.

### Live activation — 2026-09-14

Security gate #22 was completed before activation.

Phase A attached only `supabase-db` to internal `wandora-data` with alias `wandora-postgres`. PostgreSQL remained without a directly published host port and Supavisor remained localhost-only.

Phase B generated a dedicated Core credential outside Git/chat and stored it only in the operator-controlled file:

```text
/opt/wandora/stacks/core/secrets/wandora_core_db_password
```

The value is not recorded. Current file policy is non-world-readable (`0640`), owner `wandora-admin`, group `wandora-ops`. Core receives only the explicit operator-group supplemental GID required to read it.

The first database-overlay start failed closed because a host-owned `0600` bind-mounted secret was unreadable by the non-root Node UID. No business traffic was accepted. Core was immediately restored to standby and the runtime role was reset to passwordless / `CONNECTION LIMIT 0`.

PR #26 (`fix: prove non-root Core database secret access`) made the secret-reader group explicit and added a database-mode CI smoke. PR CI #22 and resulting main CI #23 passed.

The successful second activation left the role exactly:

```text
wandora_core_runtime
LOGIN: true
CONNECTION LIMIT: 4
SUPERUSER: false
CREATEDB: false
CREATEROLE: false
INHERIT: false
REPLICATION: false
BYPASSRLS: false
password: present
```

`CONNECTION LIMIT 4` matches the current Core pool maximum.

A live same-physical-connection proof returned:

```text
current_user=wandora_core_runtime
scope_before=""
scope_during="11111111-1111-1111-1111-111111111111"
scope_after_reuse=""
CORE_RUNTIME_POOLED_SCOPE_RESET_OK
```

PR #27 added the separate activated-state verifier without weakening the migration-disabled verifier. PR CI #24 and resulting main CI #25 passed. Main after #27:

```text
1215dd7662cd3c879688d6281179c84bd284b50d
```

The exact activated verifier blob `10e0c9f75427eed6188b80cc215fb1419edb5907` matched the file used for the live canonical post-check.

Final live proof:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ACTIVATED_V1_LIVE_OK
CORE_DATABASE_ACTIVATION_CANONICAL_VERIFIERS_OK
CORE_DATABASE_ACTIVATION_OPERATIONAL_POSTVERIFY_OK
```

## Wandora Core Private Runtime V1 — LIVE DATABASE MODE

ADR 0011 packages the deployable Core process.

Current live runtime state:

```text
container: wandora-core
image: wandora/core:private-runtime-v1
status: running / healthy
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
supplemental secret-reader group: 987
networks: wandora-core + wandora-data
published host ports: none
mode: database
GET /healthz: 200
GET /readyz: 200
secret mount: read-only
```

The Core has no Supabase admin/service credential and no public hostname. Readiness is green only through `wandora_core_runtime`.

## Security gate #22 — COMPLETE

The affected shared Supabase HS256/JWT compatibility material and shared PostgreSQL password were rotated on 2026-09-14 before Core database activation.

Accepted evidence includes:

```text
modern sb_secret REST proof: 200
current legacy service_role REST proof: 200
pre-rotation legacy service_role REST proof: 401
old_postgres_password_network=revoked
new_postgres_password_network=accepted
all_postgres_password_consumers_updated=yes
all Supabase services: healthy
GATE22_LIVE_VERIFIERS_OK
```

Recovery/evidence checkpoints remain protected under `/home/wandora-admin/wandora-backups/supabase-preflight/`. Historical old credentials there are compromised rollback material only and must not return to steady-state use.

Operational details: `docs/infra/supabase-credential-rotation-gate22.md`.

## Current production health — after Core activation

```text
all Supabase services: healthy
PostgreSQL direct published ports: 0
Supavisor: 127.0.0.1 only
supabase.wandora.com.br root: 404 (intentional)
studio.wandora.com.br unauthenticated: 401
Core healthz: 200
Core readyz: 200
Auth users: 0
Auth sessions: 0
organizations: 0
contacts: 0
messages: 0
approvals: 0
```

No customer traffic has been enabled merely because database readiness is green.

## CI / decision discipline status

GitHub Actions `Core CI` is active for every pull request and push to `main`. It now proves both legitimate role states in sequence:

1. migration creates the runtime role credential-disabled;
2. disposable harness intentionally activates it with `CONNECTION LIMIT 4`;
3. activated-state verifier confirms all least-privilege boundaries remain intact;
4. strict TypeScript/build and 17 integration/runtime tests run;
5. production image is smoked in standby and database modes;
6. database-mode smoke proves the non-root process can read a group-owned non-world-readable secret and reach readiness without publishing a port.

`AGENTS.md` requires both:

- **dual business perspective** — paying business customer + Wandora owner/operator;
- **decision → second review → execution** before material product, architecture, infrastructure, security or deployment changes.

## Model provider / memory status

No usable Mistral token is configured or required yet. Current Core tests use deterministic/fake Agent Runtime implementations.

A previously supplied Mistral token was accidentally committed to Git and is compromised. It must never be reused. When the first real supervised model call becomes materially necessary, revoke it, generate a fresh replacement and configure it only through an approved operator-controlled secret path.

Chutes subscription/token remains deferred until a concrete model/cost/privacy need justifies it.

Structured business facts remain PostgreSQL truth. Knowledge/RAG and employee experiential memory are separate concerns.

## Immediate next executable slice

**MESSAGING GATEWAY → WANDORA CORE SUPERVISED V1**

Goal: make the first real inbound business event reach the now-live Core through Wandora-owned normalized contracts without exposing Evolution semantics or introducing model/provider risk prematurely.

Expected order:

1. re-read ADR 0006, ADR 0009, current Gateway adapter/spike and Core inbound contracts;
2. inventory the currently running Gateway/Evolution network and deployment state without changing traffic;
3. define the smallest normalized internal request/authentication contract from Messaging Gateway to Core;
4. preserve canonical `organization_id` / `messaging_connection_id` resolution in Core; raw provider IDs stay behind Gateway/private bindings;
5. keep duplicate-event receipts and outbound idempotency as the durable boundary;
6. first prove Gateway → Core using deterministic/fake Agent Runtime behavior and controlled/synthetic normalized input;
7. only then perform a supervised real WhatsApp inbound proof with no autonomous commercial commitment;
8. keep human approval for discount, price, deadline, payment terms and contractual commitments;
9. expose no public Core port; Gateway and Core communicate only on private `wandora-core`;
10. after the supervised path is green, continue with Mastra adapter integration and tenant-authorized Web reads/actions;
11. request a fresh Mistral token only when the first genuinely model-backed proposal is required.

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
- Historical gate #22 credentials are emergency recovery material only, not steady-state credentials.
- Do not replace `wandora_core_runtime` with a broader role to simplify integration.
- Do not expose a public Core hostname merely to connect Gateway → Core; use the private `wandora-core` network.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Ana durable Core V1 database foundation is live. Security gate #22 is complete. Wandora Core is now live in **database mode** on private `wandora-core + wandora-data`, with no public port, `/healthz = 200`, `/readyz = 200`, and PostgreSQL access only as `wandora_core_runtime` (`CONNECTION LIMIT 4`, no BYPASSRLS/admin capabilities). The production secret is file-mounted and not in Git/chat. Migration `003` must still leave the role credential-disabled by default; use the separate activated-state verifier for the live activated state. The next slice is **Messaging Gateway → Wandora Core supervised V1**. Keep provider IDs/private payloads behind the Gateway, use deterministic/fake Agent Runtime behavior first, preserve durable receipt/idempotency semantics, and do not request a model token yet. Keep the paying-business-customer + Wandora-owner dual perspective and the decision → second review → execution discipline.
