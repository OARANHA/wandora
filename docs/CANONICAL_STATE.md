# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**
Canonical `main` before this review branch: `687d7f80f6c1ed41d0a2bab33cf0d9e70ce165b7`

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

`Equipe` consumes canonical tenant-authorized employee data through:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

This read projection does not imply that Wandora owns the full employee control plane.

Last verified live snapshot on 2026-09-16 during the ADR 0039 review:

```text
Core:      wandora/core:team-read-b31db507               healthy
Web:       wandora/web:team-read-b31db507                healthy
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de healthy
Paperclip: wandora/paperclip:v2026.831.1                  healthy

Human Send enable flag: absent / OFF
Gateway outbound enable flag: absent / OFF
```

These are mutable runtime facts; reverify before a deployment-dependent decision.

## Supervised WhatsApp loop — PROVEN

```text
WhatsApp inbound
  -> Evolution
  -> Messaging Gateway
  -> Wandora Core
  -> Mastra deterministic Agent Runtime
  -> canonical supervised proposal
  -> Trabalho / human review
  -> Confirmation V2
  -> Gateway / Evolution outbound
  -> message observed on authorized handset
```

Both external-effect switches were returned to OFF after the controlled proof. Historical uncertain effects must never be blindly retried.

## Paperclip capability authority — PROVEN

Paperclip already supplies:

- companies/memberships;
- agents/digital employees;
- managed agents and native board approval integration;
- org structure and lifecycle/config revisions;
- issues/tasks;
- assignments/run ownership;
- approvals;
- goals/projects/routines;
- built-in and external runtime adapters.

Do not recreate these as a parallel Wandora-native control plane.

## Paperclip -> Wandora/Mastra execution bridge — PROVEN IN LABORATORY

```text
Paperclip task/run
  -> external wandora_mastra adapter
  -> dedicated Wandora directional HMAC
  -> private Wandora execution bridge
  -> existing Agent Runtime Adapter / Mastra
  -> scoped callback to Paperclip using opaque run JWT
```

The bridge proof confirmed HMAC validation, a run-scoped token, minimized task context and successful Paperclip callback without exposing Paperclip's JWT master secret.

## ADR 0038 — Organization Adapter Private State V1 — MERGED, NOT LIVE

ADR 0038 accepts only minimum private state:

1. organization -> provider company binding;
2. digital employee -> provider agent binding;
3. hire external-effect journal for Wandora request idempotency/reconciliation/concurrency safety.

Migration:

```text
infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

The migration remains deliberately inert:

- private schema only;
- RLS enabled;
- no application policies;
- no grants to `authenticated`, `anon` or `wandora_core_runtime`;
- no Core write grant to `digital_employees`;
- no secret/credential fields;
- no customer hiring route;
- no runtime/provider activation.

**Merged does not mean live. Migration 010 has not been promoted to the live Wandora database by this work.**

## ADR 0039 — Paperclip SecretRef + Managed Agent Contract V1 — ACCEPTED LAB PROOF

The final normal technical boundary is no longer a broad Board API key and no longer direct `agent-hires`.

Accepted direction:

```text
Wandora Organization Adapter
  -> company-scoped Paperclip plugin webhook
  -> HMAC resolved from Paperclip secret_ref for that company
  -> ctx.agents.managed.reconcile(stableAgentKey, companyId)
  -> Paperclip managed-agent lifecycle / approval / relink
```

Proven host-enforced isolation:

- plugin config is company-scoped;
- a Company D secret reference cannot be persisted into Company A config (`HTTP 400`);
- a valid Company D signature cannot use `agents.managed.reconcile` against Company A (`HTTP 502`, host company-context denial);
- the same D-authorized attempt cannot resolve the secret under Company A context (`HTTP 502`, host company-context denial);
- omitting `secrets.read-ref` blocks runtime secret resolution;
- raw secret values are not stored in plugin config.

Sequential managed-resource behavior is useful and provider-native:

- first same-key call -> `created`;
- later same-key call -> `resolved` with the same agent ID;
- reconcile preserves operator edits;
- lost/recoverable binding can be relinked from the managed-resource marker;
- explicit `reset()` reapplies manifest defaults;
- company board-approval policy is respected for managed-agent creation.

### Critical concurrency finding

The second adversarial review proved that sequential idempotency is **not** an exactly-once first-create guarantee.

In a fresh disposable company using only a synthetic lab HMAC, 20 simultaneous first reconciles produced:

```text
HTTP 200: 15
HTTP 502: 5
managed agent rows: 10
unique agent IDs: 10
```

The disposable company was deleted after the probe.

Therefore ADR 0038's `digital_employee_hire_operations` journal remains required, but only as a **Wandora request-idempotency / concurrency-serialization / external-effect safety boundary**. It must not become another agent lifecycle.

The Organization Adapter must atomically reserve/claim a canonical request before any first provider reconcile. Same idempotency key + changed request hash fails before provider effect. Concurrent same-key requests must never both enter Paperclip first creation.

Versioned proof:

```text
spikes/paperclip-organization-adapter-control-plane-v1/
```

No operational credential is committed in that artifact.

## Abandoned native assignment direction — DO NOT REVIVE

The earlier `digital_employee_work_assignments` / native assignment-control-plane direction was rejected before merge/live application.

Do **not** call that abandoned experiment “migration 010”. The current migration `20260916_010_organization_adapter_state_v1.sql` is a different accepted migration governed by ADR 0038 and refined by ADR 0039.

Existing beta `digital_employees`, `work_items`, proposals and approvals remain valid state for the proven vertical slice but are not precedent for cloning Paperclip.

## Platform Admin — CURRENT

Platform Admin remains a separate operator trust plane and is not the current priority. It must operate through Wandora adapters rather than provider consoles or duplicated provider state machines.

## NEXT EXECUTABLE SLICE

Do **not** implement customer `Contratar funcionário` yet. Do **not** apply migration 010 to production as a side effect of this proof.

Next: **Organization Adapter Private Runtime + Serialized Reconcile V1**, still non-customer and non-production-effect by default.

1. define the minimum private Organization Adapter service/API boundary;
2. define only the minimum DB grants required to consume ADR 0038 private state;
3. atomically reserve/claim an idempotency key + canonical request hash before provider effect;
4. prove concurrent same-key/same-request callers result in only one Paperclip first-create path;
5. prove same key + changed request fails before provider effect;
6. invoke the accepted company-scoped plugin `managed.reconcile()` boundary;
7. persist/reconcile private provider binding without leaking provider IDs;
8. prove crash/timeout/ambiguous response recovery through the serialized managed-resource path;
9. prove local-only/provider-only partial-success recovery semantics;
10. prove customer/API contracts expose no Paperclip IDs, secret refs or credentials;
11. only after those gates review production migration 010 application, provider configuration and customer `Contratar/Ativar funcionário` as separate decisions.

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
