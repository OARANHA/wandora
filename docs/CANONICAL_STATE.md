# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-14**

This file is the short operational handoff for a new chat/agent. It does not replace ADRs. If it conflicts with an accepted ADR, the ADR wins.

## Continuity contract

Read, in order: `AGENTS.md`, accepted ADRs, `docs/architecture.md`, then this file. Do not ask the user to reconstruct decisions already recorded there and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI or generic agent-builder.

The human customer should see familiar business concepts: company, team, responsibilities, connected tools, work, approvals and outcomes. Terms such as provider IDs, JWT claims, RLS, Mastra runs, Evolution instances, prompts or tokens are implementation details and stay out of the normal product experience.

The normal SaaS path must aim for useful work on the same day a company subscribes. A multi-day manual implementation project may exist as an assisted premium service, but it must not be required for the default product experience.

Wandora owns tenancy, customer-facing contracts, business authorization, policy, billing boundaries, canonical business state and provider-neutral adapters.

## Accepted/current technology roles

- **Cloudflare** — public edge, DNS/protection and preferred Access layer for privileged admin surfaces.
- **Traefik** — VPS ingress/reverse proxy.
- **Docker Compose + Portainer** — initial operations model; Git is source of truth.
- **Paperclip** — validated laboratory organization/control-plane candidate behind `Organization Adapter`.
- **Mastra** — accepted initial Agent Runtime behind `Agent Runtime Adapter`.
- **Supabase self-hosted** — validated PostgreSQL/Auth/data foundation.
- **Evolution API 2.3.7** — accepted initial laboratory WhatsApp provider behind `Messaging Gateway`.
- **React + Vite + TanStack Router/Query** — accepted initial customer web shell; Wandora owns the visual/product language.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## VPS / infrastructure status

Verified laboratory services include Traefik, Portainer, Paperclip, Supabase Foundation V1 and Evolution API 2.3.7 with dedicated PostgreSQL/Redis persistence.

`manager.wandora.com.br` is an operator-only Evolution Manager surface through Cloudflare/Traefik. Cloudflare Access remains recommended before production-grade use.

Frequently used operator applications may receive their own protected HTTPS hostname when useful. Provider databases, Redis, Docker socket and internal runtimes remain private and do not receive direct public management ports merely for convenience.

## Supabase Foundation V1 — COMPLETE

Pinned upstream: `self-hosted/v0.8.1`, commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

Validated foundation includes healthy PostgreSQL/Auth/Studio-related services, stable application/admin hostnames, loopback-only database/pooler host bindings and persistence across restart.

Operational hardening still open includes Cloudflare Access for admin surfaces, production SMTP, off-host backups/restore drill and social login only when the Wandora application flow needs it.

## Mastra Agent Runtime V1 — COMPLETE

ADR 0005 accepts Mastra as the initial runtime behind the Wandora-owned adapter.

The deterministic spike proved typed tool/workflow execution, adapter isolation, invalid-input rejection, strict TypeScript verification, runtime tests, official Mastra build and digest-pinned Docker verification.

Persistent runtime storage, observability, concurrency/recovery, long-horizon employee memory and model-provider wiring remain later production concerns and do not reopen the runtime boundary.

## Evolution Messaging Gateway V1 — COMPLETE

ADR 0006 accepts Evolution API 2.3.7 only as the initial WhatsApp provider behind Wandora's provider-neutral `Messaging Gateway`.

Validated:

- digest-pinned Evolution deployment with private provider data services;
- API-key protection and QR-paired real WhatsApp instance in `state=open`;
- per-instance private `MESSAGES_UPSERT` webhook path;
- normalized inbound Wandora event without Evolution API key/JID/instance/provider IDs;
- deterministic inbound deduplication semantics;
- conservative outbound idempotency with `uncertain` state after ambiguous failures;
- real inbound WhatsApp proof;
- real outbound WhatsApp proof with handset receipt confirmed;
- 10/10 runtime tests after regression coverage for Evolution 2.3.7's required allow-listed `Origin`.

Production hardening still open: durable inbound/outbound idempotency state, reconciliation for uncertain sends, observability/reconnect/backup procedures and Cloudflare Access for the Manager.

## Wandora Core multi-tenant/auth contract V1 — COMPLETE

ADR 0007 accepts the first Wandora-owned tenant/auth boundary. The validation is a contract/schema proof on a disposable Supabase PostgreSQL container; it has **not** been applied ad hoc to the live Wandora database.

Canonical identities frozen for V1:

