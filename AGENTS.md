# AGENTS.md — Wandora

This file is the operational authority for AI coding, infrastructure and research agents working in this repository.

## 1. Mandatory read order

Before changing code, infrastructure, product contracts or architecture, read in this order:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/` (newer accepted ADRs override older conflicting guidance);
3. `docs/architecture.md`;
4. `docs/CANONICAL_STATE.md`;
5. the README/runbook for the component being changed.

Do not silently reopen, reinterpret or override an accepted decision. If new evidence creates a conflict, stop the conflicting change, document the evidence and propose a superseding ADR.

## 2. Project identity

Wandora is a standalone product for businesses to hire, train, govern and measure digital employees alongside human teams.

Do not import assumptions, code, naming, architecture or business rules from unrelated projects unless explicitly requested and justified for Wandora.

The product thesis is business-first: Wandora is not a CRM with AI and not a generic agent builder. CRM, messaging, scheduling, finance and other systems are tools used by digital employees inside a Wandora-governed company.

A normal customer should understand the product through business language — company, team, responsibilities, work, conversations, approvals and outcomes — without needing to know Supabase, Evolution, Mastra, RLS, provider IDs, prompts or tokens.

## 3. Ownership boundary

Wandora owns all customer-facing contracts and canonical product semantics, including:

- tenancy / organizations;
- customer users, memberships and roles;
- digital-employee subscriptions and configuration;
- plans, usage and billing boundaries;
- autonomy, policy and human approval;
- canonical business identifiers and structured state;
- provider-neutral integration contracts;
- audit-facing product events.

Third-party infrastructure must always sit behind Wandora-owned adapters. Provider IDs, schemas and authorization semantics must not leak into customer-facing APIs.

## 4. Canonical architecture decisions

The following are current decisions unless superseded by a newer accepted ADR:

- Docker Engine + Docker Compose are the initial deployment substrate.
- Portainer is an operator console, not the source of truth; manifests live in Git.
- Cloudflare is the public edge and Traefik is the VPS ingress/reverse proxy.
- Paperclip is the validated laboratory candidate for organization/control-plane capabilities, behind an `Organization Adapter` and private by default.
- Mastra is the accepted initial implementation of the Wandora Agent Runtime behind an `Agent Runtime Adapter`; Mastra-specific runtime objects must not become public Wandora contracts.
- Supabase self-hosted is the selected and laboratory-validated data/auth platform for Wandora: PostgreSQL, Auth, Studio, Storage, Realtime and Supavisor as needed.
- Supabase is infrastructure, not the Wandora backend. Domain logic remains in Wandora Core/API.
- One Supabase deployment is used per product/bounded context, not one shared database for unrelated products and not one deployment per Wandora customer.
- The initial Supabase deployment may run on the current Wandora VPS while load is low; migration to a dedicated data-plane VPS must remain straightforward.
- `studio.wandora.com.br` is an administrative surface and must be strongly protected (Cloudflare Access preferred). PostgreSQL must never be publicly exposed.
- `supabase.wandora.com.br` is the stable application-facing Supabase endpoint. Future VPS migration should preserve this contract through DNS/ingress changes.
- Evolution API 2.3.7 is the accepted initial laboratory WhatsApp provider behind a Wandora-owned `Messaging Gateway`; the provider-neutral boundary has been validated with real inbound and outbound WhatsApp traffic, and digital employees must never call Evolution directly.
- Wandora Core owns canonical organization, user, membership and provider-neutral messaging-connection identity. Supabase Auth subjects and provider/runtime IDs are not Wandora business IDs.
- Initial human organization roles are `owner`, `admin` and `member`; role is not a universal permission matrix and sensitive/domain actions remain explicit Core policy decisions.
- React + Vite with TanStack Router/Query is the accepted initial Wandora Web shell. TanStack supplies application behavior, not Wandora's visual identity; customer-facing design remains Wandora-owned.
- `Empresa` is the customer-facing organization administration center; personal user preferences/security/session belong to the user menu rather than a competing generic Settings section.
- ADR 0009 accepts `apps/core` and the Ana durable Core vertical slice. Its reviewed Core multitenant/auth and Ana V1 migrations were applied to the live Wandora Supabase database on 2026-09-14 and passed the production-safe read-only post-verifier.
- ADR 0010 accepts the least-privilege `wandora_core_runtime` database boundary. Migration `003` still creates the role credential-disabled by default; the later reviewed production activation uses a dedicated secret-file credential, `CONNECTION LIMIT 4`, no `BYPASSRLS`, and a separately versioned activated-state verifier.
- ADR 0011 accepts the private Wandora Core runtime. Core is live in database mode on private `wandora-core` + internal `wandora-data`, with no published host port, read-only root filesystem, non-root execution and `/readyz = 200` only through `wandora_core_runtime`.
- ADR 0012 accepts authenticated private Gateway → Core supervised ingress with durable receipt/idempotency semantics and no model/outbound side effect by itself.
- ADR 0013 accepts the private inbound Evolution Messaging Gateway runtime. Controlled production webhook cutover and real-handset proof are green; the inbound path itself does not authorize outbound effects.
- ADR 0014 accepts Core → Mastra deterministic supervised proposal generation behind the Wandora-owned Agent Runtime Adapter. Mastra telemetry is forced off; work remains human-supervised and no live model credential is required.
- ADR 0015 accepts **Wandora Platform Admin** as the first-party owner/operator control plane. Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic surfaces, not the normal daily administration workflow and never a customer dependency.
- ADR 0016 accepts canonical `wandora.work_proposals` for safe supervised proposals. Migration `20260915_004_supervised_proposal_v1.sql` is live; only `commitment=none` proposals enter this boundary and stronger commitments remain on `wandora.approvals`.
- ADR 0017 accepts **Human Supervision Read V1**: Core validates Supabase ES256/JWKS Bearer sessions, resolves canonical identity and exposes the reviewed tenant-authorized `attention-required` read without provider/private leakage.
- ADR 0018 accepts **Human Session Bootstrap V1** through `GET /api/v1/me`, returning only canonical Wandora user and active organization memberships.
- ADR 0019 accepts **Web Human Session V1**: browser sign-in uses Supabase Auth directly with only the public/publishable key, session material stays in `sessionStorage`, public signup remains disabled, and reviewed Core routes consume the Bearer session.
- ADR 0020 accepts **Conversations Read V1**: the exact tenant-authorized conversations list route is live in production and remains provider-neutral.
- ADR 0021 accepts **Conversation Detail/History Read V1**: the exact tenant-authorized conversation detail route is live, returns a bounded canonical history under `REPEATABLE READ READ ONLY` + tenant RLS, and remains a read contract.
- ADR 0022 accepts **Private Messaging Gateway Outbound V1**: Core → Gateway outbound is a private, disabled-by-default capability using a dedicated directional HMAC and operator-mounted Evolution API key; the browser never sees provider configuration.
- ADR 0023 accepts **Human Send Proposal V1**: an authenticated `owner`/`admin` may authorize only an existing current canonical `send-text`, `commitment=none` proposal; browser text/recipient/provider/idempotency overrides remain forbidden and durable uncertain delivery is non-retryable.
- ADR 0024 accepts **Multi-Organization Selector V1**: multiple active tenant memberships require explicit human selection; the browser never silently selects the first tenant and Core authorization is unchanged.
- ADR 0025 accepts **Evolution Private Outbound Origin V1**: private Gateway outbound sends one code-pinned internal Origin and Evolution allows only the reviewed Origin set; wildcard CORS is not used.
- ADR 0026 accepts **Human Send Explicit Confirmation V1**: the first click only opens a confirmation and the second explicit click is required before the reviewed send POST.
- ADR 0027 accepts and is production-deployed as **Human Send Canonical Confirmation V2**: Core emits the exact masked recipient, canonical text and SHA-256 confirmation version; Web freezes that reviewed snapshot and final POST may carry only `confirmationVersion`; stale state fails before any durable attempt/Gateway call.
- Security gate #22 is cleared. The affected shared Supabase JWT compatibility material and shared PostgreSQL password were rotated with validated backups, old-credential invalidation, full service-health proof and production-safe verifier reruns.
- Official WhatsApp providers remain a production option behind the same gateway.
- Model vendors are replaceable infrastructure behind a provider boundary. Do not request or hard-code a provider credential until a real provider call is materially required.
- Structured business facts belong in canonical PostgreSQL storage, not only in agent memory/RAG.
- Human approval remains mandatory for sensitive or irreversible actions until explicit product policy says otherwise.

## 5. Preferred component shape

```text
Customer Wandora Web            Wandora Platform Admin
        \                         /
         \                       /
          -> Wandora Core/API <-
              -> Business Graph / Supabase PostgreSQL
              -> Organization Adapter -> Paperclip
              -> Agent Runtime Adapter -> Mastra
              -> Tool Gateway -> authenticated/direct integrations
              -> Messaging Gateway -> Evolution / Meta / other providers
              -> Model Provider -> Mistral / Chutes / OpenAI / other providers
              -> Approval / Policy boundary
