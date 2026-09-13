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

## Deployment architecture — laboratory

```text
Internet
   |
Reverse Proxy / TLS
   |
   +--> Wandora Front (when available)
   +--> Wandora Core API (when available)
   +--> externally required webhooks only

Private Docker networks
   |
   +--> Paperclip
   +--> Mastra runtime/services
   +--> databases/caches
   +--> integration adapters
   +--> observability

Operator access
   |
   +--> Portainer
```

Portainer manages Docker/Compose deployments operationally, but stack definitions remain versioned in GitHub.

## Non-goals for V0

- Kubernetes;
- microservices for every domain;
- bespoke vector database without demonstrated need;
- custom OAuth platform if a safe market solution suffices;
- custom agent framework;
- customer exposure to third-party admin UIs;
- marketplace before core employee workflow is validated.