- `organization.id` — Wandora company/tenant ID;
- `user.id` — Wandora human-user ID;
- `user_identity` — maps external login subjects such as Supabase Auth `sub` to canonical users;
- `membership` — organization-scoped human membership;
- `messaging_connection.id` — provider-neutral connection ID owned by one organization;
- provider bindings — private implementation details in an internal schema.

Initial human roles are `owner`, `admin`, `member`. Role is not a universal permission matrix; domain capabilities, sensitive operations and approval requirements remain explicit Wandora Core policy decisions.

The verifier proves identity mapping, organization-scoped role resolution, suspended-membership denial, unknown-subject denial, private provider bindings, and that organization A cannot resolve organization B's messaging connection even when the foreign UUID is known.

Future audit actions use canonical `organization_id`, `actor_type` and Wandora-owned `actor_id`; provider/runtime IDs must not become audit actor IDs.

## Human Interface / Product Shell V1 — COMPLETE

ADR 0008 accepts the initial customer-facing shell.

Implementation currently lives under `apps/web` and uses React 19, Vite 8, TanStack Router, TanStack Query, Tailwind CSS and Lucide. TanStack Start is intentionally deferred until SSR/server functions provide a concrete benefit.

Customer navigation is frozen for this stage around:

- **Início** — company activity, outcomes and what needs attention;
- **Equipe** — humans/digital employees, responsibilities, current work and autonomy;
- **Trabalho** — business work rather than implementation workflows;
- **Conversas** — provider-neutral company conversations;
- **Aprovações** — human decisions when employee autonomy is exceeded;
- **Empresa** — business data, people, knowledge, tools/connections and plan.

The shell is containerized with pinned Node 22 for build and pinned Nginx for runtime. TypeScript/Vite build is green. All six routes and `/healthz` return successfully through the container with SPA fallback.

Chromium browser smoke passed at 390 px and 1440 px across all six routes with no browser-console errors and no horizontal document overflow. Desktop/mobile visual review was completed after removing customer-visible provider/runtime vocabulary and refining mobile navigation.

The V1 shell is still mock/product-contract UI; it is not wired to production Core data/auth yet.

## Immediate next executable slice

**FIRST-DAY CUSTOMER JOURNEY CONTRACT V1**

Goal: freeze what a paying business owner experiences from first entry until the first digital employee performs useful supervised work, before implementing the production employee workflow.

Required outcome:

1. define the entry point after signup/checkout without requiring a Wandora consultant;
2. create/join the company using plain business language;
3. ask what business outcome the customer wants, not which agent/model/workflow they want;
4. let the customer hire the first digital employee for that responsibility;
5. connect only the minimum tool required by that first job;
6. collect only essential company facts/knowledge required to start safely;
7. start the employee in supervised mode the same day;
8. show what the employee can do alone and what requires human approval;
9. show observable work/result in the Product Shell immediately;
10. define the transition from first-day onboarding into normal `Início`, `Equipe`, `Trabalho`, `Conversas` and `Aprovações` navigation.

Do not turn this slice into a generic setup wizard, prompt editor, workflow canvas, model selector or consulting questionnaire.

## Human-experience guardrails

Before implementing a capability, answer:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?

The product should answer, in plain language: who works for my company, what each employee is responsible for, what they are doing, what needs my approval, what happened, what result was produced, and which business tools are connected.

## Execution order after first-day journey freeze

1. define the first digital-employee role and minimum business workflow from the frozen journey;
2. build the first end-to-end vertical slice using the validated Web, Core, Supabase, Mastra and Messaging boundaries;
3. promote only the required Core schema into reviewed migrations/service code;
4. wire real customer auth/onboarding around that proven slice;
5. add Google/social OAuth when the Wandora login journey exists;
6. expand tools/integrations only when a validated employee workflow requires them.

## Non-negotiable boundaries

- Wandora Front never calls Paperclip, Mastra or Evolution directly.
- Supabase Auth identifies/sessionizes users; Wandora Core owns business authorization and tenant membership.
- Agent memory/RAG is not canonical storage for transactional business facts.
- Provider-specific identifiers do not become public Wandora identifiers without an explicit boundary decision.
- Sensitive/irreversible employee actions require human approval until explicit product policy says otherwise.
- Management consoles are operator-only surfaces and require stronger protection.
- Git is the infrastructure source of truth.
- Never commit secrets.

## Startup instruction for another chat

> Read `AGENTS.md`, all accepted ADRs, `docs/architecture.md`, and `docs/CANONICAL_STATE.md`. Continue from `Immediate next executable slice` unless real repository/runtime state proves it is complete. Preserve the human-first product thesis and provider-neutral boundaries.
