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

Candidate canonical entities include:

- organization/company;
- membership / role;
- customer/contact;
- lead/opportunity;
- product/service;
- quote;
- appointment/service order;
- payment;
- conversation;
- human employee;
- digital employee;
- task/work item;
- decision/approval;
- subscription/usage event;
- agent/tool audit event.

Agent memory is not the source of truth for prices, payments, schedules, permissions, approvals or other transactional facts.

### Organization Engine

Laboratory candidate: **Paperclip**, behind a Wandora `Organization Adapter`.

Expected concerns:

- digital-employee identity/role;
- organizational structure;
- goals and work items;
- budgets/cost controls;
- skills/training/evaluation where useful;
- work coordination and audit primitives.

Paperclip IDs, schemas and authorization semantics must not become customer-facing contracts. Paperclip does not own Wandora tenancy, billing, canonical business data, customer authentication, messaging contracts or Wandora policy semantics.

### Agent Runtime

Primary laboratory candidate: **Mastra**, behind a Wandora `Agent Runtime Adapter`.

Expected concerns:

- agent execution;
- tool invocation;
- conversation/runtime memory;
- durable workflows;
- suspend/resume for human-in-the-loop;
- multi-agent handoffs/orchestration;
- model selection/provider abstraction.

Mastra is an implementation technology inside the Wandora runtime, not a customer-visible product boundary.

### Tool Gateway

Wandora-owned boundary for authenticated/direct integrations.

Expected concerns:

- OAuth lifecycle;
- authenticated tool execution;
- per-company/per-user authorization;
- action-level approval requirements;
- provider-neutral internal tool contracts.

Arcade or other providers may be evaluated, but no tool vendor is a frozen public dependency.

### Messaging Gateway

Wandora-owned boundary.

Initial laboratory provider:

- Evolution API for rapid WhatsApp validation.

Production-compatible alternatives remain possible:

- Meta WhatsApp Business Platform;
- BSPs/other providers where commercially useful;
- future email/SMS/Instagram/Telegram adapters.

No digital employee calls Evolution API directly. Employees call a Wandora messaging contract.

### Model providers

Model vendors are interchangeable infrastructure. Initial candidates include OpenAI and Chutes.

Routing may evolve based on quality, cost, latency and task sensitivity. Digital-employee identity must not depend on one model vendor.

## Edge, DNS and ingress

Cloudflare is the canonical public edge and Traefik is the VPS ingress/reverse proxy.

Public/customer contracts may include:

- `wandora.com.br` — public website;
- `app.wandora.com.br` — customer application;
- `api.wandora.com.br` — Wandora Core/API when exposed;
- `hooks.wandora.com.br` — externally required webhooks when useful;
- `supabase.wandora.com.br` — stable application-facing Supabase endpoint.

Privileged administrative surfaces include:

- `studio.wandora.com.br` — Supabase Studio, strongly access-controlled (Cloudflare Access preferred);
- Portainer/other operator consoles — protected administrative paths, not public product surfaces.

PostgreSQL, Redis, Docker socket, Paperclip internals, Mastra runtime internals and management APIs must not be directly public.

Third-party product names should not become customer-facing DNS contracts merely because a provider is currently used.

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
   |
   +--> supabase.wandora.com.br
   |       -> Supabase API gateway/services
   |
   +--> studio.wandora.com.br
           -> privileged access protection
           -> Supabase Studio

VPS Wandora
   |
Docker networks
   |
   +--> wandora-edge
   |      -> ingress-facing services
   |
   +--> wandora-core
   |      -> Wandora services
   |      -> Paperclip (private)
   |      -> agent runtime / Mastra (private)
   |      -> Evolution / messaging integration path
   |
   +--> wandora-data
          -> Supabase/PostgreSQL and data services
          -> non-public
```

The first Supabase deployment may share the current VPS during the laboratory/early-beta phase. It must remain migration-ready for a later dedicated data-plane VPS. Stable DNS contracts should allow that migration without rewriting the product.

## Stack/source-of-truth model

Production-oriented Compose/stack definitions live in GitHub. Portainer may operate and observe them but must not become the only copy of infrastructure state.

Preferred deployment direction:

```text
Git commit / reviewed config
        |
CI / verification
        |
versioned image + Compose manifest
        |
VPS deployment
        |
Portainer observability / operations
```

Persistent state requires backup and restore procedures. Secrets live outside Git.

## Near-term execution sequence

1. Supabase Foundation V1 on the current VPS, migration-ready and private-by-default;
2. deterministic Mastra agent/tool/workflow feasibility spike;
3. Evolution-based messaging gateway laboratory validation;
4. freeze Wandora Core contracts and multi-tenant/auth boundaries;
5. first end-to-end product vertical slice;
6. social login (for example Google) when the application auth flow is ready.

## Non-goals for the current phase

- Kubernetes;
- microservices for every domain;
- bespoke vector database without demonstrated need;
- custom OAuth platform if a safe market solution suffices;
- custom agent framework;
- customer exposure to third-party admin UIs;
- one Supabase instance shared across unrelated products;
- one Supabase deployment per Wandora customer;
- marketplace before the core digital-employee workflow is validated.
