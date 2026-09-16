# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**
Canonical `main`: `b0d708a2cf1f5969bbda11a6f9100e9ae31e9fa0`

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

See ADRs 0034 and 0036.

## Capability authority

Wandora owns product semantics, stable IDs, authorization, policy, supervision, orchestration and provider-neutral contracts.

**Wandora-owned does not mean Wandora-native implementation.**

- Supabase: identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- Paperclip: digital-employee organization/control-plane capability behind Organization Adapter.
- Mastra: agent/workflow execution behind Agent Runtime Adapter.
- Evolution: WhatsApp transport behind Messaging Gateway.
- model providers: replaceable inference capability behind runtime/provider boundaries.
- Docker/Portainer/Traefik/Cloudflare: deployment/runtime/edge capability, not product-domain models.

Provider consoles are protected operator/engineering surfaces. Customers use Wandora. Platform Admin controls Wandora through adapters rather than rebuilding provider control planes.

## Customer Web — CURRENT

Implemented routes:

- `Início` (`/`)
- `Equipe` (`/team`)
- `Trabalho` (`/work`)
- `Conversas` (`/conversations`)
- `Aprovações` (`/approvals`)
- `Empresa` (`/company`)
- `/login`
- `/start`

Classification:

- **REAL:** Human Session/login, explicit multi-organization selection, `Equipe` read, `Trabalho`, `Conversas` list/history, Confirmation V2 and the controlled WhatsApp loop.
- **PARTIAL / PLACEHOLDER:** `Início`, customer `Aprovações`, customer `Empresa` and remaining production actions in `/start`, including real employee hiring/activation.

Do not describe future menu concepts as implemented routes and do not rebuild REAL surfaces from zero.

## Team Read V1 — LIVE

PR #71 made `Equipe` consume canonical tenant-authorized employee data through:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

This read projection does not imply that Wandora owns the full employee control plane.

Last verified live snapshot:

```text
Core:      wandora/core:team-read-b31db507               healthy
Web:       wandora/web:team-read-b31db507                healthy
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de healthy
Paperclip: wandora/paperclip:v2026.831.1                  healthy

organizations: 2
digital employees: 2
active employees: 2
Human Send: OFF / enable flag absent
Gateway outbound: OFF / enable flag absent
```

These are mutable runtime facts; reverify before a deployment-dependent decision.

## Supervised WhatsApp loop — PROVEN

```text
WhatsApp
  -> Evolution
  -> Messaging Gateway
  -> Wandora Core
  -> Mastra deterministic Agent Runtime
  -> canonical supervised proposal
  -> customer review in Trabalho
  -> Confirmation V2
  -> Gateway / Evolution
  -> message observed on authorized handset
```

Both external-effect switches were returned to OFF after the controlled proof. Historical uncertain effects must never be blindly retried.

## Paperclip capability authority — PROVEN ENOUGH FOR CURRENT DIRECTION

ADR 0037 and the Paperclip audit established that the installed version already supplies:

- companies/memberships;
- agent directory/org;
- company-scoped `agent-hires`;
- agent lifecycle/permissions/config revisions;
- issues/tasks/assignment/run ownership;
- approvals;
- goals/projects/routines;
- built-in and external runtime adapters.

Do not recreate these as a parallel Wandora-native control plane.

Important security findings:

- company creation is a higher-trust instance-admin operation;
- same-company board/service identity with `agents:create` can hire without instance-admin;
- board API keys inherit the owning user's memberships/permissions and therefore a broad multi-company key is unsuitable for the normal tenant adapter;
- the final least-privilege technical identity and literal cross-company denial remain activation gates.

## Paperclip -> Wandora/Mastra bridge — PROVEN IN LABORATORY

```text
Paperclip task/run
  -> external wandora_mastra adapter
  -> dedicated Wandora directional HMAC
  -> private Wandora execution bridge
  -> existing Agent Runtime Adapter / Mastra
  -> scoped callback to Paperclip using opaque run JWT
```

The bridge proof confirmed HMAC validation, a run-scoped token, minimized task context and successful Paperclip callback without exposing Paperclip's JWT master secret.

