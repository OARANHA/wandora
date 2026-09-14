# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete laboratory provider has been selected.

For decision authority, read `AGENTS.md` and accepted ADRs first. For exact operational status and next work, read `docs/CANONICAL_STATE.md`.

## Product model

The customer should perceive a company operating with human and digital employees. Technical implementation details are intentionally hidden.

```text
Customer
  |
  v
Wandora Front
  |
  v
Wandora Core/API
  |
  +--> Business Graph / canonical data
  +--> Organization Adapter
  +--> Agent Runtime Adapter
  +--> Tool Gateway
  +--> Messaging Gateway
  +--> Model Provider Gateway
  +--> Approval / Policy boundary
```

Wandora is not a CRM-with-AI architecture. CRM, WhatsApp, scheduling, finance and other applications are tools and business surfaces used by employees inside a Wandora-governed organization.

## Canonical responsibilities

### Wandora Front

Owns the customer experience only. It must not call Paperclip, Mastra, Evolution API, model providers or privileged Supabase administrative capabilities directly.

The normal customer experience should use business language: company, team, role, responsibility, work, approval and outcome. Provider/runtime terminology belongs in operator surfaces, not ordinary customer workflows.

### Wandora Core/API

Owns product semantics:

- organization/tenant identity;
- customer users, memberships and roles;
- employee subscriptions/availability/configuration;
- autonomy policy and human approvals;
- plans, usage and billing boundaries;
- canonical business identifiers;
- provider adapters;
- audit-facing product events;
- business authorization above identity/session handling.

### Core identity and tenancy contract V1

ADR 0007 freezes the initial Wandora-owned tenant/auth boundary.

Canonical identities are independent from infrastructure providers:

- `organization.id` is the Wandora company/tenant identity;
- `user.id` is the canonical human-user identity;
- external auth subjects map through `user_identity` rather than becoming Wandora user IDs;
- `membership` binds a user to one organization with role/status;
- `messaging_connection.id` is provider-neutral and belongs to exactly one organization;
- provider connection identifiers and credential references remain private adapter data.

Initial human roles are intentionally small: `owner`, `admin`, `member`. Role membership does not automatically authorize every domain action. Wandora Core policy remains authoritative for sending messages, invoking tools, billing actions, sensitive changes and required human approvals.

Authenticated database reads use PostgreSQL RLS as defense in depth. The validated contract proves that knowing another tenant's connection UUID is insufficient to resolve or access that connection, and suspended memberships lose tenant visibility.

Supabase Auth remains the current login/session provider. Its JWT subject maps to a canonical Wandora user and must not be used as a public business or audit identity.

### Business Graph / data platform

The selected laboratory foundation is a dedicated **Supabase self-hosted** deployment for Wandora.

Responsibilities used as needed:

- PostgreSQL for canonical structured business data;
- Supabase Auth for identity/session handling;
- Studio for controlled operator SQL/database administration;
- Storage for managed object storage;
- Realtime where it creates product value;
- Supavisor for connection pooling where needed.

Supabase does not replace Wandora Core. Authentication answers who the user is and provides session primitives; Wandora Core answers what that user may do in a Wandora organization.

One Wandora Supabase deployment serves the multi-tenant Wandora product. It is not one Supabase deployment per customer, and unrelated products should have independent data/auth deployments.

Candidate canonical entities include organization/company, membership/role, customer/contact, lead/opportunity, product/service, quote, appointment/service order, payment, conversation, human employee, digital employee, task/work item, decision/approval, subscription/usage event and agent/tool audit event.

Agent memory is not the source of truth for prices, payments, schedules, permissions, approvals or other transactional facts.

### Organization Engine

Laboratory candidate: **Paperclip**, behind a Wandora `Organization Adapter`.

Expected concerns include digital-employee identity/role, organizational structure, goals/work items, budgets/cost controls, skills/training/evaluation and work coordination where useful.

Paperclip IDs, schemas and authorization semantics must not become customer-facing contracts. Paperclip does not own Wandora tenancy, billing, canonical business data, customer authentication, messaging contracts or Wandora policy semantics.

### Agent Runtime

Initial accepted implementation: **Mastra**, behind a Wandora `Agent Runtime Adapter`.

The deterministic V1 spike proved the boundary with a typed tool, committed workflow, adapter result mapping, invalid-input rejection, strict TypeScript verification and containerized execution. Mastra-specific run IDs, workflow result objects, step graphs and storage representations remain internal implementation details.

Expected concerns include agent execution, tool invocation, conversation/runtime memory, durable workflows where justified, suspend/resume for human-in-the-loop, multi-agent handoffs/orchestration and model selection/provider abstraction.

Mastra is an implementation technology inside the Wandora runtime, not a customer-visible product boundary. Persistent Mastra runtime storage never becomes the only source of truth for transactional Wandora facts.

### Tool Gateway

Wandora-owned boundary for authenticated/direct integrations.

