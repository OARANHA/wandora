# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**
Canonical base verified before this synchronization: `040d96e1140f4a9e2733f97f270e047a0df3beb0`

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

Do not ask the user to reconstruct decisions already recorded here. Do not silently reopen accepted boundaries. A missing local table/service/workflow is never, by itself, evidence that Wandora should implement the capability.

## Mandatory execution discipline

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

## Capability authority

Wandora owns product semantics, stable IDs, authorization, policy, supervision, orchestration and provider-neutral contracts.

- Supabase: identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- Paperclip: digital-employee organization/control-plane capability behind Organization Adapter.
- Mastra: agent/workflow execution behind Agent Runtime Adapter.
- Evolution: WhatsApp transport behind Messaging Gateway.
- Docker/Portainer/Traefik/Cloudflare: deployment/runtime/edge capability.

Provider consoles remain operator surfaces. Customers use Wandora.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

REAL: session/login, organization selection, Team read, Work, Conversations, Confirmation V2 and the controlled supervised WhatsApp loop.

PARTIAL/PLACEHOLDER: remaining dashboard/company/approval/start actions, including real employee hiring/activation.

## Supervised WhatsApp loop — PROVEN

```text
WhatsApp -> Evolution -> Messaging Gateway -> Wandora Core
-> Mastra deterministic Agent Runtime -> supervised proposal
-> customer review -> Confirmation V2 -> Gateway/Evolution -> handset
```

Human Send and Gateway outbound remain OFF unless deliberately activated in a separately reviewed step. Historical uncertain effects must never be blindly retried.

## Paperclip capability authority — PROVEN

ADR 0037 established that Paperclip already owns the digital-employee control-plane capability: companies/memberships, agent lifecycle and organization, tasks/issues, assignment/run ownership, approvals and external runtime adapters.

Do not create a parallel Wandora-native agent control plane.

Direct `agent-hires` was proven non-idempotent for repeated equal Wandora requests and is **not** the selected V1 catalog path.

## ADR 0038 — Organization Adapter Private State V1 — MERGED, NOT LIVE

Minimum Wandora-private state remains:

1. organization -> provider company binding;
2. digital employee -> opaque provider-managed agent reference;
3. operation journal for idempotency/request hash/recovery/audit.

Migration `20260916_010_organization_adapter_state_v1.sql` remains merged but **not applied to production**.

## ADR 0039 — Managed Catalog Organization Adapter V1 — MERGED, NOT LIVE

Selected Paperclip-side mechanism:

```text
Wandora Organization Adapter
  -> private signed webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> company-scoped secret_ref HMAC resolution
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
  -> stable managed Paperclip agent
```

V1 is catalog-only. Arbitrary/custom agents remain outside V1. Never fall back silently to direct `agent-hires`.

A broad Board API key is not the normal tenant runtime identity.

## PR #81 — Organization Adapter Service Contract V1 — MERGED, NOT LIVE

PR #81 proved the internal provider-neutral Organization Adapter service with:

- active owner/admin authorization only;
- manifest-declared catalog keys only;
- operation reservation before provider effect;
- frozen `provider_company_ref` per operation;
- same-key replay idempotency;
- changed-request conflict rejection;
- one managed catalog resource per organization/provider/catalog key;
- ambiguous provider result -> `uncertain` with no visible employee;
- retry against the same frozen provider company;
- local canonical employee creation only after provider success;
- no provider ID leakage in customer-facing result.

Migration `20260916_011_organization_adapter_service_contract_v1.sql` is merged and disposable-CI proven, but **not applied to production**.

## ADR 0040 / PR #82 — Signed Paperclip Private Client V1 — MERGED, NOT LIVE

PR #82 merged as `7d3b93ea95fa76d9f9164c05b7191e67b900394a`.

Core has a private Paperclip provider implementation behind the existing `OrganizationAdapterProvider` contract.

Request contract:

```text
resolve HMAC secret by frozen providerCompanyRef
-> POST exact JSON { companyId, catalogKey }
-> Unix-second timestamp
-> HMAC-SHA256(timestamp + "." + exact raw body)
-> Paperclip plugin webhook
```

The client does not accept HMAC material from customer input. Paperclip webhook delivery success is represented to Wandora through a private opaque deterministic `provider_agent_ref`; native Paperclip agent UUIDs remain provider-private.

Transport failures, non-200 responses, malformed success or invalid correlation are treated as uncertain provider outcomes and reuse the conservative #81 recovery path.

### Combined cross-company boundary — LITERALLY PROVEN

Against disposable Paperclip using the final request contract:

```text
A secret -> A target       -> HTTP 200, one managed Ana
same A replay              -> HTTP 200, still one managed Ana
A secret -> B target       -> HTTP 502 invalid_wandora_signature
B managed Ana after denial -> zero
B secret -> B target       -> HTTP 200, one managed Ana
```

The final disposable plugin proof source is preserved under `spikes/paperclip-organization-adapter-private-client-v1/`.

## ADR 0041 / PR #84 — Secret Custody + Runtime Wiring V1 — MERGED, NOT LIVE