A disposable Paperclip instance using the same image also proved:

- two independent companies;
- `Ana Proof` hired in Company A;
- task `WAN-1` assigned and completed through the Wandora adapter/bridge;
- repeated equal `agent-hires` requests create different agent IDs;
- Paperclip metadata preserves non-secret Wandora reconciliation markers.

Therefore Wandora must own hire idempotency/reconciliation safety, while Paperclip remains authoritative for the control-plane lifecycle.

The literal final-credential Company A -> Company B denial probe was not run because the automation environment blocked creating/manipulating the extra credential. Do not claim otherwise; it remains an activation gate.

## ADR 0038 — Organization Adapter Private State V1 — MERGED, NOT LIVE

PR #75 merged at:

```text
b0d708a2cf1f5969bbda11a6f9100e9ae31e9fa0
```

Accepted minimum private state:

1. organization -> provider company binding;
2. digital employee -> provider agent binding;
3. hire external-effect journal for idempotency/request hash/reconciliation.

Paperclip remains authoritative for agent lifecycle, organization hierarchy/coordination, task/issue lifecycle, assignment and run ownership.

Migration:

```text
infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

The migration is intentionally inert:

- private schema only;
- RLS enabled;
- no application policies;
- no grants to `authenticated`, `anon` or `wandora_core_runtime`;
- no Core write grant to `digital_employees`;
- no secret/credential fields;
- no customer route;
- no runtime/provider activation.

PR #75 validation proved:

```text
migration 010 first application: green
migration 010 second application: green
ORGANIZATION_ADAPTER_STATE_V1_OK
79 Core tests: pass
Core/Web/Gateway/Platform Admin CI: green
```

**Merged does not mean live. Migration 010 has not been applied to the production Wandora database at this synchronization point.**

## Abandoned native assignment direction — DO NOT REVIVE

The earlier `digital_employee_work_assignments` direction was rejected before merge/live application.

Do not create a native employee hierarchy/responsibility/task control plane unless a newer ADR passes ADR 0036 and proves provider reuse insufficient.

Existing beta `digital_employees`, `work_items`, proposals and approvals remain valid state for the proven vertical slice but are not precedent for cloning Paperclip.

## Platform Admin — CURRENT

Platform Admin remains a separate operator trust plane and is not the current priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## NEXT EXECUTABLE SLICE

Do **not** implement customer `Contratar funcionário` yet.

Next: **Organization Adapter Activation Contract Proof**, still non-customer and non-production-effect by default.

1. choose/prove the final least-privilege Paperclip technical identity mechanism;
2. prove literal cross-company denial with that credential mechanism;
3. define the minimum Wandora Organization Adapter service/API boundary;
4. define only the minimum DB grants needed to consume ADR0038 private state;
5. prove same idempotency key + same canonical request replay;
6. prove same key + changed request fails with idempotency conflict;
7. prove timeout/ambiguous response reconciliation using Paperclip metadata;
8. prove zero-match/multiple-match conservative behavior;
9. prove local-only and provider-only partial-success recovery/repair semantics;
10. prove raw provider IDs/credentials never leak through customer contracts;
11. only after those gates review a real `Contratar/Ativar funcionário` customer action.

Migration 010 production application, provider credentials and runtime activation are separate operational decisions. Do not bundle them implicitly with this proof.

## Operational safety

- Git remains source of truth.
- Merged migration != live migration.
- Provider consoles stay private/operator-only.
- No public PostgreSQL, Docker socket, private Core/Gateway or provider management API.
- Secrets/tokens never enter Git or logs.
- Previously Git-exposed credentials are compromised historical material and must never be reused.
- External side effects fail conservatively.
- Browser-supplied IDs are selectors, never authorization.
- Read contracts stay read-only unless a separately reviewed effect contract exists.
- Human Send and Gateway outbound remain OFF unless deliberately activated in a separate reviewed step.

## Definition of progress

Progress is not more tables or copied provider state. Progress means the real product gap was identified, capability authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review and execution was independently validated.
