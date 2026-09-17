# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**
Canonical `main` verified before this synchronization: `7afeaf384816e4bdbe2e2fe51a9e8aba4eab89af`

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

Do not ask the user to reconstruct decisions already recorded in Git. Do not silently reopen accepted boundaries. Mutable runtime facts must be re-verified before acting.

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

Provider consoles remain protected operator/engineering surfaces. Customers use Wandora.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

REAL: session/login, explicit organization selection, Team read, Work, Conversations, Canonical Confirmation V2 and the controlled supervised WhatsApp loop.

PARTIAL/PLACEHOLDER: dashboard/company/approval/start actions, including real employee hiring/activation.

Human Send and Gateway outbound remain OFF unless deliberately activated in a separately reviewed step.

## Paperclip / Organization Adapter authority

ADR 0037 proves Paperclip already owns the employee control-plane capability: companies/memberships, agent lifecycle/organization, tasks/issues, assignment/run ownership, approvals and external runtime adapters.

Do not create a parallel Wandora-native agent control plane.

Direct `agent-hires` was proven non-idempotent for repeated equal Wandora requests and is not the selected V1 catalog path.

The selected catalog path is:

```text
Wandora Organization Adapter
  -> private signed webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> company-scoped HMAC custody
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
```

V1 is catalog-only. Arbitrary/custom agents and silent fallback to `agent-hires` remain out of scope.

## Organization Adapter private state — MERGED, NOT LIVE

ADR 0038 / migration `20260916_010_organization_adapter_state_v1.sql` define only minimum Wandora-private integration state:

1. organization -> provider company binding;
2. digital employee -> opaque provider-managed agent reference;
3. operation journal for idempotency/request hash/recovery/audit.

Migration 010 remains **not applied to production**.

ADR 0039 selects the managed catalog plugin mechanism.

## Service contract / signed client — MERGED, NOT LIVE

PR #81 / migration `20260916_011_organization_adapter_service_contract_v1.sql` prove the internal provider-neutral service contract, including owner/admin authorization, catalog-only input, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage.

Migration 011 remains **not applied to production**.

ADR 0040 / PR #82 add the signed Paperclip private client:

```text
resolve HMAC by frozen providerCompanyRef
-> POST exact JSON { companyId, catalogKey }
-> HMAC-SHA256(timestamp + "." + exact raw body)
-> private Paperclip plugin webhook
```

The final disposable Paperclip proof literally established:

```text
A secret -> A target       -> success, one managed Ana
same A replay              -> success, still one managed Ana
A secret -> B target       -> rejected
B managed Ana after denial -> zero
B secret -> B target       -> success, one managed Ana
```

## Secret custody / composed runtime proof — MERGED, NOT LIVE

ADR 0041 / PR #84 select mounted file custody, not environment-variable or database-held per-company HMAC material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute secret directory. Raw company refs never become filesystem paths; the reader uses `O_NOFOLLOW` and rejects missing/empty/oversized/weak material.

PR #85 proves the composed disposable path:

```text
OrganizationAdapterService
  -> migrations 010/011
  -> operation reservation / frozen target
  -> file-backed per-company custody
  -> signed Paperclip client
  -> exact private HTTP contract
```

The proof includes one canonical hire, customer-contract non-leakage, Company A/B secret separation and frozen-target recovery after a mutable binding change.

## ADR 0042 / PR #87 — Production Activation Rehearsal V1 — MERGED

PR #87 turned the intended activation/rollback sequence into a reproducible non-production gate.

It proves, with disposable state:

- migration 010 -> inert verifier -> migration 011 -> service/runtime verifier;
- exact pinned Paperclip image/plugin/config contract;
- Core runtime factory remains private and customer-unreachable;
- injected migration failure leaves no partial Organization Adapter tables;
- synthetic custody/signature failures fail closed;
- the historical service/runtime proof remains nested in the rehearsal.

No production mutation was performed by this rehearsal.

## ADR 0043 / PR #88 — Core Candidate Wiring V1 — MERGED, NOT LIVE

PR #88 merged as canonical `main@7afeaf384816e4bdbe2e2fe51a9e8aba4eab89af`.

