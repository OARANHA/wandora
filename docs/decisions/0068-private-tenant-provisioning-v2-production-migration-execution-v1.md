# ADR 0068 — Private Tenant Provisioning V2 Production Migration Execution V1

- Status: **Accepted and live**
- Date: 2026-09-18
- Scope: apply and verify migration 012 in production without creating any tenant, provider company, employee hire or outbound effect

## REAL NOW

Canonical Git entering execution:

```text
main = 8715179f37c8d324441e06b5663cae81a082967d
PR #112 = merged
open PRs = 0
```

ADR 0067 had already proven:

- current production backup/restore;
- exact migration 012 rehearsal on a restore of current production;
- idempotent second application;
- V1 compatibility;
- least-privilege V2 execution;
- a lossless migration-only reverse path while provisioning requests remain zero.

No production schema mutation had occurred during the preflight.

## FINAL PRE-EXECUTION RECHECK

Immediately before applying migration 012, production still matched the preflight assumptions:

```text
organizations              = 2
digital_employees          = 3
control bindings           = 1
employee bindings          = 1
completed catalog hires    = 1
tenant provisioning requests = 0
customer-hire canary slug  = absent

V2 function                = absent
provisioning_version column= absent
employee_id                = NOT NULL

wandora_platform_provisioner password = absent

Organization Adapter       = ON
Customer Digital-Employee Hire = OFF / flag absent
Human Send                 = OFF / flag absent
Gateway outbound           = OFF / flag absent
```

The rollback backup checksum was reverified before execution:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

## EXACT EXECUTED ARTIFACTS

Migration:

```text
infra/stacks/supabase/migrations/20260918_012_private_tenant_provisioning_v2.sql
Git blob = f9b6eedaf56b967ce9b30fd9a0558fb4c4cd34e7
```

Live-safe verifier:

```text
infra/stacks/supabase/verifiers/VERIFY_20260918_PRIVATE_TENANT_PROVISIONING_V2_LIVE.sql
Git blob = 46bb6b585e84c375595dacffbcb205fb8eb4c99e
```

Both staged VPS files were hashed with `git hash-object` and matched those exact canonical Git blobs before execution.

## DECISION / SECOND ADVERSARIAL REVIEW

Execution remained limited to migration 012 only.

Rejected before execution:

- creating the future canary tenant in the same transaction/slice;
- enabling customer hire merely because the schema would support V2;
- using Core/authenticated to execute V2;
- activating the dormant platform provisioner login/password;
- creating any Paperclip company, config, HMAC or provider binding;
- deploying PR #109 Core/Web;
- enabling Human Send or Gateway outbound;
- skipping the live-safe verifier after COMMIT;
- treating a failed verifier as permission to improvise rollback.

The execution harness was prepared so that, only if migration 012 committed and the canonical verifier then failed, it could use the already-proven structural reverse path **only while `tenant_provisioning_requests = 0`**. Otherwise it would stop without automatic recovery.

## EXECUTION

Migration 012 ran on the live Wandora PostgreSQL database as `supabase_admin`:

```text
BEGIN
ALTER TABLE
ALTER TABLE
DO
CREATE FUNCTION
REVOKE
REVOKE
REVOKE
GRANT
REVOKE
COMMENT
COMMENT
COMMIT
```

The canonical live-safe verifier immediately returned:

```text
PRIVATE_TENANT_PROVISIONING_V2_LIVE_OK
```

No rollback path was invoked.

## INDEPENDENT POST-VALIDATION

After migration + verifier:

```text
organizations              = 2
digital_employees          = 3
control bindings           = 1
employee bindings          = 1
completed catalog hires    = 1
tenant provisioning requests = 0
customer-hire canary slug  = absent

V1 function                = present
V2 function                = present
provisioning_version column= present
employee_id                = nullable

platform provisioner EXECUTE V2 = true
Core EXECUTE V2                 = false
authenticated EXECUTE V2        = false
platform direct ledger SELECT   = false
platform provisioner password   = absent
```

Runtime remained healthy:

```text
Core      = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Web       = wandora/web:team-read-b31db507, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de, healthy
```

Effect state remained:

```text
Organization Adapter           = ON
Customer Digital-Employee Hire = OFF
Human Send                     = OFF
Gateway outbound               = OFF
```

The pre-migration backup checksum still validated after execution. Temporary staged SQL files were removed from host/container after validation.

## EFFECT BOUNDARY

This slice changed only the private provisioning schema/contract.

It did **not**:

- create any organization;
- create any digital employee;
- insert any provisioning request;
- create a Paperclip company;
- create/change provider bindings;
- change HMAC custody/config;
- activate the platform provisioner login;
- deploy Core/Web;
- enable Customer Digital-Employee Hire;
- activate a digital employee;
- enable Human Send or Gateway outbound.

## DECISION

**Private Tenant Provisioning V2 is now live as a dormant, least-privilege production capability.**

The capability exists but has not been exercised in production. The provisioning ledger remains empty and the future customer-hire canary remains absent.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Employee-Free Tenant Provisioning Preflight V1.**

Before creating the canary organization:

1. reverify V2 live state and zero provisioning requests;
2. select the exact execution identity/path for the dormant `wandora_platform_provisioner` contract without creating a reusable production password merely for the canary;
3. freeze the canary request key, slug and display name from ADR 0065;
4. prove same-key replay/slug safety in a production-shaped disposable path if needed;
5. define exact post-provisioning invariants;
6. keep Paperclip company/bootstrap, provider binding, customer hire, activation and outbound as later separate effects.

The subsequent provisioning execution, if authorized by that preflight, must create exactly one employee-free `Wandora Customer Hire Canary` organization and stop before any Paperclip/provider/hire effect.
