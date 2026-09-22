# Wandora — Project Source / Continuity Bootstrap

Snapshot date: **2026-09-20**
Repository: `OARANHA/wandora`
Canonical main entering the self-hosted CI restoration slice: `90ce29465816e4b91fb7bf2d516e0119a6404731`
Active infrastructure PR at this snapshot: **#162** (`ci: add isolated Wandora self-hosted runner`); implementation-validation head `fad8d64070663aea823325f8970a24b90004295e`.

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


## Current CI execution boundary

The repository remains private. GitHub-hosted Actions quota exhaustion is treated as an unavailable hosted-runner allowance, not as a failed code/test result.

Normal Wandora CI now uses the repository-scoped runner `wandora-vps-01-ci` on the existing Wandora VPS. The runner uses the dedicated `wandora-ci` identity and a separate rootless Docker daemon; it is not in the host `docker`, `wandora-ops` or `sudo` groups and has no production Docker socket authority.

The live runner service is bounded to 300% CPU, 3 GiB `MemoryHigh`, 4 GiB `MemoryMax` and 4096 tasks, with `UMask=0022` and `PrivateTmp=yes`. Pre/post job hooks prove the rootless boundary and clean CI Docker state.

Important continuity rule: bind sources needed by rootless Docker must be staged in `RUNNER_TEMP`, not runner-private `/tmp`, because the Docker daemon is a separate user service and therefore does not share the runner service's private tmp namespace.

The implementation-validation head passed all seven repository CI workflows while critical production containers remained healthy with zero restarts. See ADR 0113 for the evidence chain.

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

## Customer Owner Interrupted Invite Recovery — IMPLEMENTED / NOT LIVE

ADR 0089 + PR #137 implement the ADR 0088 recovery contract in Web/code proof only.

The public `/recover-access` route now provides a neutral recovery request and the provider callback/reset path. The browser calls public Supabase Auth `POST /recover` with the publishable key only, stages exact unexpired `type=recovery` sessions separately under `wandora.auth.recovery.v1`, removes URL credentials before React renders and reuses the shared authenticated password-update + password-grant reconciliation from ADR 0087.

The second review found a pre-render collision: the existing invite handler would have stripped a valid recovery fragment first. Invite now explicitly defers recovery and recovery explicitly defers invite; unsupported Auth fragments still fail closed.

GitHub-hosted checks for the implementation head again ended before runner assignment with `steps=null`, so they are not called green. An independent reconstruction of the exact Web branch with the pinned Dockerfile passed strict TypeScript, invite/recovery/hire verifiers, Vite production build and an isolated route smoke with `/recover-access=200`, `/accept-invite=200` and generic unreviewed API `404`.

The implementation is not deployed. No recovery/invite was generated or sent, no Auth user/tenant/provider state changed, and eligibility remains zero. Live CAPTCHA is still disabled and remains an activation gate.

## Customer Owner Invite + Recovery Production Activation Preflight — COMPLETE / BLOCKED

ADR 0090 proves the owner-access Web source and a production-keyed local candidate without deploying it.

```text
canonical main = 5f135e9070380e28c64f244c8a7126644cfa793c
candidate = wandora/web:owner-access-candidate-5f135e90
candidate manifest list = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
live Web = wandora/web:candidate-af542864d267
```

All 34 Web build-context files match current main Git blobs. The candidate uses the existing public Supabase ANON/publishable key, passed strict TypeScript + invite/recovery/hire verifiers + Vite build, and isolated smoke returned 200 for `/login`, `/accept-invite`, `/recover-access`, with unauthenticated `/api/v1/me=401`. Rollback is image-only.

Auth redirect/origin configuration is compatible and public signup remains disabled. No recovery POST was sent.

Activation remains blocked by the anti-abuse gate: GoTrue CAPTCHA is off and the current Web has no CAPTCHA-token contract; the public Supabase Traefik router has no recovery-specific limiter; the origin is not proven Cloudflare-only; and the installed Cloudflare DNS token can read the zone but receives 403 reading the HTTP rate-limit ruleset. Therefore no compatible Cloudflare recovery rule is currently proven.

No Web/Auth/Core deployment, invite/recovery, tenant/provider wiring or eligibility effect occurred.

## Customer Owner Recovery Edge Anti-Abuse Control Preflight — COMPLETE

ADR 0091 resolves the anti-abuse design against the actual Cloudflare zone.

```text
Cloudflare plan = Free Website
selected rule = exact /auth/v1/recover path
rate = 6 requests / 10 seconds / IP
mitigation = block 10 seconds
phase = http_ratelimit
```

Free-plan constraints matter: one rate-limiting rule, Path matching, IP counting, 10-second window/mitigation, and no Method field. Therefore OPTIONS and POST are intentionally counted together; the threshold allows several rapid human retries while cutting machine-speed bursts.

The existing DNS token remains DNS-only and cannot read the rate-limit ruleset (403). It must not be widened. Future execution requires a separate one-zone WAF credential that first snapshots the current ruleset and proves the Free single-rule slot is available.

A direct-origin attempt from independent `28server` timed out before connection, correcting the earlier over-interpretation of local loopback routing. Exact UFW rules are still not readable without interactive sudo, so future execution rechecks the external direct-origin negative rather than assuming a specific firewall implementation.

The future edge-rule validation can use OPTIONS-only burst traffic and therefore does not need a real recovery POST or e-mail.

No Cloudflare rule, Auth setting, Web runtime, tenant/provider state or eligibility changed in this preflight.

## Recovery Edge Activation — PRE-MUTATION CREDENTIAL GATE

ADR 0092 records that execution reached the credential/custody boundary and stopped safely.

Only the Cloudflare DNS token exists on the VPS and it remains DNS-scoped. The reviewed WAF secret directory does not exist and `/opt/wandora/data` is root-owned, so `wandora-admin` cannot create the production custody path without sudo. No alternate WAF token was found.

Required operator-issued token:

```text
specific zone = wandora.com.br
Zone Read
Zone WAF Read
Zone WAF Edit/Write
no DNS edit
no account-level WAF
```

