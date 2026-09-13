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
- **Mastra** — primary Agent Runtime candidate, currently under deterministic feasibility validation.
- **Supabase self-hosted** — accepted Wandora data/auth foundation: PostgreSQL, Auth, Studio and selected supporting services. It may run on the current VPS initially.
- **Evolution API** — laboratory WhatsApp provider behind Wandora `Messaging Gateway`; not a direct dependency of employees or customer-facing contracts.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## Current VPS state verified on 2026-09-13

The Wandora VPS currently has substantial laboratory headroom (about 11 GiB RAM total, roughly 9+ GiB available during the latest check, and ample disk).

Current deployed stacks/services include:

- Traefik — healthy;
- Portainer — running;
- Paperclip — healthy, pinned laboratory build, private on the Wandora core network;
- edge/status probe — running with the former information-leaking `whoami` behavior removed.

Canonical private Docker network separation includes edge/core/data intent. Databases and privileged service internals must remain non-public.

## Paperclip status

Spike passed at infrastructure level. Paperclip is running privately and remains reversible. Do not make Paperclip IDs or schemas public Wandora contracts.

Next Paperclip work is adapter/contract validation, not additional public exposure.

## Mastra status

A local feasibility spike has begun with Node 22 and current package APIs inspected. The runtime has not yet been declared validated.

The next Mastra proof must be deterministic and minimal: Wandora-owned tool contract -> workflow -> agent/runtime adapter, initially without requiring paid model tokens where possible.

## Supabase status

Architecture decision accepted; deployment is **not yet complete**.

Target initial public/admin contracts:

- `supabase.wandora.com.br` — application-facing Supabase endpoint;
- `studio.wandora.com.br` — administrative Studio surface behind strong access control (Cloudflare Access preferred).

PostgreSQL must not be publicly exposed. Secrets remain outside Git. The stack must be designed for later migration to a dedicated data-plane VPS while preserving stable hostnames.

## Immediate next executable slice

**SUPABASE FOUNDATION V1**

Goal: establish a reproducible self-hosted Supabase foundation on the current VPS without coupling product domain logic to Supabase internals.

Required outcome:

1. versioned stack/config templates in Git with no real secrets;
2. pinned/reviewed upstream version rather than blind `latest` usage;
3. persistent database/storage volumes and private network placement;
4. application-facing gateway prepared for `supabase.wandora.com.br`;
5. Studio prepared for `studio.wandora.com.br` with privileged access protection;
6. PostgreSQL verified non-public;
7. Auth health/login primitives validated;
8. Studio/SQL access validated for the operator;
9. backup procedure documented and at least a basic restore path defined;
10. resource/health baseline recorded.

Do not create Wandora business tables during the infrastructure slice except a disposable smoke-test artifact if strictly necessary and removed afterward.

## Execution order after Supabase Foundation V1

1. finish deterministic **Mastra Agent Runtime spike**;
2. validate **Evolution / Wandora Messaging Gateway** laboratory path;
3. define/freeze the first Wandora Core contracts and multi-tenant/auth boundaries on Supabase/PostgreSQL;
4. build the first end-to-end vertical product slice;
5. add Google/social login when the application login flow exists and OAuth callback contracts are ready.

## Non-negotiable boundaries

- Wandora Front does not call Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes users; Wandora Core owns business authorization.
- Agent memory/RAG is not canonical storage for payments, permissions, schedules, approvals or other transactional facts.
- No provider-specific identifier becomes a public Wandora identifier without an explicit boundary decision.
- Sensitive/irreversible employee actions require human approval until an explicit policy changes that rule.
- Do not expose management consoles merely for convenience.
- Do not commit secrets.

## Startup instruction for another chat

Use this instruction when resuming work:

> Read `AGENTS.md`, all accepted ADRs in `docs/decisions/`, `docs/architecture.md`, and `docs/CANONICAL_STATE.md` before making changes. Treat them as the canonical Wandora authority. Continue from the `Immediate next executable slice` unless the repository or production state proves it has already been completed. Verify real state before implementing; do not repeat completed work and do not silently change accepted decisions.