Expected concerns include OAuth lifecycle, authenticated tool execution, per-company/per-user authorization, action-level approval requirements and provider-neutral internal tool contracts.

Arcade or other providers may be evaluated, but no tool vendor is a frozen public dependency.

### Messaging Gateway

Wandora-owned boundary.

Initial accepted laboratory WhatsApp provider: **Evolution API 2.3.7**, behind the Wandora Messaging Gateway.

The V1 proof validated real inbound and outbound WhatsApp traffic while keeping Evolution instance names, JIDs, API keys, raw webhook envelopes and provider message IDs behind the adapter boundary.

The minimum Wandora contract covers outbound text and normalized inbound text. Inbound events receive deterministic Wandora event IDs and a receipt-store boundary for deduplication. Outbound attempts use Wandora idempotency keys and enter an `uncertain` state after ambiguous transport/non-success provider results so automatic retry cannot accidentally duplicate a send.

Current receipt and outbound-attempt stores in the spike are in-memory laboratory implementations only. Durable persistence and tenant-scoped provider resolution belong to the production Core/data path.

Production-compatible alternatives remain possible: Meta WhatsApp Business Platform, BSPs and future email/SMS/Instagram/Telegram adapters.

No digital employee calls Evolution directly. Employees call a Wandora messaging contract.

### Model providers

Model vendors are interchangeable infrastructure. Initial candidates include OpenAI and Chutes. Routing may evolve based on quality, cost, latency and task sensitivity. Digital-employee identity must not depend on one model vendor.

## Audit identity

Audit-facing product events must use Wandora-owned actor semantics:

- canonical `organization_id`;
- `actor_type` such as human, digital employee or system;
- canonical Wandora `actor_id`.

Supabase Auth subjects, Evolution instance names, Mastra run IDs and other provider/runtime identifiers are implementation metadata rather than audit actor identities.

## Edge, DNS and ingress

Cloudflare is the canonical public edge and Traefik is the VPS ingress/reverse proxy.

Public/customer contracts may include `wandora.com.br`, `app.wandora.com.br`, `api.wandora.com.br`, `hooks.wandora.com.br` and `supabase.wandora.com.br` where justified.

Privileged administrative surfaces include:

- `studio.wandora.com.br` — Supabase Studio, strongly access-controlled;
- `portainer.wandora.com.br` — Portainer operator console;
- `manager.wandora.com.br` — Evolution operator Manager, never a customer-facing surface.

PostgreSQL, Redis, Docker socket, Paperclip internals, Mastra runtime internals and direct provider/database management ports must not be publicly exposed.

## Deployment architecture — current foundation

```text
Internet
   |
Cloudflare DNS / Proxy / Access
   |
Traefik
   |
   +--> wandora.com.br / app / api / hooks
   |       -> Wandora-owned services
   +--> supabase.wandora.com.br
   |       -> Supabase API gateway/services
   +--> studio.wandora.com.br
   |       -> privileged Supabase Studio
   +--> portainer.wandora.com.br
   |       -> operator console
   +--> manager.wandora.com.br
           -> operator-only Evolution Manager

VPS Wandora
   |
Docker networks
   |
   +--> wandora-edge
   |      -> ingress-facing services
   +--> wandora-core
   |      -> Wandora services
   |      -> Paperclip (private)
   |      -> Agent Runtime / Mastra (private)
   |      -> Messaging Gateway (private boundary)
   |      -> Evolution provider adapter path
   +--> wandora-data / provider-private data networks
          -> Supabase/PostgreSQL and data services
          -> Evolution PostgreSQL/Redis
          -> non-public
```

The first Supabase deployment may share the current VPS during laboratory/early beta. Stable DNS contracts must keep a later data-plane VPS migration straightforward.

## Stack/source-of-truth model

Production-oriented Compose/stack definitions live in GitHub. Portainer may operate and observe them but must not become the only copy of infrastructure state. Persistent state requires backup and restore procedures. Secrets live outside Git.

## Near-term execution sequence

1. define the first digital-employee role and its minimum human-centered business workflow;
2. build the first end-to-end product vertical slice using the validated Core, Supabase, Mastra and Messaging boundaries;
3. promote only the required Core contract schema into reviewed migrations/service code;
4. add Wandora login/onboarding around that real workflow;
5. add social login when the application auth journey exists;
6. expand integrations only when a validated employee workflow requires them.

Supabase Foundation V1, Mastra Agent Runtime V1, Evolution Messaging Gateway V1 and Core Multi-tenant/Auth Contract V1 are complete and should not be repeated unless drift or a regression requires repair.

## Non-goals for the current phase

- Kubernetes;
- microservices for every domain;
- bespoke vector database without demonstrated need;
- custom OAuth platform if a safe market solution suffices;
- custom agent framework;
- customer exposure to third-party admin UIs;
- generic prompt editor or workflow canvas as the primary customer experience;
- one Supabase instance shared across unrelated products;
- one Supabase deployment per Wandora customer;
- marketplace before the core digital-employee workflow is validated.
