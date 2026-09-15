# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-15**

Authority order: `AGENTS.md` → accepted ADRs → `docs/architecture.md` → this file → component README/runbook. Do not ask the user to reconstruct decisions already recorded here and do not silently reopen accepted boundaries.

## Product thesis

Wandora is a company-operating layer built around human and digital employees, not a CRM-with-AI and not a generic agent builder.

A normal customer should see company, team, responsibilities, work, conversations, approvals and outcomes. Supabase, Mastra, Evolution, RLS, provider IDs, prompts, tokens and infrastructure topology remain implementation details.

The default SaaS path aims for useful supervised work on the same day. Multi-day assisted implementation may exist as a premium service, but it is not the default dependency.

Every material product/customer-journey decision must be checked twice before execution from two perspectives:

- a paying business customer asking whether the value is understandable, trustworthy, useful the same day and worth paying for;
- the Wandora owner/operator asking whether the capability is secure, supportable, observable, scalable, commercially coherent and operationally affordable.

Operational discipline remains **decision → second review → execution**.

## Human experience — CURRENT

Public product preview:

- `https://app.wandora.com.br`
- `https://app.wandora.com.br/start`

Customer navigation remains:

- **Início** — what is happening, results and what needs attention;
- **Equipe** — human/digital employees, responsibilities, work and autonomy;
- **Trabalho** — business work rather than technical workflows;
- **Conversas** — provider-neutral conversations;
- **Aprovações** — human decisions beyond employee autonomy;
- **Empresa** — organization administration: company data, people, knowledge, tools/connections and plan/billing.

The current-user menu owns personal preferences, notifications, security and session actions.

The current Web shell still uses preview/mock product-contract data. It must not be mistaken for a connected production customer account until tenant-authorized Core reads/actions are wired.

## Platform administration direction — ACCEPTED, NOT YET COMPLETE

ADR 0015 accepts **Wandora Platform Admin** as the first-party control plane for the Wandora owner/operator.

The long-term normal operating model is **not** to require daily administration through Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio or Portainer. Those native consoles remain strongly protected engineering, diagnostics and emergency-recovery tools.

Platform Admin will be implemented incrementally behind Wandora-owned Core/operator APIs and adapters. Its intended scope includes:

- organizations/tenants and lifecycle;
- human users, memberships and access state;
- digital employees, responsibilities, status and autonomy;
- prompt/instruction versions when canonicalized;
- workflows, tools and capabilities;
- models/providers, cost and usage visibility;
- messaging connections and provider-neutral health;
- work, conversations, supervision and approvals;
- traces/execution diagnostics through Wandora-owned observability contracts;
- plans, limits and billing-support state;
- audit/security events;
- service health/incidents and controlled recovery actions.

Customer administration and Platform Admin are separate trust planes. A tenant `owner` or `admin` does not gain platform-wide access.

This direction does not change the immediate priority: first make the real supervised employee loop visible and usable through the existing customer Wandora Web. Platform Admin follows in vertical slices around stable contracts rather than as a speculative generic infrastructure dashboard.

## Accepted technology roles

- Cloudflare — public edge/protection and preferred Access layer for privileged surfaces.
- Traefik — VPS ingress/reverse proxy.
- Docker Compose + Portainer — initial operations model; Git remains source of truth.
- Supabase self-hosted — PostgreSQL/Auth/data foundation, not Wandora business backend.
- Wandora Core — canonical business semantics and authorization.
- Mastra — accepted initial Agent Runtime behind Wandora's adapter.
- Paperclip — validated organization/control-plane candidate behind a Wandora-owned adapter; not the customer/operator product itself.
- Evolution API 2.3.7 — accepted initial WhatsApp provider behind Messaging Gateway.
- React 19 + Vite with TanStack Router/Query — accepted customer web shell.
- Wandora Platform Admin — accepted first-party owner/operator control-plane direction.
- Model providers — replaceable behind a Wandora-owned boundary; no real provider is required by the current live path.

