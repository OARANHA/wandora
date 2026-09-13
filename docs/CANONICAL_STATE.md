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
- **Supabase self-hosted** — validated Wandora data/auth foundation: PostgreSQL, Auth, Studio, Storage, Realtime, Supavisor and supporting services.
- **Evolution API** — laboratory WhatsApp provider behind Wandora `Messaging Gateway`; not a direct dependency of employees or customer-facing contracts.
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

Validated outcomes:

- PostgreSQL/Auth/PostgREST/Realtime/Storage/Studio/Envoy/Supavisor stack came healthy;
- `supabase.wandora.com.br` exposes only the intended application API paths through Traefik;
- `studio.wandora.com.br` is a separate privileged operator surface and requires gateway authentication;
- PostgreSQL/Supavisor host ports are loopback-only;
- Auth settings endpoint was verified over public TLS;
- database persistence survived a PostgreSQL restart;
- disposable persistence probe was removed; no Wandora business tables were created;
- runtime secrets remain outside Git;
- pinned preparation/overlay/runbook are versioned in the repository.

See `docs/infra/supabase-foundation-v1.md` and `infra/stacks/supabase/README.md`.

Remaining operational hardening before production-grade customer data:

- Cloudflare Access for Studio and Portainer;
- production SMTP;
- scheduled off-host backups and a full restore drill;
- Google/social login only when the application login flow exists.

## Mastra status

A local feasibility spike has begun with Node 22 and current package APIs inspected. The runtime has not yet been declared validated.

The next proof must be deterministic and minimal: Wandora-owned tool contract -> workflow -> agent/runtime adapter, initially without requiring paid model tokens where possible.

## Immediate next executable slice

**MASTRA AGENT RUNTIME SPIKE V1**

Goal: prove that current Mastra APIs can implement a Wandora-owned runtime boundary without exposing Mastra concepts as customer-facing contracts.

Required outcome:

1. pin the exact tested Mastra package versions;
2. define a tiny Wandora-owned Agent Runtime interface/contract;
3. implement one deterministic tool with typed input/output;
4. execute that tool through a minimal workflow;
5. prove the same capability can be invoked through the Wandora runtime adapter boundary;
6. avoid paid model dependency for the first proof where possible;
7. add tests that fail if provider/runtime-specific objects leak through the Wandora contract;
8. containerize or otherwise make the spike reproducible;
9. document failure modes and reversibility;
10. only after the proof passes, decide whether Mastra becomes the accepted primary runtime implementation.

Do not start customer UI or CRM surface area during this slice.

## Execution order after Mastra Runtime Spike V1

1. validate **Evolution / Wandora Messaging Gateway** laboratory path;
2. define/freeze Wandora Core multi-tenant/auth contracts on Supabase/PostgreSQL;
3. define the first digital-employee role and smallest end-to-end business workflow;
4. build the first vertical product slice;
5. add Wandora login/onboarding and then Google/social OAuth;
6. expand integrations only when they serve a validated employee workflow.

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