PR #84 merged as `815c416715f720c22b29b444b0b89ac71e5515d3`.

Sender-side custody now reuses the existing mounted-secret-file pattern instead of environment variables or database-held raw secrets.

For a frozen `providerCompanyRef`, Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute secret directory. Raw company refs never become paths. The default reader opens read-only with `O_NOFOLLOW`, trims surrounding whitespace and rejects missing, empty, oversized or too-short material. V1 requires at least 32 characters of HMAC material.

A disposable runtime factory composes:

```text
OrganizationAdapterService
  -> PaperclipOrganizationAdapterProvider
  -> file-backed per-company secret resolver
  -> signed private Paperclip webhook
```

The factory is intentionally not wired into the live Core entrypoint and exposes no customer route.

## PR #85 — Composed Organization Adapter Runtime Proof V1 — MERGED

PR #85 merged as the current canonical base:

```text
040d96e1140f4a9e2733f97f270e047a0df3beb0
```

The reproducible verifier composes, in one disposable execution:

```text
OrganizationAdapterService
  -> PostgreSQL migrations 010/011
  -> operation reservation / frozen provider target
  -> file-backed per-company secret custody
  -> PaperclipOrganizationAdapterProvider
  -> exact signed HTTP contract
```

It proves:

- canonical catalog hire completes once and persists one employee/binding/operation;
- customer result contains no provider/private fields;
- Company A request is signed only with Company A custody, not Company B material;
- an uncertain first provider response freezes Company A;
- after the mutable organization binding changes, retry still targets/signs the frozen Company A snapshot;
- the migration-010 inert-state verifier remains isolated from migration 011;
- global `provider_company_ref` uniqueness remains enforced instead of being weakened for the test.

The composed CI proof deliberately does not install another Paperclip instance. Literal Paperclip handling of the same signed contract, including A-signed/B-target denial, is already proven by #82.

## Runtime observation after #85

Observed on the VPS after the #85 merge:

```text
wandora-web               wandora/web:team-read-b31db507       healthy
wandora-core              wandora/core:team-read-b31db507      healthy
wandora-messaging-gateway wandora/messaging-gateway:origin-fix-94cfb4de healthy
wandora-paperclip         wandora/paperclip:v2026.831.1        healthy
```

The live Supabase database still reports all three Organization Adapter private tables from migration 010 as absent. Therefore migrations 010/011 remain literally **not live**.

Disposable/local Paperclip proof containers also exist on the VPS; they are laboratory artifacts and are not production capability activation.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC secret generation/mounting on both sides;
- live Core Organization Adapter wiring;
- any customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback.

## SECOND ADVERSARIAL REVIEW AFTER #85

The tempting next step is to apply migrations 010/011 directly because they are already disposable-CI proven. That is **not** the next action.

Reasons:

1. migration 011 intentionally grants new write capability to `wandora_core_runtime`; applying it is a real least-privilege boundary change even while no route exists;
2. applying only migration 010 would create a partial production state that does not reduce the remaining plugin/secret/runtime activation uncertainty;
3. the accepted ADR 0041 explicitly requires production preflight, backup/recovery awareness, exact plugin/config scope, secret permission proof and post-verification before activation;
4. the current evidence proves components and their composition, but not the complete operator activation/rollback sequence against a production-shaped rehearsal.

Decision: **do not apply either migration yet and do not install the live plugin yet.** First make the activation sequence itself reproducible and falsifiable.

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Production Activation Rehearsal V1** — no customer hiring and no live production effect.

Required proof:

1. create a production-shaped disposable database from the current canonical migration stack/state and prove 010 -> inert verifier -> 011 -> service verifier in the exact intended order;
2. define and test rollback boundaries for: migration failure before commit, plugin/config failure, missing/wrong secret, Core candidate failure and uncertain provider effect;
3. produce a secret manifest that contains only deterministic filenames/company refs or hashes/permissions metadata — never raw HMAC material;
4. prove exact filesystem ownership/mode and `O_NOFOLLOW` behavior expected for the eventual Core secret mount;
5. pin the exact Paperclip image/plugin source/config contract intended for activation and prove configured-company scope without broad Board API credentials;
6. prove a Core candidate can include Organization Adapter wiring while remaining unreachable from all customer routes;
7. define production post-verification queries that prove zero duplicate employees/bindings/operations and no provider/private leakage;
8. leave migrations 010/011, plugin config, production HMACs, live Core wiring and customer `Contratar` OFF at the end of the rehearsal.

Only after that rehearsal is green should a separate reviewed production activation be considered. Customer `Contratar/Ativar funcionário` remains a later product slice after the technical activation boundary itself is proven live and reversible.

## Operational safety

- Git remains source of truth.
- Merged migration != live migration.
- Provider consoles stay private/operator-only.
- Secrets/tokens never enter Git or logs.
- External side effects fail conservatively.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain OFF unless explicitly activated after review.
- An Organization Adapter proof or candidate must not silently become a customer-visible activation path.

## Definition of progress

Progress means the real product gap was identified, capability authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review and execution was independently validated.
