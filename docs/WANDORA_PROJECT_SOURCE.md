# Wandora — Project Source / Continuity Bootstrap

Snapshot date: **2026-09-17**
Repository: `OARANHA/wandora`
Canonical base before this live-Core-promotion checkpoint: `8ceb1c43f5fb9967966f0c1564c51ecea382b13c`

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
Paperclip canary agents = 1
Paperclip managed resources = 1
Organization Adapter plugin = wandora.organization-adapter-v1@0.1.0, ready

Human Send: OFF / enable flag absent
Gateway outbound: OFF / enable flag absent
organizations = 2
digital_employees = 3
active_employees = 3
```

Migrations `20260916_010_organization_adapter_state_v1.sql` and `20260916_011_organization_adapter_service_contract_v1.sql` are **live**, and both canonical verifiers are green. The internal canary has live provider binding + company-scoped custody/config. The candidate image remains loaded; the temporary smoke container was removed after the successful canary.

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

## ADR 0038 — Organization Adapter private state — LIVE FOR INTERNAL CANARY

The accepted minimum private state remains:

- Wandora organization <-> provider company binding;
- Wandora digital employee <-> provider agent binding;
- operation journal for Wandora idempotency/request hash/recovery/audit.

Migration 010 is live and remains private. Migration 011 grants only the reviewed minimum Core runtime contract. There is still no authenticated/customer direct access, no customer hiring route, and provider credentials remain behind the adapter/custody boundaries.

## ADR 0039 — Managed Catalog Organization Adapter V1 — LIVE FOR INTERNAL CANARY

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

## Current Organization Adapter canary

ADR 0059 records the completed internal canary.

```text
migrations 010/011 = LIVE + verifiers green
internal Wandora -> Paperclip binding = 1
Paperclip plugin = installed + ready
Paperclip company config = present
company-scoped custody = live
Wandora Ana = 1 active / supervised
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-idempotency-key replay = same Wandora employee id