Reviewed custody:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
root:wandora-ops
0640
```

No Cloudflare rule mutation occurred.

## Customer Owner Recovery Edge Activation — COMPLETE

ADR 0093 records the successful edge-rule transaction.

The Free-plan `http_ratelimit` phase had no entry point before mutation (`404 / 10003`). The dedicated one-zone WAF token was used to create exactly one reviewed rule:

```text
wandora_owner_recovery_burst_guard_v1
/auth/v1/recover
6 requests / 10 seconds / IP
block 10 seconds
```

Read-back returned one rule with exact match. OPTIONS-only burst validation reached 429 and returned to 200 after 12 seconds. No recovery POST was sent; recovery-token/sent counters remain zero.

Independent direct-origin TCP remained unreachable after the edge change.

Owner-access Web remains undeployed; live Web is still `wandora/web:candidate-af542864d267`.

## Customer Owner Invite + Recovery Web Production Activation — COMPLETE

ADR 0094 records the production Web promotion.

```text
live Web = wandora/web:owner-access-candidate-5f135e90
id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
health = healthy
restarts = 0
```

Only the Web image selector changed and only `wandora-web` was recreated.

Public routes are live (`/login`, `/accept-invite`, `/recover-access` = 200) while unauthenticated `/api/v1/me` remains 401. Auth signup remains disabled, recovery counters remain zero, eligibility remains zero, and Human Send/Gateway outbound remain OFF.

The recovery edge guard remains reachable normally after mitigation and direct-origin TCP remains unreachable externally.

No real invite/recovery has been sent.

## First Real Customer Owner Access + Tenant — REAL

ADR 0101 sent the first real owner invite. ADR 0102 proves invite consumption, first password and a fresh normal password login.

ADR 0103 froze the first real tenant request and ADR 0104 made `MEDICSPRO` / `medicspro` live through Private Tenant Provisioning V2.

ADR 0105 now proves the customer product end-to-end with a genuine normal owner session: MEDICSPRO renders as the active organization, `/api/v1/me` returns 200 from the fresh login flow, and tenant-authorized Trabalho/Equipe/Conversas reads return 200. No customer secret/session extraction or privileged JWT impersonation was used.

MEDICSPRO remains intentionally employee-free and provider-unwired: no Paperclip/control binding, employee binding, eligibility or hire state exists for it.

## MEDICSPRO Paperclip Company Bootstrap — PREFLIGHT COMPLETE

ADR 0106 freezes the provider-company bootstrap without creating it. Live Paperclip is still the pinned `wandora/paperclip:v2026.831.1` / `65ec059b...` runtime, healthy/private/authenticated, with exactly two existing provider companies and zero exact `MEDICSPRO` matches. The protected Board credential remains instance-admin when explicitly addressed to `http://127.0.0.1:3100`.

The exact future payload is `{"name":"MEDICSPRO"}` (SHA-256 `6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b`). Reuse the ADR 0072 official one-shot CLI path; Paperclip company creation is not idempotent and names are not unique, so ambiguous dispatch must be reconciled by read-only state and never blindly retried.

MEDICSPRO remains at zero employees, control bindings, employee bindings, hire operations and eligibility. No HMAC/secret/plugin config was created.

## MEDICSPRO Paperclip Company Bootstrap — LIVE

ADR 0107 executed exactly one official Paperclip company create for MEDICSPRO after revalidating the ADR 0106 gates.

```text
provider company id = a63f27a8-dbac-4552-a456-b3a21302226b
name                = MEDICSPRO
status              = active
owner membership    = active
agents              = 0
company secrets     = 0
plugin config       = null
```

Wandora remains intentionally unwired for MEDICSPRO: control binding, employee-provider binding, eligibility and hire state are all zero. The deterministic future HMAC file is also absent. No runtime was recreated and no outbound effect was enabled.

## MEDICSPRO Organization Adapter Custody + Config + Binding — LIVE

ADR 0110 executes the exact ADR 0108 wiring boundary after ADR 0109 cleared recovery.

```text
control binding            = exactly 1
Core HMAC                  = 0640 / readable / deterministic path
Paperclip secret           = exactly 1 active local_encrypted
plugin config              = exact secret_ref / healthy
secret usage               = exactly one required plugin hmacSecret binding
Paperclip agents           = 0

MEDICSPRO employees        = 0
employee bindings          = 0
hire operations            = 0
eligibility                = 0 / 0 enabled
```

The final current secret version is version 2. The adversarial review rotated the initial value to an exact 32-byte `crypto.randomBytes(32)` value before closure; hash-only proof matches Core custody to Paperclip `value_sha256` and `fingerprint_sha256`. No plaintext was exposed. Temporary staging was removed, runtime health is green and outbound remains OFF.

## MEDICSPRO First Real Tenant Eligibility Rollout — LIVE

ADR 0111 accepted MEDICSPRO as the clean real target; ADR 0112 executed the serialized operator transition.

```text
eligibility rows/enabled   = 1 / 1
enabled target             = MEDICSPRO + ana-commercial-v1
MEDICSPRO employees        = 0
employee bindings          = 0
MEDICSPRO hire operations  = 0
Paperclip agents           = 0
Organization Adapter       = exact + ready
Human Send                 = OFF
Gateway outbound           = OFF
```

The dedicated setter ran only under `SET LOCAL ROLE wandora_customer_hire_operator` after the exclusive lock and zero-enabled check. Independent post-commit validation confirmed no employee, provider-agent, activation or outbound side effect.

## MEDICSPRO First Real Digital-Employee Hire — LIVE

ADR 0114 froze the execution boundary; ADR 0115 completed the first genuine MEDICSPRO owner hire through the normal customer browser flow.

```text
MEDICSPRO employees          = 1
Ana status/autonomy          = paused / supervised
employee bindings            = 1
ana-commercial-v1 hire ops   = 1 completed
unfinished hires             = 0
Paperclip agents             = 1 paused
Paperclip adapter            = wandora_mastra
hire projection              = already-hired
outbound attempts/messages   = 0 / 0
Human Send                   = OFF
Gateway outbound             = OFF
```

The owner clicked `Contratar Ana` once. The original browser idempotency key became the single completed durable hire operation; no retry was required. Independent Paperclip reconciliation confirms Ana is paused with zero budget, no heartbeat and an explicit pause reason requiring separate activation.

Capability Reuse Gate remains satisfied: Wandora owns the customer contract/policy and minimum mapping/idempotency state; Paperclip owns the provider employee lifecycle behind Organization Adapter.

## MEDICSPRO Digital-Employee Activation Preflight — COMPLETE / NO-GO

ADR 0116 revalidated the first real customer activation boundary without any activation effect.

The exact MEDICSPRO mapping remains green: one Wandora Ana `paused/supervised`, one employee-provider binding, one completed `ana-commercial-v1` hire operation and one matching Paperclip managed Ana in the exact company, also paused with healthy org chain.

Two independent activation prerequisites are still absent:

```text
live Paperclip wandora_mastra adapter = absent / exact read returns 404
live Organization Adapter agents.resume capability = absent
```

The live plugin remains ready with only `agents.managed`, `webhooks.receive` and `secrets.read-ref`. The pinned Paperclip SDK already provides company-scoped `ctx.agents.resume(agentId, companyId)` behind `agents.resume`, and provider resume converges `paused -> idle`.

Therefore customer activation remains unavailable. The operator Board credential is not a valid customer-activation shortcut; Wandora may project `active` only after the exact provider-managed employee is resumed and confirmed through the company-scoped Organization Adapter.

Human Send and Gateway outbound remain OFF and are not bundled into activation.

## Paperclip -> Wandora/Mastra Production Execution Bridge — COMPLETE / MERGED

ADR 0117 turns the ADR 0037 laboratory direction into a production-shaped but dormant bridge. PR #166 is merged in canonical `main` at `7bc8c4790e37b0410703bf58979458200810d5a9`.

```text
canonical external adapter = @wandora/paperclip-adapter-mastra@0.1.0
adapter type               = wandora_mastra
Core private route         = /internal/v1/paperclip/execution
Core bridge gate           = disabled by default
migration 014              = repository source only / not live
production adapter install = not performed
```

The adapter signs a minimized request with a dedicated file-backed HMAC and carries the Paperclip run token only in a secret header. Core independently validates that token back against private Paperclip `/api/agents/me` and requires exact company/agent plus `wandora.organization-adapter-v1 / ana-commercial-v1` managed identity.

Only then does Core resolve the active Wandora organization, derive the existing stable managed provider ref and require the exact Wandora employee binding with `status=active / autonomy=supervised` before invoking the existing Agent Runtime/Mastra boundary. Provider IDs do not enter Mastra.

