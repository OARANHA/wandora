# ADR 0200 — Customer Company Profile + First Access Onboarding Production Promotion Execution V1 — Partial Checkpoint

Status: **PARTIAL / PRODUCTION FOUNDATION PROMOTED / ONBOARDING FLAG OFF**
Date: 2026-09-23

## Context

ADR 0199 qualified migration 019, exact Core/Web artifacts, activation order, rollback and an invite-only smoke.

This execution slice was authorized to perform the production promotion. It followed the frozen order until the final invite-only smoke gate exposed one missing operational prerequisite: production currently has no unlinked Auth identity and the repository defines no canonical smoke e-mail alias.

The slice therefore stops fail-closed with the onboarding feature flag OFF. Migration 019 and the exact qualified Core/Web candidates remain promoted and healthy.

ADR 0168 remains binding: provider portability is contract decoupling, not implementation duplication. No Paperclip, Mastra, Messaging Gateway or outbound capability was internalized or activated by this slice.

## REAL NOW

Execution started from:

```text
main = fcb78992f0fbaf19da59b3a74d47f835c3a4ff63
open PRs = 0
ADR 0199 = READY
```

Exact qualified artifacts:

```text
Core artifact id = 10734743245
Core image = wandora/core:organization-adapter-candidate-0a7f36833188
Core source = 0a7f368331882f6dcfe4ff1fe722be6e442354a5

Web artifact id = 10735126200
Web image = wandora/web:candidate-0a7f36833188
Web source = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
```

## Backup / recovery gate

A fresh protected pre-019 custom-format backup was captured before the first successful migration effect:

```text
execution root = /home/wandora-admin/executions/company-onboarding-production-execution-v1-20260923T062528Z
backup = backup/pre019-wandora-wandora_private.dump
sha256 = ed9bc76f4cb84e7d85e655c909a8b599e696d054919dd6153ea08445175b92f4
catalog entries = 432
```

The host does not have `pg_restore` installed. The same backup was therefore validated inside a disposable `supabase/postgres:17.6.1.136` container. The first isolated restore attempt exposed the expected missing application role `wandora_core_runtime`; after creating that empty NOLOGIN role in the disposable container only, the restore succeeded and proved:

```text
wandora.organizations = present
wandora.organization_profiles = absent
RESTORE_READINESS_OK
```

No production role or schema was altered for that rehearsal.

## Migration 019

A first live attempt used PostgreSQL role `postgres` and failed on the first `ALTER TYPE wandora.audit_action` because that enum is owned by `supabase_admin`.

The migration file is internally transactional. Post-failure proof showed:

```text
wandora.organization_profiles = ABSENT
organization-profile-created enum label = ABSENT
organization-profile-updated enum label = ABSENT
audit_action owner = supabase_admin
```

Repository history confirms the canonical production migration boundary is a protected local `supabase_admin` session.

The exact unmodified migration was then applied as `supabase_admin` with `ON_ERROR_STOP=1` and committed successfully.

Canonical bytes:

```text
migration sha256 = 3799f98bcedb090b386bfc162a6a82741b4785f0d217ef5a1083182e50cf9d29
verifier sha256 = 3ff67a96ea21343e1c3e7f583c92b15ba20fd13cef073e7aac72d0873b1770d1
```

The rollback-wrapped verifier returned:

```text
CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1_OK
```

Production now has `wandora.organization_profiles` and `wandora_private.complete_customer_company_onboarding_v1(...)`.

## Core promotion

The exact Core artifact was loaded and promoted with the onboarding flag still OFF.

Result:

```text
image = wandora/core:organization-adapter-candidate-0a7f36833188
health = healthy
restart = 0
/healthz = 200
/readyz = 200
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT
```

The existing production Compose overlay set was preserved.

## Web promotion

The exact Web artifact was loaded and the persisted selector in `/opt/wandora/stacks/web/.env` was changed from:

```text
wandora/web:candidate-aaada76d9806
```

to:

```text
wandora/web:candidate-0a7f36833188
```

A backup of the prior Web env selector exists under the execution root.

Result:

```text
image = wandora/web:candidate-0a7f36833188
health = healthy
restart = 0
/login = 200
/api/v1/me without session = 401
```

With the onboarding flag OFF, onboarding/CEP/CNPJ bridge paths failed closed as 404.

## Flag activation rehearsal in production

The canonical overlay:

```text
/opt/wandora/stacks/core/compose.customer-company-onboarding.yaml
sha256 = 5d5a57d8801095575f3d7c984dfc42626b80651a0c7e915a3aa458e28b3b294b
```

was copied byte-identically from the reviewed repository and used to recreate only Core.

With the flag ON:

```text
Core image = wandora/core:organization-adapter-candidate-0a7f36833188
health = healthy
restart = 0
readyz = 200
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = true
CEP lookup without session = 401
CNPJ lookup without session = 401
profile read without session = 401
```

A malformed onboarding POST returned 400 before service authentication. Code review confirms a syntactically valid onboarding request is passed to `companyProfileService.completeOnboarding`, where the verified human session is required. A direct valid mutation probe without authentication was not executed because the tool safety layer blocked that operation before it reached production.

## Smoke blocker

Production currently has:

```text
organization_profiles = 0
unlinked Auth users = 0
```

No repository/runbook defines a canonical real smoke e-mail alias.

ADR 0199 requires a legitimate invite-only first-access smoke and rejects manufacturing an identity merely to advance rollout. Therefore no synthetic Auth user, direct `auth.users` mutation, fake e-mail or provider bypass was introduced.

Because the mandatory smoke cannot yet be performed, the onboarding flag was removed again and only Core was recreated.

Final fail-closed state:

```text
migration 019 = APPLIED
Core = wandora/core:organization-adapter-candidate-0a7f36833188 / healthy / restart 0
Web = wandora/web:candidate-0a7f36833188 / healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0 / unchanged
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / unchanged
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT
organization_profiles = 0
unlinked Auth users = 0
```

## Outbound reconciliation

A global count showed four historical `wandora_private.outbound_attempts`. This initially appeared to conflict with an older tenant-specific checkpoint.

Metadata-only reconciliation proved all four rows were created on 2026-09-16 and belong to:

```text
Wandora Internal Supervised Proof
```

They predate this execution by seven days and are unrelated to onboarding. No outbound attempt was created by this slice.

## Decision

**PARTIAL, FAIL-CLOSED.**

The production foundation is promoted and ready:

- migration 019 live and verified;
- exact Core candidate live;
- exact Web candidate live;
- rollback snapshot captured;
- feature activation itself proved ready;
- no onboarding profile or synthetic identity created.

The final activation + first invite-only smoke remains blocked only by the absence of a legitimate unlinked invited e-mail identity.

Do not repeat migration 019 or Core/Web promotion in the continuation slice.

Next slice:

**Customer Company Profile + First Access Onboarding — Invite-Only Smoke + Final Flag Activation V1**

Required input before that smoke: one legitimate e-mail address authorized to receive the production invite.
