# ADR 0067 — Private Tenant Provisioning V2 Production Migration Preflight V1

- Status: **Accepted preflight — migration 012 not applied to production**
- Date: 2026-09-18
- Scope: prove the exact live pre-012 state, current rollback evidence and production-shaped migration behavior before any live schema change

## REAL NOW

Canonical Git entering this preflight:

```text
main = fe945214b5aec824d133c9fc05b0314f2a841ab0
PR #111 = merged
open PRs = 0
```

PR #111 completed Private Tenant Provisioning V2 in code/CI. Its six pull-request workflows were green, including Core CI #279. The dedicated provisioning V2 step applied migrations 001→012 on disposable PostgreSQL, reapplied 012, and proved V2 behavior plus V1 regression compatibility.

Live runtime was revalidated before this preflight:

```text
Core      = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de, healthy

Organization Adapter           = ON
Customer Digital-Employee Hire = OFF / flag absent
Human Send                     = OFF / flag absent
Gateway outbound               = OFF / flag absent
```

Live database state before migration 012:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary slug         = absent

provision_beta_organization_v1    = present
provision_beta_organization_v2    = absent
provisioning_version column       = absent
tenant_provisioning.employee_id   = NOT NULL

wandora_platform_provisioner:
  LOGIN            = true
  CONNECTION LIMIT = 0
  BYPASSRLS        = false
  password         = absent
  EXECUTE V1       = true
  direct ledger SELECT = false
```

This proves migration 012 was not accidentally applied during the preceding implementation/CI work.

## PROVEN BACKUP / RESTORE EVIDENCE

The previously available PostgreSQL backup predated the current Organization Adapter internal canary and was therefore rejected as the canonical rollback basis for migration 012.

A fresh live database snapshot was created without changing application rows:

```text
backup = /home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
format = pg_dump custom
size   = 395851 bytes
sha256 = d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

The first restore attempt failed before a valid restore because a fresh PostgreSQL cluster did not contain the cluster-level role `wandora_core_runtime`, which `pg_dump` does not include. Production was untouched and the dump checksum remained valid.

A second role-preparation attempt failed before restore because of shell quoting in the disposable harness. It also changed no production state and did not justify regenerating the dump.

The corrected restore proof reused the exact same backup and SHA, pre-created only the structural roles required by restored policy definitions, and completed successfully in disposable `supabase/postgres:17.6.1.136`:

```text
RESTORE_ORGANIZATIONS=2
RESTORE_DIGITAL_EMPLOYEES=3
RESTORE_CONTROL_BINDINGS=1
RESTORE_EMPLOYEE_BINDINGS=1
RESTORE_COMPLETED_HIRES=1
RESTORE_PROVISIONING_REQUESTS=0
RESTORE_V1_PRESENT=true
RESTORE_V2_ABSENT=true
PRIVATE_TENANT_PROVISIONING_V2_BACKUP_RESTORE_PROOF_OK
```

The failed attempts are retained here because restore prerequisites are part of the operational contract: database dumps do not replace cluster-role reconstruction.

## EXACT MIGRATION ARTIFACT

Canonical migration:

```text
infra/stacks/supabase/migrations/20260918_012_private_tenant_provisioning_v2.sql
Git blob = f9b6eedaf56b967ce9b30fd9a0558fb4c4cd34e7
```

Canonical live-safe verifier:

```text
infra/stacks/supabase/verifiers/VERIFY_20260918_PRIVATE_TENANT_PROVISIONING_V2_LIVE.sql
Git blob = 46bb6b585e84c375595dacffbcb205fb8eb4c99e
```

The migration artifact staged for rehearsal was verified byte-for-byte using its Git blob hash before execution.

## PRODUCTION-SHAPED REHEARSAL

The exact canonical migration 012 was applied only to a disposable restore of the current production snapshot. It was then applied a second time to prove idempotent reapplication.

Observed after 012:

```text
AFTER012_ORGS=2
AFTER012_EMPLOYEES=3
AFTER012_REQUESTS=0
AFTER012_V2_PRESENT=true
AFTER012_VERSION_COLUMN=true
AFTER012_EMPLOYEE_NULLABLE=true
AFTER012_PLATFORM_EXEC=true
AFTER012_CORE_EXEC=false
AFTER012_AUTH_EXEC=false
```

Therefore migration 012 changes only the intended private provisioning boundary on the current live shape. It does not create a tenant, employee, provider binding or request row.

## REVERSIBILITY PROOF

Because current production has zero `tenant_provisioning_requests`, the migration-only phase has a lossless reverse path before any V2 request is executed.

The disposable rehearsal reversed 012 by:

1. dropping `provision_beta_organization_v2(...)`;
2. dropping the version/row-shape constraint;
3. restoring `employee_id NOT NULL`;
4. dropping `provisioning_version`.

Observed after reverse:

```text
ROLLBACK_ORGS=2
ROLLBACK_EMPLOYEES=3
ROLLBACK_REQUESTS=0
ROLLBACK_V2_ABSENT=true
ROLLBACK_VERSION_COLUMN_ABSENT=true
ROLLBACK_EMPLOYEE_NOT_NULL=true
PRIVATE_TENANT_PROVISIONING_V2_MIGRATION_REHEARSAL_AND_ROLLBACK_OK
```

This reverse path is valid only while no V2 provisioning row exists. Once V2 creates a row with `employee_id IS NULL`, rollback must instead use the full backup/restore or a separately designed forward-compatible migration. The future canary tenant is therefore explicitly excluded from the migration-application slice.

## SECOND ADVERSARIAL REVIEW

Rejected:

- using the older pre-Organization-Adapter backup as migration-012 rollback evidence;
- regenerating a new dump after a disposable restore harness failure when the original dump and SHA were still valid;
- treating a database dump as sufficient without proving cluster-role prerequisites for restore;
- applying migration 012 to production merely because PR #111 CI was green;
- coupling migration application with creation of the future customer-hire canary;
- enabling the runtime-wide customer-hire flag during schema migration;
- deploying PR #109 Core/Web as part of migration 012;
- creating a Paperclip company, HMAC custody or provider binding during this migration slice;
- enabling Human Send or Gateway outbound;
- treating the reversible migration-only window as valid after V2 rows exist.

## DECISION

The migration-012 production preflight is complete.

The live database is proven to be exactly pre-012, the current snapshot has a verified restore path, the exact migration applies idempotently to a restored current-state database, V1 business rows remain unchanged, V2 privileges fail closed to Core/authenticated, and a lossless migration-only reverse path is proven while the provisioning ledger remains empty.

No production schema mutation occurred during this preflight.

## NEXT EXECUTABLE SLICE

**Private Tenant Provisioning V2 — Production Migration Execution V1.**

Exact execution boundary:

1. reverify live counts, effect flags and that V2 is still absent;
2. verify the existing pre-provisioning-v2 backup SHA;
3. stage the exact migration 012 and verifier artifacts from current canonical `main`, verifying their Git blob hashes;
4. apply migration 012 as the reviewed database owner/administrator;
5. immediately run the exact live-safe V2 verifier;
6. prove organizations/employees/provider bindings/hire operations remain unchanged and provisioning requests remain zero;
7. prove Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF;
8. stop on any failure and use the proven migration-only reverse path if the transaction committed but validation fails;
9. do **not** create the canary tenant, Paperclip company, provider binding or hire in the same slice.

After successful migration application and documentation, the next separately reviewed slice may provision the single employee-free `Wandora Customer Hire Canary` organization.