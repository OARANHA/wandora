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
- second/customer Paperclip provider-company provisioning and live cross-company gate.

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

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Live Cross-Company Isolation Preflight V1** — observation/plan-first.

1. fresh REAL NOW against current `main`, live Core, Paperclip and effect switches;
2. re-read ADRs 0039/0040/0057/0059/0060 and the accepted disposable A-secret -> B-target denial proof;
3. determine the minimum live topology required to satisfy the remaining cross-company isolation gate;
4. do **not** create `Empresa Exemplo` in Paperclip merely to begin the preflight;
5. freeze the exact second-company/bootstrap/config/custody sequence only if the live gate truly requires it;
6. perform a second adversarial review of whether the disposable proof plus current host scoping already satisfies part of the requirement;
7. execute no customer-facing `Contratar/Ativar`, Human Send or Gateway outbound effect during the preflight.

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
