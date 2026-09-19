# ADR 0111 — Customer Owner First Real Tenant Eligibility Rollout Preflight V1

- Status: **Accepted preflight — MEDICSPRO qualifies; eligibility remains disabled/absent**
- Date: 2026-09-19
- Scope: re-evaluate the real MEDICSPRO tenant against ADR 0085's first-rollout gates, freeze the exact serialized operator transaction for `ana-commercial-v1`, and stop before any eligibility, hire, activation or outbound effect.

## REAL NOW

Canonical Git entering preflight:

```text
main = d5d3cdd430ecae9ce4c834696618a9ab4be48be4
open relevant PRs = 0
```

Target:

```text
organization_id = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
slug            = medicspro
display_name    = MEDICSPRO
catalog_key     = ana-commercial-v1
```

Runtime:

```text
Customer Digital-Employee Hire = ON
Human Send                     = OFF
Gateway outbound               = OFF

Auth / DB / Web / Core / Paperclip / Messaging Gateway = healthy
```

## PROVEN EVIDENCE — CUSTOMER / TENANT

Fresh read-only production reconciliation:

```text
target active organization = 1
active owner               = 1
active owner/admin path    = 1
Supabase identity mapping  = 1
confirmed Auth owner       = 1

digital employees          = 0
matching legacy Ana        = 0
employee provider bindings = 0
ana-commercial-v1 hires    = 0
unfinished target hires    = 0

target eligibility rows    = 0
global eligibility rows    = 0
enabled eligibility rows   = 0
```

Therefore MEDICSPRO is materially different from the three tenants rejected by ADR 0085: it is a genuine real customer tenant, employee-free and exact-catalog clean.

## PROVEN EVIDENCE — ORGANIZATION ADAPTER

ADR 0110 wiring was revalidated without reading secret plaintext:

```text
control binding       = exactly 1
Paperclip company     = MEDICSPRO / active
Paperclip agents      = 0
Paperclip secrets     = exactly 1
secret referenceCount = 1
secret usage count    = 1
plugin config         = exact secret_ref
config lastError      = empty/null
plugin health         = ready
```

Core custody:

```text
HMAC file = deterministic provider-company path
mode      = 0640
owner     = wandora-admin
group     = wandora-ops
size      = 64 bytes
Core read = true
```

Hash-only integrity proof:

```text
Core HMAC SHA-256
= 020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8

Paperclip current secret version = 2
value_sha256                     = same hash
fingerprint_sha256               = same hash
status                           = current
```

No plaintext or encrypted material was printed.

## PROVEN EVIDENCE — ELIGIBILITY AUTHORITY

The dedicated operator role remains:

```text
wandora_customer_hire_operator
  LOGIN=false
  SUPERUSER=false
  CREATEDB=false
  CREATEROLE=false
  INHERIT=false
  REPLICATION=false
  BYPASSRLS=false
```

Live privilege proof:

```text
wandora_core_runtime
  eligibility SELECT = true
  eligibility direct DML = false
  setter EXECUTE = false

wandora_customer_hire_operator
  eligibility direct DML = false
  setter EXECUTE = true

eligibility RLS policies = exactly 1
setter function           = exactly 1
```

The protected local execution boundary remains `supabase_admin`, narrowed inside the transaction with `SET LOCAL ROLE wandora_customer_hire_operator`.

## NO-EFFECT TRANSACTION REHEARSAL

The future execution shape was rehearsed in production without calling the setter:

```text
BEGIN
-> EXCLUSIVE LOCK eligibility table
-> assert enabled count = 0
-> SET LOCAL ROLE wandora_customer_hire_operator
-> current_user = wandora_customer_hire_operator
-> RESET ROLE
-> current_user = supabase_admin
-> ROLLBACK
```

Post-rehearsal:

```text
eligibility rows    = 0
enabled rows        = 0
```

No row was inserted or updated.

