# Wandora — Canonical Architecture

## Purpose

This document describes the current Wandora architecture for the laboratory / early-beta foundation. Wandora boundaries remain provider-neutral even where a concrete implementation has been selected.

Authority order is `AGENTS.md` → accepted ADRs → this document → `docs/CANONICAL_STATE.md` → component README/runbook.

## Product model

The customer should perceive a company operating with human and digital employees. Technical implementation details are intentionally hidden.

```text
Customer Wandora Web             Wandora Platform Admin
        \                           /
         \                         /
          -----> Wandora Core/API <-----
                    |
                    +--> canonical business state / Supabase PostgreSQL
                    +--> Organization Adapter -> Paperclip candidate
                    +--> Agent Runtime Adapter -> Mastra
                    +--> Tool Gateway -> authenticated integrations
                    +--> Messaging Gateway -> Evolution / Meta / other providers
                    +--> Model Provider Gateway -> Mistral / Chutes / OpenAI / others
                    +--> Approval / Policy boundary
```

Wandora is not a CRM-with-AI and not a generic agent builder. Messaging, CRM, scheduling, finance and other systems are tools/business surfaces used by employees inside a Wandora-governed organization.

Every material product or architecture choice is checked from two perspectives before execution: paying business customer and Wandora owner/operator. Operational discipline is **decision → second review → execution**.

## Wandora Web

The customer application is React 19 + Vite with TanStack Router and TanStack Query. Tailwind CSS and Wandora-owned visual patterns provide the design layer; TanStack supplies application behavior rather than visual identity.

Current customer navigation is `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

`Empresa` is the organization-administration center: company data, people, knowledge, tools/connections and plan/billing. Personal preferences, notifications, security and session actions belong to the current-user menu.

The browser never calls Paperclip, Mastra, Evolution, model providers or privileged database/admin capabilities directly.

The current public shell is still preview/product-contract data. The next integration boundary is to expose tenant-authorized Core supervision/review state so a human can see and act on a digital employee proposal without exposing private implementation storage.

## Wandora Platform Admin

ADR 0015 defines a first-party **Wandora Platform Admin** as the owner/operator control plane for normal SaaS administration.

It is separate from tenant-scoped customer administration. A customer organization `owner` or `admin` does not become a Wandora platform administrator.

Platform Admin is intended to progressively centralize Wandora-owned views/actions for:

- organizations/tenants and lifecycle;
- human users, memberships and access state;
- digital employees, responsibilities, autonomy and status;
- prompt/instruction versions once those have a canonical Wandora contract;
- workflows and tools/capabilities;
- model/provider selection, usage and cost visibility;
- messaging connections and provider-neutral health;
- work, conversations, supervision and approvals;
- traces/execution diagnostics through Wandora-owned observability contracts;
- plans, limits, billing-support state and usage;
- audit/security events;
- service health and incidents;
- controlled enable/disable/suspend/recovery actions.

This target is implemented incrementally. It is not permission to surface raw provider schemas or to build a generic infrastructure dashboard ahead of proven product needs.

Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic/emergency surfaces. They may be extremely useful to Wandora operators, but they are not the required daily workflow and are never a customer dependency.

The operator should normally think in Wandora vocabulary — company, employee, responsibility, autonomy, work, conversation, approval, connection, model, cost, health and incident — rather than provider instance IDs, Mastra runtime objects, database internals or container names.

## Wandora Core/API

Wandora Core owns product semantics and business authorization:

- organization/tenant identity;
- canonical human users, memberships and roles;
- digital-employee identity, assignment, status and autonomy;
- contacts, conversations, messages and work;
- human approvals and policy decisions;
- canonical audit events;
- plans, usage and billing boundaries;
- provider-neutral adapter contracts.

`apps/core` is the promoted durable Core package. ADR 0009 defines Ana's durable vertical slice, ADR 0010 the least-privilege database identity, ADR 0011 the private deployable runtime, ADR 0012 the authenticated supervised Gateway ingress and ADR 0014 the Mastra deterministic supervised proposal path. ADR 0015 defines the first-party operator control-plane direction around those boundaries.

### Identity and tenancy

ADR 0007 freezes the initial identity boundary:

- `organization.id` is the company/tenant identity;
- `user.id` is the canonical human identity;
- `user_identity` maps external auth subjects to Wandora users;
- `membership` binds a user to an organization;
- initial roles are `owner`, `admin`, `member`;
- `messaging_connection.id` is provider-neutral and belongs to exactly one organization;
- provider bindings live in a private schema.

Supabase Auth handles identity/session issuance. Its JWT `sub` is not a Wandora business ID. Core policy remains authoritative for sensitive/domain actions; role alone is not a universal capability matrix.

### Core database runtime boundary

ADR 0010 defines the PostgreSQL identity used by deployed Core code:

- `wandora_core_runtime` has no `BYPASSRLS`, role/database administration or provider-binding access;
- each Core transaction sets `wandora.organization_id` transaction-locally before tenant-owned queries;
- RLS independently enforces organization isolation and pooled connections return unscoped after commit/rollback;
- foundation configuration tables are read-only to Core;
- mutable workflow tables expose only the table/column privileges required by current services;
- canonical audit writes use tenant-checked `wandora.append_core_audit(...)`;
- browser/member policies target `authenticated`, while Core policies target only `wandora_core_runtime`.

Migration `20260914_003_core_runtime_role_v1.sql` creates the role credential-disabled. The reviewed live operator activation supplies a dedicated secret-file credential and exactly `CONNECTION LIMIT 4`, matching the Core pool maximum.

A same-physical-connection live proof confirmed tenant scope resets after commit/reuse.

### Core private runtime boundary

ADR 0011 packages Core as a private Node 22 service. The runtime:

- runs as non-root `node`;
- uses a read-only root filesystem;
- drops all Linux capabilities;
- enables `no-new-privileges`;
- publishes no host port;
- attaches to `wandora-core` and `wandora-data`;
- reads secrets only from operator-controlled mounted files.

`/healthz` measures process health while `/readyz` measures permission to perform business work.

Current live Core:

```text
container: wandora-core
image: wandora/core:mastra-deterministic-bd40a438
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
healthz: 200
readyz: 200
published host ports: none
```

Security gate #22 was completed before database activation. Shared Supabase/PostgreSQL credentials affected by the earlier exposure were rotated and old values are not used by Core.

## Canonical business state

Supabase self-hosted provides PostgreSQL/Auth/data infrastructure. It is not the Wandora business backend.

The live database contains durable state for the first Ana workflow:

- digital employees;
- contacts;
- conversations;
- inbound/outbound messages;
- qualification work items;
- approvals;
- canonical audit records;
- private normalized-event receipts;
- private outbound-attempt/idempotency state.

Tenant relationships are protected with organization-scoped constraints and RLS. Browser clients have no direct grants to Ana's internal Core state.

Structured business truth — prices, payments, schedules, permissions, approvals and similar facts — belongs in canonical PostgreSQL state, never solely in agent memory/RAG.

An explicitly labeled internal Wandora laboratory tenant exists for controlled live proofs. It is test infrastructure, not customer data.

## Ana supervised inbound path

Ana's current live responsibility remains narrow: receive a normalized inbound WhatsApp contact and keep one understandable qualification work item moving under human supervision.

```text
Evolution webhook
      |
      v
