[Reading 428 lines from start (total: 428 lines, 0 remaining)]

# ADR 0199 — Customer Company Profile + First Access Onboarding Production Promotion Preflight V1

Status: **READY FOR SEPARATE PRODUCTION PROMOTION EXECUTION / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0198 implemented the Wandora-owned canonical organization profile and invite-only first-access onboarding behind an OFF-by-default Core feature flag.

This preflight qualifies migration 019, Core/Web artifacts, activation order, rollback and the future invite-only smoke. It does not apply migration 019, promote/recreate a live service, enable onboarding, create an Auth identity/organization/profile, call a model or enable outbound.

ADR 0168 remains binding:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW

The handoff checkpoint was reconciled rather than assumed.

The ADR 0198 executable merge is:

```text
implementation main = 608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
PR #257 = MERGED
PR #257 reviewed head = 5ffe209bb222056a7382204076991ef674ace798
PR #257 head checks = 7/7 GREEN
implementation-main push checks = 6/6 GREEN
```

A later documentation-only checkpoint was also reconciled and merged:

```text
PR #258 = MERGED
checkpoint main before the overlay correction = 8f3c3e263577768cb60ddb1535b07fb1e027cd76
open PRs after #258 = 0
checkpoint-main applicable push checks = 4/4 GREEN
```

During this preflight two real promotion gaps were found. First, the reviewed onboarding flag existed in Core code, but the canonical Compose overlay that activates it was absent from `main`. Second, the BrasilAPI adapter and Web lookup calls existed, but the CEP/CNPJ lookup routes were not wired into the Core Human API runtime, so enrichment would have failed soft forever instead of reaching the adapter.

The gap was corrected code/config-only through PR #259:

```text
overlay = infra/stacks/core/compose.customer-company-onboarding.yaml
effect = WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED=true
Core CI = renders/asserts the overlay with database + Human API
post-correction main = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
```

No production service was touched by that correction.

Post-merge push workflows on `main@0a7f368331882f6dcfe4ff1fe722be6e442354a5` are **6/6 GREEN**:

- Core CI;
- Core Candidate Artifact;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI;
- Paperclip Mastra Adapter CI.

## Live production boundary

Read-only runtime reconciliation proved:

```text
Web = wandora/web:candidate-aaada76d9806 / healthy
Core = wandora/core:organization-adapter-candidate-d8349b353bb7 / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
Supabase DB/Auth/Storage = healthy

wandora.organization_profiles = ABSENT
complete_customer_company_onboarding_v1(...) = ABSENT
update_organization_profile_v1(...) = ABSENT
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = ABSENT
Gateway outbound enable flag = ABSENT

Core runtime = mastra-supervised-model
customer-work gate = ON
```

The already-canonical readback immediately before this preflight also records:

```text
MEDICSPRO customer works = 2
MEDICSPRO outbound attempts = 0
MEDICSPRO digital employees = 1
```

No attempt was made to mutate customer state merely to re-prove those counts.

## Capability Authority / Reuse Gate

No new subsystem is justified.

- **semantic authority:** Wandora owns customer organization identity, owner membership semantics and canonical company profile;
- **durable product state:** `wandora.organizations`, users/identities/memberships and `wandora.organization_profiles`;
- **operational authority:** Supabase Auth supplies the verified human identity/session; Core authorizes and executes the Wandora-owned profile contract;
- **provider implementation:** Supabase PostgreSQL stores the profile; BrasilAPI is optional lookup/enrichment only;
- **replacement boundary:** Paperclip, Mastra and messaging providers are not involved in generic company onboarding.

The preflight creates no CRM, lifecycle engine, retrieval/RAG, embedding/vector system, memory store, context assembler, workflow engine or provider state.

## Migration 019 qualification

Canonical files:

```text
infra/stacks/supabase/migrations/20260923_019_customer_company_profile_onboarding_v1.sql
sha256 = 3799f98bcedb090b386bfc162a6a82741b4785f0d217ef5a1083182e50cf9d29

infra/stacks/supabase/verifiers/VERIFY_20260923_CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1.sql
sha256 = 3ff67a96ea21343e1c3e7f583c92b15ba20fd13cef073e7aac72d0873b1770d1
```

Deep review confirms:

1. **1:1 profile:** `organization_id` is the profile primary key and FK to `wandora.organizations(id)`.
2. **No organization duplication / no CRM:** migration adds only the legal/contact/address profile and supporting enum/functions/audit actions.
3. **RLS/grants:** browser roles and service_role have no direct profile-table access; Core gets tenant-scoped SELECT; mutation functions are executable only by `wandora_core_runtime`.
4. **Owner/admin boundary:** profile updates require an active owner/admin membership in the active organization and the Core tenant scope must match.
5. **Retry/idempotency:** onboarding takes a transaction advisory lock on provider subject. An exact retry reconciles to the existing user/org/profile; a changed retry fails closed as already-linked.
6. **PF/PJ:** PF persists 11 normalized CPF digits; PJ persists legacy or alphanumeric CNPJ shape.
7. **CPF/CNPJ validation authority:** deterministic check-digit validation stays in Core/Web. The SQL boundary intentionally rechecks normalized shape, not external registry validity.
8. **CEP:** Core/Web require deterministic local eight-digit normalization/validation; SQL persists exactly eight digits.
9. **No employee/provider state:** the onboarding transaction inserts only Wandora user, Supabase identity mapping, organization, owner membership, profile and audit evidence.
10. **No Paperclip/Mastra/work/outbound:** no such state is referenced or created by the onboarding service/migration.
11. **Transactionality:** migration itself is transaction-wrapped and onboarding is a single database function call; failed onboarding does not intentionally leave a partial company bootstrap.

The existing ADR 0198 production-derived rehearsal remains valid because these exact migration/verifier bytes are unchanged. It already proved:

```text
CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1_OK
PROFILE_019_FINAL_RESTORE_VERIFY_OK
```

The verifier itself is rollback-wrapped and proves owner membership, no digital employee creation, alphanumeric CNPJ persistence, identical retry reconciliation, changed-retry rejection and owner profile update.

A second migration rehearsal was therefore rejected as redundant in this preflight.

## Core feature boundary

Core code proves:

- onboarding is OFF when the flag is absent;
- the flag is invalid in standby mode;
- the flag requires Human API;
- the company-profile service is instantiated only when the flag is explicitly enabled;
- with the flag enabled, readiness probes the profile table and both database functions;
- absent/inaccessible migration boundary yields fail-closed readiness:
  `customer-company-onboarding-database-boundary-unavailable`.

The newly canonical activation overlay is:

```yaml
services:
  core:
    environment:
      WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED: "true"
```

Its local Compose proof passed with database + Human API:

```text
CUSTOMER_COMPANY_ONBOARDING_COMPOSE_V1_OK
```

## Exact reviewed Core artifact

The first correct artifact was taken from the **push of the exact ADR 0198 implementation main**, not from the PR merge-ref.

```text
source_sha = 608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
source_tree_sha = ca9880619811d5cf8d5d8274ccb3e13fc6a6f333
workflow run = 35821355342
artifact id = 10733421489
artifact name = core-organization-adapter-candidate-608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
GitHub/ZIP sha256 = 6b28cf52fba9033fe745732d2c36411e77bc402562ceb4297c2d9f2f52da4df7
expires = 2026-09-30
image_tag = wandora/core:organization-adapter-candidate-608bedd9d4ee
oci_config_digest = sha256:39da6b6265d530b30aa22caab4127b28c02f3379719294a3c691187d89bc9396
oci_manifest_digest = sha256:429c13f09c8835df41e592b37356ca667c5f1a7c4091c3d09dd799839eb27524
archive_sha256 = becb87095264ee7f7ca166cbcc89f3d72d6b0226ccca733b094defc0b7d6ca85
```

Host-authenticated transfer verified the GitHub digest, internal `SHA256SUMS` and manifest.

The PR-head artifact whose `source_sha` was the synthetic GitHub PR merge-ref `60741e4b...` was explicitly **not** accepted as the canonical promotion artifact even though its tree was compatible. This enforces the artifact runbook rather than weakening it.

After PR #259, the future execution must use the exact post-correction-main Core artifact recorded as:

```text
post-correction Core artifact:
workflow run = 35825001919
artifact id = 10734743245
artifact name = core-organization-adapter-candidate-0a7f368331882f6dcfe4ff1fe722be6e442354a5
GitHub/ZIP sha256 = 875ff17010e5974a15bc18e82cd9d949d54b77ddd67fcd2e62ba3f9efafaf8bd
source_sha = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
source_tree_sha = 356531d0c3a17b99770464dd0fa41cfb8505b882
image_tag = wandora/core:organization-adapter-candidate-0a7f36833188
oci_config_digest = sha256:58a9a0ec2aabff3761b765a4751467522bd9dbb01d36f24c53d47c0ed1566303
oci_manifest_digest = sha256:bdd65e24ef6997db9129342a242ea333b894ca127f19e5a3051db748bf7dd8eb
archive_sha256 = c449cc68de6bd6a0058e5979f6e489fd05878a1996af8cee7b1556739e87a630
```