No resume authority or outbound capability is added by this slice. All seven PR workflows were green before merge, and post-merge live validation proves migration 014 remains absent, the live Paperclip adapter store still has no `wandora_mastra`, MEDICSPRO Ana remains `paused + supervised`, and Core bridge/Human Send/Gateway outbound remain OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight — COMPLETE / NO-GO

ADR 0118 revalidated the dormant production state after the bridge implementation and froze the future activation transaction.

Still true:

```text
migration 014              = absent
live wandora_mastra        = absent / exact read 404
Core execution bridge      = OFF
Organization Adapter       = ready
agents.resume              = absent

MEDICSPRO Ana / Wandora    = exactly 1 / paused + supervised
MEDICSPRO binding          = exactly 1
MEDICSPRO hire             = exactly 1 / completed
MEDICSPRO Ana / Paperclip  = exactly 1 / paused / no heartbeat

Human Send                 = OFF
Gateway outbound           = OFF
```

The adapter and Core candidate are now exact-artifact frozen. The selected adapter tgz SHA-256 is `0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f`. The selected Core archive SHA-256 is `b4acc5bac69743493865a69fa51757d32d2ab5bc738d9b277fccd62c3e3a7287`; its source tree is byte-identical to the canonical bridge-code squash merge.

Production activation is **not** authorized yet because three readiness contracts are missing:

1. canonical Paperclip execution-bridge runtime overlay for the shared read-only dedicated HMAC and exact Core URL;
2. Core bridge-specific `/readyz` proof for migration 014;
3. one disposable integrated Paperclip run-token -> Core -> Agent Runtime/Mastra attestation.

The future activation order and rollback are frozen in ADR 0118. The adapter must be extracted into a restart-stable path under persistent `/paperclip/operator-packages` and installed through the official local-directory adapter route; never install it from `/tmp`, a CI workspace or an unverified registry package.

## Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation — COMPLETE

ADR 0119 closed ADR 0118's three implementation gaps without activating production:

```text
Paperclip bridge runtime overlay             = implemented / CI-validated
Core migration-014-aware bridge readiness   = implemented / fail-closed
disposable pinned Paperclip -> Core -> Mastra= GREEN
migration 014 live                           = NO
```

The disposable proof uses Paperclip's native managed-agent service and a real run-scoped token. Its resolver shim is proof-only and is not a substitute for migration 014.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2 — COMPLETE / GO

ADR 0120 revalidated current `main@cb52b601d440b5abb9412005fc6503c7b8065adc`, PR #169 artifacts and production.

```text
migration 014            = absent
bridge secret             = absent
Core bridge               = OFF
Paperclip bridge overlay  = absent live
wandora_mastra store      = []
agents.resume             = absent
Ana                       = exactly 1 / paused + supervised
Paperclip wakeups/runs    = 0 / 0
Human Send                = OFF
Gateway outbound          = OFF
```

Exact current artifacts are frozen:

```text
adapter artifact ZIP sha256 = ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952
adapter tgz sha256          = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f

Core artifact ZIP sha256    = 6c9daf4528e8f18dbaff2a4d313edf7616915627e19683223bacbd4da449b2fc
Core archive sha256         = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
Core source tree            = abacb9da0949a63210080a01bdd95b087e98d02e
```

The Core source tree is exactly the canonical current-main tree. The adapter tgz is byte-identical to ADR 0118. Live Core/Paperclip base Compose files remain byte-equivalent to Git, and the new bridge overlays remain repository-only.

The GO is only for a separately reviewed bridge-foundation activation. It does not authorize `agents.resume`, Ana activation/resume, Human Send or Gateway outbound. If the current short-lived Actions artifacts expire or disappear, provenance must be re-established before any live mutation.

## Activation Execution V1 pre-mutation amendment

ADR 0121 adds two mandatory pre-mutation gates discovered after ADR 0120 merged: reclaim proven disposable runtime headroom / remove the old host-network Paperclip proof listener while preserving proof volumes, and create a fresh current Paperclip DB + `master.key` recovery snapshot with disposable restore/decrypt/state proof. The latest previous snapshot predates the current MEDICSPRO Ana.
## Activation Execution V1 partial production checkpoint

ADR 0122 records that ADR 0121 Gates A-C are GREEN, the fresh scoped Wandora backup/rehearsal is GREEN, and **migration 014 is now LIVE and independently verified**.

The execution stopped at the next step because the execution platform blocked creation of the dedicated bridge HMAC before remote dispatch. No bypass was attempted.

Current bridge-foundation boundary at this checkpoint:

```text
migration 014          = LIVE / verified
bridge HMAC             = not created by this execution
Core bridge             = OFF / not promoted
Paperclip bridge overlay= not activated
wandora_mastra          = not installed live
agents.resume           = absent
Ana                     = exactly 1 / paused + supervised
Human Send              = OFF
Gateway outbound        = OFF
outbound attempts       = 0
```

Continuity rule: **never repeat migration 014 on resume merely because the HMAC/runtime portion remains incomplete.** Reconcile first and continue from the HMAC custody gate.

## Production execution bridge activation V1 — COMPLETE

ADR 0125 records completion of the Paperclip -> Wandora/Mastra production execution bridge foundation on `main@72bcd60eb8428f6210bd2aae0532edabd2c75c5f`.

The final live path is:

```text
Paperclip control plane
-> wandora_mastra external adapter
-> dedicated Paperclip/Core HMAC boundary
-> Wandora Core resolver/policy boundary
-> existing Agent Runtime / Mastra execution boundary
```

Migration 014 is live/verified and must not be replayed. The host bridge HMAC remains `root:wandora-ops / 0640`. Paperclip uses the corrected startup wrapper to copy the secret into non-persistent tmpfs as `0400 uid:gid 1000:1000` before the original non-root application startup. Core and Paperclip are healthy with zero restarts at the final checkpoint.

`wandora_mastra@0.1.0` is installed exactly once from the retained hash-addressed local package path and official `test-environment` is PASS.

Safety state remains frozen:

```text
Ana = exactly 1 / paused + supervised
Paperclip Ana = paused
wakeups = 0
heartbeat runs = 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO outbound attempts = 0
```

The bridge being live is **not** permission to execute Ana or send messages.

## Paperclip + Mastra capability canonicalization — CURRENT

ADR 0126 adds the canonical capability maps:

- `docs/PAPERCLIP_CAPABILITY_MAP.md`;
- `docs/MASTRA_CAPABILITY_MAP.md`;
- `docs/CAPABILITY_COLLISION_MATRIX.md`.

Durable split:

```text
Paperclip = organizational control plane
Mastra    = execution runtime
Wandora   = customer contract, tenancy, policy, adapters and external effects
```

Key reuse decisions:

- Paperclip Routines own durable business recurrence;
- Paperclip tasks/issues own durable organizational work;
- Paperclip owns organizational Skills catalog/policy while Mastra may materialize runtime skills;
- Paperclip Decisions/Execution Policy govern control-plane work, not Wandora external-effect authorization;
- Paperclip Decision Training and Mastra Evals are different evidence layers;
- Paperclip Connections is the leading candidate for organizational connection/grant authority;
- Mastra `@mastra/connect` is not adopted as a competing authority.

Production now runs Paperclip `v2026.916.0` at `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca` / `sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced`. Mastra Core remains `1.66.0`.

