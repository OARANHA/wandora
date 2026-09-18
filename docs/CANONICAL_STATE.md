# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**

Canonical Git base before this canary-completion checkpoint:

```text
main = 58b792529e8fa7fa9e4b556459f45952b607ee43
PR #103 = merged
```

ADR 0059 now records the completed internal canary, including the private-hostname correction, successful same-key recovery and the bounded post-canary runtime state. Mutable Git/runtime state must still be reverified before execution.

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

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

**REAL:** login/session, explicit multi-organization selection, Team read, Work, Conversations, Canonical Confirmation V2 and the controlled supervised WhatsApp loop.

**PARTIAL / PLACEHOLDER:** dashboard/company/approval/start actions, including real employee hiring/activation.

No current Organization Adapter work introduces a customer `Contratar` / `Ativar funcionário` route.

Human Send and Gateway outbound remain separate effect capabilities and are not activated by the Organization Adapter artifact work.

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

## NEXT EXECUTABLE SLICE

Next: **Customer Hire Canary — Private Candidate Core Hire Preflight V1.**

Observation/plan-first only. Freeze the exact reviewed Core image/source, private production-connected composition, real authorized human-session request path, stable idempotency key, paused-first expectations, replay/no-duplicate proofs, response non-leakage, ambiguity handling and complete candidate cleanup.

Do not execute the hire, expose the candidate publicly, enable the normal live Core customer-hire gate, activate Ana, Human Send or Gateway outbound during that preflight.

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

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review, execution was independently validated, and any production effect remains bounded by a separately reviewed activation step.
