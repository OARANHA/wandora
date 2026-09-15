# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete implementation has been selected.

Authority order is `AGENTS.md` → accepted ADRs → this document → `docs/CANONICAL_STATE.md` → component README/runbook.

## Product model

The customer should perceive a company operating with human and digital employees. Technical implementation details are intentionally hidden.

```text
Customer
  |
  v
Wandora Web
  |
  v
Wandora Core/API
  |
  +--> canonical business state / Supabase PostgreSQL
  +--> Organization Adapter -> Paperclip candidate
  +--> Agent Runtime Adapter -> Mastra
  +--> Tool Gateway -> authenticated integrations
  +--> Messaging Gateway -> Evolution / Meta / other providers
  +--> Model Provider Gateway -> Mistral / Chutes / OpenAI / others
  +--> Approval / Policy boundary
```

Wandora is not a CRM-with-AI and not a generic agent builder. Messaging, CRM, scheduling, finance and other systems are tools/business surfaces used by employees inside a Wandora-governed organization.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router and TanStack Query. Tailwind CSS and Wandora-owned visual patterns provide the design layer; TanStack supplies application behavior rather than visual identity.

Current customer navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

`Empresa` is the organization-administration center: company data, people, knowledge, tools/connections and plan/billing. Personal preferences, notifications, security and session actions belong to the current-user menu rather than a competing generic Settings area.

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly. The default customer path aims for useful supervised work on the same day; multi-day assisted setup may be an optional service, not a product dependency.

## Wandora Core/API

Wandora Core owns product semantics and business authorization:

- organization/tenant identity;
- canonical human users, memberships and roles;
- digital-employee identity, assignment, status and autonomy;
- contacts, conversations, messages and work;
- human approvals and policy decisions;
- canonical audit events;
- plans, usage and billing boundaries;
- provider-neutral adapter contracts.

`apps/core` is the first promoted durable Core package. ADR 0009 accepts Ana's first durable vertical slice. ADR 0010 establishes the least-privilege `wandora_core_runtime` PostgreSQL boundary. ADR 0011 establishes the private deployable Core runtime. That runtime is now live in **database mode**, privately connected to canonical PostgreSQL through `wandora-data`, with `/readyz = 200` and no published host port. Live customer/Gateway traffic remains a separate supervised step.

### Identity and tenancy

ADR 0007 freezes the initial identity boundary:

- `organization.id` is the company/tenant identity;
- `user.id` is the canonical human identity;
- `user_identity` maps external auth subjects to Wandora users;
- `membership` binds a user to an organization;
- initial roles are `owner`, `admin`, `member`;
- `messaging_connection.id` is provider-neutral and belongs to exactly one organization;
- provider bindings live in a private schema.

Supabase Auth handles identity/session issuance. Its JWT `sub` is not a Wandora business ID. Core policy remains authoritative for sensitive/domain actions; role alone is not a universal capability matrix.

### Core database runtime boundary

ADR 0010 defines the PostgreSQL identity used by deployed Core code:

- `wandora_core_runtime` has no `BYPASSRLS`, role/database administration or provider-binding access;
- each Core transaction sets `wandora.organization_id` transaction-locally before tenant-owned queries;
- RLS independently enforces organization isolation and pooled connections return unscoped after commit/rollback;
- foundation configuration tables are read-only to Core;
- mutable workflow tables expose only the table/column privileges required by the current Ana service;
- canonical audit writes use tenant-checked `wandora.append_core_audit(...)`; Core has no direct audit-table access;
- generic `PUBLIC` access to the `net` schema is removed while explicit Supabase service grants are preserved;
- browser/member policies target `authenticated`, while Core policies target only `wandora_core_runtime`.

Migration `20260914_003_core_runtime_role_v1.sql` still creates the role credential-disabled (`CONNECTION LIMIT 0`, no password). The original live verifier deliberately proves that migration-state invariant.

The later reviewed operator activation uses a dedicated secret-file credential and exactly `CONNECTION LIMIT 4`, matching the current Core pool maximum. The separate `VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql` proves the active state without relaxing the original verifier.

