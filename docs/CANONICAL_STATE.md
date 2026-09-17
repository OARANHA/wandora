# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**
Canonical base verified before this synchronization: `5c69cac595b7af9bd23a6496fc24a9d356027e29`

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

Last verified live snapshot before this synchronization:

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

## Paperclip capability authority — PROVEN

ADR 0037 and the installed Paperclip audit established that Paperclip already supplies companies/memberships, agent directory/org, agent lifecycle/configuration, tasks/issues/assignment/run ownership, approvals, goals/projects/routines and external runtime adapters.

Do not recreate these as a parallel Wandora-native control plane.

Historical proof also established that direct company-scoped `agent-hires` is non-idempotent for Wandora's repeated equal request: repeated calls can create different agent IDs. This remains useful evidence but **direct `agent-hires` is no longer the selected V1 catalog-hiring provider operation**.

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

## ADR 0038 — Organization Adapter Private State V1 — MERGED, NOT LIVE

Accepted minimum private state:

1. organization -> provider company binding;
2. digital employee -> provider agent binding;
3. operation journal for Wandora idempotency/request-hash/recovery/audit.

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

Validation on the original state PR proved migration 010 first and second application, `ORGANIZATION_ADAPTER_STATE_V1_OK`, existing Core verifiers and the then-current Core test suite.

**Merged does not mean live. Migration 010 has not been applied to the production Wandora database at this synchronization point.**

## ADR 0039 — Managed Catalog Organization Adapter V1 — MERGED, NOT LIVE

PR #78 merged as:

```text
5c69cac595b7af9bd23a6496fc24a9d356027e29
```

The selected V1 Paperclip technical identity/provider mechanism is:

```text
Wandora Organization Adapter
  -> private signed webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> company-scoped config
  -> company-scoped secret_ref HMAC resolution
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
  -> stable managed Paperclip agent
```

Minimum proven plugin capabilities:

- `webhooks.receive`;
- `secrets.read-ref`;
- `agents.managed`.

Security/proof facts:

- without `secrets.read-ref`, runtime secret resolution was host-blocked;
- company config cannot reference another company's secret;
- first managed reconcile created the declared Ana proof agent;
- identical replay resolved the same provider agent ID without duplication;
- a plugin configured only for one disposable company could reconcile there;
- the same proactive plugin call targeting an unconfigured company was denied by the Paperclip host;
- the installed SDK/service confirms managed reconcile only accepts manifest-declared managed agents.

Therefore the first V1 is explicitly a **catalog employee** model. Arbitrary/custom agents are outside V1. Never silently fall back to direct `agent-hires` for an undeclared employee.

A broad ordinary Board API key is **not** the normal tenant runtime identity. Plugin install/company configuration remain trusted operator/provisioning operations; customers never receive Paperclip credentials or configure the native plugin directly.

The exact combined negative verifier — valid Company A HMAC with a Company B target — remains unclaimed and must still run against a disposable final signed-request harness before live activation. Do not convert the two already-proven independent boundaries into a false claim that this exact combined variant has run.

ADR 0038 private state remains accepted. For the managed-catalog path the operation journal protects Wandora idempotency-key/request-hash conflicts, durable mapping, network ambiguity and partial-success recovery; it is no longer needed to emulate provider idempotency inside `managed.reconcile` itself.

Evidence:

```text
docs/infra/paperclip-organization-adapter-managed-plugin-proof-v1-20260916.md
```

The PR #78 CI set was green: Core, Web, Messaging Gateway and Platform Admin.

## Abandoned native assignment direction — DO NOT REVIVE

The earlier `digital_employee_work_assignments` direction was rejected before merge/live application.

Do not create a native employee hierarchy/responsibility/task control plane unless a newer ADR passes ADR 0036 and proves provider reuse insufficient.

Existing beta `digital_employees`, `work_items`, proposals and approvals remain valid state for the proven vertical slice but are not precedent for cloning Paperclip.

## Platform Admin — CURRENT

Platform Admin remains a separate operator trust plane and is not the current priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## NEXT EXECUTABLE SLICE

Do **not** implement customer `Contratar funcionário` yet.

Next: **Organization Adapter Service Contract V1**, still non-customer and non-production-effect by default.

1. define the exact Core authorization policy for hire/activate (`owner`/`admin` unless a newer explicit capability is accepted);
2. define the minimum provider-neutral Wandora Organization Adapter service/API contract;
3. define/prove only the minimum DB grants needed to consume ADR 0038 state in a disposable database;
4. prove same idempotency key + same canonical request returns/reconciles the same Wandora employee/provider binding;
5. prove same key + changed request fails with idempotency conflict;
6. prove provider replay through `managed.reconcile` resolves the same managed agent;
7. prove network ambiguity and local-only/provider-only partial-success repair semantics;
8. prove raw provider IDs, plugin config, secret refs and credentials never leak through customer contracts;
9. execute the literal valid Company A HMAC -> Company B target denial with the final disposable signed-request harness;
10. only after these gates review a real `Contratar/Ativar funcionário` customer action and a separate operational live-activation plan.

Migration 010 production application, production plugin installation/configuration, provider secrets and runtime activation remain separate operational decisions. Do not bundle them implicitly with the service-contract proof.

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
