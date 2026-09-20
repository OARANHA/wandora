# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-19**

Canonical Git base before this canary-completion checkpoint:

```text
main = 58b792529e8fa7fa9e4b556459f45952b607ee43
PR #103 = merged
```

ADR 0059 now records the completed internal canary, including the private-hostname correction, successful same-key recovery and the bounded post-canary runtime state. Mutable Git/runtime state must still be reverified before execution.

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

## 2026-09-19 execution bridge activation V1 — COMPLETE / EMPLOYEE STILL PAUSED

Canonical Git at execution completion:

```text
main = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
PR #175 = merged
ADR 0125 = completion checkpoint
```

The Paperclip -> Wandora/Mastra production execution bridge foundation is now LIVE and validated. Migration 014 remains live/verified and was not repeated. The dedicated HMAC remains root-custodied on the host; Paperclip receives a node-owned `0400` tmpfs copy through the corrected ADR 0123/0124 startup wrapper.

Current production boundary:

```text
Core bridge                = LIVE / healthy / readyz 200
Paperclip bridge           = LIVE / healthy / restart 0
wandora_mastra             = exactly 1 / loaded / version 0.1.0
adapter test-environment   = PASS
Ana / Wandora              = exactly 1 / paused + supervised
Ana / Paperclip            = exactly 1 / paused
wakeups / heartbeat runs   = 0 / 0
agents.resume              = absent
Human Send                 = OFF
Gateway outbound           = OFF
MEDICSPRO outbound attempts= 0
```

This checkpoint activates only the bridge foundation. It does **not** authorize Ana activation/resume or customer messaging. Any future activation/outbound effect must be a separate reviewed slice from fresh REAL NOW evidence.

## 2026-09-19 CI execution checkpoint — LIVE

This section is the newest mutable infrastructure checkpoint and supersedes older Git/CI mutable-state lines below where they conflict.

```text
main entering CI slice                     = 90ce29465816e4b91fb7bf2d516e0119a6404731
PR                                          = #162 ci: add isolated Wandora self-hosted runner
implementation-validation head             = fad8d64070663aea823325f8970a24b90004295e
repository                                  = private
runner                                      = wandora-vps-01-ci
runner host                                 = wandora-vps-01 / 13.140.190.149
runner identity                             = wandora-ci
Docker boundary                             = dedicated rootless daemon
production Docker socket access             = none
validated PR checks                         = 7/7 success
```

GitHub-hosted Actions quota exhaustion is an external billing/quota condition, not a code failure. Normal repository CI now targets `[self-hosted, linux, x64, wandora-ci]`.

The runner is deliberately hosted on the existing Wandora VPS but is isolated from production through a dedicated unprivileged identity, no host `docker`/operator/sudo groups, a separate rootless Docker daemon/store, explicit systemd path restrictions, pre/post rootless-boundary hooks and resource ceilings of 300% CPU, 3 GiB `MemoryHigh`, 4 GiB `MemoryMax` and 4096 tasks. The runner service keeps `PrivateTmp=yes`; workflow files that must be bind-mounted into rootless Docker must be staged under `RUNNER_TEMP`, not the runner-private `/tmp`.

Final validation on the implementation head proved Core Candidate, Core, Messaging Gateway, Operator Consoles, Organization Adapter Plugin, Platform Admin and Web CI green while critical production containers remained healthy with zero restarts.

At the ADR 0113 CI checkpoint the next functional product slice was **Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1**. ADR 0114 closed that no-effect gate and ADR 0115 has now completed the first real MEDICSPRO customer hire through the normal owner browser path. The next functional slice is **Customer Owner First Real Tenant Digital-Employee Activation Preflight V1**. Ana remains paused + supervised; Human Send and Gateway outbound remain OFF.

This file is a compact current-state handoff. Historical evidence belongs in accepted ADRs and infra proof documents. Mutable runtime facts must be re-verified before a later production action.

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

After timeout, frozen chat or tool failure, inspect real Git/runtime state before repeating any operation. A missing assistant response is not evidence that the prior operation failed.

## Capability authority

Wandora owns product/operator semantics, stable IDs, tenant authorization, policy, supervision, orchestration and provider-neutral contracts.

- **Paperclip** owns digital-employee organization/control-plane capability behind the Wandora Organization Adapter.
- **Mastra** supplies agent/workflow execution behind the Agent Runtime Adapter.
- **Evolution** supplies WhatsApp transport behind the Messaging Gateway.
- **Supabase** supplies identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- **Docker / Compose / Portainer / Traefik / Cloudflare** supply deployment/runtime/edge capability.

Before material new domain state, apply ADR 0036 Capability Authority / Reuse Gate. Do not recreate Paperclip agent lifecycle, hierarchy, tasks or assignment control plane merely because a local Wandora table would be convenient.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

**REAL:** login/session, explicit multi-organization selection, Team read, Work, Conversations, Canonical Confirmation V2, the controlled supervised WhatsApp loop, and the tenant-gated customer `Contratar Ana` contract/UI.

**PARTIAL / PLACEHOLDER:** dashboard/company/approval surfaces and digital-employee **activation/resume**. The first real MEDICSPRO hire is now live under ADR 0115; activation remains deliberately unavailable.

Customer hire is exposed only through the exact reviewed route `POST /api/v1/organizations/:organizationId/digital-employees`, normal human session authorization, tenant eligibility and Organization Adapter/Paperclip reconciliation. `Contratar` creates/returns a paused + supervised employee; it is not an activation capability.

Human Send and Gateway outbound remain separate effect capabilities and remain OFF.

## Organization Adapter — accepted V1 architecture

ADRs 0037–0050 establish the accepted catalog path:

```text
Wandora Organization Adapter
  -> private provider-neutral service contract
  -> frozen provider company target
  -> file-backed per-company HMAC custody
  -> signed private Paperclip webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
```

V1 is **catalog-only**. Arbitrary/custom employees and silent fallback to direct `agent-hires` remain out of scope.

Direct repeated `agent-hires` was proven non-idempotent and is not the selected V1 catalog path.

### Minimum Wandora-private state — LIVE FOR INTERNAL CANARY

Migration 010:

```text
infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

owns only minimum integration safety state:

1. organization → provider company binding;
2. digital employee → opaque provider-managed agent binding;
3. hire operation journal for idempotency, request hash, recovery and audit.

### Service contract boundary — LIVE FOR INTERNAL CANARY

Migration 011:

```text
infra/stacks/supabase/migrations/20260916_011_organization_adapter_service_contract_v1.sql
```

adds the reviewed internal catalog-hire service/runtime boundary with owner/admin authorization, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage to customer contracts.

Both migrations are live in production. Their exact canonical verifiers returned `ORGANIZATION_ADAPTER_STATE_V1_OK` and `ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_OK`; verifier proof rows rolled back.

## Secret custody — LIVE FOR INTERNAL CANARY

ADR 0041 selects mounted-file custody, not per-company HMAC environment variables and not database-held secret material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute custody directory. Raw company refs never become filesystem paths. The reader uses `O_NOFOLLOW` and rejects missing, empty, oversized or weak material.

Per-company Organization Adapter custody is live for the internal canary. Core uses the mounted-file boundary and Paperclip stores only its company-owned encrypted secret with plugin config referencing it by `secret_ref`. Raw material remains outside Git and business payloads.

## Composed proof / activation rehearsal — PROVEN, NON-PRODUCTION

PR #85 proved the composed disposable path:

```text
OrganizationAdapterService
  -> migrations 010/011
  -> operation reservation / frozen target
  -> file-backed per-company custody
  -> signed Paperclip client
  -> exact private HTTP contract
```

ADR 0042 / PR #87 proved the production-shaped activation order and failure/rollback behavior using disposable/candidate infrastructure.

ADR 0043 / PR #88 added candidate-only Core wiring. The base live Core remains Organization Adapter OFF unless a later explicit activation changes it. The candidate overlay requires database mode, exact private Paperclip webhook, read-only HMAC custody and migration-011 readiness. It adds no customer/browser/Platform Admin hiring route.

## Core candidate provenance — PROVEN, NOT RUNNING AT LAST LIVE CHECK

ADRs 0044–0048 established the build, staging and portable OCI provenance contract.

Corrected candidate application source:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

Post-merge private artifact proof:

```text
workflow_run        = 35198147447
artifact_id         = 10487136577
artifact_zip_sha256 = 2bf661160c5344c87ed4445e709dfdcdc95e067c4c049eb596f3a1835c6d02db
archive_sha256      = 3b7c65c30525fb3f2bb0674bbe81687570aae48f26b08ee80b8c6a33193a7d76
oci_config_digest   = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
oci_manifest_digest = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
```

Private host staging was:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Last verified candidate state:

```text
candidate tag   = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate VPS Id= sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
state           = STAGED + LOADED, NOT RUNNING
running count   = 0
```

Do not repeat `docker load` merely because a chat froze. Reconcile current image/container state first.

## Production Activation Preflight V1 — ADR 0049

ADR 0049 did **not** authorize activation. It proved recovery/readiness prerequisites and stopped on a missing production Paperclip plugin artifact.

Already-proven recovery evidence — do not repeat blindly:

```text
backup = /home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
backup_sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
RESTORE_COUNTS_MATCH = YES
POSTGRES_WANDORA_RESTORE_PROOF_OK
ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK
```

Last live runtime evidence from that preflight — **historical until re-verified**:

```text
wandora-core      = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy/private
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Human Send        = OFF
Gateway outbound  = OFF
migration 010 private tables = ABSENT
production Organization Adapter HMAC custody = ABSENT
production plugin/config = ABSENT
```

## Production Paperclip managed-plugin artifact — CANONICAL + LIVE FOR INTERNAL CANARY

ADR 0050 / PR #95 cleared ADR 0049's missing-artifact blocker.

Canonical source:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

Canonical package contract:

```text
package      = paperclip-plugin-wandora-organization-adapter@0.1.0
plugin id    = wandora.organization-adapter-v1
catalog key  = ana-commercial-v1
adapterType  = wandora_mastra
status       = paused
budget       = 0
Paperclip    = wandora/paperclip:v2026.831.1
source       = 65ec059bde30d98c92165b24a30a540800dd1f6f
plugin API   = 1
SDK source   = 1.0.0
```

The package embeds no Wandora execution URL, real secret, provider company identifier, API key or run JWT. `wandora_mastra` is only the stable future adapter identifier; execution-adapter promotion remains a separate gate.

Post-merge `main` proof:

```text
main                = f60715d042da4bbe4ac9068ea29dae2c986006bd
workflow_run        = 35266676646
artifact_id         = 10516662930
artifact_name       = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
artifact_zip_sha256 = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package             = paperclip-plugin-wandora-organization-adapter-0.1.0.tgz
package_sha256      = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

The dedicated CI proved strict typecheck, 5/5 signed-ingress tests, bundled SDK artifact shape, pinned native Paperclip manifest validation, two identical `npm pack` hashes, exact five-file tarball contents, forbidden proof/credential material absence and private artifact upload.

**Historical artifact blocker cleared by ADR 0050. Current live activation state is governed by ADR 0059 and the checkpoint below.**

## Operator Consoles + Paperclip Provider Prerequisites — LIVE, BOUNDED

ADRs 0051–0057 supersede older console/admin preflight notes.

Current proven operator surfaces:

```text
control.wandora.com.br -> Cloudflare Access -> Traefik -> control bridge -> private Paperclip
runtime.wandora.com.br -> Cloudflare Access -> Traefik -> isolated Mastra Studio
```

Origin TLS is valid and direct public-origin TCP/443 bypass was denied in the external probe.

Paperclip provider administration/current canary state:

```text
bootstrapStatus = ready
instance admin = established through explicit operator claim
provider companies = 1
provider company = Wandora Internal Supervised Proof
providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
owner/active membership = 1
wandora.organization-adapter-v1 = installed, ready
plugin company config = present
Paperclip Ana agents = 1
Paperclip managed resources = 1
```

The provider company maps only to the canonical internal Wandora supervised-proof organization. `Empresa Exemplo` deliberately still has no Paperclip company.

Migrations 010/011, control-plane binding and per-company custody are now live for this internal canary. Customer hiring remains absent.

## Production Activation Preflight V2 — COMPLETE, NO ACTIVATION

ADR 0057 closes the observation/plan preflight.

Revalidated evidence includes:

```text
backup sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
candidate = loaded, running count 0
live Core = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
Human Send = OFF
Gateway outbound = OFF
plugin artifact = available, unexpired
wandora.organization-adapter-v1 installed count = 0
```

The full future migration -> operator binding -> canonical plugin artifact -> per-company HMAC/secret_ref -> company config -> candidate Core -> internal canary order is frozen in ADR 0057.

**Preflight completion is not activation authorization.**

## Exact future migration boundary

A later activation may proceed only after a fresh preflight. If that preflight explicitly authorizes execution, database order remains fixed:

1. apply `20260916_010_organization_adapter_state_v1.sql`;
2. run `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop immediately on failure;
4. apply `20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop immediately on failure;
7. only then continue to separately reviewed plugin install/config, per-company HMAC custody and candidate Core activation.

Migration 010 being inert is not permission to apply it early. Migration 011 widens `wandora_core_runtime` capability and remains part of one attributable activation sequence.

## Residual unrelated secret / cleanup gap

A residual file exists from an aborted/future dedicated Paperclip database experiment:

```text
/opt/wandora/stacks/paperclip-db/secrets/postgres_password
```

It was not referenced by live Paperclip at the ADR 0049 preflight and is **not** an Organization Adapter HMAC. Do not reuse it as HMAC material and do not delete it merely as part of context recovery/activation. Cleanup is a separate reviewed operational concern.

## What remains explicitly NOT live / NOT approved

- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Paperclip → Wandora/Mastra execution-adapter production promotion;
- Human Send or Gateway outbound activation as part of Organization Adapter work;
- second/customer Paperclip provider-company provisioning.

## Second adversarial review after artifact promotion

Rejected shortcuts:

- treat the green artifact as permission to activate production immediately;
- install/configure the plugin before re-checking current live Paperclip/runtime state;
- apply migration 010 early merely because the artifact blocker is now gone;
- generate HMACs before the fresh preflight fixes the exact target/company/install composition;
- treat `wandora_mastra` as proof that the production execution adapter is installed;
- reuse the residual future `paperclip-db` PostgreSQL password as HMAC material;
- repeat backup, restore proof or candidate load just because prior chats froze.

