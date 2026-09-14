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

## First-Day Customer Journey V1 — COMPLETE

`docs/product/FIRST_DAY_CUSTOMER_JOURNEY_V1.md` freezes the paying-customer path from first entry to the first supervised employee start.

The standalone `/start` experience has six customer-language steps:

1. identify the company with only essential information;
2. choose the first business outcome to remove from the owner's desk;
3. receive a digital-employee recommendation with explicit responsibility and approval boundary;
4. connect only the first required work tool;
5. teach only the minimum company facts needed to begin safely;
6. review the initial responsibility/autonomy and start supervised work.

The route is intentionally outside the normal application shell. It transitions into `Início` after the customer chooses **Começar trabalho supervisionado**.

Current UI is still a product-contract proof: WhatsApp connection and activation are simulated and do not produce live business side effects yet. Production wiring must preserve the customer contract while moving state and authorization into Wandora Core.

Learning boundary is also frozen: history remains traceable; corrections may become proposed durable instructions; durable company guidance requires the appropriate approval path; transactional facts remain structured canonical state rather than conversational/model memory.

Validation evidence:

- pinned Node 22 Docker build runs strict TypeScript and Vite successfully;
- `/healthz`, `/start` and all six shell routes return HTTP 200 with SPA fallback;
- Chromium completes the entire six-step journey at 390 px and 1440 px;
- no browser-console errors or horizontal document overflow were observed;
- `/start` renders without leaking the normal application shell;
- customer-facing source scan is clean of provider/runtime vocabulary;
- source secret scan is clean.

## Ana inbound new-contact contract V1 — COMPLETE

`docs/product/ANA_INBOUND_NEW_CONTACT_V1.md` and `spikes/ana-inbound-new-contact-v1` freeze the first employee business contract.

Ana's initial responsibility is deliberately narrow: receive a normalized inbound WhatsApp contact, acknowledge and qualify it using confirmed company knowledge, and keep one understandable qualification work item moving. A new message does not automatically become a sales opportunity.

The contract freezes these boundaries:

- active Wandora messaging connection must belong to the organization;
- active Ana assignment must exist before customer state is created;
- contact and conversation are canonical Wandora objects;
- later messages from the same customer reuse the same contact, conversation and active qualification work item;
- duplicate normalized events do not plan or send twice;
- discount, special price, delivery deadline, payment terms and contractual commitments require human approval before outbound send;
- disabled connection and paused employee fail before work begins;
- audit records use Wandora organization/system/digital-employee identities and normalized Wandora event correlation IDs rather than provider/runtime IDs.

Validation evidence:

- strict TypeScript passes;
- 7/7 tests pass locally;
- the same 7/7 tests pass in the digest-pinned Node 22 Docker build;
- the container test runs with networking disabled;
- the spike uses only in-memory state and fake planner/messaging implementations and does not authorize production autonomous traffic.

## Immediate next executable slice

**WANDORA WEB PREVIEW — CUSTOMER EXPERIENCE DEPLOYMENT V1**

Goal: make the already validated customer experience directly accessible to the product owner at `app.wandora.com.br` before deeper backend promotion.

Required outcome:

1. deploy the current `apps/web` build as a versioned Docker container;
2. route `app.wandora.com.br` through the existing Cloudflare/Traefik edge without exposing a direct host application port;
3. keep the preview clearly separated from real production customer data and real autonomous employee actions;
4. verify `/`, `/start`, `/team`, `/work`, `/conversations`, `/approvals`, `/company` and `/healthz` through the public hostname;
5. visually review the public desktop/mobile experience as a paying business owner;
6. capture any UX/product corrections before promoting the Ana contract into durable Core state.

The preview is intentionally allowed to use the current mock/product-contract data. Publishing the interface does not activate real Ana autonomous sending.

## Human-experience guardrails

Before implementing a capability, answer:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?

The product should answer, in plain language: who works for my company, what each employee is responsible for, what they are doing, what needs my approval, what happened, what result was produced, and which business tools are connected.

## Execution order after web preview

1. review and correct the customer experience based on direct use of `app.wandora.com.br`;
2. build **ANA VERTICAL SLICE V1** using the validated Web, Core, Supabase, Mastra and Messaging boundaries;
3. promote only the required Core schema into reviewed migrations/service code;
4. wire real customer auth/onboarding around that proven slice;
5. replace the `/start` simulated connection/activation with real provider-neutral Core operations;
6. add Google/social OAuth when the Wandora login journey exists;
7. expand employees/tools/integrations only when a validated business workflow requires them.

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