That post-correction artifact includes the canonical activation overlay and the authenticated CEP/CNPJ runtime wiring discovered during this preflight. It is therefore the only Core artifact qualified for the future promotion.

## Exact reviewed Web artifact

From the same implementation `main@608bedd9...` push:

```text
source_sha = 608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
source_tree_sha = ca9880619811d5cf8d5d8274ccb3e13fc6a6f333
workflow run = 35821355301
artifact id = 10733661058
artifact name = web-candidate-608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
GitHub/ZIP sha256 = 4db2b18c22d555201c08b7db872f9bc1083bcd3f9cf69a3a2cfc19738f720edf
image_tag = wandora/web:candidate-608bedd9d4ee
image_id = sha256:f29f2439a27e79ada1cbf237fdfdb91d2bf2806e4097d35d01c4f3c7e1e6bfb0
archive_sha256 = 7fa8ae96bd37b851e5618414a23a914e9624d9cae3faadca14e257caf715191a
```

The initial ADR 0198 Web artifact is historical evidence only after PR #259, because the Nginx lookup allowlist was hardened during this preflight.

The exact post-correction Web artifact qualified for future promotion is:

```text
workflow run = 35825001967
artifact id = 10735126200
artifact name = web-candidate-0a7f368331882f6dcfe4ff1fe722be6e442354a5
GitHub/ZIP sha256 = 4efe33331ac8343856127980322ec357c6a73ae3ed58cf1a0f53dfda91a82d4e
source_sha = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
source_tree_sha = 356531d0c3a17b99770464dd0fa41cfb8505b882
image_tag = wandora/web:candidate-0a7f36833188
image_id = sha256:af428c5142ceb06ed4ce42c4f44be8c57c76a1d899386703ac819a5ccb5aed14
archive_sha256 = 1de8652b189a552957f26b5e23b197e12f6f4ea19f0eb746f057c721f7c44e80
```

Host-authenticated transfer verified its GitHub digest, internal `SHA256SUMS` and manifest.

The Web bridge explicitly exposes only:

- onboarding create;
- CEP lookup;
- CNPJ lookup;
- organization profile;
- previously reviewed customer routes.

Authorization is forwarded, browser cookies are stripped, and the generic `/api/` path remains fail-closed 404.

The customer surface proves:

- `unlinked → CompanyOnboardingPage`;
- authenticated account e-mail is prefetched and read-only;
- client CPF/CNPJ/CEP validators mirror the Core algorithms;
- CNPJ accepts the Receita alphanumeric base + numeric check digits;
- Company profile is displayed separately from organization grounding;
- ordinary Company summary masks tax ID;
- no employee/integration/outbound capability is presented as an automatic onboarding effect.

## BrasilAPI boundary

The provider adapter remains optional enrichment only:

```text
CEP lookup timeout = 3s
CNPJ lookup timeout = 3s
404 = found:false
network / timeout / rate-limit / non-success / invalid body = provider-unavailable
```

Local CPF/CNPJ/CEP validation happens before/independently of provider lookup.

The activation decision does **not** depend on BrasilAPI accepting alphanumeric CNPJ. A locally valid identifier remains manually submit-able when lookup is unavailable or does not know the identifier.

## Promotion order — adversarial review

Initial hypothesis:

```text
backup/readiness
→ migration 019
→ Core candidate flag OFF
→ Web candidate
→ public/auth validation
→ explicit onboarding flag ON
→ invite-only smoke
```

This order is accepted with two clarifications.

### Why flag-last is safer

A new Web with Core flag OFF is fail-closed:

- the onboarding UI may exist for an authenticated `unlinked` identity;
- mutation/lookup/profile services are not instantiated until the Core flag is ON;
- no invite-only smoke identity is introduced before activation;
- linked existing customers continue to use existing contracts.

Enabling Core before Web would expose a backend capability before the full reviewed customer bridge is live. Therefore flag-last is preferable.

### Frozen future execution order