## Production Activation Execution V1 — INTERNAL CANARY COMPLETE

ADR 0059 is the current activation authority/checkpoint.

```text
migration 010 = LIVE + verifier green
migration 011 = LIVE + verifier green

internal control-plane binding = exactly 1
Paperclip plugin = wandora.organization-adapter-v1@0.1.0, ready
Paperclip company config = present
Paperclip company secret reference = present, version 2
Paperclip private hostname allowlist includes wandora-paperclip

internal canary operation = completed
Wandora Ana = 1 active / supervised
Wandora provider binding = 1
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-key replay = same Wandora employee id
```

The first provider call failed closed with HTTP 403 because the Paperclip private hostname guard did not allow its Docker service hostname. PR #103 added only `PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip`, preserved the guard, and promoted the exact merged Compose. The existing `uncertain` operation was then retried with the same idempotency key and completed successfully.

Post-promotion runtime:

```text
live Core = wandora/core:organization-adapter-candidate-068d30a49d9b
live Core image id = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
live Core Organization Adapter = ON
live Core healthz/readyz = 200/200
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF

Paperclip = healthy/private/authenticated
Paperclip plugin = ready
Paperclip companies = 1
Paperclip Ana / managed resources = 1 / 1
Empresa Exemplo Paperclip company = absent
customer Contratar/Ativar = absent
```

ADR 0060 proves that no Core or Core-stack source changed after the candidate source revision, the promotion render had no residual delta beyond the candidate image + Organization Adapter config/mount, rollback was prepared before replacement, and a same-key replay through the live Core returned the existing Ana without duplication.

## Organization Adapter Live Cross-Company Isolation Execution V1 — COMPLETE

ADR 0062 closes the remaining live A/B isolation gate.

The execution deliberately used an ephemeral provider-only company B and never provisioned `Empresa Exemplo`.

Two setup attempts failed closed and were fully recovered before any retry:

1. verifier used the wrong Paperclip membership table name; official cleanup restored baseline;
2. preflight expected HTTP 422 for cross-company secret_ref rejection, while the live Paperclip route intentionally normalizes that internal error to HTTP 400; source review proved the exact mapping and official cleanup again restored baseline.

The final proof established:

```text
B owner membership = 1
B config / B secret_ref = valid
B agents / managed = 0 / 0

A secret_ref -> B config
  = HTTP 400
  = "Plugin config references a secret outside the selected company"
  = B config unchanged

A HMAC -> B target
  = HTTP 502
  = invalid_wandora_signature
  = B agents / managed still 0 / 0
```

Cleanup used the official Paperclip company API, then re-saved A's exact existing config JSON unchanged to recompute the worker configured-company scope to A-only.

Final independent state:

```text
Core / Paperclip = healthy / healthy
Organization Adapter = ON
Human Send = OFF
Gateway outbound = OFF

Wandora organizations = 2
control-plane bindings = 1
digital-employee provider bindings = 1
completed hire operations = 1
Empresa Exemplo Paperclip binding = 0

Paperclip companies = 1
ephemeral B = 0
plugin = ready
A config / secret / Ana / managed = 1 / 1 / 1 / 1
A secret_ref unchanged = true
fixture checkpoint = absent
```

The cross-company isolation gate is therefore **CLOSED**. No durable B provider state remains.

## Customer Digital-Employee Lifecycle Contract Preflight V1 — COMPLETE, NO CUSTOMER EFFECT

ADR 0063 defines the customer lifecycle boundary without enabling any customer mutation.

Accepted semantics:

```text
Contratar = materialize one supported catalog employee, stable/idempotent, paused + supervised
Ativar    = separate future execution permission; unavailable until production execution bridge + least-privilege resume contract are proven
```

No new lifecycle table is approved. Existing `wandora.digital_employees.status = paused|active` plus the existing Organization Adapter binding/hire journal are sufficient for V1 hire.

The existing Organization Adapter service already owns owner/admin authorization, tenant scope, idempotency, provider reconciliation and private binding. Customer first-time hire must change its local finalization from `active` to `paused`; completed hire replay must return the actual canonical `paused|active` state.

Paperclip independently confirms managed agents are provisioned paused and “require explicit activation.” Its plugin SDK exposes company-scoped `agents.resume`, but the live Wandora plugin does not request that capability and the Paperclip -> Wandora/Mastra execution bridge remains laboratory-only. Therefore customer activation remains blocked.

Provider company creation is lazy at first hire in product semantics, but must **not** be hidden inline inside the customer POST yet. Paperclip company creation is an instance-admin effect with no Wandora idempotency contract. The first `Empresa Exemplo` canary will therefore use a separately reviewed operator bootstrap prerequisite; general self-service requires a later bootstrap-automation contract.

The current public placeholder `/start` is not production-safe. Real V1 must be authenticated/tenant-bound, use the selected canonical organization, expose only `Ana / ana-commercial-v1`, remove fake company/WhatsApp/knowledge effects, explicitly confirm `Contratar Ana`, and redirect to canonical `Equipe`. No `Ativar` control is rendered yet.

Customer hire also requires its own disabled-by-default runtime gate. Organization Adapter ON does not imply customer hire ON.

## Customer Hire Contract Implementation V1 — COMPLETE, GATE OFF

ADR 0064 closes the code/CI implementation slice.

The customer POST and authenticated Ana-only `/start` experience now exist in code behind a dedicated disabled-by-default runtime gate. First-time hire finalizes `paused + supervised`; hire replay returns the same employee with its current canonical `paused|active` state. The exact Web bridge forwards Authorization + Idempotency-Key and keeps the generic API boundary closed.

Second adversarial review found an existing legacy Ana in `Empresa Exemplo` that is active/supervised but has no Paperclip provider binding and no proven catalog identity. Therefore automatic adoption by matching name/role is rejected. The adapter now fails closed with `catalog-conflict` before journal/provider effect when such a legacy collision exists.

`Empresa Exemplo` is **not eligible for a naive first-hire canary**. ADR 0064 supersedes that future-canary assumption from ADR 0063.

No production deployment or customer effect was authorized by this implementation slice. Customer Digital-Employee Hire remains OFF; Human Send and Gateway outbound remain OFF; customer activation remains unavailable.

## Customer Hire Canary Selection + Legacy Reconciliation Preflight V1 — COMPLETE

ADR 0065 selects a **fresh employee-free internal customer-like tenant** for the first paused-first customer hire canary and defers legacy `Empresa Exemplo` adoption.

Read-only production evidence showed:

- only two current organizations;
- the internal supervised-proof organization already has the completed catalog canary and cannot prove first-time hire;
- `Empresa Exemplo` has one legacy active/supervised Ana with no Paperclip binding and no catalog hire operation;
- no durable provisioning/audit evidence proves that legacy row is `ana-commercial-v1`;
- the current ADR 0030 tenant provisioner always creates one active supervised commercial-assistant employee, so it cannot create a clean paused-first hire tenant;
- `wandora_platform_provisioner` remains inert at `CONNECTION LIMIT 0` with no password;
- live Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

The selected future canary is:

```text
Wandora Customer Hire Canary
slug = wandora-customer-hire-canary
pre-hire digital employees = 0
```

ADR 0065 also requires the actual first production hire effect to run through a **private production-connected candidate Core** with the customer-hire gate ON. The normal live Core stays customer-hire OFF during that canary because the current gate is runtime-wide, not tenant-specific.

## Private Tenant Provisioning V2 — IMPLEMENTED IN CODE / NOT LIVE

ADR 0066 implements the employee-free private provisioning contract without changing V1 behavior.

The versioned migration is:

```text
infra/stacks/supabase/migrations/20260918_012_private_tenant_provisioning_v2.sql
```

Contract:

```text
wandora_private.provision_beta_organization_v2(...)
  -> organization
  -> canonical user / Supabase identity mapping
  -> active owner membership
  -> private idempotency evidence
  -> zero digital employees
```

V1 and V2 share the private provisioning ledger with an explicit version/row-shape invariant:

```text
V1 -> provisioning_version = 1 -> employee_id required
V2 -> provisioning_version = 2 -> employee_id absent
```

The V1 function signature and first-employee behavior remain unchanged. V2 is executable only by the dedicated `wandora_platform_provisioner`; browser/authenticated/Core roles remain denied and the provisioner still has no direct table access.

A dedicated Core CI harness applies migrations 001→012 in order, reapplies 012, proves V2 behavior, V1 regression compatibility, shared-key cross-version fail-closed behavior and the least-privilege boundary.

**Migration 012 is not applied to production by this implementation slice.** The future canary tenant and Paperclip company remain absent; Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Private Tenant Provisioning V2 — PRODUCTION MIGRATION PREFLIGHT COMPLETE / NOT LIVE

ADR 0067 closes the production migration preflight without applying migration 012.

Fresh read-only live evidence before the preflight showed:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent

V1 function                       = present
V2 function                       = absent
provisioning_version column       = absent
employee_id                       = NOT NULL
```

The current rollback snapshot is:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

Restore proof on disposable `supabase/postgres:17.6.1.136` reproduced the current production business/integration counts and confirmed V1 present / V2 absent.

The exact canonical migration 012 Git blob `f9b6eedaf56b967ce9b30fd9a0558fb4c4cd34e7` was then applied twice to a disposable restore of that snapshot. It preserved all current business rows, created V2 only for `wandora_platform_provisioner`, and remained denied to Core/authenticated. A migration-only reverse path also restored the exact pre-012 schema while the provisioning ledger remained empty.

**Migration 012 is still absent from production.** Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The canary tenant and Paperclip company remain absent.

## Private Tenant Provisioning V2 — LIVE / DORMANT

ADR 0068 records the successful production application of migration 012.

Production now has:

```text
wandora_private.provision_beta_organization_v1(...) = present
wandora_private.provision_beta_organization_v2(...) = present
tenant_provisioning_requests.provisioning_version  = present
tenant_provisioning_requests.employee_id           = nullable

wandora_platform_provisioner EXECUTE V2 = true
wandora_core_runtime EXECUTE V2          = false
authenticated EXECUTE V2                 = false
platform direct ledger SELECT            = false
platform provisioner password            = absent
```

Post-migration business/integration state remained unchanged:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent
```

The canonical live-safe verifier returned `PRIVATE_TENANT_PROVISIONING_V2_LIVE_OK`. Core/Web/Paperclip/Gateway remained healthy. Customer Digital-Employee Hire, Human Send and Gateway outbound remained OFF.

V2 is therefore a **live but dormant** operator capability. No tenant has yet been created through it.

## Customer Hire Canary — Employee-Free Tenant Provisioning Preflight V1 — COMPLETE, NO CANARY CREATED

ADR 0069 freezes the exact first V2 canary request and least-privilege execution path.

Current frozen request:

```text
request_key               = customer-hire-canary:tenant-v2:v1
organization_slug         = wandora-customer-hire-canary
organization_display_name = Wandora Customer Hire Canary
owner_user_id             = e1000000-0000-4000-8000-000000000001
owner subject             = runtime-resolved only; SHA-256 frozen in ADR 0069
```

The production execution path creates no reusable platform password:

```text
private supabase_admin maintenance session
  -> resolve/hash-gate existing owner identity
  -> BEGIN
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> provision_beta_organization_v2(...)
  -> COMMIT
  -> independent post-verification
```

The role-switch proof is green: the effective platform role can execute V2 and still cannot directly read the private provisioning ledger.

No redundant V2 rehearsal was run because ADR 0066/PR #111 already proves exact replay, changed-payload conflict, same-slug conflict, owner reuse and least privilege; ADRs 0067–0068 prove the exact current migration shape through disposable production restore and live application.

Production remains unchanged after this preflight: 2 organizations, 0 provisioning requests, canary absent, Customer Digital-Employee Hire OFF, Human Send OFF and Gateway outbound OFF.

## Customer Hire Canary — Employee-Free Tenant Provisioning Execution V1 — LIVE

ADR 0070 records the bounded V2 production execution.

Current durable state:

```text
organizations                       = 3
digital_employees total             = 3
tenant_provisioning_requests        = 1

Wandora Customer Hire Canary        = active
canary active owner memberships     = 1
canary digital employees            = 0
canary control-plane bindings       = 0
canary employee-provider bindings   = 0
canary hire operations              = 0
```

The provisioning row uses the frozen request key `customer-hire-canary:tenant-v2:v1`, `provisioning_version=2`, `employee_id=NULL`, and reuses the frozen canonical owner.

The least-privilege role remains passwordless with `CONNECTION LIMIT 0`.

Independent Paperclip API proof still reports exactly one provider company — `Wandora Internal Supervised Proof` — so the new canary has no Paperclip company yet.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The existing Organization Adapter internal canary bindings/operation remain unchanged at 1/1/1.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Preflight V1 — COMPLETE, NO PROVIDER MUTATION

ADR 0071 freezes the first provider-company bootstrap for the clean customer-hire canary.

Live Paperclip proof:

```text
commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
deployment          = authenticated / private
bootstrap           = ready
database backup     = enabled / ok
operator credential = board_key / isInstanceAdmin=true
companies           = 1
exact canary-name matches = 0
```

Frozen request:

```json
{"name":"Wandora Customer Hire Canary"}
```

Body SHA-256:

```text
e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe
```

Paperclip company creation has no idempotency key, company names are not unique, and the route is not externally atomic across company creation, owner membership/grants and audit. Therefore any lost/non-201 response after dispatch is treated as potentially effectful. Blind retry is forbidden; reconciliation against the frozen pre-call company baseline is mandatory.

The live health contract reports `companyDeletionEnabled=false`, so deletion is not assumed as normal rollback. Partial/orphan state stops the slice for separately reviewed recovery rather than direct SQL repair.

Production remains unchanged after preflight: Paperclip still has one company, the canary has zero employees/provider bindings/hire operations, and Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Execution V1 — LIVE

ADR 0072 records the one-shot provider bootstrap through the official Paperclip CLI/instance-admin boundary.

Current provider state:

```text
Paperclip companies total = 2

Wandora Internal Supervised Proof
  providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
  status = active

Wandora Customer Hire Canary
  providerCompanyRef = e7422a00-1474-49d5-ac32-34594520015e
  status = active
  owner membership = active
  agents = 0
  Organization Adapter config = absent
  company secrets = 0
```

