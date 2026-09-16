# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-16**

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

Do not ask the user to reconstruct decisions already recorded here. Do not silently reopen accepted boundaries. A missing local Wandora table/service/workflow is never, by itself, evidence that Wandora should implement the capability.

## Mandatory execution discipline

Every material next step follows:

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

## Product / capability authority

Wandora owns the customer/operator product contract, vocabulary, stable product identity, tenant/platform authorization, product policy, supervision, orchestration and provider-neutral adapters.

**Wandora-owned does not mean Wandora-native implementation.** Specialist components lend capabilities behind Wandora contracts:

- **Supabase** — identity/session and PostgreSQL/data infrastructure for Wandora-owned durable facts, mappings, projections, audit/reconciliation and policy state;
- **Paperclip** — selected organization/control-plane provider behind the Wandora `Organization Adapter`;
- **Mastra** — accepted execution runtime behind the Wandora `Agent Runtime Adapter`;
- **Evolution** — accepted WhatsApp transport behind Wandora Messaging Gateway;
- **model providers** — replaceable inference providers behind runtime/provider boundaries;
- **Docker / Portainer / Traefik / Cloudflare** — deployment/runtime/edge capability, not product-domain models.

Provider consoles are protected operator/engineering/diagnostic surfaces. Customers use Wandora. Platform Admin controls Wandora through the same adapter boundaries.

## Customer Web — CURRENT

Implemented routes are currently:

- `Início` (`/`)
- `Equipe` (`/team`)
- `Trabalho` (`/work`)
- `Conversas` (`/conversations`)
- `Aprovações` (`/approvals`)
- `Empresa` (`/company`)
- `/login`
- `/start`

Current classification from the state-first audit:

- **REAL:** Human Session/login, explicit multi-organization selection, `Equipe` read, `Trabalho`, `Conversas` list/history and the supervised Confirmation V2 path;
- **PARTIAL / PLACEHOLDER:** `Início`, `Aprovações`, `Empresa` and the remaining production actions in `/start`.

Do not describe future menu concepts as implemented routes and do not rebuild REAL surfaces from zero.

## Team Read V1 — LIVE

PR #71 made `Equipe` consume tenant-authorized real employee projection data through:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

The Web no longer invents Clara or fake learning progress. This read projection does **not** decide how full employee hiring/control-plane capability is implemented.

Live images:

```text
Core:    wandora/core:team-read-b31db507
Web:     wandora/web:team-read-b31db507
Gateway: wandora/messaging-gateway:origin-fix-94cfb4de
```

Current live proof:

```text
Core: healthy
Web: healthy
Gateway: healthy
organizations: 2
digital employees: 2
active employees: 2
Human Send enable flag: absent
Gateway outbound enable flag: absent
```

Current repository main after architecture guardrail PR #72:

```text
209b7ba54a428ff10f7500a82ad46cd840728bfd
```

## Supervised WhatsApp loop — PROVEN

The real controlled product path has been proven:

```text
WhatsApp
  -> Evolution
  -> Messaging Gateway
  -> Wandora Core
  -> Mastra deterministic Agent Runtime
  -> canonical supervised proposal
  -> customer review in Trabalho
  -> Canonical Confirmation V2
  -> Gateway / Evolution
  -> message observed on authorized handset
```

Both external-effect switches were returned to OFF after the controlled proof. Historical uncertain attempts must never be blindly retried.

## Paperclip capability audit — COMPLETE FOR THE CURRENT GATE

ADR 0037 and `docs/infra/paperclip-organization-adapter-audit-v1-20260916.md` record the audit against the Paperclip version actually installed on the VPS:

```text
image: wandora/paperclip:v2026.831.1
source commit: 65ec059bde30d98c92165b24a30a540800dd1f6f
deployment mode: authenticated
exposure: private
health: ok
```

The installed Paperclip already supplies substantial control-plane capability that Wandora must not recreate casually:

- companies/memberships;
- agent directory/org;
- company-scoped `agent-hires`;
- agent lifecycle/permissions/config revisions;
- issues/tasks/assignment/run ownership;
- approvals;
- goals/projects/routines;
- built-in and external runtime adapters.

### Paperclip authority findings

