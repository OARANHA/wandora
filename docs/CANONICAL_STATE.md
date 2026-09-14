# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-14**

This is the short operational handoff. Authority order remains: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file. Do not ask the user to reconstruct decisions already recorded there and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI or generic agent-builder.

The customer should see familiar business concepts: company, team, responsibilities, connected tools, work, approvals and outcomes. Provider IDs, JWT claims, RLS, Mastra runs, Evolution instances, prompts, tokens and similar implementation details stay out of the normal experience.

The normal SaaS path must aim for useful work on the same day a company subscribes. A multi-day assisted implementation may exist as a premium service, but it must not be required for the default path.

Wandora owns tenancy, customer-facing contracts, business authorization, policy, billing boundaries, canonical business state and provider-neutral adapters.

## Accepted/current technology roles

- **Cloudflare** — public edge, DNS/protection and preferred Access layer for privileged admin surfaces.
- **Traefik** — VPS ingress/reverse proxy.
- **Docker Compose + Portainer** — initial operations model; Git is source of truth.
- **Paperclip** — validated laboratory organization/control-plane candidate behind `Organization Adapter`.
- **Mastra** — accepted initial Agent Runtime behind `Agent Runtime Adapter`.
- **Supabase self-hosted** — validated PostgreSQL/Auth/data foundation.
- **Evolution API 2.3.7** — accepted initial WhatsApp provider behind `Messaging Gateway`.
- **React + Vite + TanStack Router/Query** — accepted initial customer web shell; Wandora owns the visual/product language.
- **Model providers** — replaceable behind a Wandora model-provider boundary.

## Operator/infrastructure posture

Verified laboratory services include Traefik, Portainer, Paperclip, Supabase Foundation V1 and Evolution with dedicated PostgreSQL/Redis persistence.

Frequently used operator applications may have protected HTTPS hostnames when useful. Provider databases, Redis, Docker socket and internal runtimes remain private and do not receive direct public management ports merely for convenience.

Management consoles are operator-only and require stronger protection than customer surfaces. Cloudflare Access remains recommended for privileged admin hostnames before production-grade use.

## Supabase Foundation V1 — COMPLETE

Pinned upstream: `self-hosted/v0.8.1`, commit `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

Validated foundation includes healthy PostgreSQL/Auth/Studio-related services, stable application/admin hostnames, loopback-only database/pooler host bindings and restart persistence.

Still open for production hardening: Cloudflare Access for admin surfaces, SMTP, off-host backups/restore drill and social login only when the Wandora application journey needs it.

## Mastra Agent Runtime V1 — COMPLETE

ADR 0005 accepts Mastra as the initial runtime behind the Wandora-owned adapter.

The deterministic spike proved typed tool/workflow execution, adapter isolation, invalid-input rejection, strict TypeScript verification, official Mastra build and digest-pinned Docker verification.

Persistent runtime storage, observability, concurrency/recovery, long-horizon employee memory and model-provider wiring remain later production concerns; they do not reopen the runtime boundary.

## Evolution Messaging Gateway V1 — COMPLETE

ADR 0006 accepts Evolution API 2.3.7 only as the initial WhatsApp provider behind Wandora's provider-neutral `Messaging Gateway`.

Validated:

- digest-pinned Evolution deployment with private provider data services;
- API-key protection and a real QR-paired WhatsApp instance in `state=open`;
- private per-instance `MESSAGES_UPSERT` webhook;
- normalized Wandora inbound events without provider credentials/JIDs/instance IDs in the public contract;
- deterministic inbound deduplication semantics;
- conservative outbound idempotency with `uncertain` handling;
- real inbound WhatsApp proof;
- real outbound WhatsApp proof with handset receipt confirmed;
- 10/10 runtime tests, including the Evolution 2.3.7 allow-listed `Origin` regression.

Still open for production hardening: durable inbound/outbound idempotency, reconciliation of uncertain sends, observability/reconnect/backup procedures and Cloudflare Access for the Manager.

## Wandora Core multi-tenant/auth contract V1 — COMPLETE

ADR 0007 accepts the initial Wandora-owned tenant/auth boundary. This remains a reviewed contract/schema proof; it has not been applied ad hoc to the live customer database.

Canonical identities frozen for V1:

- `organization.id` — company/tenant;
- `user.id` — canonical human user;
- `user_identity` — maps external identity subjects to Wandora users;
- `membership` — organization-scoped human membership;
- `messaging_connection.id` — provider-neutral messaging connection owned by one organization;
- provider bindings — private implementation details.

Initial human roles are `owner`, `admin`, `member`. Role is not a universal permission matrix; domain capabilities and sensitive actions remain explicit Wandora policy decisions.

The verifier proves identity mapping, organization-scoped roles, suspended-member denial, unknown-subject denial, private provider bindings and that organization A cannot resolve organization B's messaging connection even when the foreign UUID is known.

Audit-facing actions use canonical `organization_id`, `actor_type` and Wandora-owned `actor_id`; provider/runtime IDs must not become audit actor IDs.

## Human Interface / Product Shell V1 — COMPLETE

ADR 0008 accepts the initial customer-facing shell under `apps/web` using React 19, Vite 8, TanStack Router, TanStack Query, Tailwind CSS and Lucide. TanStack Start is intentionally deferred until SSR/server functions provide a concrete benefit.

Customer navigation is frozen for this stage around:

- **Início** — activity, outcomes and what needs attention;
- **Equipe** — humans/digital employees, responsibilities, current work and autonomy;
- **Trabalho** — business work rather than technical workflows;
- **Conversas** — provider-neutral company conversations;
- **Aprovações** — human decisions beyond employee autonomy;
- **Empresa** — business data, people, knowledge, tools/connections and plan.

The shell is containerized with pinned Node 22 for build and pinned Nginx for runtime. TypeScript/Vite build, SPA routing, desktop/mobile Chromium smoke and customer-language review are green.

## First-Day Customer Journey V1 — COMPLETE

`docs/product/FIRST_DAY_CUSTOMER_JOURNEY_V1.md` freezes the path from first entry to the first supervised employee start.

Standalone `/start` flow:

1. identify the company with only essential information;
2. choose the first business outcome;
3. receive a digital-employee recommendation with explicit responsibility and approval boundary;
4. connect only the first required work tool;
5. teach only the minimum company facts required to begin safely;
6. review initial autonomy and start supervised work.

The normal product must not depend on a Wandora consultant to make progress. Learning is progressive: history remains traceable, corrections may become proposed durable guidance, durable company guidance requires the appropriate approval path, and transactional facts remain canonical structured state rather than conversational/model memory.

## Ana inbound new-contact contract V1 — COMPLETE

`docs/product/ANA_INBOUND_NEW_CONTACT_V1.md` and `spikes/ana-inbound-new-contact-v1` freeze the first employee business contract.

Ana's first responsibility is deliberately narrow: receive a normalized inbound WhatsApp contact, acknowledge/qualify it using confirmed company knowledge, and keep one understandable qualification work item moving. A new message does not automatically become a sales opportunity.

Frozen boundaries:

- active Wandora messaging connection must belong to the organization;
- active Ana assignment must exist before customer state is created;
- contact and conversation are canonical Wandora objects;
- later messages from the same customer reuse the same contact, conversation and active qualification work;
- duplicate normalized events do not plan or send twice;
- discount, special price, delivery deadline, payment terms and contractual commitments require human approval before outbound send;
- disabled connection and paused employee fail before work begins;
- audit records use Wandora-owned identities and normalized event correlation IDs rather than provider/runtime IDs.

Evidence: strict TypeScript plus 7/7 tests locally and in the pinned Node 22 Docker build with networking disabled. The spike uses in-memory state/fake planner/fake transport and does not authorize production autonomous traffic.

## Wandora Web Preview V1 — COMPLETE / PUBLIC PRODUCT REVIEW

`docs/product/WANDORA_WEB_PREVIEW_V1.md` records the first browser-accessible customer experience.

Public preview:

- `https://app.wandora.com.br`
- `https://app.wandora.com.br/start`