The canary Wandora organization still has zero employees, zero provider bindings and zero hire operations. Existing internal integration totals remain 1/1/1.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Organization Adapter Custody + Config + Binding Preflight V1 — COMPLETE / EXECUTION BLOCKED

ADR 0073 freezes the production wiring contract without creating any new binding, secret or config.

Frozen pair:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e
provider              = paperclip
```

Future Core custody filename:

```text
paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

The accepted execution order is operator-owned Wandora binding → one protected HMAC file → one company-owned Paperclip `local_encrypted` secret → company-scoped plugin config **last** → independent validation. Core remains unable to INSERT the control-plane binding.

Secret creation and plugin-config responses are reconciled by readback after ambiguity; blind retry is forbidden. Plugin config is not treated as safely repeatable merely because its storage operation is an upsert.

The second adversarial review found a recovery blocker: live Paperclip database backups and `/paperclip/instances/default/secrets/master.key` are currently colocated on the same Docker volume, while Paperclip requires both database metadata and that master key to restore `local_encrypted` secrets. No independent external master-key recovery copy was found.

Therefore no second production `local_encrypted` HMAC is created yet.

## Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1 — COMPLETE / NO SNAPSHOT YET

ADR 0074 freezes the recovery gate required before creating another production `local_encrypted` secret.

Current facts:

```text
Paperclip image = wandora/paperclip:v2026.831.1
Paperclip commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
embedded PostgreSQL = 18
local_encrypted = healthy
live master.key mode = 0600
```

The accepted V1 recovery pair will live outside the Docker volume under a unique operator-owned mode-0700 directory in `/home/wandora-admin/backups/`, containing a fresh official Paperclip logical backup, byte-identical `master.key`, SHA256SUMS and a non-secret recovery manifest; artifact files are mode 0600.

The disposable proof reuses the exact pinned Paperclip image/runtime and `runDatabaseRestore()`, restores into fresh PG18 state with no public port/live volume, decrypts the existing internal Organization Adapter HMAC via `localEncryptedProvider.resolveVersion()`, and records only boolean/hash-match evidence. A deliberately wrong disposable key must fail decryption.

This V1 is same-host but out-of-Docker-volume recovery; it does not claim to solve total VPS/off-site disaster recovery.

No recovery snapshot was created in this preflight and no customer-hire wiring state changed.

## Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1 — GREEN

ADR 0075 records the completed recovery execution.

Retained protected snapshot:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260918T090456Z/
  paperclip-db.sql.gz
  master.key
  SHA256SUMS
  RECOVERY_MANIFEST.txt
```

Custody is `0700` on the directory and `0600` on artifacts. The fresh manual Paperclip backup and master key are byte-hash matched to their live sources.

Disposable proof:

```text
RESTORE_OK=true
LOCAL_ENCRYPTED_DECRYPT_OK=true
HMAC_HASH_MATCH=true
WRONG_KEY_DECRYPT_REJECTED=true
```

The restore target was the exact Paperclip embedded PostgreSQL 18 runtime. A local PostgreSQL 17.6 `psql` closure was used only as the dump client because the production Paperclip image does not bundle `psql`; no network, live provider volume or public port was used. Proof-only harness/image/state were removed.

Post-proof live validation is green: Paperclip/Core remained running with zero restarts, Organization Adapter is ready/healthy and `local_encrypted` remains `ok`.

The customer-hire canary remains at zero secrets/config/agents/binding/employees/hire operations.

The recovery blocker from ADR 0073 is therefore cleared. This snapshot is same-host/out-of-Docker-volume recovery only; off-host/VPS-loss recovery remains a separate infrastructure concern.

## Customer Hire Canary — Organization Adapter Custody + Config + Binding Execution V1 — GREEN

ADR 0076 records the completed production wiring.

Current canary control-plane state:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e

Wandora control-plane binding = exactly 1
Core deterministic HMAC file  = present / 0640 / readable
Paperclip company secret       = exactly 1 active local_encrypted
Paperclip plugin config        = exact secret_ref / lastError=null
secret usage                   = one required plugin hmacSecret binding
Paperclip canary agents        = 0
```

The Core HMAC file SHA-256 and Paperclip secret-version `value_sha256` / `fingerprint_sha256` are identical:

```text
eba4bdda5baf60b57368d1d4a83628f73551b3e8ad1a226f3c983b06154ecb60
```

Execution order matched ADR 0073: operator binding → HMAC custody → encrypted Paperclip secret → plugin config last.

The canary still has zero digital employees, zero digital-employee provider bindings and zero hire operations. Organization Adapter remains ON while Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Private Candidate Core Hire Execution V1 — GREEN

ADR 0078 records the first clean customer-like production hire through the real Human API + Organization Adapter contract.

Proven result:

```text
Wandora Customer Hire Canary
  digital employees = 1
  employee-provider bindings = 1
  hire operations = 1

Ana
  id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
  role = commercial-assistant
  status = paused
  autonomy = supervised

hire operation
  key = customer-hire-canary:ana-commercial-v1:v1
  catalog = ana-commercial-v1
  status = completed

Paperclip canary agents = 1
Paperclip Ana = paused / wandora_mastra
```

A real normal Supabase browser session for the existing owner passed candidate `GET /api/v1/me`; no service-role/admin impersonation was used. The first POST returned 200. Same-key replay and different-key/same-catalog replay both returned the same employee and independent readback remained exactly 1 employee / 1 provider binding / 1 hire operation / 1 Paperclip agent.

Customer response leakage checks remained negative for provider/secret fields.

Cleanup is complete:

```text
private hire candidate container = absent
ephemeral browser-session file = absent
temporary bearer helper = absent
candidate image = staged only / not running

normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The successful hire remains deliberately paused. `Contratar` is still separate from future `Ativar`.

## Customer Digital-Employee Hire — Public Rollout Preflight V1 — COMPLETE / NOT ACTIVATED

ADR 0079 closes the rollout design after the successful canary.

Key findings:

- PR #126 is merged and behaviorally proves browser idempotency survives reload and remains bound to the original organization across tenant switches;
- the live Web is still the older pre-rollout image and public customer hire remains OFF;
- the Core hire flag is process-wide while production has multiple active organizations in different readiness states;
- Core already fails closed for member/cross-tenant access, missing provider binding, matching legacy employee, catalog replay and ambiguous provider outcomes;
- Private Tenant Provisioning V2 intentionally creates no provider/control-plane wiring;
- a control-plane binding cannot double as customer eligibility because accepted wiring creates that binding before provider configuration is complete.

Decision:

```text
global runtime hire gate
AND
explicit Wandora-owned organization + catalog eligibility
=
customer hire available
```

The eligibility fact is provider-neutral and operator-owned. It is enabled only after wiring validation and is enforced server-side before journal/provider effects. No provider identifiers/configuration become customer state.

No production activation occurred.

## Customer Digital-Employee Hire — Tenant Eligibility Contract Implementation V1 — CODE/CI GREEN / NOT LIVE

ADR 0080 records the completed implementation on PR #128.

The contract now provides:

- private provider-neutral eligibility keyed by Wandora organization + catalog;
- dedicated `wandora_customer_hire_operator` NOLOGIN capability with controlled setter-only authority;
- Core tenant-scoped read-only eligibility access;
- eligibility enforcement before new journal/provider effects;
- original-key-only resume for unfinished hires;
- completed catalog dedupe independent of later eligibility disablement;
- provider-neutral customer read states: `available | already-hired | reconciliation-required | unavailable`;
- Web gating driven by the Core projection rather than owner/admin role alone;
- refresh/tenant-switch reconciliation that never invents a replacement idempotency key.

Final technical validation before the ADR/checkpoint was fully green:

```text
Core CI                 35342325894 = success
Web CI                  35342325859 = success
Platform Admin CI       35342325774 = success
Messaging Gateway CI    35342325740 = success
Core Candidate Artifact 35342325793 = success
```

Reviewed Core/Web candidate artifacts were produced as CI evidence only and were not promoted.

Production remains unchanged:

```text
migration 013                             = ABSENT
tenant/catalog eligibility rows           = none / contract not live
normal live Customer Digital-Employee Hire = OFF
Human Send                                = OFF
Gateway outbound                          = OFF
```

No live role grant, migration, candidate deployment, customer hire activation, employee activation or outbound effect occurred.

## Customer Digital-Employee Hire — Production Activation Preflight V2 — COMPLETE / NO EFFECT

ADR 0081 closes the production activation preflight after PR #128.

Current canonical Git/provenance:

```text
main = e438518bb52be8119883c4350295dac58cd70ef2
main tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
PR #128 reviewed merge-ref = af542864d267c0d186bae7272b208a4ee676f1cc
reviewed merge-ref tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
```

The selected Core/Web artifacts from the final PR validation are therefore accepted as current-main **tree-equivalent** candidates; no arbitrary rebuild is required merely because the squash commit identity differs.

Read-only production revalidation proves:

```text
migration 013 table / role / setter = ABSENT / ABSENT / ABSENT
normal Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
Core/Web/Paperclip/Gateway = healthy / 0 restarts
```

Tenant-by-tenant review found no active tenant that should receive a new `ana-commercial-v1` eligibility row now:

- Internal Supervised Proof already has a completed catalog operation and proof/employee state;
- Empresa Exemplo has a legacy active Ana and no Paperclip control-plane binding;
- Customer Hire Canary already has the completed paused-first catalog hire.

Paperclip readback independently shows one paused `wandora_mastra` Ana in each bound company (Internal Supervised Proof and Customer Hire Canary).

Future dormant-foundation order is frozen:

```text
fresh backup/rollback evidence
-> migration 013
-> read-only zero-row + authority postverify
-> global customer-hire gate still OFF
-> Core candidate
-> Core health/readiness/no-effect verification
-> Web candidate
-> Web fail-closed verification
-> STOP
```

Core precedes Web because the old Web safely ignores the additional Core `hire` field, while the new Web depends on that projection.

The future eligibility operator path does not create a new LOGIN: the protected local DB administration session uses transactional `SET LOCAL ROLE wandora_customer_hire_operator` and the controlled setter only. No persistent grant to an application/service account is authorized.

No migration, candidate deploy, eligibility row, global hire activation, employee activation or outbound effect occurred during this preflight.

## Customer Digital-Employee Hire — Dormant Production Foundation Activation V1 — LIVE / DORMANT

ADR 0082 makes the eligibility contract and reviewed customer Core/Web live without enabling any customer-hire effect.

Current production foundation:

```text
migration 013 table / setter / operator role = LIVE
wandora_customer_hire_operator = NOLOGIN / least privilege
eligibility rows = 0

Core = wandora/core:organization-adapter-candidate-af542864d267
Core health / ready / restarts = healthy / 200 / 0

Web = wandora/web:candidate-af542864d267
Web health / restarts = healthy / 0

Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The exact migration Git blob was hash-gated before execution. A fresh pre-migration custom-format backup is retained under `/home/wandora-admin/backups/customer-hire-foundation-20260918T123446Z/` with SHA-256 `9ab8ebc19342be406d1b505073b6dbddce3fd7314014ddac743c745d565ee423`.

Recovery proof restored the Wandora-owned `wandora` + `wandora_private` schemas into disposable PostgreSQL 17.6 and reproduced the exact pre-migration counts. The first broader Supabase-image restore attempts were explicitly rejected after disposable-only failures; production was never used as a restore target.

Migration 013 live postverify is read-only and proves zero rows, RLS, tenant-scoped Core SELECT, setter-only NOLOGIN operator authority, no platform-provisioner authority, and no browser/service-role authority.

The Core and Web promotion renders each differed from the previous live render only by their image line. Previous images and rollback records remain locally available.

Public Web route checks are green for `/healthz`, `/`, `/login`, `/team`, `/work`, `/conversations`, `/company` and `/start`.

Durable business/integration counts remained unchanged:

```text
organizations = 3
digital_employees = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
tenant_provisioning_requests = 1
```

No tenant eligibility, hire, employee activation, Paperclip mutation or outbound effect occurred.

## Customer Digital-Employee Hire — Global Runtime Gate Activation Preflight V1 — COMPLETE / OFF

ADR 0083 closes the process-wide gate preflight without recreating Core.

Current production remains:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Web  = wandora/web:candidate-af542864d267
Core/Web = healthy

migration 013 = LIVE
eligibility rows = 0
enabled eligibility rows = 0

Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The canonical gate overlay is only:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true
```

Its Git blob is `cf188f4e22651f318984f10a17aba3dee05ad2ea`. The file is not yet present in the live Core stack directory; a byte-identical copy exists only under the isolated preflight directory.

Rendered OFF vs ON Core composition differs by exactly that one environment variable:

```text
OFF render SHA-256 = 8f76c8dd872974de738109b2c0555e87dbbb9433782a5bcbf4ddec2c0e5e9408
ON  render SHA-256 = c3744b7c7319d8eed3bd6254d5cb6384f6ef643c9c2f6e4ceb2185898d5ee658
```

Active-tenant state proves zero new availability with the gate ON and zero eligibility rows:

- Internal Supervised Proof already has a completed `ana-commercial-v1` operation;
- Customer Hire Canary already has a completed `ana-commercial-v1` operation;
- Empresa Exemplo has no eligibility row and no Paperclip control binding.

The live hire journal also has exactly **0 unfinished operations** (`planned|creating|uncertain`) and 2 completed operations. This is a mandatory companion invariant to zero eligibility because an existing unfinished operation is intentionally reconciled before the eligibility check.

A disposable executable proof used the **same live Core image**, the accepted production-derived backup, canonical migration 013 and a synthetic fully wired owner tenant with no eligibility. With the hire path enabled only inside the harness:

```text
GET hire state = unavailable
available = false
POST = 404 employee-not-available
provider calls = 0
new operations/employees/employee-bindings = 0
```

The selected rollout order is **global gate first, tenant eligibility later**. Enabling eligibility first was rejected because it could leave latent tenants waiting behind a broad process switch.

Baseline live POST proof with the gate OFF returns `404 not-found` for a syntactically valid hire request and produces no durable delta.

## Customer Digital-Employee Hire — Global Runtime Gate Activation Execution V1 — LIVE / ZERO TENANT ELIGIBILITY

ADR 0084 enables only the process-wide customer-hire runtime gate on the already reviewed Core image.

Current production:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Core health / ready / restarts = healthy / 200 / 0

Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2

Human Send = OFF
Gateway outbound = OFF
```

