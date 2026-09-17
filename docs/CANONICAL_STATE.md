# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**

Preflight Git baseline:

```text
main = 2e88ed7f8b004bfe5b4d4f8c216e082cc0934ad2
```

Canonical application source embedded in the staged Organization Adapter Core candidate:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

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

Provider consoles remain protected operator/engineering surfaces. Customers use Wandora-owned surfaces and contracts.

Before new domain state, apply ADR 0036 Capability Authority / Reuse Gate. Do not recreate Paperclip agent lifecycle, hierarchy, tasks or assignment control plane merely because a local Wandora table would be convenient.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

**REAL:** login/session, explicit multi-organization selection, Team read, Work, Conversations, Canonical Confirmation V2 and the controlled supervised WhatsApp loop.

**PARTIAL / PLACEHOLDER:** dashboard/company/approval/start actions, including real employee hiring/activation.

No current Organization Adapter activation introduces a customer `Contratar` / `Ativar funcionário` route.

Human Send and Gateway outbound remain OFF unless separately reviewed and deliberately activated.

## Organization Adapter — accepted architecture

ADRs 0037–0041 establish the accepted V1 boundary:

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

### Minimum Wandora-private state — MERGED, NOT LIVE

Migration 010:

```text
infra/stacks/supabase/migrations/
  20260916_010_organization_adapter_state_v1.sql
```

owns only minimum integration safety state:

1. organization → provider company binding;
2. digital employee → opaque provider-managed agent binding;
3. hire operation journal for idempotency, request hash, recovery and audit.

### Service contract boundary — MERGED, NOT LIVE

Migration 011:

```text
infra/stacks/supabase/migrations/
  20260916_011_organization_adapter_service_contract_v1.sql
```

adds the reviewed internal catalog-hire service/runtime boundary with owner/admin authorization, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage to customer contracts.

Neither migration is applied to production at this checkpoint.

## Secret custody — MERGED, NOT LIVE

ADR 0041 selects mounted-file custody, not per-company HMAC environment variables and not database-held secret material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute custody directory. Raw company refs never become filesystem paths. The reader uses `O_NOFOLLOW` and rejects missing, empty, oversized or weak material.

No production Organization Adapter HMAC exists at this checkpoint.

## Composed proof / rehearsal — PROVEN, NON-PRODUCTION

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

ADR 0043 / PR #88 added candidate-only Core wiring. The base live Core remains Organization Adapter OFF. The candidate overlay requires database mode, exact private Paperclip webhook, read-only HMAC custody and migration-011 readiness. It adds no customer/browser/Platform Admin hiring route.

## Core candidate provenance — PROVEN, NOT RUNNING

ADRs 0044–0048 establish the build, staging and portable OCI provenance contract.

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

Private host staging:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Current staged image:

```text
candidate tag   = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate VPS Id= sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
state           = STAGED + LOADED, NOT RUNNING
running count   = 0
```

The historical combined load-validation shell exited non-zero **after** Docker had already loaded the candidate because an expected zero-match `grep` was treated as an error under `pipefail`. State was reconciled before retry and `docker load` was **not** repeated.

## Production Activation Preflight V1 — ADR 0049

ADR 0049 closes the preflight but **does not authorize production activation**.

### Already-proven recovery evidence — do not repeat blindly

Pre-adapter PostgreSQL backup:

```text
/home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
mode   = 0600
```

Disposable restore proof already returned:

```text
RESTORE_TABLES=17
RESTORE_COUNTS_MATCH=YES
POSTGRES_WANDORA_RESTORE_PROOF_OK
```

Live preactivation verifier already returned:

```text
ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK
core_image=wandora/core:team-read-b31db507
paperclip_image=wandora/paperclip:v2026.831.1
paperclip_host_binding=3100/tcp -> 127.0.0.1:3100
migration_010_tables=ABSENT
organization_adapter=OFF
human_send=OFF
gateway_outbound=OFF
custody=ABSENT
```

### Current live state at preflight

```text
wandora-core      = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy/private
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Human Send        = OFF
Gateway outbound  = OFF
```

Production DB remains pre-adapter:

```text
wandora_private.control_plane_provider_bindings       = ABSENT
wandora_private.digital_employee_provider_bindings    = ABSENT
wandora_private.digital_employee_hire_operations      = ABSENT
```

