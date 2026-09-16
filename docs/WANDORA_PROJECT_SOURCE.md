# Wandora — Project Source / Continuity Bootstrap

Snapshot date: **2026-09-16**
Repository: `OARANHA/wandora`
Canonical `main` at snapshot: `b0d708a2cf1f5969bbda11a6f9100e9ae31e9fa0`

> **Purpose:** compact bootstrap for ChatGPT Project Sources and future development sessions. It prevents architectural drift, accidental reinvention and stale workflow assumptions.
>
> **This file is not the highest authority and never replaces live verification.** If this snapshot conflicts with current Git, accepted ADRs or the running environment, the newer canonical evidence wins.

## Mandatory authority order

Before a material product, architecture, code, database or infrastructure decision:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/`;
3. `docs/CAPABILITY_AUTHORITY.md`;
4. `docs/architecture.md`;
5. `docs/CANONICAL_STATE.md`;
6. component README/runbook;
7. this file only as continuity/bootstrap context.

Mutable facts such as branch, container image, feature flags, database counts and deployment status must be reverified.

## Mandatory development discipline

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

The second review must actively try to prove the first decision wrong, duplicated, unsafe, too broad or based on an unproven premise.

A missing Wandora table/service/workflow is **never**, by itself, evidence that Wandora must build that capability.

## Product thesis

Wandora is the product through which businesses hire, train, govern and measure digital employees alongside human teams.

Customers should understand company, team, responsibilities, work, conversations, approvals, outcomes and learning. They should not need to know Paperclip, Mastra, Evolution, Supabase, RLS, provider IDs, prompts, tokens or Portainer.

## Canonical capability architecture

```text
CUSTOMER                                  WANDORA OPERATOR
app.wandora.com.br                        Platform Admin
        |                                      |
        +-------------------+------------------+
                            v
                    Wandora Core/API
              contracts + authorization + policy
                 orchestration + stable IDs
                            |
          +-----------------+------------------+------------------+
          |                 |                  |                  |
          v                 v                  v                  v
  Organization Adapter  Agent Runtime      Messaging         Data/Auth
          |              Adapter            Gateway           Boundary
          v                 |                  |                  |
      Paperclip             v                  v                  v
                         Mastra             Evolution          Supabase
                            |
                            v
                    Model/Tool providers
```

**Wandora owns the product contract and experience; specialist components lend capabilities through Wandora-owned adapters.**

`Wandora-owned` does **not** mean `Wandora-native implementation`.

## Capability authority

| Capability | Wandora owns | Specialist capability |
| --- | --- | --- |
| Customer product | vocabulary, UX, policy, authorization, stable IDs | Wandora Web/Core |
| Platform operation | operator contracts, authorization, audit | Platform Admin over adapters |
| Human identity/session | Wandora user/membership semantics | Supabase Auth |
| Durable Wandora facts | mappings, policy, projections, audit/reconciliation | Supabase PostgreSQL |
| Digital-employee control plane | customer-facing identity/contract/policy | Paperclip via Organization Adapter |
| Agent execution | allowed execution contract and policy | Mastra via Agent Runtime Adapter |
| WhatsApp transport | provider-neutral messaging/effect policy | Evolution via Messaging Gateway |
| Model inference | provider-neutral runtime/model policy | replaceable model providers |
| Runtime/operations | desired topology in Git | Docker/Compose/Portainer/Traefik/Cloudflare |

Native consoles are protected engineering/operator surfaces. They are not the customer product and do not replace Platform Admin.

## Capability Reuse Gate

Before a material new table, service, workflow, state machine, scheduler, assignment model, agent registry or admin subsystem, answer:

1. What exact customer/operator capability is missing?
2. Does an accepted component already provide all or part of it?
3. Which layer owns the capability and which semantics/IDs/policy remain Wandora-owned?
4. What is the **minimum** Wandora state needed for safety, replaceability, authorization, idempotency, audit or reconciliation?
5. What adapter prevents provider IDs/schemas/auth from leaking to Web or Platform Admin?
6. What happens on timeout, partial success, outage or replacement?
7. Would a Wandora-native implementation duplicate an accepted provider capability?

If #7 is yes, default = **do not build it**. A newer ADR must prove reuse insufficient.

## Customer Web — current classification

Implemented routes: `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login`, `/start`.

**REAL:** login/session, explicit multi-organization selection, `Equipe` canonical read, `Trabalho`, `Conversas` list/history, Confirmation V2, controlled WhatsApp end-to-end proof.

**PARTIAL / PLACEHOLDER:** `Início`, customer `Aprovações`, customer `Empresa`, and production actions in `/start`, including real hiring/activation.

Do not rebuild REAL surfaces from zero.

## Proven end-to-end loop

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

External-effect switches were returned to OFF after the controlled proof.

## Live snapshot — reverify before relying on it

Observed on 2026-09-16:

```text
Core:      wandora/core:team-read-b31db507              healthy
Web:       wandora/web:team-read-b31db507               healthy
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de healthy
Paperclip: wandora/paperclip:v2026.831.1                 healthy