The live overlay is the exact canonical Git blob `cf188f4e22651f318984f10a17aba3dee05ad2ea`. The Core recreation used the same reviewed image and differed only by `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true`.

The unauthenticated hire route now returns `401 unauthorized` instead of the prior structural `404 not-found`, with no durable delta.

The live compiled customer projection was executed read-only for all active organizations:

```text
Internal Supervised Proof -> already-hired / available=false
Customer Hire Canary      -> already-hired / available=false
Empresa Exemplo           -> unavailable / available=false
```

No active organization projects `available=true`.

Durable totals remain:

```text
organizations = 3
digital_employees = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
eligibility rows = 0
```

Rollback is config-only: omit the hire overlay and recreate the same Core image with the previous six overlays.

## Customer Digital-Employee Hire — First Tenant Eligibility Rollout Preflight V1 — COMPLETE / NO CURRENT TARGET

ADR 0085 closes the first tenant eligibility rollout preflight without enabling any tenant.

Current live safety state remains:

```text
Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

All three active organizations were re-reviewed:

- **Wandora Internal Supervised Proof** already has a completed `ana-commercial-v1` operation and projects `already-hired`;
- **Wandora Customer Hire Canary** already has a completed `ana-commercial-v1` operation and projects `already-hired`;
- **Empresa Exemplo** has a matching legacy active/supervised Ana and no Paperclip control-plane binding, so it remains `unavailable`.

The two Paperclip-bound companies each still have one paused `wandora_mastra` Ana, company-scoped Organization Adapter config with HMAC `secret_ref`, a healthy/ready plugin and deterministic Core HMAC custody at mode 0640 readable by Core.

The dedicated `wandora_customer_hire_operator` remains NOLOGIN and setter-only. Core remains read-only for eligibility; platform provisioner, browser roles and service role cannot execute the setter.

No current tenant qualifies for a first new `ana-commercial-v1` rollout. The exact future setter and rollback transaction are frozen in ADR 0085 for a separately reviewed clean target. The first activation must start from zero enabled rows and fail before commit unless exactly the reviewed target becomes the sole enabled organization+catalog pair.

The transaction is now concurrency-safe for the first rollout: a protected local `supabase_admin` session takes an EXCLUSIVE eligibility-table lock, proves zero enabled rows, narrows to `wandora_customer_hire_operator` only for the setter, then rechecks the sole target before commit. A two-session disposable race proved the second contender blocks and is rejected before creating its row; rollback returns to zero enabled rows.

No eligibility row, tenant, Paperclip resource, hire operation, employee activation or outbound effect was created by this preflight.

## Customer Digital-Employee Hire — Clean Tenant Rollout Candidate Preparation Preflight V1 — COMPLETE / OWNER ONBOARDING BLOCKER

ADR 0086 proves that no real clean customer target currently exists.

Current identity/tenant inventory:

```text
Supabase Auth users = 1
canonical Wandora users = 1
Wandora users without memberships = 0
active organizations = 3
Paperclip companies = 2
eligibility rows = 0
```

All existing organizations remain unsuitable for a first new `ana-commercial-v1` rollout: two already have completed exact-catalog hires and `Empresa Exemplo` has matching legacy Ana state with no Paperclip control binding.

The blocker is now explicit: **the first real customer owner identity does not exist yet**.

Supabase Auth live remains correctly closed to public signup, has e-mail/SMTP configured and exposes protected admin invite/generate-link routes. Private Tenant Provisioning V2 remains live and employee-free, but correctly requires an already-existing Supabase Auth subject.

The current Web remains login-only: password grant, refresh, logout and `/api/v1/me` bootstrap are implemented; invite acceptance, first-password setup, password recovery and onboarding UI are absent.

ADR 0086 selects invite-only beta onboarding and rejects creating another synthetic tenant under the existing internal owner, widening public signup, direct `auth.users` mutation, or placing Auth admin credentials in Web/Core.

No Auth user, invite, tenant, Paperclip company, provider binding, eligibility, employee or outbound effect was created by this preflight.

## Customer Owner Invite Acceptance + First Password Contract Implementation V1 — IMPLEMENTED / CODE+CI ONLY

ADR 0087 implements the normal invite-first-password browser contract against the exact live Auth family `supabase/gotrue:v2.196.0`.

The provider contract was proven from the pinned upstream source:

```text
admin invite verification = implicit flow
successful invite redirect = URL fragment with access/refresh + type=invite + sb marker
invited user without password = provider-generated temporary password
first-password update = authenticated PUT /auth/v1/user
```

Web now has a public `/accept-invite` route. A valid provider-issued invite session is staged separately under `wandora.auth.invite.v1`, the credential fragment is removed before React renders, and a SITE_URL-root invite fallback is canonicalized to the dedicated route. Unsupported Supabase Auth fragments fail closed.

The invited user's password is sent directly to Supabase Auth with the public publishable key plus that user's Bearer session. No Auth admin/service credential enters Web or normal Core. The staged invite session is not promoted to the normal `wandora.auth.session.v1` session until password update succeeds; tenant authorization still comes from the existing `/api/v1/me` bootstrap.

Web CI #291 / run 35392357787 proved:

```text
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
WANDORA_WEB_HUMAN_API_BRIDGE_V1_OK
```

The implementation is **not deployed**. The live Web remains `wandora/web:candidate-af542864d267`. No real invite, Auth user, customer tenant, Paperclip state or eligibility was created.

### Explicit residual gap

Invite verification consumes the one-time token and GoTrue assigns a random temporary password. Invite session material intentionally remains browser-session scoped. If the user closes the browser/tab after verification but before defining the password, the staged session is lost and the user does not know the temporary password.

Therefore the normal first-access path is implemented, but a real customer invitation is not yet operationally recoverable. Recovery must reuse Supabase Auth recovery semantics rather than inventing Wandora credential state.

## Customer Owner Interrupted Invite Recovery Contract Preflight V1 — COMPLETE / NO EFFECT

ADR 0088 closes the interrupted-invite recovery preflight against exact `supabase/auth@v2.196.0`.

The provider-native public `POST /recover` path is sufficient: unknown e-mails receive neutral `200 {}`; existing users receive provider-owned recovery tokens/e-mail; successful implicit verification consumes recovery token state and issues an authenticated `type=recovery` session. The recovery verification itself does not set a new password.

The selected future Web contract is a dedicated `/recover-access` request/callback/reset flow. Recovery sessions must be staged separately from invite and normal sessions, URL credentials removed before React render, and password definition must reuse ADR 0087's authenticated `GET /user -> PUT /user -> password grant` reconciliation before normal session promotion and `/api/v1/me` bootstrap.

No Wandora recovery-token table or generic Core Auth-recovery proxy is justified. Protected `/admin/generate_link type=recovery` remains operator-only emergency/diagnostic capability and is not the customer path.

Read-only production evidence remained:

```text
Auth users = 1
users with recovery_token = 0
users with recovery_sent_at = 0
recovery one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

Live GoTrue has SMTP configured, public signup disabled and the Wandora app origin allow-listed. CAPTCHA is currently unset/disabled. Provider rate/frequency limits exist, but ADR 0088 makes anti-abuse review (provider-native CAPTCHA and/or compatible edge protection) an explicit activation gate before the first real customer recovery.

No `/recover` or admin generate-link call was made. No invite/recovery e-mail or token was generated, no Auth user or tenant was created, no Web/Core/Auth deploy occurred, no provider wiring changed and no eligibility was enabled.

## Customer Owner Interrupted Invite Recovery Contract Implementation V1 — IMPLEMENTED / NOT LIVE

ADR 0089 + PR #137 implement the provider-native recovery contract selected by ADR 0088.

Web now has a public `/recover-access` journey. Without staged recovery state it submits a neutral provider-native `POST /auth/v1/recover` request using only the existing publishable browser key and `redirect_to=https://app.wandora.com.br/recover-access`. With a valid recovery callback it accepts only exact `sb + type=recovery + bearer + access/refresh + unexpired expires_at`, stores that state separately under `wandora.auth.recovery.v1`, removes provider credentials from the URL before React renders and reuses the hardened ADR 0087 password finalizer.

The adversarial review found and fixed an important dispatcher collision: the pre-existing invite handler would otherwise strip a valid recovery fragment before the recovery handler saw it. Invite now explicitly defers recovery callbacks and recovery explicitly defers invite callbacks; unsupported provider flows still fail closed.

Invite and recovery both finish through:

```text
authenticated GET /auth/v1/user
-> authenticated PUT /auth/v1/user
-> password grant with the chosen password
-> only then normal Wandora session + /api/v1/me
```

The recovery request completion UI is account-enumeration neutral. No Auth admin/service credential, Core recovery proxy, Wandora recovery-token table or `localStorage` recovery persistence was added.

The GitHub-hosted Web/Core/Platform Admin/Gateway workflows for the implementation head again failed before runner assignment with `steps=null`; they are not classified green. The accepted infrastructure exception was independently reproduced against the exact Web branch with the real pinned Dockerfile and a synthetic publishable key:

```text
TypeScript strict = green
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_OWNER_INTERRUPTED_INVITE_RECOVERY_V1_OK
WANDORA_WEB_SHARED_PASSWORD_FINALIZATION_V1_OK
WANDORA_WEB_DIGITAL_EMPLOYEE_HIRE_BRIDGE_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
Vite production build = green

isolated route smoke:
/healthz = 200
/recover-access = 200
/accept-invite = 200
/api/v1/not-reviewed = 404
```

The implementation remains **not deployed**. No real invite/recovery was requested or generated, no Auth user/tenant/provider state was created and eligibility remains unchanged. ADR 0088's anti-abuse gate remains mandatory because live CAPTCHA is still disabled.

## Customer Owner Invite + Recovery Production Activation Preflight V1 — COMPLETE / ACTIVATION BLOCKED

ADR 0090 closes the no-effect production activation preflight.

The application/Web source base entering this preflight is `main@5f135e9070380e28c64f244c8a7126644cfa793c`; PR #138 is documentation-only and does not change that application tree. The retained Web build context was hash-compared against all 34 `apps/web` files at that base and is byte-for-byte equivalent. PR #137 head -> merge also has no file delta.

A real-key, non-live Web candidate is staged locally:

```text
wandora/web:owner-access-candidate-5f135e90
manifest list = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

It was built with the existing public Supabase ANON/publishable key without emitting the key, passed strict TypeScript plus all invite/recovery/hire verifiers and Vite build, and passed isolated route smoke:

```text
publishable-key fingerprint = expected
/healthz = 200
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me without session = 401
```

The old ADR 0089 proof image used a synthetic publishable key and is not promotable. The current live Web also predates owner invite/recovery and is not the candidate.

Auth redirect/origin preflight is green: live SITE_URL is `https://app.wandora.com.br`, the allow-list covers `https://app.wandora.com.br/**`, public signup remains disabled, and an OPTIONS preflight to `/auth/v1/recover` from the Wandora app origin returns 200 with the exact allowed origin. No recovery POST was made.

Production activation is nevertheless **blocked** by anti-abuse:

- GoTrue CAPTCHA is not configured live;
- the current Web sends no CAPTCHA token, so enabling provider CAPTCHA now would break recovery;
- the public Supabase Traefik router has no recovery-specific rate limiter;
- Traefik HTTPS is public-bound and a direct-origin route exists, so forwarded Cloudflare client-IP headers are not accepted as a trusted local rate-limit identity without a proven Cloudflare-only origin boundary;
- the installed Cloudflare DNS token can read the zone but receives 403 on the HTTP rate-limit ruleset, so no compatible edge rule is currently provable.

No edge rule, Auth config, Web runtime or production service was changed.

The activation/rollback plan is frozen: after anti-abuse is separately proven, promote only the Web image; rollback restores `wandora/web:candidate-af542864d267`. Post-deploy checks must preserve Hire ON, eligibility 0, unfinished hires 0, Human Send OFF, Gateway outbound OFF, Auth signup disabled, and zero recovery-token/sent state until a separately authorized real recovery test.

## Customer Owner Recovery Edge Anti-Abuse Control Preflight V1 — COMPLETE / CREDENTIAL GATE

ADR 0091 closes the no-effect edge anti-abuse design against the real Cloudflare zone.

Read-only zone evidence:

```text
zone = wandora.com.br
status = active
plan = Free Website
```

The Free plan provides one zone-level rate-limiting rule, Path matching, IP counting, a 10-second counting window and 10-second mitigation. Method is not available in the Free rule expression, so the selected recovery guard intentionally counts both browser OPTIONS and POST traffic.

Selected V1 rule:

```text
ref = wandora_owner_recovery_burst_guard_v1
phase = http_ratelimit
path = /auth/v1/recover
action = block
characteristics = cf.colo.id + ip.src
requests = 6
period = 10 seconds
mitigation = 10 seconds
```

The threshold accounts for one browser recovery attempt potentially consuming both an OPTIONS preflight and POST. It is combined with GoTrue's existing provider-side recovery/OTP and SMTP frequency controls.

The current Traefik DNS token remains intentionally insufficient for WAF: it can read the zone but receives 403 reading the `http_ratelimit` entry point. Only the DNS token is evident on the VPS. ADR 0091 rejects widening that credential; future execution requires a separate zone-scoped WAF token.

ADR 0090's local-origin evidence was refined: a loopback Traefik route does not prove public bypass. A new direct-origin attempt from the independent authorized `28server` timed out before TCP/TLS establishment, while the normal Cloudflare hostname remains reachable. Exact UFW rules remain unreadable without interactive sudo, so the execution contract must reprove the external direct-origin negative rather than claiming a fully enumerated firewall allow-list.

The future activation proof is effect-free with respect to Auth: after creating the edge rule in its own later slice, validate the limiter using only repeated OPTIONS requests. No `POST /recover` is needed. Because Cloudflare rate limiting can have short enforcement delay and per-data-center counters, validation requires a bounded burst to trigger, not an exact request ordinal.

No Cloudflare rule, Auth config, Web runtime, tenant/provider state or eligibility changed during this preflight.

## Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 — BLOCKED PRE-MUTATION

ADR 0092 records an explicit operator credential/custody gate before any Cloudflare mutation.

Observed host custody:

```text
existing DNS token:
  /opt/wandora/data/traefik/secrets/cloudflare_dns_api_token
  owner root:wandora-ops
  mode 0640

dedicated WAF custody:
  /opt/wandora/data/cloudflare/secrets/
  absent

/opt/wandora/data = root-owned
wandora-admin noninteractive sudo = unavailable
```

