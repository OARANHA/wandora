# AGENTS.md — Wandora

This file is the operational authority for AI coding/research agents working in this repository.

## 1. Project identity

Wandora is a standalone project. Do not import assumptions, code, naming, architecture or business rules from unrelated projects unless explicitly requested and justified for Wandora.

## 2. Current stage

Wandora is pre-MVP. The current objective is to validate the smallest viable architecture before committing to a product implementation.

Do not build speculative product surface area. Prefer short, falsifiable technical spikes and documented decisions.

## 3. Product principles

- Customer experience is business-first, not AI-first.
- A digital employee is presented as a role with responsibilities, tools, autonomy, training, work and measurable outcomes.
- The client should not need to understand LLMs, prompts, RAG, MCP, embeddings, workflow nodes or provider internals.
- Wandora owns customer-facing contracts, tenancy, billing, permissions, policy and canonical business data.
- Third-party infrastructure must sit behind Wandora-owned adapters/boundaries.
- Structured business facts belong in canonical structured storage, not only in agent memory or RAG.
- Human approval is mandatory for sensitive or irreversible actions until explicit product policy says otherwise.

## 4. Current architectural hypotheses

These are candidates to validate, not assumptions to hard-code:

- Paperclip as organization/control-plane adapter.
- Mastra as primary TypeScript agent/runtime candidate.
- Arcade versus alternatives for authenticated tools/OAuth.
- Supabase/PostgreSQL + pgvector for canonical business data and retrieval.
- Chutes/OpenAI/other providers behind a model-provider boundary.
- Evolution API for laboratory WhatsApp connectivity, with official providers available for production.
- Portainer + Docker Compose as the initial VPS operations model.

## 5. Architecture boundaries

Never couple the customer-facing Wandora API directly to a third-party schema.

Preferred shape:

```text
Wandora Front
  -> Wandora Core
      -> Organization Adapter -> Paperclip
      -> Agent Runtime Adapter -> Mastra
      -> Tool Gateway -> Arcade/direct integrations
      -> Messaging Gateway -> Evolution/Meta/other providers
      -> Model Provider -> Chutes/OpenAI/etc.
      -> Business Graph -> PostgreSQL
```

A provider must be replaceable without forcing a customer-facing redesign.

## 6. Infrastructure rules

- Deploy through Docker Compose / Portainer Stacks unless a later ADR explicitly changes this.
- Do not expose Docker socket, databases, Redis, internal runtimes or management APIs publicly.
- Portainer is an operator console, not a customer-facing dependency.
- Infrastructure-as-code lives in this repository; Portainer should consume versioned definitions rather than become the only source of truth.
- Never commit secrets, tokens, private keys or real customer credentials.
- Pin meaningful image versions in production-oriented manifests; avoid unreviewed `latest` tags.

## 7. Development discipline

Before implementing a dependency-dependent feature:

1. verify the current upstream license and deployment constraints;
2. make the Wandora boundary explicit;
3. write a small spike or contract test;
4. record the outcome in an ADR or research note;
5. only then promote it into product architecture.

## 8. Initial spike order

1. Paperclip organization-control-plane feasibility.
2. Mastra agent/tool/workflow feasibility.
3. Mastra + authenticated tool provider (Arcade or alternative).
4. Agent memory comparison if needed (Mastra vs Letta or other candidate).
5. Messaging gateway laboratory path.
6. Only after the above: freeze the minimum distributable product.

## 9. Definition of progress

Progress is not measured by number of services or screens. Progress means uncertainty has been removed about a critical customer or architectural assumption.