The base Core remains Organization Adapter OFF. A separate candidate-only Compose overlay may enable the already-proven private service with these fail-closed constraints:

- database mode only;
- exact private Paperclip webhook at `wandora-paperclip:3100`;
- absolute read-only mounted HMAC custody directory;
- no browser/customer/Platform Admin route added;
- readiness additionally requires the migration-011 private DB boundary;
- enabling the adapter before migration 011 yields `/readyz=503`, not a false-green candidate.

All four PR checks for #88 were green: Core, Web, Messaging Gateway and Platform Admin.

## REAL LIVE observation after #88

Verified directly on the Wandora VPS on 2026-09-17:

```text
wandora-web               wandora/web:team-read-b31db507                 healthy
wandora-core              wandora/core:team-read-b31db507                healthy
wandora-messaging-gateway wandora/messaging-gateway:origin-fix-94cfb4de  healthy
wandora-paperclip         wandora/paperclip:v2026.831.1                  healthy
```

Live Core remains on `wandora-core` + `wandora-data`, has no published port and has no `WANDORA_ORGANIZATION_ADAPTER_ENABLED=true` environment entry.

A direct production DB check returned:

```text
control_plane_provider_bindings       ABSENT
digital_employee_provider_bindings    ABSENT
digital_employee_hire_operations      ABSENT
```

Therefore migrations 010/011 remain literally **not live**.

The VPS currently has no Organization Adapter HMAC custody directory and no Core image built from the post-#88 candidate source. Existing `wandora/core:*` images stop at earlier product slices. This is important: do not widen DB privileges merely because the candidate code is merged in Git.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC generation/mounting;
- post-#88 Core candidate image on the VPS;
- live Core Organization Adapter enablement;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Human Send or Gateway outbound activation as part of this work.

## SECOND ADVERSARIAL REVIEW AFTER #88

Tempting option: apply migrations 010/011 now because the activation rehearsal and candidate code are green.

Rejected.

Reason: the live host does not yet possess the post-#88 candidate image or HMAC custody path. Applying migration 011 first would widen `wandora_core_runtime` privileges while the executable candidate that consumes them is still absent. This recreates the idle-privilege ordering ADR 0043 explicitly rejected.

Tempting option: install the production Paperclip plugin/HMACs first.

Rejected for the same ordering reason. It would create live provider capability before the exact Core candidate artifact is locally identified and preflighted.

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Core Candidate Build + Live Preflight V1** — read-only with respect to Wandora business/database/provider state.

Required proof:

1. produce an identifiable Core candidate artifact from canonical `main@7afeaf384816e4bdbe2e2fe51a9e8aba4eab89af`;
2. prove its image/source identity before any deployment;
3. render the exact base + database + Organization Adapter overlay without exposing raw secrets;
4. verify the candidate keeps no public host port and only the reviewed private networks/mounts;
5. verify current live prerequisites remain deliberately absent: migration-010 tables, production plugin config and HMAC custody;
6. define the exact activation order so candidate availability precedes DB privilege widening;
7. define rollback ordering: disable candidate entry path first, then provider/plugin/custody cleanup, and only then consider DB privilege/schema rollback;
8. leave production migrations, plugin config, HMACs, live Core and customer hiring unchanged at the end of this slice.

Only after this candidate/preflight gate is green should a separate **Production Technical Activation** decision be considered. Customer `Contratar/Ativar funcionário` remains a later slice even after technical activation.

## Operator UI / native consoles

The normal operator contract is Wandora Platform Admin, not provider-branded public hostnames. Native Paperclip/Mastra/Evolution/Supabase/Portainer consoles remain protected engineering/diagnostic surfaces and do not become customer product contracts.

## Operational safety

- Git is source of truth; Portainer is not.
- Merged migration != live migration.
- Provider consoles stay operator-only.
- Secrets/tokens never enter Git, DB payloads or logs.
- External effects fail conservatively; uncertain effects are never blindly retried.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain OFF unless explicitly activated after review.
- An Organization Adapter proof/candidate must not silently become a customer-visible activation path.

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review and execution was independently validated.