No alternate WAF/Rulesets token exists. The DNS token remains intentionally insufficient and must not be widened.

The required operator action is to issue a separate Cloudflare token scoped only to `wandora.com.br` with Zone Read + Zone WAF Read/Edit (or current UI-equivalent Write), then install it as:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
```

No Cloudflare rule, Web/Auth runtime, recovery/invite, tenant/provider state or eligibility changed. After the token is securely installed, resume the same execution slice at ruleset read/snapshot; stop if the Free-plan slot is already occupied.

## Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 — COMPLETE

ADR 0093 closes the Cloudflare edge activation.

The dedicated WAF credential is stored at:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
size = 53 bytes
```

The existing DNS token was not widened.

Immediately before mutation, Cloudflare returned `404 / 10003` for the zone `http_ratelimit` entry point, proving no rate-limit ruleset existed.

The created and read-back rule is exactly:

```text
ruleset id = 56c46388452f4328b27a6e6bf5f55cc8
rule id = 77758d45428d43fa8c8810569579f90f
ref = wandora_owner_recovery_burst_guard_v1
path = /auth/v1/recover
action = block
characteristics = cf.colo.id + ip.src
period = 10 seconds
requests = 6
mitigation = 10 seconds
exact match = true
```

OPTIONS-only validation from independent `28server` proved the edge control without generating recovery state:

```text
baseline OPTIONS = 200
bounded burst = multiple 429 responses
after 12 seconds = 200

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
```

The direct-origin TCP check from `28server` still timed out on port 443, so no new external origin bypass became reachable.

The owner-access Web candidate remains staged but not running:

```text
wandora/web:owner-access-candidate-5f135e90
sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

Live Web remains `wandora/web:candidate-af542864d267`.

No invite/recovery, tenant/provider state, eligibility, Human Send or Gateway outbound effect occurred.

## Customer Owner Invite + Recovery Web Production Activation Execution V1 — COMPLETE

ADR 0094 closes the owner-access Web production promotion.

Source provenance remained exact: no `apps/web/` file changed between the proven candidate source base and current main.

Production now runs:

```text
WANDORA_WEB_IMAGE=wandora/web:owner-access-candidate-5f135e90
image id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
wandora-web = healthy
restarts = 0
```

Only `wandora-web` was recreated. Core/Auth/Gateway/Cloudflare configuration were not changed in this deployment transaction.

External validation:

```text
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me unauthenticated = 401
recovery OPTIONS = 200
direct-origin TCP:443 = timeout / unreachable
```

Post-deploy safety state:

```text
Auth signup disabled = true
Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

Rollback is image-only to `wandora/web:candidate-af542864d267`.

No real invite/recovery was generated or sent.

## Customer Owner First Real Access End-to-End Validation Preflight V1 — COMPLETE / BLOCKED BEFORE INVITE

ADR 0095 closes the no-effect first-real-access preflight.

Current live owner-access foundation remains green:

```text
Web = wandora/web:owner-access-candidate-5f135e90 / healthy
Core/Auth/Gateway = healthy
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me unauthenticated = 401

Cloudflare recovery guard:
  exact /auth/v1/recover
  6 requests / 10 seconds / IP
  block 10 seconds
```

No-effect durable state remains:

```text
Auth users = 1
recovery_sent rows = 0
recovery_token rows = 0
Auth one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

The preflight found a real production blocker that earlier “SMTP configured” checks did not prove away. Live GoTrue points at:

```text
GOTRUE_SMTP_HOST = supabase-mail
GOTRUE_SMTP_PORT = 2500
```

but `supabase-mail` does not resolve from the Auth container, TCP probing returns `bad address`, and the live Supabase Compose service inventory contains no mail service. Those values are the same development/default values present in `.env.example`, not an operational transactional relay.

The target gate also remains real: the only existing Auth/Wandora owner is already linked to the three legacy/canary/internal organizations. ADR 0086 still forbids creating another synthetic tenant merely to advance rollout. None of Empresa Exemplo, Customer Hire Canary or Internal Supervised Proof is repurposed as the first real customer.

Decision:

- do not send the first invite yet;
- keep Supabase Auth as invite/password/recovery authority;
- first fix/prove transactional SMTP in a separate slice;
- later freeze one genuinely new owner mailbox + real customer organization;
- primary first proof is the normal `/accept-invite -> first password -> password grant -> /api/v1/me` path;
- `/recover-access` is contingency for an actual interruption, not something to force during the first happy-path proof;
- keep Paperclip bootstrap, provider wiring, eligibility and hiring outside the owner-access proof.

No invite/recovery, Auth user, tenant, Paperclip resource, eligibility or outbound effect occurred.

## Customer Owner Transactional E-mail Delivery Foundation Preflight V1 — COMPLETE

ADR 0096 closes the no-effect SMTP foundation preflight.

Decision:

```text
provider        = Resend SMTP
sending domain  = notify.wandora.com.br
sending region  = sa-east-1
from             = Wandora <acesso@notify.wandora.com.br>
smtp host/port   = smtp.resend.com:587 / STARTTLS
credential       = sending-only key restricted to notify.wandora.com.br
custody          = Docker secret file, never Supabase .env/Git
```

The live Auth container resolved and reached the selected SMTP endpoint and observed STARTTLS without authenticating or issuing MAIL/RCPT/DATA. The selected sender-domain DNS names are currently unused; `mail.wandora.com.br` was rejected because it already resolves to the VPS.

The secret-file compose design was adversarially tested with synthetic material. A naive override was rejected because it retained the password environment key and allowed Compose-time dollar interpolation. The accepted design removes `GOTRUE_SMTP_PASS` from the versioned environment mapping, mounts a dedicated secret and reads it only inside the container immediately before `exec /usr/local/bin/auth`.

No Resend account/domain/key was created, no DNS record changed, no GoTrue configuration changed and no invite, recovery or test e-mail was sent. No Auth user, tenant, provider binding or eligibility state was created. Human Send and Gateway outbound remain OFF.

## Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1 — COMPLETE

ADR 0097 executes ADR 0096 Phase A and makes the external delivery foundation real without activating Auth SMTP.

Live provider foundation:

```text
Resend domain = notify.wandora.com.br / verified
region        = sa-east-1
DKIM          = published + verified
sending CNAME = rsend.notify + send.notify / DNS-only / verified
DMARC         = _dmarc.notify / v=DMARC1; p=none;
credential    = dedicated sending-only/domain-scoped operator key
custody       = /opt/wandora/data/supabase/secrets/gotrue_smtp_pass
               root:wandora-ops / 0640
```

Independent VPS read-back observed the provider DNS and exact DMARC value. Secret-structure/leak checks proved a nonempty 36-byte Resend credential with no trailing newline and no exact-value match in shell history, Supabase `.env`, Compose text or live Web/Core/Gateway/Auth service environments.

A STARTTLS SMTP authentication proof returned `235` and immediately `QUIT 221` with no `MAIL FROM`, `RCPT TO` or `DATA`.

Live GoTrue was deliberately not changed and still uses:

```text
GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

No invite, recovery or test e-mail was sent. No Auth/Core/Web/Gateway service was recreated. Human Send and Gateway outbound remain OFF.

## Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1 — COMPLETE

ADR 0098 closes the no-effect activation preflight and versions the exact Auth-only startup candidate.

The adversarial proof found that local Docker Compose file-backed secrets preserve host permissions and explicitly ignore secret long-syntax `uid/gid/mode`. Therefore the protected `root:wandora-ops/0640` credential is not readable directly by the image's non-root `supabase` user.

The accepted candidate does **not** weaken custody. It resets the inherited container password mapping, mounts the secret only into Auth, uses a minimal root startup shell to read it, and immediately `exec su -p` drops the final GoTrue PID 1 back to UID/GID 1000 before `/usr/local/bin/auth` runs. Disposable no-network proof verified the drop and showed no resident root parent.

A protected rollback snapshot exists at:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-preflight-v1-20260919T012450Z
```

It contains byte-identical live base/overlay copies, exactly the six prior SMTP_* values under mode 0600, hashes and Auth identity metadata. Values are operator-secret material and must never be printed.

The exact candidate was rendered with future non-secret SMTP settings and the real Resend secret did not appear. A Docker Compose dry-run proposed only:

```text
supabase-auth Recreate -> Recreated -> Starting -> Started
```

The future `.env` keeps `SMTP_PASS=` intentionally empty only to satisfy upstream interpolation; the real credential remains file-only.

Live production remains unchanged:

```text
GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

No Auth service recreation occurred and no invite, recovery or test e-mail was sent.

## Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1 — COMPLETE

ADR 0099 executes the exact ADR 0098 activation contract in production.

Pre-execution drift checks matched the frozen evidence byte-for-byte. The canonical overlay was materialized at:

```text
2d35d6ea292c0749d4edb3654cec007a6e5ffc6086d8f44516e53742abfaa280
```

A fresh protected execution snapshot was created at:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-execution-v1-20260919T013658Z
```

The live non-secret SMTP source is now:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=
SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
SMTP_SENDER_NAME=Wandora
```

The actual SMTP credential remains only in the reviewed file secret. The live render proved the real secret absent, `GOTRUE_SMTP_PASS` absent from container `Config.Env`, and only Auth mounting the secret. The dry-run again proposed only the Auth recreation.

The approved command recreated **only** `supabase-auth`. DB, Web, Core, Gateway and Paperclip container identities remained unchanged.

Live Auth is now:

```text
image              = supabase/gotrue:v2.196.0
health             = healthy
restarts           = 0
PID 1 UID          = 1000
SMTP host/port     = smtp.resend.com:587
SMTP user          = resend
sender             = Wandora <acesso@notify.wandora.com.br>
```

An SMTP dialogue from the recreated Auth namespace resolved the relay, received the normal `220` greeting, advertised `AUTH PLAIN LOGIN` and `STARTTLS`, and returned `220 Ready to start TLS`. No AUTH, MAIL FROM, RCPT TO or DATA was issued by this activation slice.

Post-activation no-effect proof:

```text
auth_users          = 1
recovery_sent       = 0
recovery_token      = 0
one_time_tokens     = 0

eligibility_rows    = 0
eligibility_enabled = 0
unfinished_hires    = 0

Customer Digital-Employee Hire = ON
Human Send                     = absent / OFF
Gateway outbound               = absent / OFF
```

Auth, DB, Web, Core, Gateway and Paperclip all remain healthy with zero restarts. No invite, recovery or test e-mail was sent and no customer/business state was created.

## Customer Owner First Real Invite Execution V1 — COMPLETE

ADR 0101 sent exactly one real Supabase Auth invite to the explicitly authorized genuine new owner target. The target address remains intentionally absent from Git.

## Customer Owner First Invite Acceptance + First Password Validation V1 — COMPLETE

ADR 0102 closes the first real owner authentication path.

Production evidence proves:

```text
Auth user confirmed           = yes
first password present        = yes
invite one-time token         = consumed / 0 rows
confirmed_at                  = 2026-09-19 02:10:52 UTC
fresh normal last_sign_in_at  = 2026-09-19 02:12:14 UTC
active Auth sessions          = 1
latest session created        = 2026-09-19 02:12:14 UTC
target Wandora identity rows  = 0
target membership rows        = 0
eligibility rows              = 0
eligibility enabled           = 0
```

The recipient explicitly signed out and logged in again with e-mail + the newly created password. Current Web code reaches `/api/v1/me` only after a successful Supabase password grant; the observed “Conta ainda não vinculada” state is the canonical `403 unlinked` result for a valid Auth identity that has no Wandora organization membership yet.

Therefore invite acceptance, first password, normal repeat login and authenticated bootstrap are proven. No tenant or eligibility effect was created.

Read-only readiness for the next slice also reconfirmed:

```text
organizations                 = 3
tenant provisioning requests  = 1
Private Tenant Provisioning V2= present
platform provisioner EXECUTE  = true
Core EXECUTE V2               = false
authenticated EXECUTE V2      = false
platform provisioner password = absent
platform provisioner connlimit= 0
eligibility rows/enabled      = 0 / 0
unfinished hires              = 0
```

## Customer Owner First Real Tenant Access Validation V1 — COMPLETE

ADR 0105 proves the first genuine owner customer session after ADR 0104.

Human-visible proof:

```text
organization = MEDICSPRO
user = Alessandro Aranha
customer surface = Trabalho
state = Nada aguardando sua atenção
```

Fresh login/API evidence:

```text
/api/v1/me                   = 200
work attention read          = 200
digital-employees/team read  = 200
conversations read           = 200
```

An earlier request from an already-open `/approvals` navigation returned a transient 503 before recovering to 200. The actual fresh `/login` bootstrap returned 200 and subsequent tenant reads remained 200.

Independent canonical reconciliation:

```text
target Auth rows                    = 1
target confirmed/signed-in          = 1 / 1
target Wandora mapping rows         = 1
MEDICSPRO active orgs               = 1
MEDICSPRO active owner memberships  = 1
MEDICSPRO employees                 = 0
MEDICSPRO control bindings          = 0
MEDICSPRO employee bindings         = 0
MEDICSPRO eligibility               = 0
unfinished hires                    = 0
```

No customer token/password was shared or extracted. No privileged JWT impersonation was used. No Paperclip/provider, eligibility, hire or outbound mutation occurred.

## Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1 — COMPLETE

ADR 0106 reuses the already-proven canary Paperclip company-bootstrap contract for the real MEDICSPRO tenant without creating provider state.

Fresh read-only evidence:

```text
main entering preflight              = 6865551b5c841234714834cc37b904d52eb13768
open PRs                             = 0
Paperclip image                      = wandora/paperclip:v2026.831.1
Paperclip source commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
Paperclip health                     = ok
deployment                           = authenticated / private
bootstrapStatus                      = ready
database backup                      = enabled / ok
Board credential isInstanceAdmin     = true
Paperclip companies                  = 2
Paperclip MEDICSPRO exact matches    = 0

MEDICSPRO active org                 = 1
MEDICSPRO digital employees          = 0
MEDICSPRO control bindings           = 0
MEDICSPRO employee bindings          = 0
MEDICSPRO hire operations            = 0
MEDICSPRO eligibility                = 0
unfinished hires total               = 0
eligibility rows/enabled             = 0 / 0
```

