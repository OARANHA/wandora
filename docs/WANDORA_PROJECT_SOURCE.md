# Wandora — Project Source / Continuity Bootstrap

Snapshot date: **2026-09-17**
Repository: `OARANHA/wandora`
Canonical base verified before this closure: `e42f29967892c626c1ca790ee41ec0ceabc251ed`

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

Observed/reverified through 2026-09-17:

```text
Core:      wandora/core:team-read-b31db507               healthy
Web:       wandora/web:team-read-b31db507                healthy
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de healthy
Paperclip: wandora/paperclip:v2026.831.1                  healthy/private
Paperclip bootstrapStatus: ready

control.wandora.com.br -> protected Paperclip operator console
runtime.wandora.com.br -> protected isolated Mastra Studio
Cloudflare Access: required/proven for both

Paperclip companies = 1
Paperclip canary company = Wandora Internal Supervised Proof
Paperclip canary agents = 0
Paperclip plugin registry entries = 0

Human Send: OFF / enable flag absent
Gateway outbound: OFF / enable flag absent
organizations = 2
digital_employees = 2
active_employees = 2
```

Migrations `20260916_010_organization_adapter_state_v1.sql` and `20260916_011_organization_adapter_service_contract_v1.sql` remain **merged in Git but not applied live** at this snapshot. No Organization Adapter production HMAC exists and the candidate Core remains loaded but not running.

## Paperclip boundary — proven

Paperclip remains authoritative for its organization/control-plane lifecycle. Wandora must not recreate a parallel hierarchy/task/agent-control-plane merely because local tables would be convenient.

Historical direct `agent-hires` laboratory evidence remains valid: repeated equal requests can create distinct provider agents. It is no longer the selected V1 provider action for catalog employees.

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

## ADR 0038 — Organization Adapter private state — MERGED, INERT

The accepted minimum private state remains:

- Wandora organization <-> provider company binding;
- Wandora digital employee <-> provider agent binding;
- operation journal for Wandora idempotency/request hash/recovery/audit.

Migration `20260916_010_organization_adapter_state_v1.sql` remains deliberately inert and not live:

- no `wandora_core_runtime` access;
- no `authenticated` access;
- no customer hiring route;
- no provider credential;
- no live Paperclip adapter installation.

## ADR 0039 — Managed Catalog Organization Adapter V1 — MERGED, NOT LIVE

PR #78 merged at:

```text
5c69cac595b7af9bd23a6496fc24a9d356027e29
```

The V1 Paperclip technical identity/provider operation is now selected:

```text
Wandora Organization Adapter
 -> private signed webhook
 -> Wandora-owned headless multi-company Paperclip plugin
 -> company-scoped config + secret_ref
 -> timestamp/HMAC verification
 -> Paperclip configured-company host scope
 -> agents.managed.reconcile(stable catalog agentKey, companyId)
 -> stable managed Paperclip agent
```

Minimum plugin capabilities proven:

```text
webhooks.receive
secrets.read-ref
agents.managed
```

Disposable proof established:

- missing `secrets.read-ref` is denied by the host;
- plugin config cannot bind another company's secret reference;
- first reconcile creates the declared managed catalog agent;
- replay resolves the same provider agent ID rather than duplicating it;
- a proactive plugin call can reconcile within its configured company;
- the same call targeting an unconfigured company is denied by the Paperclip host.

Second adversarial review found a critical scope limit: `agents.managed.reconcile()` only supports **manifest-declared plugin-managed agents**. Therefore V1 is intentionally a **catalog employee** model. Arbitrary/custom employees remain outside V1 and there is no fallback to direct `agent-hires` without a newer ADR/proof.

A broad ordinary Board API key is not the normal tenant runtime credential. Plugin install/configuration are trusted operator/provisioning actions; customer browsers never receive Paperclip credentials or native plugin management access.

The exact combined negative case — valid Company A HMAC with Company B as target — was later executed successfully in the disposable final request-contract proof recorded by ADR 0040. A separate live cross-company gate remains required before customer-facing activation if the activation ADR still calls for it.

Evidence:

```text
docs/decisions/0039-paperclip-managed-catalog-organization-adapter-v1.md
docs/infra/paperclip-organization-adapter-managed-plugin-proof-v1-20260916.md
```

PR #78 passed Core, Web, Messaging Gateway and Platform Admin CI.

## Abandoned direction — DO NOT REVIVE

The old native `digital_employee_work_assignments` direction was rejected before merge/live application.

Do not create a Wandora-native employee hierarchy/responsibility/task control plane merely because the concepts are convenient locally.

## Next executable slice

Do **not** expose customer `Contratar funcionário` yet.

Production Activation Preflight V2 is complete in ADR 0057. The legitimate Paperclip instance-admin exists and one provider company is frozen for the internal canary:

```text
Wandora organization = Wandora Internal Supervised Proof
Paperclip company     = Wandora Internal Supervised Proof
providerCompanyRef    = 815d499e-4231-4e6b-b7fc-67f0ba22a595
Paperclip agents      = 0
```

The next possible slice is a separate **Organization Adapter Production Activation Execution V1**. It is a real production-effect decision and is **not executed or implicitly authorized** by the preflight.

Frozen high-level order:

1. fresh REAL NOW + second adversarial review;
2. migration 010 + verifier;
3. migration 011 + verifier;
4. operator-only Wandora organization -> Paperclip company binding, fail-closed on conflict;
5. verify/materialize the canonical CI plugin artifact;
6. install only `wandora.organization-adapter-v1@0.1.0`;
7. generate one per-company HMAC exactly once and establish Core/Paperclip custody;
8. configure only the internal canary company with its own `secret_ref`;
9. re-render/promote the candidate Core with Organization Adapter enabled, customer hire route still absent, Human Send OFF and Gateway outbound OFF;
10. run one internal canary and validate stable managed Ana/replay before any second/customer company.

`Empresa Exemplo` deliberately has no Paperclip provider company yet. Do not create it merely to continue context recovery.

## Platform Admin

Platform Admin remains a separate Wandora operator trust plane and is not the current priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## Security invariants

- customer/product browsers never talk directly to Paperclip, Mastra, Evolution or privileged DB/admin APIs; protected operator consoles are a separate operator-only surface;
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
- ADR 0039 — Managed Catalog Organization Adapter V1
- ADR 0056 — Paperclip Provider Company Bootstrap V1
- ADR 0057 — Organization Adapter Production Activation Preflight V2 Closure
- current Git `main`
- current runtime/container state when deployment facts matter

## One-line memory anchor

> **Wandora owns the customer/operator contract; specialist components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let local implementation convenience redefine the architecture.**