ADRs 0127–0130 close the Paperclip v916 qualification, rollback preflight and production execution chain.

Current production result:

```text
Paperclip health/restarts = healthy / 0
migration ledger          = 278 / max 278
new migration rows        = 49
startup migration files   = 0231..0279 / applied
Organization Adapter      = 1 / ready / v0.1.0
wandora_mastra            = 1 / v0.1.0 / testEnvironment pass
MEDICSPRO Ana             = paused + supervised
Paperclip Ana             = paused
MEDICSPRO wakeups/runs    = 0 / 0
MEDICSPRO outbound        = 0
agents.resume             = absent
Human Send                = OFF
Gateway outbound          = OFF
```

The retained ADR 0129 recovery set remains authoritative. Because v916 migrations committed, image-only rollback to v831 is forbidden; rollback requires the schema-faithful PostgreSQL 18.1 pre-upgrade restore + matching `master.key` + exact frozen v831 runtime/extensions.

## Next executable slice

**Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1.**

Reconcile ADR 0116's earlier activation assumptions against the now-live Paperclip v2026.916.0 capability/authority maps and current runtime. Determine actual prerequisites before employee activation rather than adopting every new provider capability by default.

This is a readiness slice only. MEDICSPRO Ana must remain paused + supervised, `agents.resume` absent, Human Send OFF and Gateway outbound OFF unless a later separately reviewed activation execution explicitly changes those boundaries.
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

## Paperclip v2026.916.0 production-upgrade execution checkpoint

ADR 0130 supersedes the mutable Paperclip production-version lines above.

```text
Paperclip          = v2026.916.0
source             = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
image ID           = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
health/restarts    = healthy / 0
migration ledger  = 278 / max 278
new migrations    = 49 / startup files 0231..0279

Organization Adapter = 1 / ready / v0.1.0
wandora_mastra       = 1 / v0.1.0 / testEnvironment pass

MEDICSPRO Ana      = paused + supervised
Paperclip Ana      = paused
wakeups/runs       = 0 / 0
agents.resume      = absent
Human Send         = OFF
Gateway outbound   = OFF
outbound attempts  = 0
```

The ADR 0129 protected recovery set remains retained. Production has crossed the migration boundary, so v831 image-only rollback is forbidden; v831 recovery requires the schema-faithful PostgreSQL 18.1 pre-upgrade restore + matching `master.key` + frozen runtime/extensions.

Post-upgrade acceptance used only the existing **Wandora Internal Supervised Proof** identity. The initial proof ran through Paperclip's normal heartbeat service so Paperclip minted the run-scoped JWT internally; the bounded on-demand run and one timer heartbeat that fired during the brief synthetic idle window both completed `succeeded`. During later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` proof path was invoked once more and run `3d316b82-eaa2-4ceb-a89e-f25e9263fec6` also completed `succeeded`. Final proof state is 3 succeeded runs total, agent `paused`, issue `cancelled`, pending runs/wakeups `0/0`, and proof outbound attempts unchanged at 4. A forged/tampered JWT was rejected with 401, and a live Core service check returned `UNKNOWN_MAPPING_FAIL_CLOSED=true` for an unmapped Paperclip company. The local-encrypted Organization Adapter path was proven by resolving the secret before deliberately rejecting an invalid signature. No MEDICSPRO employee or outbound effect was triggered.

No `wandora_mastra` repack, Organization Adapter behavior change or Mastra upgrade was bundled.

Next executable slice: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**. It must reconcile the earlier activation preflight with v916 and the capability maps before any resume/activation.

## Canonical documents

- `AGENTS.md`
- `docs/CAPABILITY_AUTHORITY.md`
- `docs/architecture.md`
- `docs/CANONICAL_STATE.md`
- `docs/PAPERCLIP_CAPABILITY_MAP.md`
- `docs/MASTRA_CAPABILITY_MAP.md`
- `docs/CAPABILITY_COLLISION_MATRIX.md`
- `docs/operations/paperclip-v2026-916-0-disposable-upgrade-compatibility-proof-v1.md`
- `docs/operations/paperclip-v2026-916-0-production-upgrade-execution-v1.md`
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
- ADR 0088 — Customer Owner Interrupted Invite Recovery Contract Preflight V1
- ADR 0089 — Customer Owner Interrupted Invite Recovery Contract Implementation V1
- ADR 0090 — Customer Owner Invite + Recovery Production Activation Preflight V1
- ADR 0091 — Customer Owner Recovery Edge Anti-Abuse Control Preflight V1
- ADR 0092 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 Pre-Mutation Credential Gate
- ADR 0093 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1
- ADR 0094 — Customer Owner Invite + Recovery Web Production Activation Execution V1
- ADR 0095 — Customer Owner First Real Access End-to-End Validation Preflight V1
- ADR 0096 — Customer Owner Transactional E-mail Delivery Foundation Preflight V1
- ADR 0097 — Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1
- ADR 0098 — Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1
- ADR 0099 — Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1
- ADR 0100 — Customer Owner First Real Invite Execution Preflight V1
- ADR 0101 — Customer Owner First Real Invite Execution V1
- ADR 0102 — Customer Owner First Invite Acceptance + First Password Validation V1
- ADR 0103 — Customer Owner First Real Tenant Provisioning Preflight V1
- ADR 0104 — Customer Owner First Real Tenant Provisioning Execution V1
- ADR 0105 — Customer Owner First Real Tenant Access Validation V1
- ADR 0106 — Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1
- ADR 0107 — Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1
- ADR 0108 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1
- ADR 0109 — Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1
- ADR 0110 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1
- ADR 0111 — Customer Owner First Real Tenant Eligibility Rollout Preflight V1
- ADR 0112 — Customer Owner First Real Tenant Eligibility Rollout Execution V1
- ADR 0113 — GitHub Actions Self-Hosted Runner Isolation V1
- ADR 0114 — Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1
- ADR 0115 — Customer Owner First Real Tenant Digital-Employee Hire Execution V1
- ADR 0116 — Customer Owner First Real Tenant Digital-Employee Activation Preflight V1
- ADR 0117 — Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1
- ADR 0118 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1
- ADR 0119 — Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1
- ADR 0120 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2
- ADR 0121 — Paperclip -> Wandora/Mastra Production Execution Bridge Pre-Mutation Recovery + Host Hygiene Gate
- ADR 0122 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 Partial Checkpoint
- ADR 0123 — Paperclip -> Wandora/Mastra Production Execution Bridge Secret Custody Privilege-Drop Correction
- ADR 0124 — Paperclip Bridge Wrapper Command Preservation Correction
- ADR 0125 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 Complete
- ADR 0126 — Paperclip + Mastra Capability Canonicalization, Authority Collision Audit + Paperclip Upgrade Preflight V1
- ADR 0127 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Partial Checkpoint
- ADR 0128 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Complete
- ADR 0129 — Paperclip v2026.916.0 Production Upgrade Preflight V1
- ADR 0130 — Paperclip v2026.916.0 Production Upgrade Execution V1 Complete
- current Git `main`
- current runtime/container state when deployment facts matter

## One-line memory anchor

> **Wandora owns the customer/operator contract; specialist components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let local implementation convenience redefine the architecture.**

## Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1

ADR 0131 refreshed the first real activation boundary against live Paperclip v2026.916.0.

Resolved from ADR 0116:

- the Paperclip -> Wandora/Mastra execution bridge is live and healthy;
- `wandora_mastra@0.1.0` is installed exactly once and v916-qualified;
- the old missing-adapter blocker is closed.