The exact future provider payload is:

```json
{"name":"MEDICSPRO"}
```

with SHA-256:

```text
6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b
```

The protected auth store is valid only when the CLI explicitly targets its matching private API base. A read-only call without the matching API base returned 401 before any effect; adding `--api-base http://127.0.0.1:3100` resolved the expected Board identity and exact two-company baseline. The future execution must not rely on CLI default API-base selection.

Provider create remains non-idempotent. After dispatch, timeout/reset/unreadable response/non-201/interruption are potentially effectful and must be reconciled through provider reads. No blind retry, direct SQL repair or second company is allowed.

This preflight created no Paperclip company, Organization Adapter HMAC/secret/config, Wandora provider binding, eligibility, employee or hire operation. Customer Hire remains globally ON but MEDICSPRO eligibility remains zero; Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1 — COMPLETE

ADR 0107 executed the exact ADR 0106 provider request once and stopped before any Organization Adapter wiring or customer-hire effect.

Provider result:

```text
Paperclip companies total       = 3
MEDICSPRO exact matches         = 1
MEDICSPRO provider company id   = a63f27a8-dbac-4552-a456-b3a21302226b
MEDICSPRO status                = active
Board MEDICSPRO membership      = owner / active
MEDICSPRO agents                = 0
MEDICSPRO company secrets       = 0
MEDICSPRO plugin config         = null
```

The exact payload was `{"name":"MEDICSPRO"}` and its pre-dispatch SHA-256 again matched `6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b`. The installed non-TTY CLI path was re-read before dispatch and confirmed one `POST /api/companies` with interactive auth recovery disabled.

Independent Wandora/no-effect proof:

```text
MEDICSPRO digital employees      = 0
MEDICSPRO control bindings       = 0
MEDICSPRO employee bindings      = 0
MEDICSPRO hire operations        = 0
MEDICSPRO eligibility            = 0

control bindings total           = 2
employee bindings total          = 2
hire operations total            = 2
unfinished hires total           = 0
eligibility rows/enabled         = 0 / 0
```

Future deterministic HMAC path seed:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e
```

The matching host HMAC file is absent. Auth, DB, Web, Core, Paperclip and Messaging Gateway remain healthy. Organization Adapter and global Customer Hire remain ON, but MEDICSPRO remains ineligible; Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1 — COMPLETE / EXECUTION BLOCKED

ADR 0108 revalidated the exact real-tenant wiring boundary without creating it.

```text
Wandora organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Paperclip company     = a63f27a8-dbac-4552-a456-b3a21302226b
MEDICSPRO agents      = 0
MEDICSPRO secrets     = 0
MEDICSPRO plugin cfg  = null

MEDICSPRO control bindings   = 0
MEDICSPRO employee bindings  = 0
MEDICSPRO hire operations    = 0
MEDICSPRO eligibility        = 0 / 0 enabled
```

The deterministic future Core custody target remains absent:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e

paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac
exists = false
```

Binding authority is unchanged: `supabase_admin` may INSERT the private mapping, while `wandora_core_runtime` may SELECT but not INSERT. Future execution remains operator-owned and uses one exact INSERT without UPSERT.

The Organization Adapter plugin is `wandora.organization-adapter-v1@0.1.0`, ready/healthy. `local_encrypted` is healthy and the protected ADR 0075 master-key copy still matches the live key.

The second adversarial review found the retained recovery DB is stale relative to current Paperclip state:

```text
protected recovery snapshot = paperclip-local-encrypted-20260918T090456Z
snapshot hashes             = green
snapshot master.key         = matches live
canary company in snapshot  = yes
canary live HMAC secret     = absent from snapshot
MEDICSPRO company           = absent from snapshot
```

The only newer logical backups are still inside the Paperclip Docker volume; the newest observed preflight backup (`paperclip-20260919-030454.sql.gz`) predates the MEDICSPRO company creation at 03:23:39 UTC.

Therefore the recovery mechanism remains proven, but the retained out-of-volume DB+key pair does not represent current state. Wiring execution is blocked until a fresh current-state pair is created and proven using ADRs 0074–0075.

Future wiring order remains:

```text
current-state recovery refresh
-> exact operator-owned Wandora control binding
-> one protected deterministic-path Core HMAC
-> one company-owned Paperclip local_encrypted secret
-> company-scoped secret_ref plugin config LAST
-> independent validation
```

No HMAC, Paperclip secret/config, Wandora binding, eligibility or employee was created by ADR 0108. Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1 — COMPLETE

ADR 0109 clears ADR 0108's recovery blocker.

Exactly one fresh official Paperclip manual backup was created:

```text
source backup = paperclip-20260919-034717.sql.gz
size          = 334736 bytes
trigger       = manual
started       = 2026-09-19T03:47:17.080Z
finished      = 2026-09-19T03:47:18.896Z
```

The current-state protected pair now exists at:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T034717Z/
```

with directory `0700`, files `0600`, byte-identical source/copy hashes and green gzip validation. The previous ADR 0075 snapshot remains retained and green.

The fresh backup contains the live canary HMAC secret/config state and the real MEDICSPRO company. An isolated no-network PostgreSQL 18 restore using Paperclip's own restore/decrypt code proved:

```text
RESTORE_OK                  = true
MEDICSPRO_COMPANY_PRESENT   = true
CANARY_CONFIG_PRESENT       = true
LOCAL_ENCRYPTED_DECRYPT_OK  = true
HMAC_HASH_MATCH             = true
WRONG_KEY_DECRYPT_REJECTED  = true
```

No secret plaintext was emitted. The PostgreSQL 17.6 helper was client-only; the restore server remained embedded PostgreSQL 18.

All proof-only container/image/harness state was removed.

Post-refresh MEDICSPRO remains intentionally unwired:

```text
employees                  = 0
control bindings           = 0
employee provider bindings = 0
hire operations            = 0
eligibility                = 0 / 0 enabled
HMAC file                  = absent
Paperclip agents           = 0
Paperclip company secrets  = 0
Paperclip plugin config    = null
unfinished hires total     = 0
```

Auth, DB, Web, Core, Paperclip and Messaging Gateway remain healthy with zero restarts. Human Send and Gateway outbound remain OFF.

## Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1 — COMPLETE

ADR 0110 makes the real MEDICSPRO control-plane wiring live.

```text
Wandora control binding     = exactly 1
Core deterministic HMAC    = present / 0640 / readable
Paperclip company secret    = exactly 1 active local_encrypted
Paperclip plugin config     = exact secret_ref / lastError=null
secret referenceCount       = 1
Paperclip agents            = 0

MEDICSPRO employees         = 0
employee provider bindings  = 0
hire operations             = 0
eligibility                 = 0 / 0 enabled
```

The adversarial review caught that the first generated HMAC, while strong and correctly shaped, did not literally satisfy ADR 0108's full 32-random-byte contract. Before closure and while MEDICSPRO remained ineligible/employee-free, the same Paperclip secret was rotated to a Node `crypto.randomBytes(32)` value. Provider version 1 is now `previous`; version 2 is `current`.

Hash-only proof shows the final Core HMAC, Paperclip version-2 `value_sha256` and `fingerprint_sha256` are identical:

```text
020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8
```

The single secret usage is the Organization Adapter plugin's required `hmacSecret` binding with `versionSelector=latest`. Temporary rotation/staging files were removed, the ADR 0109 recovery pair remains hash-green, all relevant runtimes remain healthy with zero restarts, and Human Send/Gateway outbound remain OFF.

## Customer Owner First Real Tenant Eligibility Rollout Preflight V1 — COMPLETE

ADR 0111 accepts MEDICSPRO as the first real `ana-commercial-v1` eligibility rollout target without enabling it.

```text
active real owner path       = 1
MEDICSPRO employees          = 0
matching legacy Ana          = 0
control binding              = 1
employee provider bindings   = 0
ana-commercial-v1 hire ops   = 0
Paperclip agents             = 0
Paperclip secret/config      = exact / healthy
Core HMAC ↔ secret hash      = match

target eligibility rows      = 0
global eligibility rows      = 0
enabled eligibility rows     = 0
```

The dedicated `wandora_customer_hire_operator` remains NOLOGIN/least-privilege and is the only role with setter execution. A production no-effect rehearsal proved `supabase_admin -> BEGIN -> EXCLUSIVE LOCK -> zero-enabled check -> SET LOCAL ROLE -> RESET ROLE -> ROLLBACK`, ending with zero rows.

No eligibility, employee, hire, provider-agent or outbound effect occurred.

## Customer Owner First Real Tenant Eligibility Rollout Execution V1 — COMPLETE

ADR 0112 executed exactly the frozen serialized operator transaction for MEDICSPRO + `ana-commercial-v1`.

```text
eligibility rows/enabled      = 1 / 1
enabled target                = MEDICSPRO + ana-commercial-v1
MEDICSPRO employees           = 0
employee provider bindings    = 0
MEDICSPRO hire operations     = 0
unfinished hires              = 0
Paperclip agents              = 0
Organization Adapter          = unchanged / ready
Human Send                    = OFF
Gateway outbound              = OFF
```

The setter ran only under `SET LOCAL ROLE wandora_customer_hire_operator` inside the ADR 0111 exclusive-lock transaction. The postcondition assertions passed before COMMIT, then an independent connection and Paperclip read proved that eligibility alone created no employee/provider/outbound effect.

## Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1 — COMPLETE

ADR 0114 revalidates the first real MEDICSPRO hire boundary after eligibility became live.

Fresh production evidence:

```text
MEDICSPRO active owner path       = 1
MEDICSPRO eligibility            = 1 enabled
MEDICSPRO control binding        = 1
MEDICSPRO employees              = 0
employee-provider bindings       = 0
MEDICSPRO hire operations        = 0
global unfinished hires          = 0
MEDICSPRO Paperclip agents       = 0
Human Send                       = OFF
Gateway outbound                 = OFF
```

The running Core image's packaged JS was inspected rather than trusting its OCI revision label alone and contains the tenant-eligibility/reconciliation contract. A no-effect call through the actual live Core read service against the live database projects MEDICSPRO as:

```json
{"itemCount":0,"hire":{"catalogKey":"ana-commercial-v1","available":true,"state":"available"}}
```

The deployed Web has no `apps/web/` delta from its source revision to current main. It persists one organization-scoped UUIDv4 idempotency key in session storage before the canonical POST, retains it on ambiguous outcome and clears it only after validated success. The customer route remains normal human session -> active owner/admin -> eligibility -> collision/binding checks -> one durable hire operation -> Paperclip reconciliation -> paused/supervised finalization.

Capability Reuse Gate passes with no new domain code: Paperclip remains the employee control-plane authority behind the existing Organization Adapter; Wandora keeps only policy, stable projection, binding and idempotency/reconciliation state.

A fresh normal owner browser session is deliberately an execution-time pre-dispatch gate. No bearer token was extracted or manufactured during preflight.

## Customer Owner First Real Tenant Digital-Employee Hire Execution V1 — COMPLETE

ADR 0115 records the first genuine MEDICSPRO owner hire through the normal customer browser contract.

```text
MEDICSPRO Ana                       = exactly 1
status / autonomy                   = paused / supervised
employee-provider bindings          = exactly 1
ana-commercial-v1 hire operations   = exactly 1 / completed
global unfinished hires             = 0
MEDICSPRO Paperclip agents          = exactly 1 / paused
Paperclip adapter                   = wandora_mastra
hire projection                     = already-hired

outbound attempts                   = 0
outbound messages                   = 0
Human Send                          = OFF
Gateway outbound                    = OFF
```

The normal owner clicked `Contratar Ana` once. The durable hire journal retained the original idempotency key and no retry was required. Independent provider reconciliation confirmed the managed Paperclip Ana is paused, has zero budget, no heartbeat and the explicit provider pause reason requiring separate activation.

## Customer Owner First Real Tenant Digital-Employee Activation Preflight V1 — COMPLETE / NO-GO

ADR 0116 revalidated the first real MEDICSPRO activation boundary without any resume or outbound effect.

Fresh evidence is split cleanly:

```text
exact Wandora <-> Paperclip MEDICSPRO/Ana mapping = GREEN
Paperclip Ana                                      = paused / org-chain healthy
Paperclip adapterType                              = wandora_mastra

wandora_mastra registered in live Paperclip        = NO / exact adapter read returns 404
live Organization Adapter agents.resume capability= NO
customer activation Core route                     = absent
customer activation Web action                     = absent

Human Send                                         = OFF
Gateway outbound                                   = OFF
```

The pinned Paperclip SDK does provide company-scoped `ctx.agents.resume(agentId, companyId)`, guarded by the `agents.resume` plugin capability, and the provider resume transition converges `paused -> idle`. The installed Wandora plugin remains intentionally narrower with only `agents.managed`, `webhooks.receive` and `secrets.read-ref`.

Therefore `adapterType=wandora_mastra` is not treated as runtime readiness, the Board credential is not accepted as a customer-activation shortcut, and Wandora must never project `active` before an exact provider resume/readback succeeds.

The future path remains provider-first and keeps Human Send/Gateway outbound independent. No new Wandora lifecycle/control-plane model is approved; only minimum external-effect safety state may be proposed later if serialized reconciliation cannot prove replay/concurrency safety.

## Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1 — COMPLETE / MERGED

ADR 0117 promotes the ADR 0037 laboratory bridge into production-shaped repository contracts without activating production.

Canonical merged boundary (`main` = `7bc8c4790e37b0410703bf58979458200810d5a9`):

```text
Paperclip external adapter package = @wandora/paperclip-adapter-mastra@0.1.0
adapter type                       = wandora_mastra
supportsLocalAgentJwt              = true
private Core route                 = POST /internal/v1/paperclip/execution
Core runtime gate                  = disabled by default
migration source                   = 20260919_014_paperclip_execution_binding_resolver_v1.sql
production migration               = NOT applied
production adapter install         = NOT performed
```

The adapter uses a dedicated file-backed HMAC and forwards the Paperclip run token only in a secret header. Core independently calls private Paperclip `/api/agents/me` using that run-scoped token and requires exact agent/company plus `wandora.organization-adapter-v1 / ana-commercial-v1` managed identity before resolving Wandora state.

Core then requires the exact Wandora employee-provider binding and `status=active / autonomy=supervised` before calling the existing Agent Runtime/Mastra boundary. A paused employee therefore cannot execute merely because the adapter artifact exists or is later installed.

No new Paperclip-like task/control-plane domain is created. The only new DB capability is a least-privilege active organization resolver executable by `wandora_core_runtime`.

The current deterministic runtime makes duplicate execution of the same run non-effectful at this stage. This is not a general idempotency claim for future model/tool/external effects; those require a newer durable effect/reconciliation contract before activation.

PR #166 was squash-merged only after all seven workflows on head `0d6ee0ba593e69e74cae851e127bf146b36f38f1` were green. Post-merge production proof confirms migration 014 is still absent, the live Paperclip adapter store has zero `wandora_mastra` records, MEDICSPRO Ana remains exactly one `paused + supervised` employee with one provider binding and one completed hire operation, and the Core bridge/Human Send/Gateway outbound enable flags remain absent/OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1 — COMPLETE / NO-GO

ADR 0118 completed the requested no-effect production preflight.

Fresh production evidence remains:

```text
main entering preflight = 2d4adc5c81ce6ce36554fd9e3fa399656dd7d612