Human Send: OFF / enable flag absent
Gateway outbound: OFF / enable flag absent
organizations = 2
digital_employees = 2
active_employees = 2
```

Migration `20260916_010_organization_adapter_state_v1.sql` is **merged in Git but not applied live** at this snapshot.

## Paperclip boundary — proven

The installed Paperclip already supplies companies/memberships, agents, `agent-hires`, org/control-plane concepts, agent lifecycle/configuration, issues/tasks, assignments/run ownership, approvals, goals/projects/routines and external runtime adapters.

Therefore Wandora must not recreate a parallel control plane.

Important findings:

- Paperclip company creation is higher-trust instance-admin work;
- same-company board/service identity with `agents:create` can hire without instance-admin;
- board API keys inherit the owning user's memberships/permissions, so a broad multi-company key is not acceptable as the normal tenant adapter credential;
- the final tenant technical-identity mechanism and literal cross-company denial remain activation gates.

## Paperclip -> Wandora -> Mastra bridge — proven in laboratory

```text
Paperclip task/run
 -> external wandora_mastra adapter
 -> dedicated Paperclip->Wandora HMAC
 -> private Wandora execution bridge
 -> Agent Runtime Adapter / Mastra
 -> callback to Paperclip with opaque run-scoped JWT
```

The adapter minimizes provider context via allow-list. Wandora never receives Paperclip's JWT master signing secret.

Disposable proof also established:

- two isolated Paperclip companies;
- a disposable Ana agent hired and assigned task `WAN-1`;
- a real run crossed the Wandora adapter/bridge and updated `WAN-1` to `done`;
- repeated equal `agent-hires` returned `201` twice with different agent IDs;
- Paperclip agent metadata preserves non-secret Wandora reconciliation markers.

Thus Paperclip does **not** provide the hire idempotency contract Wandora needs.

## ADR 0038 / Organization Adapter private state — MERGED, INERT

PR #75 merged as:

```text
main: b0d708a2cf1f5969bbda11a6f9100e9ae31e9fa0
ADR: docs/decisions/0038-organization-adapter-private-state-v1.md
migration: infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

The accepted minimum private state is only:

- Wandora organization <-> provider company binding;
- Wandora digital employee <-> provider agent binding;
- hire external-effect journal for idempotency/reconciliation.

Paperclip remains authoritative for agent lifecycle, hierarchy/coordination, task/issue lifecycle, assignment and run ownership.

The migration is deliberately inert:

- no `wandora_core_runtime` access;
- no `authenticated` access;
- no Core write grant to `digital_employees`;
- no customer hiring route;
- no provider credential;
- no live Paperclip adapter installation;
- no production application merely because it is merged.

CI proof on PR #75 included migration 010 first + second application, `ORGANIZATION_ADAPTER_STATE_V1_OK`, existing Core verifiers and 79 passing Core tests.

## Abandoned direction — DO NOT REVIVE

The old native `digital_employee_work_assignments` direction was rejected before merge/live application.

Do not create a Wandora-native employee hierarchy/responsibility/task control plane merely because the concepts are convenient locally.

Existing beta `digital_employees`, `work_items`, proposals and approvals remain valid for the proven slice but are not precedent for cloning Paperclip.

## Next executable slice

Do **not** expose customer `Contratar funcionário` yet.

The next slice is the **Organization Adapter activation contract proof**, still non-customer and non-production-effect by default:

1. define the final least-privilege Paperclip technical identity mechanism;
2. prove literal Company A credential -> Company B denial using that mechanism;
3. define the minimum Wandora adapter service/API boundary and minimum DB grants;
4. prove same idempotency key + same request replay;
5. prove same key + changed request conflict;
6. prove ambiguous-response reconciliation through Paperclip metadata;
7. prove local-only/provider-only partial-success repair behavior;
8. prove provider IDs/credentials do not leak through Wandora contracts;
9. only then review customer `Contratar/Ativar funcionário` UX and activation.

Migration 010 production application, adapter credentials and runtime activation are separate operational decisions and must not happen implicitly.

## Platform Admin

Platform Admin remains a separate Wandora operator trust plane and is not the current priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## Security invariants

- browser never talks directly to Paperclip, Mastra, Evolution or privileged DB/admin APIs;
- provider IDs/contracts never become customer-facing Wandora contracts;
- no production credential merely because a role/table/adapter exists;
- outbound remains OFF unless deliberately activated by a separate reviewed step;
- uncertain effects are never blindly retried;
- secrets/tokens/private keys never enter Git;
- private services remain private unless a reviewed public contract says otherwise;
- tenant selectors are not authorization; Core reauthorizes every tenant request;
- merged migration != live migration.

## New-session bootstrap

1. read this file for orientation;
2. read `AGENTS.md` and the authority chain;
3. fetch current `main`;
4. inspect active PR/branch relevant to the requested work;
5. verify live runtime when deployment state matters;
6. classify target as REAL / PARTIAL / PLACEHOLDER / ABSENT;
7. apply Capability Reuse Gate;
8. execute decision -> adversarial review -> execution -> validation.

Do not ask the user to reconstruct decisions already documented unless evidence is genuinely missing or contradictory.

## Maintenance rule

Update this file when architecture authority, REAL customer surfaces, live topology relevant to continuity, selected providers/adapters, major safety invariants or the current executable slice materially changes.

Keep it compact. Detailed history belongs in ADRs/evidence docs.

## Canonical documents

- `AGENTS.md`
- `docs/CAPABILITY_AUTHORITY.md`
- `docs/architecture.md`
- `docs/CANONICAL_STATE.md`
- ADR 0034 — state-first continuity
- ADR 0036 — capability authority/reuse gate
- ADR 0037 — Paperclip/Wandora/Mastra execution bridge
- ADR 0038 — Organization Adapter private state
- current Git `main`
- current runtime/container state when deployment facts matter

## One-line memory anchor

> **Wandora owns the customer/operator contract; specialist components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let local implementation convenience redefine the architecture.**
