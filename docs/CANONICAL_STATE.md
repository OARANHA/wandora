# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**
Canonical base verified before this synchronization: `7d3b93ea95fa76d9f9164c05b7191e67b900394a`

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

Merged main before #82: `72d6c50895e058a97a392b7a8eec583652f9154d`.

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

PR #82 merged as:

```text
7d3b93ea95fa76d9f9164c05b7191e67b900394a
```

Core now has a private Paperclip provider implementation behind the existing `OrganizationAdapterProvider` contract.

Request contract:

```text
resolve HMAC secret by frozen providerCompanyRef
-> POST exact JSON { companyId, catalogKey }
-> Unix-second timestamp
-> HMAC-SHA256(timestamp + "." + exact raw body)
-> Paperclip plugin webhook
```

The client does not accept HMAC material from customer input. A production secret resolver is intentionally **not selected or wired yet**.

Paperclip's webhook returns delivery success, not the native managed-agent UUID. Wandora therefore stores an opaque deterministic `provider_agent_ref` derived from plugin key + frozen provider company + catalog key. The column remains private; it is not a customer contract and need not equal Paperclip's internal UUID.

Transport failures, non-200 responses, malformed success or invalid correlation are treated as uncertain provider outcomes and reuse the conservative #81 recovery path.

### Combined cross-company boundary — NOW LITERALLY PROVEN

Against disposable Paperclip using the final request contract:

```text
A secret -> A target       -> HTTP 200, one managed Ana
same A replay              -> HTTP 200, still one managed Ana
A secret -> B target       -> HTTP 502 invalid_wandora_signature
B managed Ana after denial -> zero
B secret -> B target       -> HTTP 200, one managed Ana
```

This closes the exact valid-Company-A-HMAC -> Company-B-target gate that ADR 0039 intentionally left unclaimed.

The final disposable plugin proof source is preserved under `spikes/paperclip-organization-adapter-private-client-v1/`.

PR #82 final head `e77cfa856d0040cf50e74cbcd755ee6557bfc4ee` passed Core, Web, Messaging Gateway and Platform Admin CI. Core passed the historical verifier, Organization Adapter Service Contract verifier and deterministic runtime/overlay validation.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC secrets;
- production secret resolver/custody mechanism on Wandora sender side;
- Organization Adapter runtime wiring into live Core;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback.

## NEXT EXECUTABLE SLICE

Do **not** expose customer hiring yet.

Next: **Organization Adapter Secret Custody + Runtime Wiring Proof V1**, still non-production-effect by default.

1. inventory/reuse the existing Wandora secret-custody patterns before introducing anything new;
2. choose the minimum sender-side per-company secret resolver with no raw secret in Wandora DB/customer payload;
3. prove company A operation can only resolve/sign with A material and ambiguous retries retain the frozen company target;
4. wire `PaperclipOrganizationAdapterProvider` into a disposable Core runtime only;
5. prove the service + real signed provider client end-to-end against disposable DB/Paperclip;
6. prove no provider refs/secrets/plugin config leak through any customer contract;
7. define preflight/rollback/post-verification for eventual live migration/plugin/config/secret activation;
8. only after those gates separately review customer `Contratar/Ativar funcionário` UX and production activation.

## Operational safety

- Git remains source of truth.
- Merged migration != live migration.
- Provider consoles stay private/operator-only.
- Secrets/tokens never enter Git or logs.
- External side effects fail conservatively.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain OFF unless explicitly activated after review.

## Definition of progress

Progress means the real product gap was identified, capability authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review and execution was independently validated.