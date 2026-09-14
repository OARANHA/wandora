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

A normal customer should understand the product through business language — company, team, responsibilities, work, approvals and outcomes — without needing to know Supabase, Evolution, Mastra, RLS, provider IDs, prompts or tokens.

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
- ADR 0010 accepts the least-privilege `wandora_core_runtime` database boundary. Migration `003` was rehearsed against a restored live snapshot and applied to production on 2026-09-14. The live role remains deliberately unusable for real connections (`CONNECTION LIMIT 0`, no password).
- ADR 0011 accepts the private Wandora Core runtime. PR #23 is merged and the Core is deployed live in `standby` on the private `wandora-core` network: process health is green, business readiness is intentionally closed, there is no published host port, no database credential and no `wandora-data` attachment. Security gate #22 must be cleared before database activation or customer traffic.
- Official WhatsApp providers remain a production option behind the same gateway.
- Model vendors are replaceable infrastructure behind a provider boundary. Do not request or hard-code a provider credential until a real provider call is materially required.
- Structured business facts belong in canonical PostgreSQL storage, not only in agent memory/RAG.
- Human approval remains mandatory for sensitive or irreversible actions until explicit product policy says otherwise.

## 5. Preferred component shape

```text
Wandora Web
  -> Wandora Core/API
      -> Business Graph / Supabase PostgreSQL
      -> Organization Adapter -> Paperclip
      -> Agent Runtime Adapter -> Mastra
      -> Tool Gateway -> authenticated/direct integrations
      -> Messaging Gateway -> Evolution / Meta / other providers
      -> Model Provider -> Mistral / Chutes / OpenAI / other providers
      -> Approval / Policy boundary
```

Mastra, Paperclip, Supabase and Evolution are technologies used by Wandora. None of them is Wandora itself.

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
- A known credential exposure or rotation gate must be cleared before introducing a dependent production credential or customer traffic. Do not bypass a security gate merely because the affected environment currently has no customer rows.

## 7. Product and development discipline

Before promoting a third-party dependency into architecture:

1. verify current upstream license and deployment constraints;
2. define the Wandora-owned boundary;
3. run a small falsifiable spike/contract test;
4. record the outcome in an ADR or research note;
5. only then promote it into a product path.

Do not build speculative surface area. Prefer vertical slices that remove a critical uncertainty and leave a reproducible artifact.

For customer-facing work, design the human journey before the technical screen. The interface should answer who is responsible, what is happening, what needs approval and what result was produced. Do not expose technical runtime/provider concepts merely because they are easy to surface.

The default customer path must aim for useful work on the same day. A multi-day manual implementation dependency may exist as an assisted premium service, but it must not be required for the normal SaaS experience.

For Ana or future employees, unknown/ambiguous external side effects must fail conservatively. In particular, an uncertain message delivery must not be retried automatically unless reconciliation proves it safe.

### Dual business perspective

For every material product or customer-journey decision, review the choice from both perspectives before execution:

1. **paying business customer** — would a normal company owner understand the value, trust the flow, reach the result without learning infrastructure, and reasonably pay for it?
2. **Wandora owner/operator** — is the capability secure, supportable, observable, scalable, commercially coherent and inexpensive enough to operate?

A choice that is technically elegant but weak from either perspective must be revised before implementation.

### Second-pass decision review

For every material product, architecture, infrastructure, security or deployment decision, do not execute immediately after the first conclusion. Use this sequence:

1. analyze the problem and form a provisional decision;
2. review that decision a second time against accepted architecture, security, reversibility, product experience, operational state, the dual business perspective and simpler alternatives;
3. actively look for a missed side effect or a better option;
4. if the second review contradicts the first, revise the decision and review again;
5. execute only after the second pass confirms the decision is still in conformity.

Routine mechanical steps inside an already-reviewed decision do not each require a separate design cycle, but any new material choice discovered during execution does.

## 8. Current execution order

Unless an active blocker or explicit user decision changes priority:

1. keep canonical documentation synchronized with accepted decisions and live operational state;
2. clear security gate #22 through a coordinated Supabase credential rotation with backup/recovery proof, service-health verification and invalidation of the exposed credentials;
3. only after #22 is green, attach the live Supabase database to the internal `wandora-data` path through reviewed source-of-truth configuration;
4. generate the Core database password outside Git/chat, store it only through the operator-controlled secret-file path, activate the smallest justified non-zero connection limit for `wandora_core_runtime`, and prove deployed Core `/readyz = 200` only through that least-privilege identity;
5. prove transaction-local tenant scoping survives pooled connection reuse in the deployed runtime;
6. wire normalized Messaging Gateway inbound traffic to Wandora Core in supervised mode;
7. wire the accepted Mastra Agent Runtime Adapter to Core, using a deterministic/fake model path first where possible and keeping model-provider selection replaceable;
8. expose tenant-authorized Core read/action APIs to Wandora Web so the existing human experience uses canonical state;
9. prove the complete real path in supervised mode before any autonomous customer traffic;
10. when the first real model call is materially required, revoke the previously Git-exposed Mistral token, generate a fresh token and configure it only through an approved operator-controlled secret path;
11. add real customer authentication/onboarding wiring around that proven journey;
12. add Google/social login and broader integrations only when a validated customer workflow requires them.

Supabase Foundation V1, Mastra Agent Runtime V1, Evolution Messaging Gateway V1, Wandora Core Multi-tenant/Auth Contract V1, Human Interface/Product Shell V1, First-Day Customer Journey V1, Ana inbound new-contact contract V1, Ana durable Core vertical slice V1 including its live database foundation, the live credential-disabled Core runtime database boundary V1, and Wandora Core Private Runtime V1 live in standby are complete or accepted. Do not repeat them unless verifying/repairing drift. The next blocking concern is security gate #22, not another runtime packaging pass. See `docs/CANONICAL_STATE.md` for exact operational status.

## 9. Definition of progress

Progress is not the number of services, screens or integrations installed. Progress means a critical product or architectural uncertainty was removed, the result is reproducible, the human experience became clearer, and the decision is recorded without weakening Wandora-owned boundaries.