migration 014 resolver      = ABSENT
wandora_mastra live adapter = ABSENT / 404
Core execution bridge       = OFF
Organization Adapter        = ready
agents.resume               = absent

MEDICSPRO Ana / Wandora     = exactly 1 / paused + supervised
MEDICSPRO provider binding  = exactly 1
MEDICSPRO hire              = exactly 1 / completed
MEDICSPRO Ana / Paperclip   = exactly 1 / paused / no heartbeat

Human Send                  = OFF
Gateway outbound            = OFF
MEDICSPRO outbound attempts = 0
```

Exact artifacts are frozen:

```text
adapter artifact id = 10580337991
adapter ZIP sha256  = bd523953c42b2e8be23311c70c55be01c9248248e2e38358761e8c7d29a2414f
adapter tgz sha256  = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f

Core artifact id    = 10580881710
Core ZIP sha256     = 0387b4bf0f08f2c518b6249bf9515a37a080ffd4b36403d547902f5410ca1c05
Core archive sha256 = b4acc5bac69743493865a69fa51757d32d2ab5bc738d9b277fccd62c3e3a7287
Core source tree    = fb69ab98faa7cf116fadb9b17974cf0f65224dd9
```

The candidate source tree equals the canonical bridge-code squash-merge tree. Current `main` differs only by later documentation, so no rebuild is justified by commit-SHA difference alone.

The preflight blocks live execution on three missing production-readiness contracts:

1. Paperclip lacks a canonical/live bridge runtime overlay for the dedicated HMAC mount and Core bridge URL;
2. Core `/readyz` does not yet prove the migration-014 resolver when the bridge flag is enabled;
3. there is no single disposable integrated attestation using an actual pinned Paperclip run-scoped token through Paperclip -> Core -> Agent Runtime/Mastra.

The exact future migration/HMAC/Core/Paperclip/adapter order and rollback rules are frozen in ADR 0118. The verified adapter must be installed from a restart-stable extracted directory under persistent `/paperclip`, never from `/tmp` or a CI workspace.

## Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1 — COMPLETE

ADR 0119 closes the three repository-readiness gaps from ADR 0118 without activating production.

```text
Paperclip runtime custody overlay             = implemented / CI-validated
Core bridge-aware resolver readiness          = implemented / fail-closed
disposable pinned Paperclip -> Core -> Mastra = GREEN

pinned Paperclip = 65ec059bde30d98c92165b24a30a540800dd1f6f
run status       = succeeded
execution id     = canonical exec_sha256 shape
migration 014    = NOT applied
```

The disposable proof uses Paperclip's native managed-agent service for synthetic Ana identity and a proof-only resolver shim; it does not install/re-run the live Organization Adapter.

Production remains dormant by contract: no live bridge secret, no live adapter install, no Core/Paperclip bridge promotion/recreation, no `agents.resume`, no Ana activation/resume, Human Send OFF and Gateway outbound OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2 — COMPLETE / GO

ADR 0120 revalidates the merged ADR 0119 implementation against canonical Git, final CI artifacts and the actual dormant production runtime.

```text
main entering preflight = cb52b601d440b5abb9412005fc6503c7b8065adc
open PRs               = 0

migration 014          = ABSENT
live bridge HMAC       = ABSENT
Core bridge            = OFF
Paperclip bridge       = ABSENT live
wandora_mastra store   = []
agents.resume           = absent

MEDICSPRO Ana / Wandora   = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip = exactly 1 / paused
Ana wakeups / runs         = 0 / 0
Human Send                 = OFF
Gateway outbound           = OFF
outbound attempts          = 0
```

The final PR #169 adapter artifact ZIP is `ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952`; the contained tgz remains exactly `0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f`.

The final bridge-aware Core candidate is frozen as archive `b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d`, OCI config `1a4f06bc...`, OCI manifest `1fd3f3d7...`, source tree `abacb9da0949a63210080a01bdd95b087e98d02e`. The PR merge-ref, PR head and canonical `main@cb52b601...` all share that exact source tree.

Live Core/Paperclip base Compose files remain byte-identical to Git. The bridge overlays exist only in Git. HMAC custody remains viable with `0640 root:wandora-ops`: Core already receives the `wandora-ops` GID and Paperclip runs as root.

The V2 decision is GO only for a separately executed bridge-foundation activation transaction. It does not authorize `agents.resume`, Ana activation/resume, Human Send or Gateway outbound. If the short-lived Actions artifacts expire or cannot be retrieved, provenance must be re-established before any production effect.

## Paperclip -> Wandora/Mastra Activation Execution pre-mutation recovery + host hygiene gate — COMPLETE

ADR 0121 amends ADR 0120 after post-merge evidence showed two execution-preparation risks: the newest Paperclip recovery snapshot predates the current MEDICSPRO Ana, and stale disposable/proof containers consume material RAM while one host-network proof owns `127.0.0.1:3100`.

ADR 0120's GO remains valid, but Activation Execution V1 must begin with:

```text
Gate A: reconcile + clean proven disposable high-cost containers, preserve proof volumes, free localhost:3100, re-check headroom
Gate B: fresh current Paperclip DB + master.key snapshot, disposable restore/decrypt/state proof
Gate C: exact PR #169 artifact availability/provenance
then: Wandora DB backup/rehearsal -> migration 014 -> HMAC -> Core -> Paperclip -> adapter -> STOP
```

No bridge mutation, employee resume or outbound effect is authorized until these gates pass.
## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 — COMPLETE

ADRs 0122–0125 record the completed production bridge activation and its two corrective stops.

After migration 014 became live in ADR 0122:

- ADR 0123 created the dedicated bridge HMAC, promoted Core/Paperclip bridge runtime and installed `wandora_mastra` exactly once, then stopped when Paperclip's `gosu node` privilege drop could not read the root-custodied secret;
- ADR 0124 corrected the secret wrapper after the first wrapper promotion failed closed with `Cmd=null`;
- ADR 0125 validated the final live bridge foundation.

Current validated state:

```text
migration 014                                  = LIVE / verified
dedicated bridge HMAC                          = present / root:wandora-ops / 0640
Core bridge                                    = LIVE / healthy / ready
Paperclip bridge                               = LIVE / healthy
Paperclip tmpfs bridge secret                  = 0400 / 1000:1000 / host hash match
wandora_mastra                                 = exactly 1 / loaded
adapter test-environment                       = PASS

Ana / Wandora                                  = exactly 1 / paused + supervised
Ana / Paperclip                                = exactly 1 / paused / wandora_mastra
Ana wakeups / heartbeat runs                   = 0 / 0
agents.resume                                  = absent
Human Send                                     = OFF
Gateway outbound                               = OFF
MEDICSPRO outbound attempts                    = 0
```

Continuity rules:

- **do not repeat migration 014;**
- **do not reinstall `wandora_mastra`;**
- the live bridge foundation is not authorization to run Ana;
- provider resume / `agents.resume`, Wandora `paused -> active`, Human Send and Gateway outbound remain separate future effects.

## Paperclip + Mastra Capability Canonicalization / Authority Collision Audit — ADR 0126

The canonical capability maps are:

- `docs/PAPERCLIP_CAPABILITY_MAP.md`;
- `docs/MASTRA_CAPABILITY_MAP.md`;
- `docs/CAPABILITY_COLLISION_MATRIX.md`.

Key authority split:

```text
Paperclip = durable organizational control plane
            company/agent lifecycle
            tasks/runs/routines
            organizational skills
            control-plane decisions/review
            decision training
            task watchdog/liveness
            Paperclip-controlled connections/grants/secrets

Wandora  = product semantics/stable IDs/tenancy
            authorization/policy/projections
            adapter mappings/reconciliation
            external-effect authorization
            compliance/effect audit
            billing/retention/privacy

Mastra   = execution runtime
            workflows/tools
            execution-local goals/task lists/signals
            runtime skills
            memory/observability/evals when separately adopted
            workspaces/sandbox/token-context guardrails
```

Resolved collisions:

- durable business recurrence -> **Paperclip Routine**, not a parallel Wandora scheduler or Mastra schedule;
- durable organizational work -> **Paperclip task/issue**, not Mastra task lists/goals;
- organizational skill catalog/policy -> **Paperclip**; runtime materialization -> **Mastra**;
- control-plane decision/review -> **Paperclip**; customer commitment/external effect -> **Wandora**;
- Decision Training -> **Paperclip decision evidence**; Evals -> **Mastra execution-quality evidence**;
- Connections/grants -> **Paperclip is the leading specialist candidate**; Mastra `@mastra/connect` is not adopted as a competing authority.

## Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof — GREEN

ADRs 0127–0128 record the production-derived disposable compatibility proof.

Production remains:

```text
Paperclip image  = wandora/paperclip:v2026.831.1
Paperclip source = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

Qualified candidate:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

Final proof:

```text
schema-faithful live/proof canonical SHA
= 379673af39dc3d8d0dfcbd7bf5c751bde96ef6fae6bb88079c13e956959f8356

live == proof schema                     = true
migrations 0231..0279                    = PASS
MEDICSPRO + owner                        = preserved
Ana                                      = preserved / paused / wandora_mastra
agents.resume                            = absent
Ana wakeups / heartbeat runs             = 0 / 0
Organization Adapter                     = ready
local_encrypted decrypt/hash/wrong-key    = PASS / PASS / PASS
wandora_mastra copied existing package    = load PASS
official adapter test-environment         = HTTP 200 / PASS
real run-scoped JWT /api/agents/me        = 200
tampered run token                        = 401
mapped Core -> Mastra run                 = succeeded
Mastra model                              = mastra-deterministic
unknown managed mapping                   = fail-closed / Mastra not invoked
bad HMAC                                  = 401
v831 rollback lab                         = PASS before cleanup
final proof cleanup                       = complete
production drift                          = none
```

Important backup-fidelity finding:

- the normal Paperclip logical backup preserves logical data/recovery state but does **not** serialize PostgreSQL CHECK constraints;
- it remains required together with the matching `master.key`;
- upgrade rehearsal and exact rollback additionally require a fresh PostgreSQL 18.1 schema-faithful `pg_dump -Fc`.

Upgrade state:

```text
disposable compatibility = GREEN
production upgrade        = NOT EXECUTED
next authorization level  = Production Upgrade Preflight V1 only
```

## Mastra version/adoption checkpoint

Production Core remains:

```text
@mastra/core          = 1.66.0
@mastra/memory        = NOT_FOUND
@mastra/observability = NOT_FOUND
@mastra/evals         = NOT_FOUND
```

Upstream `@mastra/core@1.67.0` is not required by the Paperclip upgrade proof and must not be bundled into that change.

Memory, Observability, Evals, workspaces/sandbox and richer runtime skills remain separately reviewed adoption slices. `MASTRA_TELEMETRY_DISABLED=true` remains the current live default.

## Paperclip v2026.916.0 Production Upgrade Preflight — GREEN / STOP before mutation

ADR 0129 freezes the real production rollback and execution contract without upgrading Paperclip.

Candidate remains exactly:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

Fresh protected recovery set:

```text
/home/wandora-admin/backups/
paperclip-v916-production-upgrade-preflight-v1-20260920T004119Z/

official backup =
paperclip-20260920-003950.sql.gz
SHA-256 =
b279ddd16aa67c76c33a47c1de649760c2d2061e6e37f22294209049471867d0

schema-faithful PostgreSQL 18.1 pg_dump -Fc SHA-256 =
6e830685e30969a34826f37b212bf25eae19395b632845f40b4142e28567fbbd

fresh dump restore/schema equality =
8f60a06a73283d9d774cff4ef5f5c9fb5131b025b2d8db752d9bcbcce3c5c612
= GREEN
```

The copied `master.key` is byte-identical to live. The protected Compose base, bridge overlay/wrapper, `adapter-plugins.json`, current `wandora_mastra` package and current Organization Adapter package are byte-identical to live.

Exact v831 image availability is frozen with:

```text
wandora/paperclip:rollback-v2026.831.1-pre-v916-20260920T004119Z
-> sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
```

The current `wandora_mastra@0.1.0` runtime bytes remain v916-qualified by ADR 0128. Its `compatibility.json` still pins v831.1 and is now explicitly classified as stale provenance metadata. Before a re-attested package is promoted, emit a new immutable compatibility-only artifact (recommended `0.1.1`) with the v916 image/commit while keeping `index.mjs` byte-identical and `adapterType=wandora_mastra`.

Production remains:

```text
Paperclip                = v2026.831.1 / healthy / restart 0
migration ledger         = 229 / max 229
Ana / Wandora            = exactly 1 / paused + supervised
Ana / Paperclip          = exactly 1 / paused / wandora_mastra
Organization Adapter     = exactly 1 / ready
agents.resume            = absent
Ana wakeups / runs       = 0 / 0
Human Send               = OFF
Gateway outbound         = OFF
MEDICSPRO outbound       = 0
production upgrade       = NOT EXECUTED
```

Irreversibility rule:

> once the first v916 migration from `0231..0279` commits, image-only rollback is forbidden; rollback requires the protected schema-faithful pre-upgrade database restore plus matching `master.key` and exact frozen v831 runtime/extensions.

The exact future sequence and rollback decision tree are frozen in:

`docs/operations/paperclip-v2026-916-0-production-upgrade-execution-v1.md`.

## Paperclip v2026.916.0 Production Upgrade Execution V1 — COMPLETE / LIVE

