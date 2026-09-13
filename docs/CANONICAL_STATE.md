# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-13**

This file is the short operational handoff for a new chat/agent. It does not replace ADRs. If it conflicts with an accepted ADR, the ADR wins.

## Continuity contract

A new agent must first read `AGENTS.md`, accepted ADRs, `docs/architecture.md`, and this file. Do not ask the user to reconstruct decisions already recorded there.

Do not reopen an accepted architectural decision simply because another technology is familiar or fashionable. New evidence must be written as a proposed superseding ADR before changing the canonical path.

## Product thesis

Wandora is a company-operating layer built around digital employees, not a CRM-with-AI or generic agent-builder product.

The customer sees employees, responsibilities, work, approvals and outcomes. CRM, WhatsApp, scheduling, finance and integrations are tools those employees use.

Wandora owns tenancy, customer-facing contracts, policy, billing boundaries, canonical business state and provider-neutral adapters.

## Accepted / current technology roles

- **Cloudflare** — public edge, DNS/protection and preferred Access layer for privileged admin surfaces.
- **Traefik** — VPS reverse proxy / ingress.
- **Docker Compose + Portainer** — initial operations model. Git is source of truth; Portainer is an operator console.
- **Paperclip** — validated laboratory organization/control-plane candidate, private and behind `Organization Adapter`.
- **Mastra** — accepted initial Agent Runtime implementation behind a Wandora `Agent Runtime Adapter`.
- **Supabase self-hosted** — validated Wandora data/auth foundation: PostgreSQL, Auth, Studio, Storage, Realtime, Supavisor and supporting services.
- **Evolution API** — next laboratory WhatsApp provider behind Wandora `Messaging Gateway`; never a direct employee/customer contract.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## Current VPS state verified on 2026-09-13

The laboratory VPS has about 11 GiB RAM and ample disk. After Supabase + Paperclip + edge services were running, it still had roughly 8+ GiB RAM available during the validation window.

Current deployed services include:

- Traefik — healthy;
- Portainer 2.45.0 — reachable at `https://portainer.wandora.com.br` through Traefik; no direct host 9443 publication;
- Paperclip — healthy, pinned laboratory build, private on the Wandora core network;
- Supabase Foundation V1 — deployed and healthy;
- edge/status probe — sanitized; old `whoami` information disclosure removed.

Canonical network intent is edge/core/data separation. PostgreSQL, Supavisor, Docker socket and internal runtimes are not public services.

## Paperclip status

Infrastructure spike passed. Paperclip remains private and reversible. Do not make Paperclip IDs or schemas public Wandora contracts.

Next Paperclip work is adapter/contract validation when required by the first vertical slice, not more public exposure.

## Supabase status — FOUNDATION V1 COMPLETE

Pinned upstream:

- `self-hosted/v0.8.1`;
- commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

Validated outcomes include healthy data/auth services, separated public/admin hostnames, loopback-only PostgreSQL/Supavisor host bindings, valid public TLS, persistence across PostgreSQL restart, versioned non-secret overlay/runbook, and no premature Wandora business tables.

Remaining operational hardening before production-grade customer data:

- Cloudflare Access for Studio and Portainer;
- production SMTP;
- scheduled off-host backups and a full restore drill;
- Google/social login only when the application login flow exists.

## Mastra status — AGENT RUNTIME SPIKE V1 COMPLETE

Validated versions:

- Node `22.23.2`;
- `@mastra/core` `1.66.0`;
- `mastra` `1.29.0`;
- Zod `4.6.4`;
- TypeScript `6.0.3`.

Evidence:

- deterministic typed tool executes through a committed Mastra workflow;
- the same capability executes behind the Wandora-owned `AgentRuntime` interface;
- Mastra run/workflow internals do not cross the Wandora adapter boundary;
- invalid input is rejected;
- strict typecheck passed;
- three runtime tests passed;
- official `mastra build` succeeded;
- Docker verification passed with network disabled and Node base image pinned by digest.

ADR 0005 accepts Mastra as the initial implementation behind the provider-neutral runtime adapter. It is not declared production-complete: persistent runtime storage, model-provider integration, production observability, long-running durability, concurrency/recovery and tenant-isolation behavior remain later hardening concerns.

## Immediate next executable slice

**EVOLUTION API + WANDORA MESSAGING GATEWAY V1**

Goal: prove a provider-neutral Wandora messaging contract over a self-hosted Evolution API laboratory deployment without allowing digital employees or Wandora Front to depend on Evolution-specific APIs, IDs or payloads.

Required outcome:

1. review/pin the exact current Evolution API version and license/deployment constraints;
2. deploy privately by default on the Wandora VPS with persistent state and no unnecessary public admin surface;
3. define a minimal Wandora `MessagingGateway` contract for outbound message and normalized inbound event;
4. implement an Evolution adapter behind that contract;
5. isolate provider credentials and instance identifiers from customer-facing contracts;
6. expose only the webhook/public path actually required for WhatsApp transport, preferably through `hooks.wandora.com.br` or another Wandora-owned contract;
7. prove idempotent inbound-event normalization and safe retry behavior;
8. prove outbound send mapping without coupling employee logic to Evolution payloads;
9. document reconnect/failure/backup/reversibility behavior;
10. only then advance to Wandora Core multi-tenant/auth contract freeze.

Do not build CRM UI or customer-facing WhatsApp setup screens during this laboratory slice.

## Execution order after Messaging Gateway V1

1. define/freeze Wandora Core multi-tenant/auth contracts on Supabase/PostgreSQL;
2. define the first digital-employee role and smallest end-to-end business workflow;
3. build the first vertical product slice;
4. add Wandora login/onboarding and then Google/social OAuth;
5. expand integrations only when they serve a validated employee workflow.

## Non-negotiable boundaries

- Wandora Front does not call Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes users; Wandora Core owns business authorization and tenant membership.
- Agent memory/RAG is not canonical storage for payments, permissions, schedules, approvals or other transactional facts.
- No provider-specific identifier becomes a public Wandora identifier without an explicit boundary decision.
- Sensitive/irreversible employee actions require human approval until an explicit policy changes that rule.
- Management consoles are operator-only surfaces and should receive stronger edge protection.
- Git is the infrastructure source of truth; avoid unrecorded Portainer-only edits.
- Do not commit secrets.

## Startup instruction for another chat

> Read `AGENTS.md`, all accepted ADRs in `docs/decisions/`, `docs/architecture.md`, and `docs/CANONICAL_STATE.md` before making changes. Treat them as the canonical Wandora authority. Continue from `Immediate next executable slice` unless real repository/runtime state proves that slice has already been completed. Verify real state before implementing; do not repeat completed work and do not silently change accepted decisions.