A live same-connection pool proof confirmed transaction-local tenant scope resets after commit/reuse:

```text
current_user=wandora_core_runtime
scope_before=""
scope_during="11111111-1111-1111-1111-111111111111"
scope_after_reuse=""
```

### Core private runtime boundary

ADR 0011 packages the Core as a private Node 22 service. The runtime runs as non-root with a read-only root filesystem, drops Linux capabilities, enables `no-new-privileges` and publishes no host port.

`/healthz` measures process health while `/readyz` measures permission to perform business work. Standby remains a supported fail-closed mode (`health 200`, `ready 503`). The current live mode is `database`, with both health and readiness returning 200.

Core attaches to `wandora-core` for the future application-side Messaging Gateway path and to internal `wandora-data` for PostgreSQL. Supabase DB retains its normal internal network and additionally exposes only private alias `wandora-postgres` on `wandora-data`.

The dedicated Core password is mounted from an operator-controlled file, not an environment variable. The secret remains non-world-readable (`0640`) and the non-root Core process receives only the explicit operator-group GID required to read that file.

The first live database-overlay attempt failed closed because the non-root process could not read a host-owned `0600` bind-mounted secret. Core was immediately returned to standby and the role credential disabled. PR #26 converted this finding into a versioned/tested `group_add` contract and CI database-mode smoke before the successful second activation.

Security gate #22 was completed before activation. The affected shared Supabase credentials were rotated with backup/recovery proof and old-credential invalidation; none of those shared credentials is used as the Core credential.

## Canonical business state

Supabase self-hosted provides the selected PostgreSQL/Auth/data foundation. Supabase is infrastructure, not the Wandora backend.

The live database contains durable state for the first Ana workflow:

- digital employees;
- contacts;
- conversations;
- inbound/outbound messages;
- qualification work items;
- approvals;
- canonical audit records;
- private normalized-event receipts;
- private outbound-attempt/idempotency state.

Tenant relationships are protected with organization-scoped keys/foreign keys. The browser has no direct grants to Ana's internal Core state; access will be mediated by Core APIs.

Structured business truth — prices, payments, schedules, permissions, approvals and similar facts — belongs in canonical PostgreSQL state, never solely in agent memory/RAG.

## Ana durable vertical slice V1

Ana's first responsibility is deliberately narrow: receive a normalized inbound WhatsApp contact and keep one understandable qualification context moving.

```text
normalized inbound event
        |
        v
Wandora Core
  -> validate tenant/connection/employee
  -> persist contact + conversation + inbound message
  -> reuse/create one qualification work item
        |
        v
Agent Runtime proposal
        |
        v
Wandora Policy
   | safe                  | commitment
   v                       v
idempotent outbound     durable approval
   |                       |
   v                       v
Messaging Gateway      owner/admin decision
```

Discount, special price, delivery deadline, payment terms and contractual commitments require human approval. Cross-tenant actors cannot decide another organization's approval.

Outbound delivery is conservative: an attempt moves through `planned` → `sending` → `succeeded` or `uncertain`. If delivery may have occurred but cannot be proven, Core records `delivery-uncertain`, marks work `attention-required`, and does not automatically resend the same idempotency key.

The live database foundation was applied on 2026-09-14 using exact reviewed migration blobs after fresh logical backups and successful migration rehearsals on restored copies of the live database. No synthetic customer rows were introduced.

## Agent Runtime

Mastra is the accepted initial implementation behind a Wandora-owned `Agent Runtime Adapter` (ADR 0005). Mastra run IDs, workflow objects and storage representations never become public product contracts.

The current durable Core tests use deterministic/fake runtime implementations. A real model token is intentionally not required until the first supervised real model call. Mistral is a candidate for early low-cost testing; Chutes, OpenAI and other providers remain replaceable behind the model-provider boundary.

A prior Mistral token was accidentally committed to Git and must be treated as compromised. It must never be reused. When a real model call becomes necessary, that credential must be revoked and replaced with a fresh token stored only through an approved operator-controlled secret path.