Still blocked:

- the Organization Adapter manifest intentionally still lacks `agents.resume`;
- Core/Web still have hire/read but no customer-owner activation contract/action.

Exact v916 source inspection proves that Paperclip resume changes a paused agent to `idle` without issuing a wakeup, and managed reconcile does not silently repause an already resumed agent. Therefore Paperclip remains lifecycle authority; Wandora should not build a parallel lifecycle.

The minimum next implementation is a signed company-scoped Organization Adapter action constrained to the fixed managed Ana plus a Wandora owner/admin activation contract that reconciles provider state before the local `paused -> active` projection. No activation journal is approved absent further evidence: native resume is convergent and ambiguous responses can be resolved by exact readback.

Current safety state remains:

```text
MEDICSPRO Ana / Wandora   = paused + supervised
MEDICSPRO Ana / Paperclip = paused
wakeups/runs              = 0 / 0
agents.resume             = absent
Human Send                = OFF
Gateway outbound          = OFF
outbound attempts         = 0
```

Next executable slice: **Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1**. It is implementation/qualification only and must not resume the real MEDICSPRO Ana.

## 2026-09-20 checkpoint — Activation Production Preflight V1

ADR 0133 completed the **Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT**.

Current production remains dormant: migration 015 absent; Organization Adapter v0.1.0 live without `agents.resume`; activation gate OFF; Ana MEDICSPRO `paused + supervised` / Paperclip `paused`; wakeups, heartbeat runs, open routine runs and outbound attempts all zero; Human Send and Gateway outbound OFF.

The live-derived disposable rehearsal qualified migration 015, its verifier and restore rollback. Exact Core/Web/Organization Adapter v0.2.0 candidate provenance and current rollback anchors are frozen in ADR 0133. Activation adds only Paperclip `agents.resume`; it does not invoke work or Mastra.

Next slice: **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**, with a fresh execution-time backup and fresh pre-resume gates before any lifecycle effect.


## Current real-customer activation checkpoint — 2026-09-20

The first real MEDICSPRO digital employee activation is complete under ADR 0135.

Current production checkpoint:

```text
canonical main entering checkpoint docs = 3f9f6a580f6e2cadab20cd375c9bee4255344093

MEDICSPRO Wandora Ana = active + supervised
MEDICSPRO Paperclip Ana = idle / wandora_mastra

migration 015 = live / verifier green
Organization Adapter = v0.2.0 / ready / agents.resume present
Core = organization-adapter-candidate-8d2a53e3c264
Web = candidate-eda946c36ec4
Paperclip = v2026.916.0

Human Digital-Employee Activation = ON
Human Send = OFF
Gateway outbound = OFF
```

The production activation was executed exactly once through the normal authenticated customer-owner Web flow.

A Web candidate Auth-build defect was discovered before the lifecycle effect, failed closed, and was corrected by PR #185 / ADR 0134. Real owner login then succeeded before activation resumed.

Post-activation evidence proves:

```text
Wandora Ana active + supervised
Paperclip Ana idle
wakeups = 0
heartbeat runs = 0
routine runs = 0
task sessions = 0
runtime last_run_id = null
runtime tokens/cost = 0
run identity contexts = 0
outbound attempts = 0
```

Therefore activation did not invoke Mastra or create execution work.

Continuity rule: do not repeat activation after chat failure. Reconcile the real Wandora/Paperclip states first. The next work must be a new, explicitly reviewed post-activation operational slice; do not manufacture work or enable outbound merely to prove that Ana is active.

## First legitimate active-employee work boundary — ADR 0136

The first post-activation MEDICSPRO work preflight is complete without creating work.

Fresh live state remained:

```text
Wandora Ana       = active + supervised
Paperclip Ana     = idle / wandora_mastra
assigned issues   = 0
wakeups/runs      = 0 / 0
routine runs      = 0
task sessions     = 0
runtime last run  = null
runtime cost      = 0
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
```

The first legitimate work must originate from a real authenticated MEDICSPRO owner instruction through a Wandora-owned customer contract. Paperclip remains the durable work authority:

```text
owner intent
-> Wandora authorization + stable request/idempotency boundary
-> company-scoped Organization Adapter
-> Paperclip issue + assignment wakeup/run
-> run-scoped identity
-> wandora_mastra -> Core -> Agent Runtime -> Mastra
-> supervised internal result
-> Wandora customer-safe projection
-> STOP before external effect
```

The live Organization Adapter does not yet have Paperclip `issues.read/create/wakeup`, and Core/Web do not yet expose a customer-safe Paperclip work admission/result projection. Existing `wandora.work_items` remain part of the proven messaging supervision slice; do not expand them into a competing Paperclip task engine.

Because issue creation and execution wake are distinct Paperclip effects and generic plugin issue creation has no first-class create idempotency key, the next implementation may add only the **minimum Wandora integration-safety journal** required to reconcile ambiguous outcomes. It must not clone Paperclip task lifecycle.

First real work execution remains blocked until that contract is implemented, qualified and promoted separately. Human Send and Gateway outbound remain independent Wandora-owned effect gates and stay OFF.

Next executable slice: **Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1 — NO REAL WORK**.


## First legitimate work contract implementation — ADR 0137

The first customer-owner work contract is repository-qualified with PR #188 head `21ba162b463dbdeb6be3c84419c46afa0d465335` and **7/7 GREEN** workflows.

The accepted ownership split is:

```text
Wandora
  customer intent / auth / tenant policy
  stable work request + minimum reconciliation receipt
  supervised customer result projection

Paperclip
  durable issue/task
  assignment
  dispatch/wakeup/run

Mastra
  execution-local reasoning/workflow behind the existing Agent Runtime
```

Candidate components remain dormant in production:

- migration 016 is not live;
- Organization Adapter v0.3 is not promoted;
- `wandora_mastra@0.2.0` is not promoted;
- `WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED` is OFF/absent;
- Human Send and Gateway outbound remain OFF.

Final read-only production proof still shows exactly one MEDICSPRO Ana, `active + supervised` in Wandora and `idle / wandora_mastra` in Paperclip, with zero assigned issues, wakeups, heartbeat runs, routine runs, task sessions, runtime usage/cost and outbound attempts.

Next executable slice: **Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Preflight V1 — NO EFFECT**.


## First legitimate work Production Preflight V1 — ADR 0138

The no-effect production preflight is complete and GREEN.

Current canonical repository checkpoint after the preflight hardening:

```text
PR #190 head  = 768be4e0177f52cbc957a517640457a4b6905a2a
PR #190 CI    = 5 / 5 GREEN
main          = e867585622abd0ee020bf45756eda6b53ef4fec8
```

The preflight hardened first-work idempotency before any live promotion:

- Core concurrent same-key admission converges to one Wandora work + one provider effect;
- browser idempotency survives timeout, refresh, duplicate submit and 503 while storing only opaque UUID + SHA-256 fingerprint;
- migration 016 passed double-apply + canonical verifier on a production-derived disposable restore;
- final Core/Web candidates are immutable CI artifacts;
- Organization Adapter v0.3 and `wandora_mastra@0.2.0` remain the qualified provider-side candidates from ADR 0137.

Production is still unchanged:

```text
Wandora Ana       = active + supervised
Paperclip Ana     = idle / wandora_mastra
migration 016     = absent
work gate         = OFF
issues/runs       = 0 / 0
sessions/routines = 0 / 0
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
```