- creating a Paperclip company is a higher-trust instance-admin operation;
- a same-company board/service identity with `agents:create` can use `agent-hires` without instance-admin authority;
- board API keys inherit the owning Paperclip user's memberships/permissions rather than carrying independent per-key company scope;
- therefore a broad instance-admin/multi-company board key must **not** be the normal tenant Organization Adapter credential;
- the intended tenant path is a dedicated technical Paperclip identity limited to the mapped company and minimum grants; its lifecycle still requires a disposable proof.

## Paperclip -> Wandora/Mastra execution direction — PROVEN AS A CONTRACT SPIKE

The installed Paperclip supports external adapters and run-scoped JWT injection through `supportsLocalAgentJwt=true`.

The accepted laboratory direction is:

```text
Paperclip task/run
  -> external adapter: wandora_mastra
       -> dedicated Wandora directional HMAC
       -> private Wandora execution bridge
       -> existing Wandora Agent Runtime
       -> Mastra
       -> scoped callback to Paperclip using opaque Paperclip run JWT
```

Trust split:

- Paperclip adapter -> Wandora: dedicated HMAC over timestamp + exact body;
- Wandora execution -> Paperclip callback: opaque Paperclip run JWT;
- Wandora does **not** receive Paperclip's JWT master signing secret;
- browser/Platform Admin see neither credential nor Paperclip raw IDs/contracts.

A reproducible spike lives at:

```text
spikes/paperclip-wandora-mastra-adapter-v1/
```

It was executed inside the exact live Paperclip image with `--network none` and a read-only root filesystem. The materialized VPS files matched the branch Git blob hashes before execution.

Green proof:

```text
loader = ok
supportsLocalAgentJwt = true
missingRunTokenFailClosed = true
missingBridgeSecretFailClosed = true
signatureOk = true
timestampOk = true
runTokenOk = true
bodyOk = true
result exitCode = 0
provider = wandora
```

This is a contract proof only. No adapter was installed into live Paperclip and no Paperclip company/agent/task was created.

## Abandoned native assignment direction — DO NOT REVIVE BY CONVENIENCE

The provisional `digital_employee_work_assignments` / migration 010 direction was rejected before merge or production application. Its old branch was reset to current `main`.

Do not create a native employee hierarchy/responsibility/task control plane unless a later ADR passes ADR 0036 and proves the selected Paperclip capability/adapter insufficient.

Existing beta `digital_employees` / `work_items` remain valid state required by the already-proven vertical slice. Their existence is not architectural precedent for expanding Core into a second Paperclip.

## Platform Admin — CURRENT

Platform Admin remains a separate Wandora operator trust plane and is not the current priority. Its private runtime foundation exists, but ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

Platform Admin should eventually operate Paperclip/Mastra/Evolution/Supabase capabilities through Wandora-owned adapters rather than duplicating their control planes or embedding provider consoles as the product.

## NEXT EXECUTABLE SLICE

Do **not** implement customer `Contratar funcionário` yet.

The next slice is a disposable/non-customer **Paperclip Organization Adapter contract proof**:

1. create or select an isolated Paperclip test company through the separate higher-trust operator path;
2. establish a company-scoped technical identity with only required permissions;
3. prove company-scoped company/org/agent-hire operations;
4. prove cross-company denial;
5. load the reviewed `wandora_mastra` adapter only in the controlled proof context;
6. hire a disposable agent using that adapter;
7. create/assign a disposable task;
8. prove Paperclip -> private Wandora/Mastra-compatible bridge -> scoped Paperclip callback;
9. prove idempotency/failure/reconciliation behavior;
10. clean/archive disposable state;
11. only after that, design the real Wandora customer `Contratar/Ativar funcionário` contract and UI.

Do not mutate the two current Wandora customer/beta organizations for this proof.

## Operational safety

- Git remains source of truth.
- A merged migration is not automatically live.
- Provider consoles stay private/operator-only.
- No public PostgreSQL, Docker socket, Core private runtime or provider management API.
- Secrets/tokens never enter Git or logs.
- The previously Git-exposed Mistral credential is compromised historical material and must never be reused.
- External side effects fail conservatively.
- Browser-supplied IDs are selectors, never authorization.
- Read contracts remain read-only unless a separately reviewed effect contract exists.
- Human Send and Gateway outbound remain OFF unless a separate reviewed activation is deliberately executed.

## Definition of progress

Progress is not more tables, services or provider copies. Progress means the real product gap was identified, capability authority was checked, mature provider functionality was reused behind Wandora contracts, Wandora-specific identity/policy stayed Wandora-owned, the decision survived adversarial review and the executed result was independently validated.