Long-horizon employee memory remains separate from canonical truth. Mastra Memory is the initial candidate; Letta or another memory engine may later sit behind a Wandora-owned memory boundary if evidence justifies it.

## Messaging Gateway

Evolution API 2.3.7 is the accepted initial WhatsApp provider behind Wandora's `Messaging Gateway` (ADR 0006). Real inbound and outbound handset traffic has already been proven while keeping instance names, JIDs, API keys and provider message IDs behind the adapter.

The earlier gateway spike established normalized inbound events and conservative outbound idempotency. ADR 0009 promotes durable event receipts/outbound-attempt semantics into live Core/PostgreSQL state. The next slice is the real **Gateway → Core supervised** connection; it must remain provider-neutral.

No digital employee calls Evolution directly.

## Approval and audit identity

Audit-facing product events use Wandora-owned semantics:

- canonical `organization_id`;
- `actor_type` such as human, digital employee or system;
- canonical Wandora `actor_id`;
- normalized correlation IDs.

Supabase Auth subjects, Evolution IDs and Mastra run IDs are implementation metadata, not audit actor identity.

## Operator and infrastructure boundary

Cloudflare is the public edge and Traefik is the VPS ingress/reverse proxy. Docker Engine/Compose remains the initial deployment substrate; Portainer is an operator console, while Git is source of truth.

Customer/public contracts may include `wandora.com.br`, `app.wandora.com.br`, `api.wandora.com.br`, `hooks.wandora.com.br` and `supabase.wandora.com.br` when justified.

Operator surfaces include `studio.wandora.com.br`, `portainer.wandora.com.br` and `manager.wandora.com.br`; these require stronger access controls. Additional operator tools may receive protected HTTPS hostnames when useful.

PostgreSQL, Redis, Docker socket, Paperclip internals, Mastra internals, Core runtime ports and provider management ports remain private.

After Core DB activation, PostgreSQL still has zero directly published ports; Supavisor remains localhost-only; Core publishes no host port; public Supabase root remains the intentional 404 and unauthenticated Studio remains 401.

## Migration and source-of-truth discipline

Versioned Wandora database migrations live under `infra/stacks/supabase/migrations/`; falsifiable verifiers live under `infra/stacks/supabase/verifiers/`. Spike SQL is never applied directly to the live database.

The Core multitenant/auth and Ana durable migrations were validated on disposable PostgreSQL, rehearsed against restored logical snapshots and then applied live. Migration `003` followed the same pattern and intentionally left its role credential-disabled after schema application.

Security gate #22 used fresh logical backups, protected `.env` snapshots, controlled service recreation and explicit credential-revocation proofs. Core database activation then used a separate source-of-truth network/secret path and separate activated-state verifier. Operational details live in:

- `docs/infra/supabase-credential-rotation-gate22.md`;
- `docs/infra/core-runtime-role-v1.md`;
- `docs/infra/core-runtime-database-activation-v1.md`.

The mutation-heavy behavioral verifier remains disposable-only and must never run on the live database. Persistent data must remain backup/restore-testable and movable to another VPS.

## Near-term execution sequence

1. keep canonical documentation synchronized;
2. wire the validated Messaging Gateway inbound boundary to Core in supervised mode, preserving normalized provider-neutral events and durable receipt/idempotency behavior;
3. wire the accepted Mastra Agent Runtime Adapter using a deterministic/fake model path first where possible;
4. expose tenant-authorized Core reads/actions to Wandora Web so customer screens use canonical state;
5. perform a supervised real-path proof before any autonomous customer traffic;
6. only when the first real model call is required, revoke the previously Git-exposed Mistral token and configure a fresh replacement outside Git/chat;
7. wire real customer authentication/onboarding around the proven path;
8. add social login and broader integrations only when a validated customer workflow requires them.

## Non-goals for the current phase

- Kubernetes;
- microservices for every domain;
- generic prompt/workflow builder as the customer product;
- bespoke vector database without demonstrated need;
- one Supabase deployment per customer;
- customer access to provider admin UIs;
- marketplace before the first employee workflow is proven.
