# Wandora — Project Source / Continuity Bootstrap

Snapshot date: **2026-09-16**
Repository: `OARANHA/wandora`
Canonical `main` at snapshot: `9bc7275cf6ab6931335b8afe48b63176cbb47e3c`

> **Purpose:** this file is a compact bootstrap for ChatGPT Project Sources and future development sessions. It exists to prevent architectural drift, accidental reinvention, stale workflow assumptions and loss of project continuity.
>
> **This file is NOT the highest authority and does not replace live verification.** If this snapshot conflicts with Git, accepted ADRs, the current `main` branch or the running environment, the newer canonical evidence wins.

---

## 1. Mandatory authority order

Before making a material product, architecture, code, database or infrastructure decision, read/resolve in this order:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/` — newer accepted ADRs override conflicting older guidance;
3. `docs/CAPABILITY_AUTHORITY.md`;
4. `docs/architecture.md`;
5. `docs/CANONICAL_STATE.md`;
6. component README/runbook;
7. this file only as continuity/bootstrap context.

For mutable facts such as current branch, container image, enabled feature flags, database counts or deployment status, **verify the current repo/runtime instead of trusting this snapshot**.

---

## 2. Mandatory development discipline

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

The second review must actively try to prove the first decision wrong, duplicated, unsafe, too broad, irreversible or based on an unproven premise.

A missing table/service/workflow in Wandora is **never**, by itself, evidence that Wandora must build that capability.

---

## 3. Product thesis

Wandora is a company/product where businesses hire, train, govern and measure **digital employees** alongside human teams.

The customer should experience business concepts such as:

- company;
- team / digital employees;
- responsibilities;
- work;
- conversations;
- approvals;
- outcomes;
- learning/configuration.

The customer should **not** need to know or operate Paperclip, Mastra, Evolution, Supabase, RLS, provider IDs, prompts, tokens, Portainer or runtime implementation details.

---

## 4. Canonical capability architecture

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

### Core rule

**Wandora owns the product contract and experience; specialist components lend capabilities through Wandora-owned adapters.**

`Wandora-owned` does **not** mean `Wandora-native implementation`.

---

## 5. Capability authority map

| Capability | Wandora owns | Specialist implementation/capability |
| --- | --- | --- |
| Customer product | vocabulary, UX, policy, authorization, stable Wandora IDs | Wandora Web/Core |
| Platform operation | operator contracts, authorization, audit, cross-tenant controls | Wandora Platform Admin over adapters |
| Human identity/session | Wandora user/membership semantics | Supabase Auth supplies session/identity |
| Durable Wandora facts | mappings, policy, projections, audit/reconciliation, stable IDs | Supabase PostgreSQL is storage infrastructure |
| Digital-employee control plane | customer-facing employee identity/contract/policy | Paperclip through Organization Adapter |
| Agent execution | allowed execution contract, policy, inputs/outputs | Mastra through Agent Runtime Adapter |
| WhatsApp transport | provider-neutral messaging contract/effect policy | Evolution through Messaging Gateway |
| Model inference | provider-neutral runtime/model policy | Mistral/Chutes/OpenAI/etc. |
| Runtime/operations | desired topology in Git | Docker/Compose/Portainer/Traefik/Cloudflare |

Protected native consoles — Paperclip UI, Mastra Studio, Evolution Manager, Supabase Studio and Portainer — are engineering/operator surfaces, not the customer product and not substitutes for Platform Admin.

---

## 6. Capability Reuse Gate — mandatory before new domain code

Before creating a material new Wandora table, service, workflow, state machine, scheduler, assignment model, agent registry or admin subsystem, answer:

1. What exact customer/operator capability is missing?
2. Does Paperclip, Mastra, Evolution, Supabase or another accepted component already provide all or part of it?
3. Which layer owns the capability, and which semantics/IDs/policy remain Wandora-owned?
4. What is the **minimum** Wandora durable state required for safety, replaceability, authorization, idempotency, audit or reconciliation?
5. What adapter prevents provider IDs/schemas/auth from leaking to Web or Platform Admin?
6. What happens on provider timeout, partial success, outage or replacement?
7. Would the proposed Wandora-native implementation duplicate an accepted provider capability?

If #7 is **yes**, default = **do not build it**. A newer ADR must prove why reuse is insufficient before proceeding natively.

Invalid reasoning:

> “This concept is missing from PostgreSQL, therefore Wandora needs a table/service for it.”

Correct reasoning:

```text
REAL STATE
 -> GAP
 -> REUSE GATE
 -> WANDORA CONTRACT/ADAPTER
 -> MINIMUM WANDORA STATE
 -> NATIVE DOMAIN ONLY IF REUSE IS PROVEN INSUFFICIENT