Messaging Gateway
  -> verify provider JWT
  -> reject wrong instance
  -> ignore unsupported event types
  -> normalize provider payload
      |
      v
Wandora Core private ingress
  -> verify Gateway HMAC
  -> validate tenant + messaging connection
  -> persist contact/conversation/inbound message
  -> create/reuse qualification work
      |
      v
Mastra Agent Runtime Adapter
  -> deterministic proposal
      |
      v
private durable receipt result
  -> supervision-required
  -> work attention-required
  -> no outbound side effect
```

The production Gateway entry point is the supervised service, not the outbound-capable full `AnaInboundService`.

Commercial commitments such as discount, special price, delivery deadline, payment terms and contractual commitments remain on the stronger human-approval boundary.

## Agent Runtime

Mastra is the accepted initial implementation behind the Wandora-owned `AgentRuntime` adapter (ADR 0005 and ADR 0014). Mastra workflow/run IDs and storage representations never become public product contracts.

### Deterministic live mode

The live mode is:

`WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic`

It is valid only when Core runs in database mode and authenticated supervised Gateway ingress is enabled.

The adapter forces `MASTRA_TELEMETRY_DISABLED=true` before dynamically importing Mastra modules. The production Compose overlay also sets the same value at process start.

The workflow receives only normalized customer text. It does not receive organization ID, connection ID, customer phone, provider ID or database ID.

The workflow returns only a Wandora-owned proposal:

```text
kind = send-text
commitment = none
text = deterministic supervised qualification text
rationale = Wandora-owned explanation
```

The proposal is currently stored only inside the private durable inbound receipt result. That storage is internal evidence for the narrow proof and is **not** the final customer-facing proposal model.

No model-provider credential is required by deterministic mode.

A previously Git-exposed Mistral token is compromised and must never be reused. A fresh token is requested only when the first genuinely model-backed supervised proposal is materially required.

## Messaging Gateway

Evolution API 2.3.7 is the accepted initial WhatsApp provider behind Wandora's Messaging Gateway (ADRs 0006 and 0013).

Current live Gateway:

```text
container: wandora-messaging-gateway
image: wandora/messaging-gateway:inbound-v1-2a49c066
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
network: wandora-core
published host ports: none
healthz: 200
```

Evolution → Gateway authentication uses per-instance JWT HS256. Gateway → Core authentication uses a distinct HMAC-SHA256 secret. The two credentials are independent.

The normalized internal event contains only:

- deterministic Wandora event ID;
- canonical messaging connection ID;
- normalized sender address;
- text;
- occurred-at timestamp.

Raw provider instance name, API key, server URL and raw provider message ID do not enter the Core contract.

Unsupported outbound echoes, group/status senders and non-text events are ignored for the current text-only V1 boundary.

Real handset inbound behavior was proven before Mastra activation. A later controlled synthetic live proof also exercised the complete JWT → Gateway → HMAC → Core → Mastra → PostgreSQL chain.

## Supervised proposal side-effect boundary

The live deterministic path must leave:

```text
work: attention-required
receipt: completed / supervision-required
proposal: present
approvals: 0 for the event
outbound attempts: 0 for the event
outbound messages: 0 for the event
```

A completed duplicate returns the durable stored proposal. Replay equality is structural because PostgreSQL `jsonb` does not preserve object key order.

The current live path proves orchestration, tenancy, authentication and side-effect safety. It does not prove autonomous outbound messaging or language quality.

## Approval and audit identity

Audit-facing product events use Wandora-owned semantics:

- canonical `organization_id`;
- `actor_type` such as human, digital employee or system;
- canonical Wandora `actor_id`;
- normalized correlation IDs.

Supabase Auth subjects, Evolution IDs and Mastra run IDs are implementation metadata, not audit actor identity.

## Operator and infrastructure boundary

Cloudflare is the public edge and Traefik is the VPS ingress/reverse proxy. Docker Engine/Compose remains the initial deployment substrate; Git remains infrastructure source of truth.

Customer/public contracts may include `wandora.com.br`, `app.wandora.com.br`, `api.wandora.com.br`, `hooks.wandora.com.br` and `supabase.wandora.com.br` when justified.

Protected native operator surfaces may include Mastra Studio, Paperclip UI, Supabase Studio, Evolution Manager and Portainer. These require stronger access controls and exist for engineering, diagnostics and emergency recovery. Their presence does not make them the Wandora operating model.

PostgreSQL, Redis, Docker socket, Paperclip internals, Mastra internals, Core runtime ports and provider management ports remain private.

PostgreSQL has zero directly published ports; Supavisor remains localhost-only; Core and Messaging Gateway publish no host ports.

## Migration and source-of-truth discipline

Versioned Wandora database migrations live under `infra/stacks/supabase/migrations/`; falsifiable verifiers live under `infra/stacks/supabase/verifiers/`. Spike SQL is never applied directly to the live database.

Mutation-heavy behavioral verifiers remain disposable-only and must never run against live customer data.

Secrets are never stored in Git. Any credential that enters Git history is considered compromised and must be rotated before use.

Operational details include:

- `docs/infra/supabase-credential-rotation-gate22.md`;
- `docs/infra/core-runtime-role-v1.md`;
- `docs/infra/core-runtime-database-activation-v1.md`;
- `docs/infra/core-mastra-deterministic-live-activation-v1.md`.

## Near-term execution sequence

1. keep canonical documentation synchronized;
2. define **Supervised Proposal Review V1** as a Wandora-owned customer-facing contract;
3. expose tenant-authorized Core reads for attention-required work, conversation context and proposal data without exposing private receipt tables;
4. design explicit human actions such as approve/send, edit then send, or dismiss before wiring outbound behavior;
5. preserve the stronger approval path for commercial commitments;
6. prove cross-tenant and inactive/disabled actor denial;
7. connect the Web review experience to canonical Core APIs;
8. add Platform Admin capabilities incrementally around stable Wandora-owned contracts, without delaying the first customer-visible employee loop;
9. only after the human-review contract is proven, decide whether a first real model-backed supervised proposal is materially useful;
10. request a fresh model credential only at that point;
11. do not enable automatic outbound sends merely because deterministic Mastra is live.

## Non-goals for the current phase

- autonomous outbound customer messaging;
- building the entire Platform Admin before the first employee workflow is customer-visible;
- rebuilding every native provider console inside Wandora;
- Kubernetes;
- microservices for every domain;
- generic prompt/workflow builder as the customer product;
- bespoke vector database without demonstrated need;
- one Supabase deployment per customer;
- customer access to provider admin UIs;
- marketplace before the first employee workflow is proven.