## Current live topology

```text
WhatsApp / Evolution 2.3.7
        |
        | per-instance webhook JWT HS256
        v
Wandora Messaging Gateway
        |
        | Wandora HMAC-SHA256
        v
Wandora Core
        |
        +--> Mastra deterministic supervised proposal
        |
        +--> wandora_core_runtime + transaction-local tenant scope
        v
Supabase PostgreSQL
```

The two messaging trust boundaries use distinct credentials. Docker network membership is transport isolation, not caller authentication.

Neither Core nor Messaging Gateway publishes a host port. Core has no public hostname merely for internal Gateway communication.

## Completed foundations

### Supabase Foundation V1 — COMPLETE

Pinned upstream: `self-hosted/v0.8.1` / `8c7a4d9dbbaf8b552893822e89d7bf06f33f9220`.

PostgreSQL remains non-public and Supavisor remains localhost-only. Public Supabase API and privileged Studio surfaces retain their separate edge/access policies.

### Core multi-tenant/auth contract V1 — COMPLETE + LIVE

ADR 0007 freezes canonical `organization`, `user`, external identity mapping, `membership` and provider-neutral `messaging_connection` semantics. Initial human roles are `owner`, `admin`, `member`; role is not a universal capability matrix.

### Ana durable Core vertical slice V1 — COMPLETE + LIVE

ADR 0009 promotes Ana's first inbound qualification workflow into durable Core/PostgreSQL state.

Canonical state covers digital employees, contacts, conversations, messages, qualification work, approvals and canonical audit records. Private durable state covers normalized inbound-event receipts and outbound-attempt/idempotency state.

Safety semantics remain:

- tenant relationships use organization-scoped constraints;
- foreign or disabled messaging connections fail before customer-state creation;
- paused employees fail before customer-state creation;
- duplicate/in-progress inbound receipt handling is durable;
- browser clients have no direct grants to Ana's internal state;
- commercial commitments require human approval;
- ambiguous outbound delivery becomes `delivery-uncertain` and is not blindly retried;
- provider/runtime identifiers do not become customer/audit identity.

### Core runtime database boundary V1 — LIVE + ACTIVATED

ADR 0010 defines `wandora_core_runtime` as the deployed Core PostgreSQL identity.

Current invariant:

```text
LOGIN: true
CONNECTION LIMIT: 4
SUPERUSER: false
CREATEDB: false
CREATEROLE: false
INHERIT: false
REPLICATION: false
BYPASSRLS: false
password: present only in operator-controlled secret file
```

Every Core repository transaction sets `wandora.organization_id` transaction-locally. RLS provides independent tenant isolation and pooled connections return unscoped after commit/rollback.

Migration `20260914_003_core_runtime_role_v1.sql` still creates the role credential-disabled by default. Live activation is a separate operator state proven by the activated-state verifier.

### Security gate #22 — COMPLETE

The affected shared Supabase HS256/JWT compatibility material and shared PostgreSQL password were rotated before Core database activation.

Accepted evidence includes old-credential rejection, new-credential acceptance, healthy Supabase services and zero directly published PostgreSQL ports. Historical pre-rotation credentials are recovery evidence only and must never return to steady-state use.

### Messaging Gateway → Core Supervised V1 — LIVE

ADRs 0012 and 0013 establish the private provider-neutral inbound path.

Current live Messaging Gateway state:

```text
container: wandora-messaging-gateway
image: wandora/messaging-gateway:inbound-v1-2a49c066
status: running / healthy
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
supplemental secret-reader group: 987
network: wandora-core
published host ports: none
GET /healthz: 200
```

Provider-side ingress is authenticated with Evolution per-instance JWT HS256. Gateway normalizes only the accepted Wandora inbound text contract and then authenticates to Core with a separate HMAC-SHA256 secret.

Raw Evolution instance identity, API key, server URL, JID/provider message ID and provider-private payload semantics do not cross into Core contracts.