live Core = wandora/core:organization-adapter-candidate-068d30a49d9b
live Core Organization Adapter = ON
live Core healthz/readyz = 200/200
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF
customer Contratar/Ativar = absent
Empresa Exemplo Paperclip company = absent
```

The first canary attempt failed closed at Paperclip's private hostname guard. PR #103 added only the internal Docker hostname to the allowlist, preserved the guard, and the same `uncertain` operation was retried with the same idempotency key and completed.

The temporary candidate smoke container was removed after validation. ADR 0060 then promoted the same provenance-matched image to the live Core. Git comparison proved no later changes under `apps/core/` or `infra/stacks/core/`; the final render preserved the existing database, Gateway ingress, deterministic Agent Runtime and Human API capabilities and added only the reviewed Organization Adapter configuration/custody mount.

Post-promotion replay through the live Core returned the same existing Ana employee ID. Paperclip remains at one company, one paused Ana and one managed resource.

## Live cross-company isolation — closed

ADR 0062 records the completed live gate against the production Paperclip/plugin/HMAC composition.

The proof used one ephemeral provider-only B company, never `Empresa Exemplo`. Paperclip rejected an A-owned secret_ref in B's plugin config with its canonical cross-company error, and the private webhook targeting B while signed with A's HMAC returned `invalid_wandora_signature`. B remained at zero agents/managed resources.

The B fixture was deleted through the official provider API. A's existing config was then re-saved unchanged to recompute the plugin worker's configured-company scope to A-only. Final readback shows one live Paperclip company, the original A secret_ref/Ana/managed resource intact, no B residue and no Wandora DB delta.

Human Send and Gateway outbound remain OFF. `Empresa Exemplo` remains unprovisioned in Paperclip.

## Customer digital-employee lifecycle preflight

ADR 0063 separates hire from activation.

```text
Contratar = idempotent catalog materialization -> Wandora employee paused + supervised
Ativar    = separate future provider/runtime effect
```

The existing Organization Adapter journal/bindings are reused; no new lifecycle table is introduced. First-time customer hire will finalize `paused`, while hire replay may return the same employee as `paused` or `active` if a later activation has occurred.

Paperclip managed agents are natively provisioned paused and require explicit activation. Paperclip offers company-scoped `agents.resume`, but the live Wandora plugin does not request it and the execution bridge remains laboratory-only, so customer activation remains unavailable.

Provider company creation is lazy at first hire but is not yet safe to hide inside the customer request. The first customer-like canary will use a separately reviewed provider bootstrap prerequisite; general self-service requires higher-trust bootstrap automation.

The current `/start` prototype is not a production contract. V1 must be authenticated/tenant-bound, use the selected organization, expose only real catalog Ana, perform only `Contratar`, and remove fake company/WhatsApp/knowledge effects.

## Customer Hire Contract Implementation V1 — COMPLETE, GATE OFF

ADR 0064 records that the paused-first customer hire contract is implemented and CI-green without production activation.

Implemented in code:

- exact authenticated POST on the canonical digital-employees collection;
- owner/admin authorization through Organization Adapter;
- stable idempotency key;
- first-time `paused + supervised` finalization;
- replay returning current `paused|active`;
- dedicated disabled-by-default customer-hire runtime flag and separate compose overlay;
- authenticated tenant-bound Ana-only `/start`;
- `Equipe` paused presentation as “Contratada · aguardando ativação”;
- reviewed Web bridge for Authorization + Idempotency-Key with Cookie stripped.

The second adversarial review found a legacy active/supervised Ana already present in `Empresa Exemplo` with no Paperclip binding and no proven catalog identity. Automatic adoption by name/role is rejected. A matching legacy row now causes `catalog-conflict` before journal reservation or provider effect.

Therefore `Empresa Exemplo` must not be used as a naive first-hire canary. The earlier future-canary assumption in ADR 0063 is superseded by ADR 0064.

Production remains unchanged: Customer Digital-Employee Hire OFF, Human Send OFF, Gateway outbound OFF, customer activation unavailable.

## Customer Hire Canary Selection + Legacy Reconciliation Preflight V1 — COMPLETE

ADR 0065 selects a fresh internal customer-like organization with **zero digital employees** as the first paused-first hire canary. Legacy `Empresa Exemplo` adoption is deferred because there is no durable evidence proving its existing active Ana is catalog identity `ana-commercial-v1`.

The current ADR 0030 tenant provisioner cannot create that canary cleanly because it always creates one active supervised commercial-assistant employee. Passing a different name would only leave an unrelated extra employee, so the accepted direction is a versioned employee-free **Tenant Provisioning V2**, not direct SQL and not a new organization subsystem.

The future canary identity is:

```text
Wandora Customer Hire Canary
slug = wandora-customer-hire-canary
pre-hire digital employees = 0
```

The first actual hire effect must run through a private production-connected candidate Core with Customer Digital-Employee Hire ON while the normal live Core remains OFF. This keeps the runtime-wide gate from becoming a public multi-tenant rollout merely to prove one canary.

Live state remains unchanged: organizations = 2, new canary absent, `Empresa Exemplo` unbound, Customer Digital-Employee Hire OFF, Human Send OFF, Gateway outbound OFF.

## Private Tenant Provisioning V2 — CODE COMPLETE / PRODUCTION PREFLIGHT COMPLETE

ADRs 0066–0067 establish the employee-free tenant provisioning path.

Canonical V2:

```text
wandora_private.provision_beta_organization_v2(...)
  -> organization
  -> canonical user / Supabase identity mapping
  -> active owner membership
  -> zero digital employees
