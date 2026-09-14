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
- **Evolution API 2.3.7** — accepted initial laboratory WhatsApp provider behind Wandora `Messaging Gateway`; real inbound and outbound paths validated.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## Current VPS state verified on 2026-09-13

The laboratory VPS has about 11 GiB RAM and ample disk. After Supabase + Paperclip + edge services were running, it still had roughly 8+ GiB RAM available during the validation window.

Current deployed services include:

- Traefik — healthy;
- Portainer 2.45.0 — reachable at `https://portainer.wandora.com.br` through Traefik; no direct host 9443 publication;
- Paperclip — healthy, pinned laboratory build, private on the Wandora core network;
- Supabase Foundation V1 — deployed and healthy;
- Evolution API 2.3.7 — healthy with dedicated PostgreSQL/Redis persistence, API-key authentication and no provider database/cache host publication;
- `manager.wandora.com.br` — operator-only Evolution Manager routed through Cloudflare/Traefik; Cloudflare Access remains recommended hardening;
- a private Messaging Gateway lab receiver on `wandora-core`, used only for validated webhook proof;
- edge/status probe — sanitized; old `whoami` information disclosure removed.

Canonical network intent is edge/core/data separation. PostgreSQL, Supavisor, Redis, Docker socket and internal runtimes are not public services.

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

## Evolution Messaging Gateway status — V1 LABORATORY VALIDATION COMPLETE

ADR 0006 accepts Evolution API 2.3.7 as the initial laboratory WhatsApp provider behind the provider-neutral Wandora `Messaging Gateway`.

Validated infrastructure:

- Evolution image pinned by digest;
- dedicated passworded PostgreSQL and private Redis persistence;
- provider API protected by API key;
- Evolution host publication remains loopback-only for diagnostics;
- `manager.wandora.com.br` is a separate operator surface through Cloudflare/Traefik;
- WhatsApp instance paired by QR and confirmed in `state=open`;
- global webhook disabled by default; the lab used a per-instance private webhook for `MESSAGES_UPSERT` only.

Validated contract behavior:

- minimal Wandora outbound text contract uses `connectionId`, recipient, text and Wandora idempotency key;
- minimal normalized inbound text event exposes only Wandora `eventId`, `connectionId`, sender, text and timestamp;
- raw Evolution instance names, API keys, JIDs, webhook envelopes and provider message IDs do not cross the Wandora contract boundary;
- deterministic inbound event ID + receipt store prove duplicate suppression semantics;
- outbound attempt state prevents automatic retry after ambiguous/non-2xx delivery and returns the stored result after a successful duplicate invocation;
- strict TypeScript typecheck and 9/9 runtime tests pass;
- digest-pinned Docker verification passes;
- a real inbound WhatsApp text traversed WhatsApp -> Evolution -> private webhook -> normalized Wandora event;
- a real outbound text traversed the Wandora adapter -> Evolution -> WhatsApp and was received by the destination handset.

Provider-specific operational findings:

- Evolution 2.3.7 may reject internal HTTP calls without an allow-listed `Origin`; the adapter owns this workaround and public Wandora contracts do not;
- QR pairing is the validated operational path; phone-number pairing codes are not relied on for this version.

Production hardening still open:

- persistent inbound receipt/idempotency storage;
- persistent outbound attempt state and reconciliation for `uncertain` sends;
- tenant-scoped connection resolution/authorization in Wandora Core;
- observability/alerting and reconnect operations;
- provider backup/restore procedure;
- Cloudflare Access for `manager.wandora.com.br`;
- richer/media message contracts only if required by the first validated workflow.

Do not reopen the provider-neutral messaging boundary merely because these production-hardening items remain.

## Immediate next executable slice

**WANDORA CORE — MULTI-TENANT / AUTH CONTRACT FREEZE V1**

Goal: define the minimum Wandora-owned company/user/membership/authorization contracts on the validated Supabase foundation before building customer UI or the first business workflow.

Required outcome:

1. define canonical organization/company identity independent from Paperclip and Supabase provider IDs;
2. define customer user + organization membership model and initial role semantics;
3. define how Supabase Auth identity maps into Wandora Core membership/authorization;
4. define provider-neutral connection ownership so messaging connections belong to a Wandora organization, not directly to an Evolution instance;
5. define the authorization boundary for reading/sending messages and invoking employee tools;
6. define minimal audit actor/organization identifiers for later digital-employee actions;
7. define tenant isolation expectations at Core + PostgreSQL/RLS boundaries without moving business authorization into the frontend;
8. add a falsifiable contract/schema test proving one organization cannot resolve/use another organization's messaging connection;
9. avoid CRM/business feature expansion until these contracts are frozen;
10. record the accepted boundary before choosing the first digital-employee role/workflow.

Do not build broad customer-facing onboarding, CRM screens or speculative feature modules in this slice.

## Execution order after Core contract freeze

1. define the first digital-employee role and smallest end-to-end business workflow;
2. build the first vertical product slice using the validated Supabase, Mastra and Messaging Gateway boundaries;
3. add Wandora login/onboarding and then Google/social OAuth;
4. expand integrations only when they serve a validated employee workflow.

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