```

---

## 7. Customer Web — actual implemented surface

Implemented customer routes at this snapshot:

- `Início` — `/`;
- `Equipe` — `/team`;
- `Trabalho` — `/work`;
- `Conversas` — `/conversations`;
- `Aprovações` — `/approvals`;
- `Empresa` — `/company`;
- `/login`;
- `/start`.

Do **not** describe future menu concepts as implemented routes until code exists.

### Current state-first classification

**REAL**

- human login/session;
- explicit multi-organization selection;
- `Equipe` canonical digital-employee read;
- `Trabalho` supervised work flow;
- `Conversas` list/history;
- Canonical Confirmation V2 path;
- controlled WhatsApp inbound/outbound proof.

**PARTIAL / PLACEHOLDER**

- `Início`;
- `Aprovações` customer surface;
- `Empresa` customer configuration surface;
- production actions in `/start`, including real hiring/activation.

Do not rebuild REAL surfaces from zero.

---

## 8. Proven end-to-end product loop

A controlled real flow has been proven:

```text
WhatsApp inbound
 -> Evolution
 -> Messaging Gateway
 -> Wandora Core
 -> Mastra deterministic Agent Runtime
 -> canonical supervised proposal
 -> Trabalho / human review
 -> Canonical Confirmation V2
 -> Gateway / Evolution outbound
 -> message observed on authorized handset
```

External-effect switches were returned to OFF after controlled proof.

---

## 9. Current live snapshot — verify before relying on it

Observed on 2026-09-16 immediately before creating this file:

```text
wandora-web
  image: wandora/web:team-read-b31db507
  status: healthy

wandora-core
  image: wandora/core:team-read-b31db507
  status: healthy

wandora-messaging-gateway
  image: wandora/messaging-gateway:origin-fix-94cfb4de
  status: healthy

wandora-paperclip
  image: wandora/paperclip:v2026.831.1
  status: healthy
```

Effect switches at snapshot:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED: absent / OFF
WANDORA_GATEWAY_OUTBOUND_ENABLED: absent / OFF
```

Canonical business counts at snapshot:

```text
organizations = 2
digital_employees = 2
active_employees = 2
```

Never assume these mutable values are still current in a later session; re-check runtime.

---

## 10. Team Read V1 — live

PR #71 connected customer `Equipe` to the canonical tenant-authorized endpoint:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

The UI no longer invents employees/progress data.

This read projection does **not** establish that Wandora itself owns the full employee control plane.

---

## 11. Paperclip boundary — proven findings

Installed/lab-audited Paperclip already provides substantial control-plane capabilities:

- companies/memberships;
- agents/digital employees;
- `agent-hires`;
- org structure;
- lifecycle/permissions/config revisions;
- issues/tasks;
- assignments/run ownership;
- approvals;
- goals/projects/routines;
- built-in and external runtime adapters.

Therefore Wandora must not casually recreate these as a parallel native control plane.

### Important authority findings

- Paperclip company creation is a higher-trust instance-admin operation;
- a same-company board/service identity with `agents:create` can use `agent-hires` without instance-admin authority;
- board API keys inherit the owning Paperclip user's memberships/permissions rather than having independent per-key tenant scope;
- a broad multi-company/instance-admin key must not be the normal tenant Organization Adapter credential.

---

## 12. Paperclip -> Wandora -> Mastra execution bridge — proven

The accepted direction is:

```text
Paperclip task/run
 -> external adapter: wandora_mastra
 -> dedicated Paperclip->Wandora directional HMAC
 -> private Wandora execution bridge
 -> existing Wandora Agent Runtime
 -> Mastra
 -> callback to Paperclip using opaque run-scoped JWT
```

Security split:

- adapter -> Wandora: dedicated HMAC over timestamp + exact body;
- Wandora -> Paperclip callback: opaque run-scoped Paperclip JWT;
- Wandora never receives Paperclip JWT master signing secret;
- browser/Platform Admin never see raw Paperclip credentials/IDs/contracts.

The adapter also **minimizes context** via explicit allow-list; raw provider context/MCP material must not cross the boundary by default.

Reproducible spike:

`spikes/paperclip-wandora-mastra-adapter-v1/`

---

## 13. Disposable Paperclip proof completed after ADR 0037

A second Paperclip instance was run isolated from live data using the same Paperclip image.

The disposable proof established:

- Company A and Company B can exist independently;
- `Ana Proof` was hired in Company A through Paperclip `agent-hires`;
- a Paperclip task `WAN-1` was assigned to Ana Proof;
- the canonical `wandora_mastra_spike` adapter was installed in the disposable instance;
- moving `WAN-1` into executable state started a real Paperclip run;
- Paperclip supplied a run-scoped JWT;
- the Wandora proof bridge validated its directional HMAC;
- the bridge used the run-scoped JWT to callback into Paperclip;
- `WAN-1` finished `done`;
- provider metadata can preserve a synthetic `wandoraEmployeeId` and `wandoraHireKey` for reconciliation.

### Critical idempotency finding

Repeating the same Paperclip `agent-hires` request returned `201` again and created a **different agent ID**.

Therefore Paperclip does **not** provide the hiring idempotency contract Wandora needs at this boundary.

Wandora must own only the minimum integration safety state required to avoid blind duplicate hires and reconcile ambiguous external outcomes.