```

V1 remains historically compatible and continues to create its original initial active supervised employee. V1 and V2 share one private idempotency ledger with an explicit version/row-shape invariant; only `wandora_platform_provisioner` may execute V2.

PR #111 merged the code/CI implementation; at that historical checkpoint migration 012 was not yet live. ADR 0068 later applied it to production.

ADR 0067 then proved the live pre-012 state, produced and restore-tested the current rollback snapshot, applied the exact migration twice to a disposable restore of current production, and proved a lossless migration-only reverse path while `tenant_provisioning_requests = 0`.

Current rollback artifact:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

ADR 0068 then applied migration 012 to production using the exact canonical Git artifacts after a fresh live-state/hash recheck.

Production now has the employee-free V2 provisioner live but dormant:

```text
V2 function = present
provisioning_version = present
employee_id = nullable
platform provisioner EXECUTE V2 = true
Core/authenticated EXECUTE V2 = false
tenant provisioning requests = 0
```

Existing business/provider state remained unchanged at 2 organizations, 3 digital employees, 1 control-plane binding, 1 employee binding and 1 completed catalog hire. The future customer-hire canary remains absent. Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary Tenant Provisioning Preflight — COMPLETE

ADR 0069 freezes the first employee-free production canary request without creating it.

```text
request_key = customer-hire-canary:tenant-v2:v1
slug        = wandora-customer-hire-canary
name        = Wandora Customer Hire Canary
owner       = existing canonical Wandora owner, provider subject runtime-resolved/hash-gated
```

The accepted execution path keeps `wandora_platform_provisioner` passwordless with `CONNECTION LIMIT 0`: a local private `supabase_admin` maintenance session resolves the existing owner identity, then uses `SET LOCAL ROLE wandora_platform_provisioner` for the V2 call. The role-switch proof is green and the platform role still has no direct private-ledger read.

Production is unchanged after preflight: canary absent, provisioning ledger empty, Customer Digital-Employee Hire OFF, Human Send OFF and Gateway outbound OFF.

## Customer Hire Canary Tenant Provisioning Execution — LIVE

ADR 0070 created the single employee-free customer-like canary through V2 using the frozen no-password least-privilege path.

```text
Wandora organizations = 3
canary = Wandora Customer Hire Canary
canary employees = 0
V2 provisioning requests = 1
canary Paperclip company = absent
canary provider bindings/hire operations = 0
```

The existing canonical owner was reused; no provider subject was persisted to Git. `wandora_platform_provisioner` remains passwordless with `CONNECTION LIMIT 0`.

Paperclip independently remains at exactly one company, `Wandora Internal Supervised Proof`. Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary Paperclip Bootstrap Preflight — COMPLETE

ADR 0071 freezes a one-shot provider-company bootstrap with no provider mutation yet.

```text
Paperclip commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
operator = existing protected board_key, live isInstanceAdmin=true
current companies = 1
canary-name matches = 0
backup = enabled / ok
```

Exact future POST body is `{"name":"Wandora Customer Hire Canary"}` (SHA-256 `e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe`).

Paperclip does not provide an idempotency key for company creation, names are not unique and the route can persist the company before later owner/audit steps complete. Therefore any ambiguous/non-201 result after dispatch requires read-only reconciliation and never a blind retry. The live health contract reports company deletion disabled, so normal rollback does not assume DELETE.

## Customer Hire Canary Paperclip Bootstrap Execution — LIVE

ADR 0072 created the canary provider company once through the official Paperclip CLI with the protected Board credential store.

```text
Wandora Customer Hire Canary providerCompanyRef
  = e7422a00-1474-49d5-ac32-34594520015e

Paperclip companies = 2
canary provider company = active
canary owner membership = active
canary provider agents = 0
canary Organization Adapter config = absent
canary company secrets = 0

Wandora canary employees/provider bindings/hire operations = 0/0/0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

No provider-create replay was executed.

## Customer Hire Canary Organization Adapter Wiring Preflight — COMPLETE / BLOCKED

ADR 0073 freezes the exact canary wiring sequence without mutating production:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e
future HMAC filename  = paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

Future order is: operator-owned control-plane binding → protected Core custody file → company-owned Paperclip `local_encrypted` secret → company-scoped plugin config last → independent validation. Ambiguous secret/config effects require readback reconciliation and never blind retry.

