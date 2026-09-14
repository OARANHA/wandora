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

`apps/core` is the first promoted durable Core package. ADR 0009 accepts Ana's first durable vertical slice. The corresponding Core multitenant/auth and Ana V1 PostgreSQL migrations are now applied to the live Wandora Supabase database and have passed the production-safe read-only post-verifier. Provisioning the production Core service credential and wiring live traffic remain separate operational steps.

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

## Canonical business state

Supabase self-hosted provides the selected PostgreSQL/Auth/data foundation. Supabase is infrastructure, not the Wandora backend.

The live database now contains durable state for the first Ana workflow:

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

The live database foundation was applied on 2026-09-14 using the exact reviewed migration blobs after a fresh logical backup and a successful migration rehearsal on a restored copy of the live database. The production verifier ran inside `SET TRANSACTION READ ONLY` and returned `ANA_LIVE_POSTVERIFY_V1_OK`. Existing Supabase services remained healthy and no synthetic customer rows were introduced.

## Agent Runtime

Mastra is the accepted initial implementation behind a Wandora-owned `Agent Runtime Adapter` (ADR 0005). Mastra run IDs, workflow objects and storage representations never become public product contracts.

The current durable Core tests use deterministic/fake runtime implementations. A real model token is intentionally not required until the first supervised real model call. Mistral is a candidate for early low-cost testing; Chutes, OpenAI and other providers remain replaceable behind the model-provider boundary.

A prior Mistral token was accidentally committed to Git and must be treated as compromised. It must never be reused. When a real model call becomes necessary, that credential must be revoked and replaced with a fresh token stored only through an approved operator-controlled secret path.

Long-horizon employee memory remains separate from canonical truth. Mastra Memory is the initial candidate; Letta or another memory engine may later sit behind a Wandora-owned memory boundary if evidence justifies it.

## Messaging Gateway

Evolution API 2.3.7 is the accepted initial WhatsApp provider behind Wandora's `Messaging Gateway` (ADR 0006). Real inbound and outbound handset traffic has already been proven while keeping instance names, JIDs, API keys and provider message IDs behind the adapter.

The earlier gateway spike established normalized inbound events and conservative outbound idempotency. ADR 0009 now promotes durable event receipts/outbound-attempt semantics into live Core/PostgreSQL state. Real Gateway-to-Core wiring is still pending and must remain provider-neutral.

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

PostgreSQL, Redis, Docker socket, Paperclip internals, Mastra internals and provider management ports remain private.

## Migration and source-of-truth discipline

Versioned Wandora database migrations live under `infra/stacks/supabase/migrations/`; falsifiable verifiers live under `infra/stacks/supabase/verifiers/`. Spike SQL is never applied directly to the live database.

The Core multitenant/auth and Ana durable migrations were validated together on disposable `supabase/postgres:17.6.1.136`, rehearsed against a restored logical snapshot of the live database, then applied to the live Wandora Supabase database on 2026-09-14. The live-safe verifier is read-only by construction and passed after application.

The mutation-heavy behavioral verifier remains disposable-only and must never run on the live database. Persistent data must remain backup/restore-testable and movable to another VPS.

## Near-term execution sequence

1. keep canonical documentation synchronized;
2. provision a private least-privilege production database role/credential path for Wandora Core;
3. wire the validated Messaging Gateway inbound boundary to Core in supervised mode;
4. wire the accepted Mastra Agent Runtime Adapter using a deterministic/fake model path first where possible;
5. expose tenant-authorized Core reads/actions to Wandora Web so customer screens use canonical state;
6. perform a supervised real-path proof before any autonomous customer traffic;
7. only when the first real model call is required, revoke the previously Git-exposed Mistral token and configure a fresh replacement outside Git/chat;
8. wire real customer authentication/onboarding around the proven path;
9. add social login and broader integrations only when a validated customer workflow requires them.

## Non-goals for the current phase

- Kubernetes;
- microservices for every domain;
- generic prompt/workflow builder as the customer product;
- bespoke vector database without demonstrated need;
- one Supabase deployment per customer;
- customer access to provider admin UIs;
- marketplace before the first employee workflow is proven.