Paperclip v2026.916.0 source inspection added two execution constraints:

1. replacing external `wandora_mastra` requires a Paperclip restart before continuing;
2. same-key local plugin install does not itself perform the capability-escalation approval semantics expected from the generic upgrade comments.

ADR 0138 therefore explicitly freezes the exact Organization Adapter v0.3 capability set and the production promotion order.

Next executable slice:

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — NO REAL WORK**

Promotion must stop after enabling and validating the customer-work contract. Do not manufacture a work request. The first real work must come from a genuine authenticated MEDICSPRO owner instruction and still stops before external effect.

## Model Provider / Mistral supervised assigned-work foundation — ADR 0142

ADR 0142 qualifies the first real model-provider boundary in repository code/CI while keeping production unchanged.

Accepted path:

```text
owner work
-> Wandora admission
-> Organization Adapter
-> Paperclip issue/run
-> wandora_mastra
-> Core execution bridge
-> Mastra Agent
-> Mistral V1 model provider
-> structured supervised internal summary
-> STOP before external effect
```

The V1 runtime mode is `mastra-supervised-model`; provider/model are pinned to `mistral / mistral-small-2603` behind a file-backed operator secret. The customer result uses only `wandora-supervised-v1`, not provider identity.

Important containment:

- supervised inbound/WhatsApp remains deterministic and does not gain model-provider egress;
- only Paperclip assigned-work `title` + `description` may enter the provider request;
- provider request deadline is 45 seconds;
- `wandora_mastra@0.3.0` candidate bridge deadline is 60 seconds;
- automatic model retries are disabled;
- Human Send and Gateway outbound are unchanged and remain OFF.

Qualification evidence:

```text
focused runtime tests = 8 / 8 GREEN
Paperclip adapter contract = 1 / 1 GREEN
canonical Core disposable verifier = 126 / 126 GREEN
post-migration work/adapter harness = 30 / 30 GREEN
```

Fresh production readback still shows `mastra-deterministic`, no model-provider env/secret, exactly one MEDICSPRO Ana `active + supervised`, work journal 0, outbound attempts 0 and live `wandora_mastra@0.2.0`.

Next slice after merge/CI: **Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**. It may custody a fresh key and perform one synthetic non-customer provider call, but must stop before live runtime activation or real MEDICSPRO work.


## Mistral real-provider attestation preflight — GREEN / PRODUCTION DORMANT

ADR 0143 closes **Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**.

Canonical repository base for the proof:

```text
main = 82ea046ede32605f8d5511ef06bc47ecf060d2ea
```