Unsupported events such as outbound echoes, groups/status senders and non-text messages are ignored for this V1 path rather than creating customer state.

A real WhatsApp handset inbound path has already been proven before Mastra live activation. The current internal laboratory tenant remains clearly labeled as Wandora test infrastructure, not customer data.

## Core → Mastra Deterministic Supervised Proposal V1 — LIVE

ADR 0014 is implemented and live as of **2026-09-15**.

Merged production code:

```text
PR #33
main commit: bd40a4380f4a71be0b6ff0028dfc9799ef9fa68c
image: wandora/core:mastra-deterministic-bd40a438
```

Current live Core runtime:

```text
container: wandora-core
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
supplemental secret-reader group: 987
networks: wandora-core + wandora-data
published host ports: none
GET /healthz: 200
GET /readyz: 200
PostgreSQL identity: wandora_core_runtime
```

Mastra is loaded behind the Wandora-owned `AgentRuntime` interface. Framework telemetry is forced off before Mastra modules are dynamically loaded and is also disabled by the production Compose overlay.

The deterministic workflow receives only normalized customer text and returns only the Wandora-owned proposal contract:

```text
kind: send-text
commitment: none
text: deterministic supervised qualification proposal
rationale: Wandora-owned explanation
```

Organization IDs, connection IDs, customer phone, provider IDs and database identifiers are not included in the Mastra workflow input.

### Live activation evidence

The exact Core build context used on the VPS was verified byte-for-byte against commit `bd40a438…`, including the canonical package lock. Node 22.23.2 typecheck/build passed before image creation.

A private parallel candidate container was started before production replacement and proved:

```text
healthz: 200
readyz: 200
published ports: 0
networks: wandora-core + wandora-data
user: node
read-only root filesystem: true
agentRuntime: mastra-deterministic
```

Production promotion retained an automatic rollback path to the prior image and completed without rollback.

A direct synthetic signed Core event then proved durable supervised behavior:

```text
receipt: completed / supervision-required
proposal: present / send-text / commitment none
work: attention-required
approvals for event: 0
outbound attempts for event: 0
inbound messages for event: 1
outbound messages for event: 0
replay: 200 / duplicate=true
replay result: structurally identical to durable jsonb result
```

A second synthetic proof exercised the full private messaging chain:

```text
Evolution-compatible JWT webhook
  -> live Messaging Gateway
  -> normalized provider-neutral event
  -> Gateway/Core HMAC
  -> live Core
  -> Mastra deterministic proposal
  -> PostgreSQL durable supervision result
```

That end-to-end proof returned 200 on first submission and replay and persisted:

```text
receipt: completed / supervision-required
proposal: present / send-text / commitment none
work: attention-required
approvals: 0
outbound attempts: 0
inbound messages: 1
outbound messages: 0
provider-private sentinel in canonical result/message state: absent
```

The current live path therefore proves orchestration and safety boundaries, not autonomous customer messaging.

## CI status

GitHub Actions `Core CI` and `Messaging Gateway CI` are active on pull requests and pushes to `main`.

For PR #33 and the resulting `main` commit, both workflows were green. Core CI included strict TypeScript/build, Mastra deterministic tests, durable supervised integration tests and the Compose overlay check. The Core suite reached **27/27 tests green**.

## Model provider / memory status

No usable Mistral, Chutes, OpenAI or other model credential is configured or required by the current live deterministic path.

A previously supplied Mistral token was accidentally committed to Git and is compromised. It must never be reused. A fresh token should be requested only when the first genuinely model-backed supervised proposal becomes materially necessary, and it must be stored only through an approved operator-controlled secret path.

Structured business facts remain PostgreSQL truth. Agent memory/RAG remains separate from canonical transactional state.

## Immediate next executable slice

**SUPERVISED PROPOSAL REVIEW V1 — CORE → WANDORA WEB**

