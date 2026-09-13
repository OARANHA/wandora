# Wandora — Initial Architecture

## Purpose

This document describes the current architectural hypothesis for the laboratory phase. It is intentionally provider-neutral at Wandora boundaries.

## Customer-facing model

The customer should perceive a company operating with human and digital employees. The implementation details below are invisible to the customer.

```text
Customer
  |
  v
Wandora Front
  |
  v
Wandora Core
  |
  +--> Business Graph / canonical data
  +--> Organization Engine Adapter
  +--> Agent Runtime Adapter
  +--> Tool Gateway
  +--> Messaging Gateway
  +--> Model Provider Gateway
  +--> Approval / Policy boundary
```

## Canonical responsibilities

### Wandora Front

Owns customer experience only. It must not call Paperclip, Mastra, Evolution API, model providers or tool providers directly.

### Wandora Core

Owns product semantics:

- tenant/company identity;
- customer users and roles;
- employee subscriptions/availability;
- autonomy policy and approvals;
- plans/billing boundaries;
- canonical business identifiers;
- provider adapters;
- audit-facing product events.

### Business Graph

Canonical structured business state. Likely PostgreSQL/Supabase during the laboratory phase.

Candidate entities include:

- company;
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
- decision/approval.

Agent memory is not the source of truth for prices, payments, schedules, approvals or other transactional facts.

### Organization Engine

Candidate: Paperclip behind a Wandora adapter.

Expected concerns:

- digital employee identity/role;
- organizational structure;
- goals and work items;
- budgets/cost controls;
- skills/training/evaluation where useful;
- work coordination and audit primitives.

Paperclip IDs and schemas should not become customer-facing API contracts.

### Agent Runtime

Primary candidate: Mastra.

Expected concerns:

- agent execution;
- tool invocation;
- conversation/runtime memory;
- durable workflows;
- suspend/resume for human-in-the-loop;
- multi-agent handoffs/orchestration;
- model selection/provider abstraction.

### Tool Gateway

Candidate: Arcade and/or direct Wandora integrations.

Expected concerns:

- OAuth lifecycle;
- authenticated tool execution;
- per-company/per-user authorization;
- action-level approval requirements;
- provider-neutral internal tool contracts.

### Messaging Gateway

Wandora-owned boundary.

Candidate providers:

- Evolution API for laboratory/rapid testing;
- Meta WhatsApp Business Platform for official production path;
- other BSPs/providers when commercially useful.

No digital employee should talk directly to Evolution API. It should call a Wandora messaging contract.

### Model providers

Providers are interchangeable infrastructure. Initial candidates include Chutes and OpenAI.

Routing should evolve based on quality, cost, latency and task sensitivity. Employee identity must not depend on one model vendor.

## Edge, DNS and ingress

Cloudflare is the canonical public edge for Wandora.

Responsibilities:

- authoritative DNS for `wandora.com.br` when the domain is activated;
- public hostname/subdomain resolution;
- proxying of public HTTP/HTTPS services where appropriate;
- edge TLS and protection before traffic reaches the VPS;
- Cloudflare Tunnel / Access as the preferred pattern for privileged administrative surfaces where practical;
- keeping internal Docker service names and ports independent from public DNS names.

Provisional public naming convention:

- `wandora.com.br` — public website;
- `app.wandora.com.br` — customer application;
- `api.wandora.com.br` — Wandora Core API when a public API hostname is justified;
- `hooks.wandora.com.br` — externally required webhooks when separation is useful;
- administrative hostnames are not public product surfaces and must receive stronger access controls.

Exact hostnames may change before public launch. Third-party product names such as Paperclip or Mastra must not become part of customer-facing DNS contracts.

## Deployment architecture — laboratory

```text
Internet
   |
Cloudflare DNS / Proxy / Edge
   |
   +--> public web/application traffic
   +--> externally required webhooks
   |
   +--> Cloudflare Tunnel / Access (preferred for admin surfaces)
             |
             v
          VPS Wandora
             |
       Reverse Proxy / ingress
             |
       Docker networks
             |
   +---------+---------------------------+
   |         |          |                |
Wandora   Paperclip   Mastra        integrations
Front/Core             runtime        / messaging
   |
Business Graph / canonical data

Operator
   |
Cloudflare-protected admin path
   |
Portainer
```

Portainer manages Docker/Compose deployments operationally, but stack definitions remain versioned in GitHub.

Public application containers should not need direct public IP exposure beyond the chosen ingress design. Databases, caches, organization engine internals and agent runtime internals remain on private Docker networks unless an explicit requirement is documented.

## Non-goals for V0

- Kubernetes;
- microservices for every domain;
- bespoke vector database without demonstrated need;
- custom OAuth platform if a safe market solution suffices;
- custom agent framework;
- customer exposure to third-party admin UIs;
- marketplace before core employee workflow is validated.