ADR 0130 records the production execution from `main@fa666370184d31d031d5b554153786a8b708b777`.

The already-green ADR 0128 disposable proof and ADR 0129 preflight were reused rather than repeated. Immediately before mutation, the protected rollback set was revalidated and proved fresh: a PostgreSQL 18.1 restore of the protected `pg_dump -Fc` matched live across deterministic fingerprints of all 358 public base tables, and schema matched after normalizing only pg_dump's random restrict token.

Production now is:

```text
Paperclip image        = wandora/paperclip:v2026.916.0
Paperclip image ID     = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
Paperclip source       = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
Paperclip health       = healthy / API status ok
Paperclip restarts     = 0

migration ledger       = 278 / max 278
new ledger entries     = 49
startup migration set  = 0231..0279 / applied

Organization Adapter   = exactly 1 / ready / v0.1.0
wandora_mastra         = exactly 1 / v0.1.0 / testEnvironment pass

MEDICSPRO Ana/Wandora  = exactly 1 / paused + supervised
MEDICSPRO Ana/Paperclip= exactly 1 / paused
MEDICSPRO wakeups/runs = 0 / 0
agents.resume          = absent
Human Send             = OFF
Gateway outbound       = OFF
MEDICSPRO outbound     = 0
```

Post-upgrade validation additionally proved:

- company/memberships and Organization Adapter config/bindings survived;
- the `local_encrypted` path resolves successfully without exposing plaintext: a deliberately invalid signed webhook reached `invalid_wandora_signature`, which the fixed plugin order can reach only after secret resolution and before managed reconcile;
- the existing **Wandora Internal Supervised Proof** identity was exercised through Paperclip's normal `heartbeatService.wakeup()` path, so Paperclip minted the run-scoped JWT internally and Core validated it through `/api/agents/me` before mapping/execution;
- the initial bounded on-demand proof run plus one timer heartbeat that fired during the short synthetic idle window both completed `succeeded`; during later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` path ran once more and `3d316b82-eaa2-4ceb-a89e-f25e9263fec6` also completed `succeeded`; final cleanup returned the proof agent to `paused`, kept the proof issue `cancelled`, and left zero pending proof runs/wakeups;
- a syntactically valid forged JWT with a false signature returned 401, while the successful proof traversed `wandora_mastra -> Core -> deterministic Mastra`; the proof tenant outbound-attempt count remained unchanged;
- unknown Paperclip company mapping was revalidated live through the Core runtime service and returned `company-unmapped` / `UNKNOWN_MAPPING_FAIL_CLOSED=true`;
- no compatibility-only `wandora_mastra` repack was promoted;
- no Mastra upgrade or Organization Adapter behavior change occurred.

The protected ADR 0129 recovery set and exact v831 rollback image remain retained. Because v916 migrations are now committed, image-only rollback is forbidden; any return to v831 requires the protected schema-faithful database restore plus matching `master.key` and frozen v831 runtime/extensions.

## NEXT EXECUTABLE SLICE

Next: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**.

Reconcile ADR 0116's earlier activation assumptions against the now-live Paperclip v2026.916.0 control plane and the canonical Paperclip/Mastra capability maps. Determine which safety capabilities are actual prerequisites before employee activation instead of adopting every new provider feature by default.

This next slice must begin from REAL NOW and finish with MEDICSPRO Ana still paused unless a later separately reviewed activation execution explicitly authorizes resume. Human Send and Gateway outbound remain separate effect gates.

## Operational safety

- Git is source of truth; Portainer is not.
- Merged migration != live migration.
- Canonical package != installed plugin.
- Provider consoles stay operator-only.
- Secrets/tokens never enter Git, business DB payloads or logs.
- External effects fail conservatively; uncertain effects are never blindly retried.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain separate explicitly reviewed effects.
- A proof/candidate/archive being staged or loaded does not mean its runtime is active.
- After timeout/chat/tool loss, reconcile state before retrying any effect.

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety/state persisted, the decision survived adversarial review, execution was independently validated, and any production effect remains bounded by a separately reviewed activation step.

## Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1

ADR 0131 reconciles ADR 0116 against the live Paperclip v2026.916.0 runtime.

Read-only reconciliation proved:

```text
main                         = 1c1c3c88aa4ef50d56a66d8a1948b96464b49ee3 at slice start
Paperclip                    = v2026.916.0 / dffc2b3... / healthy / restart 0
migration ledger             = 278 / max 278
MEDICSPRO Ana / Wandora      = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip    = exactly 1 / paused / wandora_mastra
MEDICSPRO wakeups/runs       = 0 / 0
completed hire               = exactly 1
unfinished hires             = 0
control + employee binding   = present / exact
agents.resume                = absent
Human Send                   = OFF
Gateway outbound             = OFF
MEDICSPRO outbound attempts  = 0
```

v916 resolves the old execution-adapter/bridge blocker from ADR 0116 but does not replace the Wandora activation boundary. Native Paperclip `agents.resume` remains a distinct capability from `agents.managed`; resume converges the provider lifecycle to `idle` and does not request a wakeup. Existing managed-agent reconciliation does not force an already resumed agent back to paused.

The remaining blockers before first real activation are deliberately narrow:

1. add a company-scoped, signed Organization Adapter activation action for the fixed managed Ana and grant only the necessary `agents.resume` capability; it must never expose arbitrary provider agent IDs or call `agents.invoke`;
2. add the Wandora owner/admin Core activation contract that revalidates the exact employee/hire/bindings, calls the adapter, reconciles Paperclip, and only then changes the Wandora projection `paused -> active`;
3. expose customer-safe activation availability/action in the Web/read model;
4. prove timeout/concurrency/already-idle/fail-closed paths in candidate/disposable tests without resuming MEDICSPRO Ana.

ADR 0131 deliberately does **not** approve a second lifecycle engine or a new activation journal. Paperclip resume is convergent and exact provider readback can recover an ambiguous response; a new durable journal requires separate evidence.

Status mapping is now explicit:

```text
Paperclip paused = lifecycle stopped
Paperclip idle   = resumed and waiting, not running
Wandora active   = product-eligible for authorized work
supervised       = still governed by Wandora policy/effect boundaries
```

Human Send and Gateway outbound remain independent Wandora-owned effect gates and are not activation prerequisites.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1**

Implement and qualify the minimum adapter/Core/Web contract above. Do not resume MEDICSPRO Ana, do not create a real wakeup/run, do not grant `agents.invoke`, and keep Human Send/Gateway outbound OFF.



## Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1 — MERGED / PRODUCTION STILL DORMANT

ADR 0132 records the completed implementation slice.

Canonical Git:

```text
PR #182 head = c6d9e2d00431f475e6226b430c73af07bbd8d960
PR #182      = merged
main         = 60527c39ddd962367674c82db16156caa201fa35
CI           = 7/7 GREEN
```

The repository now contains the narrow Organization Adapter v0.2.0 activation candidate, owner/admin Core activation route, customer-safe Team/Web projection and candidate migration 015 least-privilege activation finalizer.

The implementation intentionally preserves the authority split:

```text
activation intent
-> Wandora owner/admin + exact mappings
-> company-scoped Organization Adapter
-> Paperclip managed.get
-> Paperclip agents.resume only if paused
-> Paperclip managed.get == idle
-> Wandora paused -> active projection through migration-015 helper

NO agents.invoke
NO task/wakeup/heartbeat/run
NO Mastra call during activation
NO Human Send/Gateway outbound enablement
```

Mastra remains the already-qualified execution dependency used only later when Paperclip has an authorized concrete run through `wandora_mastra -> Core -> Agent Runtime -> Mastra`.

Fresh post-merge production readback remains:

```text
Paperclip                    = v2026.916.0 / healthy
Core/Web/Gateway             = healthy
MEDICSPRO Ana / Wandora      = exactly 1 / paused + supervised
control + employee binding   = 1 / 1
completed hire               = 1 / ana-commercial-v1
MEDICSPRO outbound attempts  = 0
migration 015 functions      = 0 / absent live
activation runtime flag      = absent / OFF
Human Send                   = OFF
Gateway outbound             = OFF
```

**Merged does not mean live:** migration 015 is unapplied, Organization Adapter v0.2.0 is not promoted by this checkpoint, live resume authority is not changed by this checkpoint, and Ana is not activated.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT.**

It must reconcile fresh runtime state, rehearse migration 015 + rollback on disposable restore, pin exact v0.2/Core/Web artifacts and rollback assets, prove zero pending MEDICSPRO wakeup/run/timer-heartbeat risk, revalidate outbound OFF, freeze the future execution order, and stop without applying/deploying/resuming anything.
## ADR 0133 — First real employee Production Activation Preflight V1 GREEN (2026-09-20)

The no-effect production activation preflight for MEDICSPRO Ana is complete and GREEN.

Proven immediately before and after the disposable rehearsal:

- migration 015 remains absent live;
- Organization Adapter live remains v0.1.0 without `agents.resume`;
- activation runtime gate, Human Send and Gateway outbound remain OFF;
- MEDICSPRO has exactly one Ana `paused + supervised`, one control binding, one employee binding and one completed hire;
- Paperclip Ana remains `paused`, with zero wakeups, zero heartbeat runs and zero open routine runs;
- MEDICSPRO outbound attempts remain zero;
- Mastra/Agent Runtime remains the existing reusable execution dependency and is not called by activation.

Migration 015 + canonical verifier passed against a live-derived disposable restore, including idempotent replay and an independent pristine rollback restore. Exact Core, Web and Organization Adapter v0.2.0 artifact digests/provenance and current rollback anchors are frozen in ADR 0133.

The activation path is proven to use only `agents.resume` as new Paperclip authority and not `agents.invoke`, tasks, wakeups, heartbeats, runs, routines or Mastra. The existing execution bridge continues fail-closed for `Paperclip idle + Wandora paused`.

The next executable slice is **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**. It is separately effectful and must not begin without a fresh REAL NOW and second adversarial review.


## Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1 — COMPLETE / GREEN

ADR 0135 records the completed first real MEDICSPRO employee activation.

Final live state:

```text
MEDICSPRO organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Wandora Ana = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
Wandora state = active + supervised

Paperclip company = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana = da6cfc6b-e16f-483a-95f1-bacee8e54365
Paperclip state = idle / wandora_mastra
```

Activation foundation:

```text
migration 015 = LIVE / canonical verifier GREEN
Organization Adapter = wandora.organization-adapter-v1@0.2.0 / ready
Core = wandora/core:organization-adapter-candidate-8d2a53e3c264
Web = wandora/web:candidate-eda946c36ec4
Paperclip = wandora/paperclip:v2026.916.0
Human Digital-Employee Activation = ON
Human Send = OFF
Gateway outbound = OFF
```

The Web Auth artifact defect discovered before activation was corrected by PR #185 / ADR 0134. The replacement Web candidate is login-capable and retains the reviewed activation bridge.

Post-effect proof:

```text
Ana count = 1
control bindings = 1
employee bindings = 1
completed exact-catalog hire = 1
unfinished hires = 0
outbound attempts = 0

Paperclip wakeups = 0
heartbeat runs = 0
open routine runs = 0
total routine runs = 0
task sessions = 0
runtime last_run_id = null
runtime tokens/cost = 0
MEDICSPRO run_identity_contexts = 0
```

The owner activation crossed the intended lifecycle point exactly once through the normal authenticated Web contract. Activation did not invoke Mastra and did not create a run. Mastra remains a lazy execution dependency for later legitimate work.

Do not create synthetic work, wakeups, heartbeats, Mastra runs or outbound effects merely to demonstrate that Ana is active. Any first real post-activation work is a separate reviewed slice.

## Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Preflight V1 — COMPLETE / REAL EXECUTION BLOCKED

ADR 0136 records the first no-effect preflight after the real MEDICSPRO Ana activation.

Fresh read-only reconciliation proved:

```text
main at slice start          = 1f13f10dc8782a459d01c7c514189e1368650831
MEDICSPRO Ana / Wandora      = exactly 1 / active + supervised
MEDICSPRO Ana / Paperclip    = exactly 1 / idle / wandora_mastra
assigned Paperclip issues    = 0
wakeup requests              = 0
heartbeat runs               = 0
routine runs                 = 0
task sessions                = 0
run identity contexts        = 0
runtime last_run_id          = null
runtime tokens / cost        = 0 / 0
MEDICSPRO outbound attempts  = 0
Human Send                   = OFF
Gateway outbound             = OFF
critical runtime             = healthy
```

No synthetic work was created.

The authoritative first-work source is now frozen conceptually as:

```text
authenticated MEDICSPRO owner
-> Wandora customer work-admission contract
-> company-scoped Organization Adapter
-> Paperclip durable issue assigned to Ana
-> Paperclip assignment wakeup/run
-> run-scoped Paperclip identity
-> wandora_mastra
-> Wandora Core execution bridge
-> Agent Runtime
-> Mastra
-> supervised internal result
-> customer-safe Wandora projection
-> STOP before external effect
```

Paperclip v2026.916.0 remains authority for durable organizational work. Exact source inspection proved that the normal assigned-issue path is the provider-native work trigger. The Plugin SDK exposes `issues.read`, `issues.create` and `issues.wakeup` separately; generic plugin issue creation does not itself dispatch the run. The live Organization Adapter v0.2.0 intentionally lacks those issue capabilities.

The current Wandora customer surface also lacks a customer-safe Paperclip work-create contract and result projection. Existing `wandora.work_items` / `work_proposals` remain the messaging-supervision vertical slice and are **not** precedent for a parallel general task engine.

The minimum remaining gaps are:

1. authenticated owner/admin work admission for an exact active + supervised employee;
2. narrow Organization Adapter issue read/create/wakeup capability;
3. minimum Wandora-owned idempotency/reconciliation state for the distinct issue-create and wake provider effects;
4. customer-safe projection of Paperclip work/result for supervision.

First real work execution is therefore **NO-GO** until those gaps are implemented and separately promoted. Human Send and Gateway outbound stay OFF; any eventual first run must stop after an internal, reviewable result.

### NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1 — NO REAL WORK**

Implement and qualify only the minimum customer-safe Wandora/Core + Organization Adapter contract above, preferably against disposable/candidate Paperclip. Do not create MEDICSPRO real work, wakeups or runs during implementation, and do not enable Human Send or Gateway outbound.