---

## 14. Abandoned direction — DO NOT REVIVE

The earlier provisional `digital_employee_work_assignments` / native assignment migration direction was rejected before merge and before production.

Do not create a parallel native employee hierarchy/responsibility/task control plane merely because those concepts are convenient locally.

Existing beta `digital_employees`, `work_items`, proposals and approvals remain valid for the proven beta vertical slice, but their existence is **not precedent** for growing Core into another Paperclip.

---

## 15. Current in-progress work — NOT canonical until merged

At snapshot time there is an unmerged branch:

```text
branch: feat/organization-adapter-state-v1
head: bd89d41c822798d8acdfac31a967dbec8939f914
```

Its purpose is to evaluate the **minimum private Wandora integration state** required by the proven Paperclip boundary, specifically:

- organization <-> Paperclip company binding;
- digital employee <-> Paperclip agent binding;
- idempotent/reconcilable hiring operation journal.

The design explicitly avoids duplicating Paperclip lifecycle, hierarchy, task or assignment state.

The proposed migration is intentionally inert until separately activated: no customer hiring route, no new Core privilege and no production application merely because the migration exists in a branch.

**Do not treat branch work as canonical until its PR is reviewed, green and merged.**

---

## 16. Platform Admin

Platform Admin is a separate Wandora operator trust plane.

Its role is:

```text
Platform Admin
 -> Wandora contracts / authorization
 -> Organization Adapter -> Paperclip
 -> Agent Runtime Adapter -> Mastra
 -> Messaging Gateway -> Evolution
 -> Data/Auth boundary -> Supabase
```

It must not become a stitched set of embedded provider consoles and must not reimplement their control planes.

ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

---

## 17. Security invariants

Never silently weaken these:

- customer browser never talks directly to Paperclip, Mastra, Evolution or privileged database/admin APIs;
- provider IDs/contracts do not become customer-facing Wandora contracts;
- no production credential merely because a role/table/adapter exists;
- outbound remains disabled unless an explicitly reviewed activation occurs;
- uncertain external effects are never blindly retried;
- secrets/tokens/private keys never enter Git;
- any credential that ever entered Git history is treated as compromised;
- private Core/Gateway/provider services stay private unless a reviewed public contract says otherwise;
- tenant selectors are not authorization; Core reauthorizes every tenant request;
- provider capability reuse is preferred over native duplication;
- minimum provider binding/reconciliation state is allowed only when justified by safety, replaceability, audit or idempotency.

---

## 18. What NOT to do in a future session

Do not:

- restart architecture from generic SaaS abstractions;
- assume a missing table means a missing capability;
- recreate Paperclip agent lifecycle, org hierarchy, tasks or assignment engine without a superseding ADR;
- create Mastra-owned public identity for Wandora employees;
- let Evolution become the business backend;
- let Supabase Studio become the customer product;
- treat Portainer as source of truth;
- assume old chat summaries override current Git/runtime;
- activate production effects as a side effect of unrelated work;
- describe a branch migration as live before it is explicitly applied and verified;
- treat provider consoles as the normal customer/admin UX;
- rebuild a customer surface already classified REAL.

---

## 19. New-session bootstrap procedure

When resuming Wandora in a new conversation/session:

1. read this file for orientation;
2. read `AGENTS.md` and the authority chain;
3. fetch current `main` SHA;
4. inspect any active branch/PR relevant to the requested work;
5. verify live runtime if the decision depends on deployment state;
6. classify the target as REAL / PARTIAL / PLACEHOLDER / ABSENT;
7. run the Capability Reuse Gate before proposing new domain state;
8. then execute the normal decision -> adversarial review -> execution -> validation cycle.

Do not ask the user to reconstruct decisions already documented unless the evidence is genuinely missing or contradictory.

---

## 20. Maintenance rule for this Project Source

Update this file when one of these materially changes:

- accepted architecture/capability authority;
- customer surfaces becoming REAL;
- live deployment topology/images when important to continuity;
- selected provider/adapters;
- major security invariants;
- current executable slice;
- abandoned directions that could otherwise be accidentally revived.

Keep it compact. Link/reference canonical documents instead of copying entire ADRs.

If this file becomes stale, **do not preserve stale facts for continuity** — update them or explicitly mark them historical.

---

## 21. Canonical documents to consult

- `AGENTS.md`
- `docs/CAPABILITY_AUTHORITY.md`
- `docs/architecture.md`
- `docs/CANONICAL_STATE.md`
- `docs/decisions/0034-state-first-project-continuity-rule.md`
- `docs/decisions/0036-capability-authority-and-reuse-gate.md`
- `docs/decisions/0037-paperclip-wandora-mastra-execution-bridge-v1.md`
- current component README/runbook
- current Git `main`
- current runtime/container state when deployment facts matter

---

## 22. One-line memory anchor

> **Wandora owns the customer/operator contract; Supabase, Paperclip, Mastra, Evolution and other components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let a local implementation convenience redefine the architecture.**