The second adversarial review found the current Paperclip disaster-recovery gap: automatic database backups and `master.key` live on the same Docker volume, but both are required to restore `local_encrypted` values. No out-of-volume master-key recovery copy was found, so canary secret creation is blocked.

## Paperclip Local-Encrypted Secret Recovery Snapshot Preflight — COMPLETE

ADR 0074 freezes a same-host, out-of-Docker-volume recovery pair before another `local_encrypted` secret is allowed.

```text
fresh official Paperclip logical DB backup
+ exact current master.key
+ SHA-256/mode manifest
+ disposable PG18 restore
+ correct-key decrypt/hash-match
+ wrong-key decrypt rejection
```

The proof reuses the exact production Paperclip image/runtime and never prints restored plaintext. No snapshot or canary wiring effect was created during the preflight.

## Paperclip Local-Encrypted Secret Recovery Snapshot Execution — GREEN

ADR 0075 creates and proves the protected same-host recovery pair outside the Paperclip Docker volume.

```text
fresh official DB backup = retained
exact master.key copy = retained
source/copy hashes = match
disposable PG18 restore = green
matching-key decrypt/hash-match = green
wrong-key rejection = green
proof-only state = removed
```

Live Paperclip/Core were not restarted or mutated, and the customer-hire canary still has zero secrets/config/agents/binding/employees/hire operations.

This clears the ADR 0073 blocker but does not claim off-host/VPS-loss disaster recovery.

## Customer Hire Canary Organization Adapter Wiring Execution — GREEN

ADR 0076 makes the clean canary's provider control-plane wiring live:

```text
Wandora org -> Paperclip company binding = present
Core deterministic HMAC custody = present / 0640 / readable
Paperclip local_encrypted secret = exactly 1
Paperclip Organization Adapter config = exact secret_ref / healthy
Paperclip agents = 0
Wandora employees/employee bindings/hire ops = 0/0/0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

Independent hash-only validation proves the Core HMAC file and Paperclip encrypted secret version represent the same plaintext without revealing it.

## Customer Hire Canary Private Candidate Hire Execution — GREEN

ADR 0078 makes the first clean customer-like hire real and verified:

```text
Wandora Ana id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
role = commercial-assistant
status = paused
autonomy = supervised

Wandora employees / employee bindings / hire ops = 1 / 1 / 1
primary hire operation = completed
Paperclip managed Ana count = 1
Paperclip Ana = paused / wandora_mastra
```

The proof used the later PR #111 candidate artifact on private networks only and a real normal Supabase owner browser session. Candidate `/me` returned 200 for the canonical owner. The first hire returned 200, and same-key plus different-key/same-catalog replay both returned the same employee with no duplicate Wandora or Paperclip state and no provider/secret leakage in the customer response.

Cleanup completed:

```text
candidate running = false / container absent
ephemeral browser-session material = removed
normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The successful Ana remains paused. `Ativar` is still a separate future effect.

## Customer Digital-Employee Hire Public Rollout Preflight — COMPLETE / OFF

ADR 0079 freezes the rollout boundary. PR #126 is merged and proves refresh-safe, tenant-bound browser idempotency. The live Web is still pre-rollout and normal customer hire remains OFF.

The Core hire flag is global while organizations have different readiness states. A control-plane binding cannot serve as customer eligibility because accepted wiring creates that binding before the integration setup is complete.

Decision:

```text
global runtime hire gate
AND
explicit Wandora-owned organization + catalog eligibility
=
customer hire available
```

Eligibility is provider-neutral, operator-owned and enforced before provider effects. No production activation occurred.

## Customer Digital-Employee Hire Tenant Eligibility — IMPLEMENTED / CI GREEN / NOT LIVE

ADR 0080 + PR #128 implement the Wandora-owned eligibility boundary selected by ADR 0079.

Current implemented contract:

```text
new hire availability
=
global Core hire gate
AND
organization + catalog eligibility
AND
normal authorization / safety checks
```