Deployment boundary:

- versioned `wandora-web` Docker image;
- container attached to private `wandora-edge` only;
- no direct application host port;
- Traefik `websecure` route;
- `app.wandora.com.br` proxied by Cloudflare;
- preview responses carry security headers plus `X-Robots-Tag: noindex, nofollow, noarchive`.

Public validation on 2026-09-14 proved HTTP 200 for `/`, `/start`, `/team`, `/work`, `/conversations`, `/approvals`, `/company` and `/healthz`.

A Playwright Chromium smoke against the **public hostname** passed at 390×844 and 1440×1100 with no console errors, no horizontal overflow, correct standalone `/start` behavior and a complete six-step journey ending at `Início`. Public desktop/mobile screenshots were visually reviewed.

This is still a product preview using mock/product-contract data. The WhatsApp connection/start buttons do not provision real customer resources or activate autonomous Ana work.

## Immediate product gate

**PRODUCT-OWNER CUSTOMER EXPERIENCE REVIEW**

Before deeper backend promotion, the product owner should use `https://app.wandora.com.br/start` and then navigate the shell as if they had just paid for Wandora.

Review specifically:

- does the first five minutes make sense without explanation from Wandora staff?
- is the language business-like rather than technical?
- is it obvious what Ana is responsible for and when she needs approval?
- does `Início` answer what is happening, what was achieved and what needs attention?
- do `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa` feel like managing a company rather than configuring software?
- what feels unnecessary, confusing or visually weak?

UX/product corrections discovered here take precedence over backend assumptions.

## Next executable technical slice after review

**ANA VERTICAL SLICE V1 — DURABLE CORE STATE + SUPERVISED REAL-PATH WIRING**

Goal: promote only the accepted Ana contract into durable Wandora Core state/services and connect the already validated Web, Supabase, Agent Runtime and Messaging Gateway boundaries.

Expected scope:

1. durable organization-scoped digital-employee assignment/status;
2. durable contact and conversation state;
3. inbound/outbound message records;
4. one qualification work item per active customer qualification context;
5. durable normalized-event/idempotency receipt;
6. durable approval request and policy context;
7. canonical audit trail;
8. supervised Agent Runtime proposal path;
9. provider-neutral Messaging Gateway wiring;
10. Product Shell reads showing the same state the customer already understands.

Do not enable unsupervised production customer traffic merely because the vertical path becomes technically executable.

## Human-experience guardrails

Before implementing a capability, answer:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?

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

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Respect the public customer-experience review gate. After product-owner review/corrections, continue with `ANA VERTICAL SLICE V1` unless real repository/runtime state proves it is already complete.