```

Mastra, Paperclip, Supabase and Evolution are technologies used by Wandora. None of them is Wandora itself. Their native consoles may be used for protected engineering/diagnostics, but normal platform administration should progressively move behind Wandora-owned Platform Admin contracts and normal customer administration must remain Wandora-owned.

## 6. Infrastructure rules

- Deploy through versioned Docker Compose / Portainer-compatible stacks unless a later ADR changes this.
- Git is the source of truth; do not make an unrecorded Portainer-only production change.
- Prefer pinned image/release versions over unreviewed `latest` tags.
- Do not expose Docker socket, PostgreSQL, Redis, internal runtimes, Paperclip internals or management APIs publicly.
- Administrative surfaces require stronger controls than customer-facing APIs.
- Frequently used operator applications may receive their own HTTPS hostname when useful, but they must remain operator-only and strongly access-controlled; a convenient URL is not permission to expose the underlying machine service directly.
- Never commit secrets, tokens, private keys, OAuth client secrets, SMTP credentials or real customer credentials. A credential that ever enters Git history must be treated as compromised and rotated before use; repository privacy does not make Git a secret store.
- Design persistent data so it can be backed up, restore-tested and moved to another VPS.
- New public hostnames must be intentional contracts, not third-party product names.
- Versioned Wandora DB migrations live under `infra/stacks/supabase/migrations/`; verifiers live under `infra/stacks/supabase/verifiers/`. Never apply SQL directly from `spikes/` to the live database.
- A migration being reviewed/merged does not mean it is already applied live. Live schema changes require explicit operational preflight, reversibility/backup awareness and post-verification.
- A live database role existing does not justify activating its credential early. Runtime credentials are provisioned only together with the reviewed service deployment and secret-injection path that will consume them.
- Keep migration-state and activated-runtime verifiers separate when both are legitimate states; do not relax a fail-closed migration invariant merely because a later operator step intentionally activates a capability.
- A known credential exposure or rotation gate must be cleared before introducing a dependent production credential or customer traffic. Do not bypass a security gate merely because the affected environment currently has no customer rows.
- Credentials retained only in protected rollback snapshots after a completed rotation are compromised historical material; they must not be restored as steady-state credentials.
- For Core production recreation/candidate work, use the canonical host secret file `wandora_core_db_password`. Do not substitute the legacy `core-db-password` filename; a candidate using that wrong file failed readiness while the live canonical secret remained valid.
- A capability overlay existing on disk is not evidence that it is active. Verify the running container environment/configuration before describing Human Send or Gateway outbound as enabled.

## 7. Product and development discipline

Before promoting a third-party dependency into architecture:

1. verify current upstream license and deployment constraints;
2. define the Wandora-owned boundary;
3. run a small falsifiable spike/contract test;
4. record the outcome in an ADR or research note;
5. only then promote it into a product path.

Do not build speculative surface area. Prefer vertical slices that remove a critical uncertainty and leave a reproducible artifact.

For customer-facing work, design the human journey before the technical screen. The interface should answer who is responsible, what is happening, what needs approval and what result was produced. Do not expose technical runtime/provider concepts merely because they are easy to surface.

For platform-operator work, prefer Wandora-owned concepts and controls. Do not make Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio or Portainer a required daily workflow merely because their native UI is convenient. Promote a control into Platform Admin only after its Wandora-owned contract, authorization, audit and rollback semantics are understood.

The default customer path must aim for useful work on the same day. A multi-day manual implementation dependency may exist as an assisted premium service, but it must not be required for the normal SaaS experience.

For Ana or future employees, unknown/ambiguous external side effects must fail conservatively. In particular, an uncertain message delivery must not be retried automatically unless reconciliation proves it safe.

Read-only slices must stay read-only. Do not smuggle reply/send/edit-send/dismiss/takeover or any other outbound effect into a read contract. A separately reviewed effect route does not turn `Conversas` history into an implicit composer.

A browser-supplied organization, conversation, work or proposal identifier is always a selector, never authorization evidence. Core must independently authorize active membership and keep transaction-local tenant scope + RLS.

Human Send browser requests must not supply effectful recipient/text/provider/connection/idempotency overrides. Confirmation V2's hash is optimistic-concurrency evidence, not authorization.

### Dual business perspective

For every material product or customer-journey decision, review the choice from both perspectives before execution:

1. **paying business customer** — would a normal company owner understand the value, trust the flow, reach the result without learning infrastructure, and reasonably pay for it?
2. **Wandora owner/operator** — is the capability secure, supportable, observable, scalable, commercially coherent and inexpensive enough to operate?

A choice that is technically elegant but weak from either perspective must be revised before implementation.

### Mandatory decision cycle: decision → second adversarial review → execution → validation

For every material product, architecture, infrastructure, security or deployment decision, use this sequence:

1. **Decision** — analyze the problem and form a provisional decision with explicit premises and intended scope.
2. **Second adversarial review** — do not merely confirm the first decision. Assume it may be wrong and actively seek a concrete reason to reject it. At minimum challenge whether it is too broad, unsafe, duplicated, irreversible, based on stale/unproven state, weaker than a simpler option, operationally unrecoverable, or inconsistent with the dual business perspective and accepted architecture.
3. If the adversarial review finds a material objection, revise the decision and run the adversarial review again. Do not execute just because work has already been invested in the first option.
4. **Execution** — execute only after the adversarial challenge fails to invalidate the revised/current decision. Keep the change at the smallest reviewed scope and preserve rollback/fail-closed boundaries.
5. **Validation** — independently prove what actually happened. Validate runtime state, hashes/SHAs, health/readiness, route boundaries, capabilities/flags, durable side effects, database counters and rollback assumptions as applicable. CI green, successful command exit or intended configuration are not substitutes for post-execution validation.

Routine mechanical steps inside an already-reviewed decision do not each require a new design cycle, but any new material choice or contradictory evidence discovered during execution returns the work to step 1/2.

## 8. Current execution order

Unless an active blocker or explicit user decision changes priority:

1. keep canonical documentation synchronized with accepted decisions and observed live operational state;
2. preserve the proven Human Session, explicit multi-organization selection, `Trabalho` and `Conversas` authorization paths;
3. keep Human Send Canonical Confirmation V2 deployed with real outbound **disabled** until a separately reviewed controlled V2 activation proof is intentionally executed;
4. before activation, apply the full decision → second adversarial review → execution → validation cycle to current tenant/connection/binding/secrets/rollback state; do not assume an earlier proof still represents current production;
5. never reuse/retry historical `uncertain` outbound attempts without a separate reconciliation contract proving it safe;
6. keep stronger commercial commitments such as discount, price, deadline and payment terms on the stronger existing approval boundary;
7. expose only exact reviewed Web action routes; generic/unreviewed `/api/` and all `/internal/` paths remain closed;
8. after a green controlled Confirmation V2 proof, define the smallest normal-beta outbound policy instead of enabling autonomous customer traffic by default;
9. add Platform Admin capabilities incrementally around already-stable Wandora-owned contracts; do not pause the customer-visible employee loop to build a generic infrastructure dashboard;
10. add customer onboarding, password recovery/OAuth and organization lifecycle around the proven authorization path rather than bypassing Core;
11. only when the first real model call is materially required, revoke/replace the previously Git-exposed Mistral credential and configure the fresh value only through an approved operator-controlled secret path.

Supabase Foundation V1, Mastra Agent Runtime V1 laboratory validation, Evolution Messaging Gateway V1, Wandora Core Multi-tenant/Auth Contract V1, Human Interface/Product Shell V1, First-Day Customer Journey V1, Ana durable Core vertical slice, security gate #22, least-privilege Core runtime, supervised inbound, deterministic proposal generation, canonical `work_proposals`, Human Supervision Read, Human Session Bootstrap, Web Human Session, explicit multi-organization selection, Conversations list/history, Private Messaging Gateway Outbound code, Human Send Proposal code, Evolution private Origin fix, explicit send confirmation and Human Send Canonical Confirmation V2 are complete/implemented as recorded by their ADRs.

Current production runtime after the 2026-09-16 Confirmation V2 promotion:

```text
runtime application source head: a1ee475570c9314198068537003918a6022d8490
Core:    wandora/core:canonical-confirm-a1ee4755
Web:     wandora/web:canonical-confirm-a1ee4755
Gateway: wandora/messaging-gateway:origin-fix-94cfb4de
Core/Web/Gateway: healthy
Human Send enable flag: absent
Gateway outbound enable flag: absent
historical outbound attempts: 3 (2 uncertain, 1 succeeded)
canonical outbound messages: 1
```

The controlled real delivery proof is historical evidence; Confirmation V2 deployment itself created no new outbound attempt/message. See ADR 0027, `docs/CANONICAL_STATE.md` and `docs/infra/human-send-canonical-confirmation-v2-live.md`.

## 9. Definition of progress

Progress is not the number of services, screens or integrations installed. Progress means a critical product or architectural uncertainty was removed, the result is reproducible, the human experience became clearer, the execution survived adversarial review, validation proved the resulting state, and the decision was recorded without weakening Wandora-owned boundaries.