ADR 0085's disposable concurrency proof remains reusable because the schema, setter and authority model are unchanged.

## DECISION / SECOND ADVERSARIAL REVIEW

**MEDICSPRO is accepted as the first real eligibility rollout target for `ana-commercial-v1`, but this preflight does not enable it.**

The execution must preserve ADR 0085's serialized first-rollout contract:

```text
protected local supabase_admin
-> BEGIN
-> EXCLUSIVE LOCK
-> assert global enabled rows = 0
-> reassert target clean state
-> SET LOCAL ROLE wandora_customer_hire_operator
-> controlled setter(MEDICSPRO, ana-commercial-v1, true)
-> RESET ROLE
-> assert exactly one enabled row and exact target
-> COMMIT
-> independent read-only validation
```

Rejected:

- enabling eligibility during this preflight;
- combining eligibility with the hire POST;
- creating Ana merely to prove availability;
- bypassing the dedicated setter with direct DML;
- omitting the table lock because current enabled rows are zero;
- enabling another tenant simultaneously;
- turning on Human Send or Gateway outbound;
- using browser/session identity as operator authority;
- altering Paperclip secret/config during eligibility rollout.

## FROZEN EXECUTION TRANSACTION

Future separately reviewed execution:

```sql
BEGIN;

LOCK TABLE wandora_private.digital_employee_catalog_hire_eligibility
  IN EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE enabled
  ) THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_not_zero';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_hire_operations
     WHERE organization_id = 'b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5'::uuid
       AND catalog_key = 'ana-commercial-v1'
  ) THEN
    RAISE EXCEPTION 'customer_hire_target_operation_collision';
  END IF;
END
$$;

SET LOCAL ROLE wandora_customer_hire_operator;

SELECT organization_id, catalog_key, enabled, updated_at
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  'b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5'::uuid,
  'ana-commercial-v1',
  true
);

RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*)
        FROM wandora_private.digital_employee_catalog_hire_eligibility
       WHERE enabled) <> 1 THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_enabled_count_drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE organization_id = 'b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5'::uuid
       AND catalog_key = 'ana-commercial-v1'
       AND enabled = true
  ) THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_target_not_enabled';
  END IF;
END
$$;

COMMIT;
```

Immediate post-commit proof must require:

```text
enabled eligibility rows = exactly 1
enabled target            = MEDICSPRO + ana-commercial-v1
MEDICSPRO employees       = 0
MEDICSPRO hire operations = 0
Paperclip agents          = 0
Organization Adapter      = unchanged / ready
Human Send                = OFF
Gateway outbound          = OFF
```

Eligibility alone must not create a digital employee, provider binding or Paperclip agent.

## FROZEN ROLLBACK

Use the same dedicated setter with `false` under the same exclusive-lock/operator-role boundary. After rollback, enabled rows must be zero; the historical target row may remain with `enabled=false`.

## EXECUTION / VALIDATION

This preflight performed only:

- Git/runtime reads;
- Wandora tenant/owner/employee/hire/eligibility reads;
- operator privilege/RLS reads;
- Paperclip company/agent/secret-usage/config/health reads;
- hash-only HMAC/secret integrity checks;
- a production transaction rehearsal that did not call the setter and ended in `ROLLBACK`.

No eligibility row was created or enabled. No employee, hire operation, provider agent, secret/config mutation or outbound effect occurred.

## RESULT

**Customer Owner First Real Tenant Eligibility Rollout Preflight V1 is GREEN.**

MEDICSPRO is the accepted first real target, but remains unavailable until the separately reviewed execution commits the scoped eligibility row.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Eligibility Rollout Execution V1**

Execute only the frozen serialized operator transaction for MEDICSPRO + `ana-commercial-v1`, independently validate exactly one enabled eligibility row and zero employee/hire/provider-agent effects, and stop.

Do not hire or activate Ana. Do not enable Human Send or Gateway outbound.