Goal: let a tenant-authorized human see what the digital employee proposes and decide what to do, without turning a safe proposal into an automatic send and without exposing private receipt/provider implementation details.

Required order:

1. re-read ADR 0014 and the current Web product contracts;
2. define the smallest Wandora-owned customer-facing proposal/review contract;
3. do not expose `wandora_private.inbound_event_receipts` directly to the browser;
4. expose proposal, related conversation/work context and supervision state through tenant-authorized Core reads;
5. preserve `attention-required` as the human-visible work boundary;
6. define explicit human actions such as approve/send, edit then send, or dismiss before wiring any outbound behavior;
7. keep commercial commitments on the existing stronger approval boundary;
8. prove cross-tenant denial and disabled/inactive actor denial;
9. keep Evolution, Mastra and provider/runtime IDs private;
10. keep model providers disabled during this slice unless the UI/review contract is already proven and a model-backed test is materially justified;
11. preserve ADR 0015: Platform Admin is the operator control-plane direction, but do not delay this customer-visible slice to build the full cockpit first.

The next slice is therefore about **customer-visible supervision**, not model quality and not autonomy.

## Human-experience guardrails

Before implementing a capability, answer from both customer and owner/operator viewpoints:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?
- would a normal business owner reasonably pay for the result?
- can Wandora operate, support, secure and scale it without disproportionate manual effort?

## Non-negotiable boundaries

- Wandora Web never calls Paperclip, Mastra or Evolution directly.
- Wandora Platform Admin is the preferred normal operator control plane; native provider consoles remain protected engineering/diagnostic tools, not customer dependencies or the daily source of operational truth.
- Supabase Auth identifies/sessionizes; Wandora Core owns business authorization and tenant membership.
- Agent memory/RAG is not canonical storage for transactional facts.
- Provider identifiers never become public Wandora identities without an explicit boundary decision.
- Sensitive employee actions require human approval until explicit product policy changes that boundary.
- Management consoles are operator-only and require stronger protection.
- Git is infrastructure/source-of-truth, never a secret store.
- Any credential that enters Git history is considered compromised and must be rotated before use.
- Historical gate #22 credentials are recovery material only, not steady-state credentials.
- Do not replace `wandora_core_runtime` with a broader role to simplify integration.
- Do not expose a public Core hostname merely to connect Gateway → Core; use the private `wandora-core` network.
- Do not wire the outbound-capable full Ana service as the live Gateway entry point until supervision/autonomy policy is explicitly reviewed.
- Do not treat the private receipt result as the long-term customer-facing proposal model.

## Startup instruction for another chat

> Read `AGENTS.md`, accepted ADRs, `docs/architecture.md` and `docs/CANONICAL_STATE.md`. Security gate #22, Core database activation, authenticated Messaging Gateway → Core ingress and Mastra deterministic supervised proposals are live. Core is private on `wandora-core + wandora-data`, uses only `wandora_core_runtime`, publishes no host port and reports `/healthz = 200` / `/readyz = 200`. Messaging Gateway is private on `wandora-core`, authenticates Evolution webhooks with JWT and Core with a separate HMAC secret. Mastra deterministic mode is live with framework telemetry forced off; it creates a durable proposal inside the private receipt while work remains `attention-required`. Live synthetic direct-Core and Gateway end-to-end proofs both show `approvals=0`, `outbound_attempts=0` and `outbound_messages=0`. No real model credential is configured or required. ADR 0015 accepts Wandora Platform Admin as the first-party owner/operator control plane; Mastra Studio, Paperclip UI, Evolution Manager, Supabase Studio and Portainer remain protected engineering/diagnostic surfaces rather than the normal operating workflow. The next slice remains **Supervised Proposal Review V1 — Core → Wandora Web**: define a Wandora-owned human-review contract and tenant-authorized reads/actions without exposing private receipt/provider internals or enabling automatic sends. Keep the paying-business-customer + Wandora-owner dual perspective and the decision → second review → execution discipline.