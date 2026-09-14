# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-13**

This file is the short operational handoff for a new chat/agent. It does not replace ADRs. If it conflicts with an accepted ADR, the ADR wins.

## Continuity contract

Read, in order: `AGENTS.md`, accepted ADRs, `docs/architecture.md`, then this file. Do not ask the user to reconstruct decisions already recorded there and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI or generic agent-builder.

The human customer should see familiar business concepts: company, team, responsibilities, connected tools, work, approvals and outcomes. Terms such as provider IDs, JWT claims, RLS, Mastra runs, Evolution instances, prompts or tokens are implementation details and should stay out of the normal product experience.

Wandora owns tenancy, customer-facing contracts, business authorization, policy, billing boundaries, canonical business state and provider-neutral adapters.

## Accepted/current technology roles

- **Cloudflare** — public edge, DNS/protection and preferred Access layer for privileged admin surfaces.
- **Traefik** — VPS ingress/reverse proxy.
- **Docker Compose + Portainer** — initial operations model; Git is source of truth.
- **Paperclip** — validated laboratory organization/control-plane candidate behind `Organization Adapter`.
- **Mastra** — accepted initial Agent Runtime behind `Agent Runtime Adapter`.
- **Supabase self-hosted** — validated PostgreSQL/Auth/data foundation.
- **Evolution API 2.3.7** — accepted initial laboratory WhatsApp provider behind `Messaging Gateway`.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## VPS / infrastructure status

Verified laboratory services include Traefik, Portainer, Paperclip, Supabase Foundation V1 and Evolution API 2.3.7 with dedicated PostgreSQL/Redis persistence.

`manager.wandora.com.br` is an operator-only Evolution Manager surface through Cloudflare/Traefik. Cloudflare Access remains recommended before production-grade use.

Provider databases, Redis, Docker socket and internal runtimes are not public services.

## Supabase Foundation V1 — COMPLETE

Pinned upstream: `self-hosted/v0.8.1`, commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

Validated foundation includes healthy PostgreSQL/Auth/Studio-related services, stable application/admin hostnames, loopback-only database/pooler host bindings and persistence across restart.

Operational hardening still open includes Cloudflare Access for admin surfaces, production SMTP, off-host backups/restore drill and social login only when the Wandora application flow needs it.

## Mastra Agent Runtime V1 — COMPLETE

ADR 0005 accepts Mastra as the initial runtime behind the Wandora-owned adapter.

The deterministic spike proved typed tool/workflow execution, adapter isolation, invalid-input rejection, strict TypeScript verification, runtime tests, official Mastra build and digest-pinned Docker verification.

Persistent runtime storage, observability, concurrency/recovery and model-provider wiring remain later production hardening and do not reopen the runtime boundary.

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
- 10/10 runtime tests after adding regression coverage for Evolution 2.3.7's required allow-listed `Origin`.

Production hardening still open: durable inbound/outbound idempotency state, reconciliation for uncertain sends, observability/reconnect/backup procedures and Cloudflare Access for the Manager.

## Wandora Core multi-tenant/auth contract V1 — COMPLETE

ADR 0007 accepts the first Wandora-owned tenant/auth boundary. The validation is a contract/schema proof on a disposable Supabase PostgreSQL container; it has **not** been applied ad hoc to the live Wandora database.

Canonical identities now frozen for V1:

- `organization.id` — Wandora company/tenant ID;
- `user.id` — Wandora human-user ID;
- `user_identity` — maps external login subjects such as Supabase Auth `sub` to canonical users;
- `membership` — organization-scoped human membership;
- `messaging_connection.id` — provider-neutral connection ID owned by one organization;
- provider bindings — private implementation details in an internal schema.

Initial human roles are deliberately simple: `owner`, `admin`, `member`. Role is not a universal permission matrix; domain capabilities, sensitive operations and approval requirements remain explicit Wandora Core policy decisions.

The falsifiable PostgreSQL verifier proves:

- Supabase identity subject -> canonical Wandora user mapping;
- organization-scoped role resolution;
- organization A cannot read or resolve organization B's messaging connection even when the foreign UUID is known;
- suspended memberships lose access;
- unknown auth subjects see no tenant data;
- provider binding details are not readable by the authenticated role;
- the verifier passes against `supabase/postgres:17.6.1.136` without touching live Supabase state.

Future audit actions must carry canonical `organization_id`, `actor_type` and Wandora-owned `actor_id`; provider/runtime IDs must not become audit actor IDs.

## Immediate next executable slice

**FIRST DIGITAL EMPLOYEE — ROLE + MINIMUM HUMAN-CENTERED WORKFLOW V1**

Goal: choose one digital employee job that a real small-business owner would immediately understand and value, then define the smallest end-to-end workflow using the already validated Core identity, Mastra runtime and Messaging Gateway boundaries.

Required outcome:

1. define the employee in business language: role, responsibility, boundaries and expected outcome;
2. define the human operator/customer journey before implementation details;
3. select one narrow workflow with a clear trigger, work performed, decision points, approval points and measurable completion state;
4. define the canonical business records the workflow needs without turning Wandora into a generic CRM;
5. define what the employee may do autonomously and what must require human approval;
6. use canonical organization/actor IDs from ADR 0007;
7. use `Messaging Gateway` rather than Evolution directly;
8. use `Agent Runtime Adapter` rather than Mastra objects directly;
9. expose observable status/outcome to the human instead of technical traces;
10. produce a falsifiable vertical-slice contract before building broad UI.

Do not start with a giant dashboard, generic chatbot, prompt editor, workflow canvas or technical integration setup wizard.

## Human-experience guardrails

A human should eventually be able to understand Wandora without knowing what Supabase, Evolution, Mastra, RLS, MCP or an LLM is.

The product should answer, in plain language:

- Who works for my company?
- What is each person/digital employee responsible for?
- What are they doing now?
- What needs my approval?
- What happened and what result did it produce?
- Which business tools are connected?

Technical detail belongs in operator/admin surfaces, not the normal customer journey.

## Execution order after first employee/workflow definition

1. build the first end-to-end vertical slice using the validated Supabase, Core, Mastra and Messaging boundaries;
2. promote only the required Core schema into reviewed migrations/service code;
3. add customer login/onboarding around that real slice rather than around empty infrastructure;
4. add Google/social OAuth when the login journey exists;
5. expand tools/integrations only when a validated employee workflow requires them.

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