```text
1. reconcile exact main/runtime and stop on drift
2. capture fresh protected pre-019 pg_dump -Fc of wandora + wandora_private
3. hash + isolated restore-readiness check
4. apply migration 019 exactly once
5. run canonical migration 019 verifier/postverify
6. load/promote exact qualified Core candidate with onboarding flag still OFF
7. prove healthz/readyz and existing customer contracts
8. load/promote exact qualified Web candidate
9. prove /healthz, /login, linked customer pages, /api/v1/me unauthorized=401
10. prove onboarding/profile paths fail closed while flag is still OFF
11. explicitly add compose.customer-company-onboarding.yaml and recreate only Core
12. prove Core readyz=200 with migration boundary + Human API
13. prove unauthenticated onboarding/profile access is rejected
14. perform exactly one invite-only smoke in a separately authorized slice
15. STOP
```

No Paperclip, Mastra, Messaging Gateway or outbound switch belongs in this sequence.

## Rollback

### Before first customer onboarding

The operational rollback is forward-compatible and non-destructive:

```text
flag OFF/remove onboarding overlay
→ recreate only Core on the previous live Core image if needed
→ restore previous Web image
→ keep additive migration 019 dormant
```

Migration 019 does not modify existing customer rows. Keeping its additive table/type/functions dormant is safer than inventing a destructive down-migration.

If exact pre-019 schema restoration is required, restore the fresh protected pre-migration `pg_dump -Fc` into the reviewed recovery path. Do not attempt ad-hoc enum-label deletion.

Frozen image rollback selectors entering this preflight:

```text
Core rollback = wandora/core:organization-adapter-candidate-d8349b353bb7
Web rollback = wandora/web:candidate-aaada76d9806
```

### Partially initiated onboarding

The onboarding database operation is transactional. A failed function call must not be repaired with manual inserts; reconcile the authenticated identity and retry only the identical request.

A successful smoke creates legitimate durable Wandora product state. Image/flag rollback does not silently delete it.

Therefore the future smoke must record exact Auth subject, Wandora user ID, organization ID, membership and profile ID/organization key. Any later cleanup is a separate explicit operator action after proving the smoke organization owns no employee, provider binding, eligibility, work, connection/tool or outbound state.

## Future invite-only smoke contract

The first production smoke is intentionally not executed by this preflight.

```text
legitimate invited e-mail
→ Supabase authentication
→ /api/v1/me = unlinked
→ CompanyOnboardingPage
→ verified e-mail prefilled/read-only
→ local PF/PJ + CPF/CNPJ + CEP validation
→ optional fail-soft CEP/CNPJ enrichment
→ profile submit with idempotency key
→ exactly one Wandora user
→ exactly one organization
→ exactly one active owner membership
→ exactly one organization profile
→ /api/v1/me returns the organization
→ customer panel / Empresa reads the masked profile
```

Negative proof after the smoke must show no new:

```text
digital employee
Paperclip company/agent/binding
Mastra run/workflow
customer work
outbound attempt/message
connection/tool
eligibility
```

No recovery interruption should be manufactured during this first smoke. Existing recovery remains contingency-only.

## Second adversarial review

Rejected:

1. accepting the PR merge-ref artifact merely because its tree looked equivalent;
2. enabling the Core flag before migration readiness;
3. enabling Core before the new Web customer bridge;
4. activating through an ad-hoc VPS environment edit;
5. rerunning the already-valid migration rehearsal without evidence of changed bytes;
6. making BrasilAPI a validity gate;
7. rejecting alphanumeric CNPJ because an external provider may lag the Receita format;
8. adding a CRM/profile provider or Paperclip/Mastra state to generic first access;
9. destructive schema downgrade as the first rollback response;
10. deleting a successfully-created smoke organization implicitly during app rollback.

Accepted:

- exact-main artifact provenance;
- canonical minimal activation overlay under Git;
- flag-last activation;
- additive dormant schema as normal application rollback;
- fresh pre-mutation backup for exact database restoration;
- explicit smoke-state reconciliation/cleanup contract.

## Decision

**READY.**

Customer Company Profile + First Access Onboarding is qualified for a **separate** future Production Promotion Execution V1, subject to the exact post-correction artifact identifiers frozen in this ADR and a fresh execution-time state reconciliation.

This ADR authorizes no production effect.

Next slice after this preflight is:

**Customer Company Profile + First Access Onboarding Production Promotion Execution V1**.

[executed on device: wandora-vps-01 (d266af26-d31e-4f0c-9840-ca03bb02b603)]