The intended Mistral key is now custodied only at:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
mode 0640 / wandora-admin:wandora-ops
```

It is **not mounted into the live Core**.

One synthetic non-customer invocation through the exact qualified Core candidate succeeded against `mistral-small-2603`:

```text
logical model      = wandora-supervised-v1
input tokens       = 222
output tokens      = 44
total tokens       = 266
cached input tokens= 0
exit               = 0
```

Post-call production remains:

```text
Core runtime        = mastra-deterministic
model env/key mount = absent
Human Send          = OFF
Gateway outbound    = OFF
MEDICSPRO Ana       = exactly 1 / active + supervised
work journal        = 0
outbound attempts   = 0
Paperclip Ana       = idle / wandora_mastra
issues/wakeups/heartbeat runs/task sessions/routines/routine runs = 0
Paperclip runtime session/run = null/null
Paperclip runtime token/cost counters = 0
```

An earlier operator-entered credential was not the intended current key and is not provider-qualification evidence. It was replaced through the same reviewed custody path; only the later intended-key success is canonical.

### NEXT EXECUTABLE SLICE

**Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT**

Reconcile live adapter version/provenance, freeze the `wandora_mastra@0.3.0` + 60s bridge-timeout promotion, freeze the Core model overlay + read-only secret mount, prove rollback/order and outbound boundaries, and stop before changing live Paperclip or Core.


## 2026-09-21 — AI runtime portability checkpoint (ADR 0144)

The model-provider foundation is provider/runtime replaceable by contract. Concrete Mistral provider/model/base URL are internal runtime configuration; the stable Wandora result identity is the logical profile `wandora-supervised-v1`.

The Agent Runtime result now includes normalized token usage so a future Runtime X can map its native usage without changing Paperclip/customer contracts. No usage history/cost field was persisted because no consumer requirement yet justifies it.

The current Mistral API key is a Wandora platform credential even though its transitional host path sits under the Core stack. It remains unmounted from live Core until a separately reviewed activation.

Paperclip operational budgets, Mastra/runtime execution guardrails and Wandora commercial billing remain distinct authorities. Paperclip v2026.916.0 has native budgets/cost events/secrets/connections, while Mastra 1.66 has version support for token limiting and TokenCostControl; the latter is not yet operational because Wandora has not installed/configured Mastra observability plus durable observability storage.

## ADR 0145 — Model Provider / Mistral Production Runtime Activation Preflight V1

Status: **NO-GO for production activation / NO EFFECT preflight complete.**

The preflight starting from `main@d5f98ed92a29b351b243c4873bf17a2d13cdfc78` qualified the exact current-main Core candidate, `wandora_mastra@0.3.0` promotion, host-side platform-secret injection, local readiness/fail-closed behavior, 45s provider deadline < 60s bridge timeout, zero automatic provider retry, provider-error handling and Runtime-X portability without changing production.

Production remains deliberately unchanged:

```text
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF
Gateway outbound    = OFF
MEDICSPRO work      = 0
MEDICSPRO outbound  = 0
Ana                 = active + supervised / Paperclip idle
Paperclip run state = zero
```

The only activation blocker is aggregate cost governance. Paperclip has native budget enforcement, but the Core/Mastra path does not currently emit an authoritative billed-cents cost event into Paperclip; the Paperclip cost-event contract requires caller-supplied `costCents`. Mastra native cumulative cost control is not yet production-qualified because its observability/storage prerequisites are not configured. Per-execution controls (single step, max output 768, 45s deadline, zero retry, bounded task input) are GREEN but are not an aggregate spend ceiling.

Do **not** create a Wandora provider-pricing table, cost engine, second budget ledger, model router or tenant secret manager to close this gap.

Next canonical slice:

**Model Provider Runtime Native Cost Governance Qualification V1 — NO EFFECT**

It must choose the minimum Mastra/Paperclip-native aggregate spend guard using synthetic/disposable evidence only. Production Core must remain deterministic; the Mistral secret must remain unmounted; Mistral must not be called. Only after that slice is GREEN may a separate Model Provider / Mistral Production Runtime Activation Execution V1 be authorized.

## ADR 0146 — Model Provider Runtime Native Cost Governance Qualification V1

The ADR 0145 cost-governance architecture gap is resolved without adding a Wandora pricing/cost engine.

Canonical authority is now:

~~~text
Mistral Workspace spending limit = hard aggregate provider-spend boundary
Mastra / Agent Runtime           = per-execution technical guardrails
Paperclip                        = organizational operational budgets / billed-cents ledger
Wandora                          = commercial plan / price / margin / billing
~~~

Current official Mistral documentation proves that API keys are scoped to a Workspace and Workspace monthly spending limits reject requests with HTTP 429 when exhausted. A disposable local synthetic 429 through the exact qualified Wandora runtime made one request and zero retries.

Mastra TokenCostControl is not accepted as the hard financial ceiling because its cumulative observability path is approximate and can fail open. Paperclip v2026.916.0 currently budgets billed_cents and requires caller-supplied costCents, so Wandora must not invent provider pricing merely to feed that ledger.

Production remains dormant and unchanged. Before model-runtime activation, the real host-custodied production key must be proven to belong to a dedicated Mistral production Workspace with an explicit finite monthly spending limit. That proof is the next separate NO EFFECT slice.

## ADR 0147 — Provider-Neutral Runtime Risk Guard + Cost Governance Correction V1

ADR 0147 restores ADR 0144's provider/runtime replaceability as the controlling activation architecture.

The Mistral Workspace spending-limit capability found in ADR 0146 remains valid provider-specific defense in depth, but it is no longer a universal prerequisite for activating the model-backed runtime. Wandora must not make one provider's account model part of the stable Agent Runtime contract.

Canonical activation guard:

~~~text
bounded admitted work
+ exact tenant/employee/run identity
+ maxSteps = 1
+ maxRetries = 0
+ bounded output
+ provider deadline < bridge deadline
+ structured output
+ fail-closed ambiguity
+ no implicit provider fallback
+ no external effect
~~~

Paperclip retains organizational work/run/budget authority. Provider-account financial controls are applied when appropriate to that provider/commercial exposure. Wandora retains logical AI profile, customer policy/entitlement, commercial billing and effect authorization.

No production mutation was performed by the correction. The separate **Model Provider / Mistral Production Runtime Activation Execution V1** is now architecturally GO, but must freshly reconcile state, promote `wandora_mastra@0.3.0` before Core, switch Core only after Paperclip is healthy, keep Human Send/Gateway outbound OFF and stop before first customer work.

## 2026-09-21 — Model-backed production runtime activated (ADR 0148)

The production Agent Runtime activation is complete.

~~~text
Wandora stable logical profile = wandora-supervised-v1
current Agent Runtime          = Mastra-backed
current provider/model         = Mistral / mistral-small-2603

Core                           = healthy / ready
Core runtime                   = mastra-supervised-model
wandora_mastra                 = 0.3.0 / exactly one / loaded
Paperclip                      = v2026.916.0 / healthy

Human Send                     = OFF
Gateway outbound               = OFF
~~~

The platform credential remains Wandora-owned host custody and is mounted read-only into Core. Provider/model identity remains implementation detail under ADR 0144/0147; this activation does not make Mistral or Mastra part of the customer contract.

Activation itself produced no work/run/model usage:

~~~text
MEDICSPRO Ana / Wandora = active + supervised
MEDICSPRO Ana / Paperclip = idle
work operations = 0
outbound attempts = 0
issues/wakeups/heartbeat runs/task sessions/routines/routine runs = 0
runtime session/run = null/null
runtime tokens/cost = 0
model usage events during activation = 0
~~~

Exact rollback state is retained under:
`/home/wandora-admin/executions/model-provider-runtime-activation-execution-v1-20260921/rollback`.

### NEXT EXECUTABLE EFFECT SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1**

It must be separately authorized. Admit at most one legitimate owner-driven MEDICSPRO work request through the existing Wandora -> Paperclip -> Agent Runtime path, keep Human Send and Gateway outbound OFF, and stop at the supervised result. No recurring/unattended/bulk model-backed work is authorized by ADR 0148.


## 2026-09-21 — First model-backed legitimate work effect gate (ADR 0149)

Fresh production reconciliation after ADR 0148 found no drift: Core/Paperclip/Web/Gateway healthy, `wandora_mastra@0.3.0` unique/loaded, logical profile `wandora-supervised-v1`, current Mistral implementation mounted read-only, exactly one MEDICSPRO Ana active+supervised / Paperclip idle, and all work/run/usage/outbound counters still zero.

The technical bounded-work contract is ready, including one-step execution, zero automatic model retries, structured bounded output, 45s provider deadline under the 60s bridge timeout, exact run identity and fail-closed uncertain replay.

No real work was executed because the accepted customer-work authority requires the exact title and description to originate from the authenticated MEDICSPRO owner through the Wandora customer surface. The operator must not manufacture the first task or impersonate the owner session. Human Send and Gateway outbound remain OFF.

Next effect remains one genuine owner-submitted MEDICSPRO work request through Wandora -> Paperclip -> `wandora_mastra` -> Core -> Agent Runtime -> current provider -> supervised result -> STOP.


## First real model-backed MEDICSPRO work — result valid, lifecycle deviation contained (ADR 0150)

The authenticated MEDICSPRO owner has now submitted the first genuine commercial work through the Wandora customer surface. Wandora admitted exactly one work operation and recorded a supervised `wandora-supervised-v1` result.

Core observed exactly one real inference through the current implementation:

```text
provider/model = mistral / mistral-small-2603
input/output   = 333 / 372
cached/total   = 0 / 705
model calls    = 1
```

Human Send and Gateway outbound remained OFF and outbound attempts stayed zero.

Paperclip historical truth is deliberately not normalized away: MED-1 had one intended successful run followed by one native `issue_continuation_needed` recovery run. The recovery run was rejected by Wandora's exact-run binding with HTTP 409 before Agent Runtime/model execution. The issue became blocked and no third run appeared.

Root cause: live `wandora_mastra@0.3.0` is a legacy/direct adapter. Its successful result did not terminalize the Paperclip issue, so Paperclip's own stranded-issue scheduler correctly interpreted the assigned open issue as needing a continuation.

PR #204 qualifies the provider-neutral lifecycle correction in `wandora_mastra@0.4.0`:

- Core normalized usage is returned to Paperclip as per-run adapter usage;
- after the exact supervised result has been committed, the same run-scoped Paperclip identity marks the exact customer-work issue `done`;
- the self-call uses Paperclip's resolved local listener, never the public URL/Traefik/customer input;
- ambiguous issue completion performs readback before any repeat;
- issue-completion recovery cannot replay Core/model execution.

Pinned disposable Paperclip proof is GREEN for one customer-work run, zero continuation recovery and usage `11|7|2`.

This repository qualification does not promote production. Live Paperclip still has `wandora_mastra@0.3.0`. The legitimate MEDICSPRO work must not be replayed.

### NEXT EXECUTABLE SLICE

**Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Preflight V1 — NO EFFECT**

Reconcile live historical work/model/outbound state, freeze the immutable 0.4.0 artifact and rollback, determine whether/how MED-1 may be terminalized without wakeup, and stop before production mutation or any new customer/model work.


## Paperclip customer-work terminal disposition + usage adapter promotion preflight — ADR 0151

The first-work lifecycle remediation is now production-preflight qualified without changing live runtime.

Exact current-main candidate:

```text
wandora_mastra = 0.4.0
main           = c44634ea8f03b491db32fbde9917a2b7a7fcbd16
tgz sha256     = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c
```

Exact live rollback was frozen before any promotion:

```text
live adapter = wandora_mastra@0.3.0
live tgz hash= 78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798
registration = exactly one / loaded
test-environment = pass
```

The protected Paperclip Board/instance-admin credential store remains `/paperclip/operator-cli/activation-v1/auth.json`, mode 0600, and is used only by reference with explicit private API base `http://127.0.0.1:3100`; its value was not read or copied.