Eligibility is a private Wandora fact. It does not contain provider IDs/configuration.

Write authority is isolated behind a dedicated `wandora_customer_hire_operator` NOLOGIN capability and a controlled setter. The tenant provisioner is deliberately not reused for rollout policy. Core has tenant-scoped SELECT only; browser/service roles have no direct authority.

The Core checks eligibility before any new journal/provider effect. An unfinished catalog hire can resume only with its original idempotency key; a completed catalog hire remains deduplicated even if eligibility is later disabled.

Customer GET now exposes only:

```text
available
already-hired
reconciliation-required
unavailable
```

The Web gates `Equipe`/`Contratar` from that projection and never invents a new key for a reconciliation-required operation.

Technical validation was green on the implementation head:

```text
Core CI                 35342325894 = success
Web CI                  35342325859 = success
Platform Admin CI       35342325774 = success
Messaging Gateway CI    35342325740 = success
Core Candidate Artifact 35342325793 = success
```

Production is unchanged: migration 013 is absent; no eligibility state is live; normal Customer Hire, Human Send and Gateway outbound remain OFF. CI candidate artifacts were not promoted.

## Customer Digital-Employee Hire Production Activation Preflight V2 — COMPLETE / NO EFFECT

ADR 0081 revalidated current `main`, production DB/runtime, final PR #128 artifacts and all active organizations without applying migration 013 or changing runtime effects.

Key frozen facts:

```text
main = e438518bb52be8119883c4350295dac58cd70ef2
main tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
reviewed PR merge-ref tree = same exact tree
migration 013 live objects = absent
Customer Hire / Human Send / Gateway outbound = OFF
active tenants selected for new catalog eligibility = 0
```

The reviewed Core/Web candidate artifacts from the final #128 validation are current-main tree-equivalent and are selected for the later dormant foundation execution.

Frozen production order:

```text
migration 013
-> read-only zero-row/authority postverify
-> Core
-> Core validation
-> Web
-> Web validation
-> stop with global hire OFF and zero eligibility rows
```

Eligibility changes use the dedicated NOLOGIN `wandora_customer_hire_operator` only through a protected local transactional `SET LOCAL ROLE` path; no new general-purpose login is authorized.

## Customer Digital-Employee Hire Dormant Production Foundation — LIVE / DORMANT

ADR 0082 applied migration 013 and promoted the reviewed PR #128 Core/Web candidates while deliberately keeping every rollout effect closed.

Live foundation:

```text
migration 013 = LIVE
eligibility rows = 0
customer-hire operator = NOLOGIN / controlled setter only

Core = wandora/core:organization-adapter-candidate-af542864d267
Web  = wandora/web:candidate-af542864d267
Core/Web = healthy

Customer Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

A fresh pre-migration backup is retained and its Wandora-owned schemas passed a disposable PostgreSQL 17.6 restore/count proof. Exact migration and candidate provenance were hash-gated before production use.

Core/Web Compose drift gates each proved that the only promotion delta was the image. Previous Core/Web images and rollback records remain available.

No durable employee/binding/hire count changed and no tenant received eligibility.

## Customer Digital-Employee Hire Global Runtime Gate Preflight — COMPLETE / OFF

ADR 0083 proves the next process-wide activation is a one-line Core configuration effect on the already-live reviewed image.

```text
canonical overlay blob = cf188f4e22651f318984f10a17aba3dee05ad2ea
delta = WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true
eligibility rows = 0
live gate = OFF
```

The overlay is not yet materialized in the live stack directory. Config-only rendering proves no image/network/mount/secret/port or unrelated capability changes.

Current safety state also proves:

```text
eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2
```

A disposable executable proof used the same live Core image with a production-derived Wandora schema clone and canonical migration 013. A synthetic fully wired owner tenant with no eligibility projected `unavailable`; POST returned provider-neutral 404 before journal/provider effect, with provider calls = 0 and no new employee/binding/operation.

The rollout order is frozen as global gate first with zero eligibility **and zero unfinished operations**, validate no new tenant availability, then stop. Tenant eligibility remains a later scoped effect.

## Customer Digital-Employee Hire Global Runtime Gate — LIVE / ZERO TENANT ELIGIBILITY

ADR 0084 executed the one-overlay Core activation selected by ADR 0083.

```text
Core image = wandora/core:organization-adapter-candidate-af542864d267
Customer Hire = ON
eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