Production Paperclip managed-plugin installation/configuration for `wandora.organization-adapter-v1` is absent.

### Exact future migration order

If a later activation is separately authorized, the database order is fixed:

1. apply `20260916_010_organization_adapter_state_v1.sql`;
2. run `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop on any failure;
4. apply `20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop on any failure;
7. only then continue to separately reviewed plugin/HMAC/Core activation.

Do not apply migration 010 merely because it is inert. Do not widen migration-011 runtime capability while the exact production plugin artifact is missing.

## CURRENT BLOCKER — production Paperclip plugin artifact gap

The accepted managed-plugin proof exists only under:

```text
spikes/paperclip-organization-adapter-managed-plugin-v1/
```

Its README explicitly states that it is **not a production plugin package and must not be installed into live Paperclip as-is**.

The current repository has no canonical production-installable/versioned Organization Adapter plugin package outside `spikes/`.

Therefore:

```text
Production Activation Preflight = BLOCKED
Production Activation           = NOT AUTHORIZED
```

Installing raw spike source into live Paperclip is rejected because it bypasses the promotion/provenance boundary already required for the Core candidate.

## Residual unrelated secret / cleanup gap

A residual file exists from an aborted/future dedicated Paperclip database experiment:

```text
/opt/wandora/stacks/paperclip-db/secrets/postgres_password
```

It is not referenced by live Paperclip and is **not** an Organization Adapter HMAC. Do not reuse it as HMAC material and do not delete it merely as part of activation/context recovery. Cleanup is a separate reviewed operational concern.

A prior public-exposure Paperclip probe was also reverted; live Paperclip is back on the accepted private topology. Do not repeat that probe as an installation shortcut.

## What remains explicitly NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip Organization Adapter plugin install/config;
- production per-company HMAC generation/mounting;
- running Organization Adapter candidate Core;
- live Core Organization Adapter enablement;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Human Send or Gateway outbound activation as part of Organization Adapter work;
- `control.wandora.com.br` or `runtime.wandora.com.br` DNS/ingress activation.

## SECOND ADVERSARIAL REVIEW AFTER ADR 0049

Rejected shortcuts:

- install the disposable spike directly in live Paperclip;
- apply migration 010 early because it is inert;
- apply 010/011 before the production plugin artifact exists;
- generate orphan production HMACs before there is an approved installable consumer;
- reuse the residual future `paperclip-db` PostgreSQL password as HMAC material;
- repeat backup, restore proof, live preactivation verifier or `docker load` merely because a prior chat froze;
- mix historical candidate/lab cleanup into activation.

The preflight did its job by stopping before an unreviewed artifact promotion.

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Managed Plugin Production Artifact V1** — non-production only.

Required outcome:

1. choose a canonical production package location outside `spikes/`;
2. preserve ADR 0039 manifest-declared catalog-only managed-agent semantics;
3. create an installable, versioned Paperclip plugin package with the exact required manifest/worker contract;
4. pin compatibility to the accepted Paperclip source/image contract;
5. add build/typecheck/test/package verification for that plugin shape;
6. produce reproducible provenance/hashes for the package;
7. prove no real secret, provider-company identifier, API key, run JWT or production credential is embedded;
8. keep production Paperclip install/config OFF;
9. perform a second adversarial review before merge;
10. after merge, return to a fresh Production Activation Preflight before any live effect.

## Operator UI / native consoles

The normal operator contract is Wandora Platform Admin at `admin.wandora.com.br`, not provider-branded hostnames.

`control.wandora.com.br` and `runtime.wandora.com.br` remain reserved provider-neutral engineering bridges and require their own protected ingress review before activation.

## Operational safety

- Git is source of truth; Portainer is not.
- Merged migration != live migration.
- Provider consoles stay operator-only.
- Secrets/tokens never enter Git, business DB payloads or logs.
- External effects fail conservatively; uncertain effects are never blindly retried.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain OFF unless explicitly activated after review.
- A proof/candidate/archive being staged or loaded does not mean its runtime is active.
- A missing production artifact is a blocker, not permission to promote laboratory code by shortcut.

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review, execution was independently validated, and any production effect remains bounded by a separately reviewed activation step.