Official CLI readback proves MED-1 is still blocked but quiescent: no live runs, no active recovery, no blockers/review path, no checkout/execution run. A future repair will use only the official board `issue update --status done` path after 0.4.0 is healthy. No direct SQL, no agent run token, no comment/resume/reassignment, no replay of the original work.

The live `v2026.916.0` OpenAPI and pinned source also qualify Paperclip's native instance Task Drain for the future execution: it holds new run admission while the current process drains and must report `quiescent=true` before restart. The drain is process-memory state and is cleared by restart, so it is not treated as a persistent maintenance lock.

Preflight effects remained zero: no Task Drain mutation, adapter install, Paperclip restart, issue mutation, work/run/model call, migration or outbound action occurred.

The next executable slice is the separately reviewed **Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Execution V1**, following the frozen runbook.

## 2026-09-21 — Paperclip capability reuse / provider portability audit + companion Core correction

The Paperclip capability audit now establishes the following canonical direction:

```text
Wandora
  = customer/product semantic authority
  = stable IDs and employee identity
  = customer work/result contract
  = commercial policy/billing
  = final external-effect authorization

Paperclip
  = current specialist operational control-plane provider
  = issue/run/routine/skills/policy/budget/etc. authority where adopted

wandora_mastra
  = Paperclip external runtime adapter

Wandora Agent Runtime
  = stable execution boundary

Mastra / Mistral
  = current replaceable runtime/model implementation
```

Use Paperclip adapters/plugins/connectors as provider-side implementation mechanisms when they fit the capability. Do not expose Paperclip IDs/state machines as customer-facing Wandora contracts.

New generic Wandora subsystems that overlap Paperclip require the Capability Authority / Reuse Gate first. Portability is achieved with stable Wandora contracts + provider bindings + export/reconciliation, not a shadow Paperclip database.

Paperclip experimental features are QUARANTINE by default. Live production currently has Cases, Pipelines, Agent Chat and Chat Connectors disabled.

Pinned Paperclip company export/import is useful for provider exit, but its own export-fidelity report states approval history, cost history and activity history are not included. Exit strategy therefore uses native export + minimum Wandora binding/receipt manifest + targeted historical archive only where required.

Pinned v2026.916.0 also proves positive external-adapter usage creates Paperclip cost events. Events without authoritative cost remain `unpriced` with `costCents=0`; current Paperclip budgets observe only `billed_cents`. Do not confuse usage telemetry with monetary hard-stop enforcement.

### ADR 0153 correction to the pending production promotion

Read-only production inspection found the live Core bridge still returns only `executionId/model/summary`, not normalized usage.

Current main has the usage-return change in exactly one executable Core source file. The existing GREEN Core Candidate Artifact is executable-source equivalent to current main.

Therefore ADR 0151's adapter-only execution order is superseded by ADR 0153:

```text
fresh REAL NOW
-> native Paperclip Task Drain
-> companion Core image-only promotion
-> Core health/readiness + zero-activity validation
-> wandora_mastra@0.4.0 replacement
-> Paperclip-only restart
-> adapter validation
-> status-only MED-1 blocked -> done repair
-> prove historical runs=2 / model calls=1 / outbound=0
-> STOP
```

No new customer/model work is permitted merely to validate telemetry.

Current production remains unchanged:

```text
Paperclip = v2026.916.0 / wandora_mastra@0.3.0 / healthy
Core      = d5f98ed... image / mastra-supervised-model / healthy
MED-1     = blocked / quiescent
Paperclip historical runs = 2
Core historical model calls = 1
outbound = 0
Human Send = OFF
Gateway outbound = OFF
```

Research/decision set:

- `docs/decisions/0152-paperclip-capability-reuse-provider-portability-architecture-v1.md`
- `docs/decisions/0153-paperclip-customer-work-usage-companion-core-promotion-preflight-v1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_AUDIT_V1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_MATRIX_V1.md`
- `docs/research/PAPERCLIP_PROVIDER_EXIT_STRATEGY_V1.md`
- `docs/research/PAPERCLIP_OPENAPI_COMPATIBILITY_GATE_PROPOSAL_V1.md`
- `docs/research/PAPERCLIP_UPSTREAM_DELTA_AUDIT_2026-09-21.md`

The next production mutation remains a separate reviewed slice. Do not execute it merely because this audit is merged.


## 2026-09-21 — Customer-work terminal disposition + usage production promotion V2

ADR 0154 records the completed production promotion. The live Core is now `wandora/core:organization-adapter-candidate-61cbb34d4bfd` / `sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873`, while Paperclip remains `wandora/paperclip:v2026.916.0` with exactly one loaded/enabled `wandora_mastra@0.4.0` and official test-environment PASS.

MED-1 was terminalized once through the protected Board status-only path from `blocked` to `done`. It still has exactly two historical Paperclip runs and no live run; their historical usage remains null because backfill was explicitly forbidden. The first legitimate work remains exactly one Wandora work and one model call. Outbound attempts remain zero, Human Send OFF and Gateway outbound OFF.

Prospective lifecycle + normalized usage now require/use the companion Core + adapter 0.4.0 pair. This does not make Paperclip monetary budget authoritative for provider spend: unpriced usage has `costCents=0`, and Wandora does not fabricate monetary cost.

A residual historical provider-state fact remains: Paperclip Ana is `error` with `errorReason=wandora_execution_failed_409`, last updated at the pre-promotion failed continuation. It was deliberately preserved. The next slice is a **Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1 — NO EFFECT** before admitting another legitimate work item.


## 2026-09-21 — MEDICSPRO Ana historical Paperclip error-state reconciliation preflight

ADR 0155 proves from exact Paperclip v2026.916.0 source that `error` is an invokable agent lifecycle state. The residual MEDICSPRO Ana `error / wandora_execution_failed_409` is a diagnostic projection of the old failed continuation run, not a blocker requiring resume/reassignment before another legitimate work item.

Live readback also proves Ana's scheduler is disabled/inactive, MED-1 is `done`, live runs and active recovery are empty, Wandora still has exactly one recorded work, and MEDICSPRO outbound attempts remain zero.

Paperclip's dedicated reconciliation primitive is Board-only `POST /api/agents/{id}/clear-error`; it performs `error -> idle` and preserves historical runs/runtime diagnostics. Plugin SDK exposes resume but not clear-error, and managed-agent reconcile does not auto-clear lifecycle errors.

Canonical decision: **NO-OP for readiness**. Do not clear/resume/pause/wake/retry/PATCH/SQL merely to normalize the display. If a future operator-facing cleanup becomes an explicit requirement, authorize it separately and use only the native `clear-error` path after fresh reconciliation.


## 2026-09-21 — second legitimate customer-work preflight found Organization Adapter gate drift

ADR 0156 closes a subtle gap left after ADR 0155: Paperclip v2026.916.0 correctly considers `error` invokable, but Organization Adapter 0.3.0 rejects any managed agent not literally `idle` before customer-work issue/wakeup admission.

The production artifact contains the same idle-only check as source. Therefore a second legitimate work must not be used to discover this incompatibility.

Decision: no lifecycle mutation. Implement a narrow compatibility correction so customer-work pre-admission accepts `idle | error`, still rejects `running` and other states, and still delegates final execution admission to Paperclip `issues.requestWakeup`.

Disposable proof of that minimal change passed 5/5 work-admission tests in the exact pinned Paperclip image, with no network or production data. The next slice is repository implementation only; production promotion remains separate.