The same reviewed Core image was recreated with only the canonical hire overlay. Core is healthy/ready with zero restarts. No durable employee/binding/hire count changed.

The live projection for all active tenants is still closed to new hire: two completed-hire tenants return `already-hired`; `Empresa Exemplo` returns `unavailable`; none returns `available=true`.

## First Tenant Eligibility Rollout Preflight — COMPLETE / NO CURRENT TARGET

ADR 0085 revalidated all active tenants with the global customer-hire gate already ON and eligibility still empty.

```text
Internal Supervised Proof -> completed ana-commercial-v1 / already-hired
Customer Hire Canary      -> completed ana-commercial-v1 / already-hired
Empresa Exemplo           -> matching legacy Ana + no Paperclip control binding / unavailable

eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

The two Paperclip-bound companies remain correctly wired with company-scoped `secret_ref` config, healthy Organization Adapter plugin and protected Core HMAC custody. The dedicated eligibility operator remains NOLOGIN and setter-only.

No current tenant qualifies for a first new catalog rollout, so no eligibility was enabled. ADR 0085 freezes the future target-specific setter/rollback and requires the first rollout to fail closed unless exactly one reviewed organization+catalog pair becomes enabled. The frozen first-rollout transaction is serialized with an EXCLUSIVE table lock; a disposable two-session race proved a second concurrent target is rejected before setter execution, and rollback restores zero enabled rows. The local operator session uses the existing protected `supabase_admin` boundary and narrows to the NOLOGIN hire-operator role only for the setter.

## Clean Tenant Rollout Candidate Preparation — COMPLETE / OWNER ONBOARDING BLOCKER

ADR 0086 proves there is no real clean customer/owner target waiting in production:

```text
Auth users = 1
Wandora users = 1
users without memberships = 0
active organizations = 3
Paperclip companies = 2
eligibility rows = 0
```

Private Tenant Provisioning V2 is ready but requires a real existing Supabase Auth subject. Public signup remains disabled. Live GoTrue has configured SMTP plus protected admin invite/generate-link routes, while the current Web only supports password login/refresh/logout and canonical `/api/v1/me` bootstrap.

The selected beta path is invite-only onboarding through Supabase Auth, followed by employee-free V2 provisioning, Paperclip company/bootstrap+wiring, and finally the ADR 0085 serialized tenant eligibility transaction. No synthetic tenant is created merely to advance rollout.

## Customer Owner Invite Acceptance + First Password — IMPLEMENTED / NOT LIVE

ADR 0087 implements the provider-aligned normal first-access path in Web/code/CI only.

Against exact GoTrue v2.196.0 source, Wandora now handles the current administrative invite as an implicit-flow redirect, strictly stages only `sb + type=invite + bearer + unexpired` sessions, removes credentials from the URL before React renders, supports SITE_URL-root fallback, and sets the first password through authenticated Supabase Auth `PUT /user`.

The invite session is isolated from the normal browser session until password success; existing `/api/v1/me` remains the canonical Wandora user/organization authorization boundary. No `service_role` or Auth-admin secret is added to Web/Core.

Web CI proved the invite acceptance, first-password, existing customer-hire browser and Human API bridge contracts together. The code is **not deployed** and no real invite/Auth user/customer tenant/provider/eligibility effect occurred.

An explicit operational gap remains: if the browser session is lost after one-time invite verification but before the password is defined, the customer cannot know GoTrue's random temporary password. A Supabase Auth recovery contract must be reviewed before real customer invitation.

## Customer Owner Interrupted Invite Recovery — PREFLIGHT COMPLETE / NO EFFECT

ADR 0088 selects the minimum recovery contract against exact GoTrue v2.196.0. Normal customer recovery will reuse public provider-native `POST /recover`, a dedicated Wandora `/recover-access` Web flow, strict `type=recovery` browser-session staging and the existing ADR 0087 authenticated password-update + password-grant reconciliation.

Recovery tokens/session issuance remain Supabase Auth state. No Wandora recovery table, generic Core recovery proxy or browser Auth-admin credential is justified. `/admin/generate_link type=recovery` remains privileged operator-only emergency/diagnostic capability.

A second interruption after consuming a recovery link is not terminal: the exact provider contract can issue a later recovery token again, subject to rate/frequency limits. Live CAPTCHA is currently disabled, so anti-abuse review is an explicit activation gate before any real customer recovery.

The preflight generated no invite/recovery, changed no Auth user, performed no deploy/provisioning/provider wiring and kept eligibility at zero.

## Next executable slice

Next: **Customer Owner Interrupted Invite Recovery Contract Implementation V1.**

Code/CI only. Implement the dedicated recovery request/callback/reset browser flow and executable verifier. Do not deploy, send a real invite/recovery, create a customer Auth user, provision a tenant, create provider wiring or enable eligibility.

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
- ADR 0059 — Organization Adapter Execution V1 internal canary
- ADR 0060 — Organization Adapter Live Core Promotion V1
- ADR 0063 — Customer Digital-Employee Lifecycle Contract Preflight V1
- ADR 0064 — Customer Hire Contract Implementation V1
- ADR 0065 — Customer Hire Canary Selection + Legacy Reconciliation Preflight V1
- ADR 0066 — Private Tenant Provisioning V2 Employee-Free Contract Implementation V1
- ADR 0067 — Private Tenant Provisioning V2 Production Migration Preflight V1
- ADR 0068 — Private Tenant Provisioning V2 Production Migration Execution V1
- ADR 0069 — Customer Hire Canary Employee-Free Tenant Provisioning Preflight V1
- ADR 0070 — Customer Hire Canary Employee-Free Tenant Provisioning Execution V1
- ADR 0071 — Customer Hire Canary Paperclip Provider Company Bootstrap Preflight V1
- ADR 0072 — Customer Hire Canary Paperclip Provider Company Bootstrap Execution V1
- ADR 0073 — Customer Hire Canary Organization Adapter Custody + Config + Binding Preflight V1
- ADR 0074 — Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1
- ADR 0075 — Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1
- ADR 0076 — Customer Hire Canary Organization Adapter Custody + Config + Binding Execution V1
- ADR 0077 — Customer Hire Canary Private Candidate Core Hire Preflight V1
- ADR 0078 — Customer Hire Canary Private Candidate Core Hire Execution V1
- ADR 0079 — Customer Digital-Employee Hire Public Rollout Preflight V1
- ADR 0080 — Customer Digital-Employee Hire Tenant Eligibility Contract Implementation V1
- ADR 0081 — Customer Digital-Employee Hire Production Activation Preflight V2
- ADR 0082 — Customer Digital-Employee Hire Dormant Production Foundation Activation V1
- ADR 0083 — Customer Digital-Employee Hire Global Runtime Gate Activation Preflight V1
- ADR 0084 — Customer Digital-Employee Hire Global Runtime Gate Activation Execution V1
- ADR 0085 — Customer Digital-Employee Hire First Tenant Eligibility Rollout Preflight V1
- ADR 0086 — Customer Digital-Employee Hire Clean Tenant Rollout Candidate Preparation Preflight V1
- ADR 0087 — Customer Owner Invite Acceptance + First Password Contract Implementation V1
- current Git `main`
- current runtime/container state when deployment facts matter

## One-line memory anchor

> **Wandora owns the customer/operator contract; specialist components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let local implementation convenience redefine the architecture.**
