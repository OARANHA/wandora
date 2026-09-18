# ADR 0085 — Customer Digital-Employee Hire — First Tenant Eligibility Rollout Preflight V1

- Status: **Accepted preflight — no current tenant qualifies; no eligibility enabled**
- Date: 2026-09-18
- Scope: select exactly one clean production tenant for the first `ana-commercial-v1` eligibility rollout or prove that none currently qualifies, then freeze the scoped operator activation/rollback contract without creating any eligibility state

## REAL NOW

Canonical Git:

```text
main = 1bcf9025c17b45637ea6269c186836709063767f
PR #132 = merged
open PRs = 0
```

Live runtime revalidation:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Core health / restarts = healthy / 0
Customer Digital-Employee Hire = ON

Web = wandora/web:candidate-af542864d267
Web health / restarts = healthy / 0

Paperclip = wandora/paperclip:v2026.831.1
Paperclip health / restarts = healthy / 0

Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de
Gateway health / restarts = healthy / 0

Human Send = OFF / flag absent
Gateway outbound = OFF / flag absent
```

Migration 013 remains live. The tenant-eligibility table is empty:

```text
eligibility rows = 0
enabled eligibility rows = 0
disabled eligibility rows = 0
unfinished ana-commercial-v1 hire operations = 0
```

## PROVEN EVIDENCE — ACTIVE TENANT ENUMERATION

Exactly three active Wandora organizations exist.

### Empresa Exemplo

```text
active members = 1
active owner/admin = 1
digital employees = 1
matching Ana commercial-assistant/supervised = 1
Paperclip control-plane bindings = 0
employee-provider bindings = 0
ana-commercial-v1 hire operations = 0
eligibility rows = 0
```

The existing Ana is active + supervised and has no Paperclip employee binding.

This tenant is not a clean new-hire target. The canonical Core read model intentionally rejects a matching legacy employee before availability can become true, and there is no Paperclip control-plane binding.

### Wandora Customer Hire Canary

```text
active members = 1
active owner/admin = 1
digital employees = 1
matching Ana = 1
Paperclip control-plane bindings = 1
employee-provider bindings = 1
ana-commercial-v1 operation = completed
eligibility rows = 0
```

Paperclip independently reports one company-owned Ana:

```text
name = Ana
status = paused
adapterType = wandora_mastra
```

The Organization Adapter plugin config exists for this company, carries a `secret_ref` HMAC binding and the plugin is healthy/ready.

This tenant is already hired for the exact catalog key. Its customer projection is `already-hired`, not a new eligibility candidate.

### Wandora Internal Supervised Proof

```text
active members = 1
active owner/admin = 1
digital employees = 2
matching Ana = 1
Paperclip control-plane bindings = 1
employee-provider bindings = 1
ana-commercial-v1 operation = completed
eligibility rows = 0
```

Paperclip independently reports one company-owned Ana:

```text
name = Ana
status = paused
adapterType = wandora_mastra
```

The Organization Adapter plugin config exists for this company, carries a `secret_ref` HMAC binding and the plugin is healthy/ready.

This tenant has proof/legacy state plus a completed exact-catalog hire. It is not a new eligibility candidate.

## PROVEN EVIDENCE — ORGANIZATION ADAPTER CUSTODY

Both currently bound Paperclip companies still have deterministic Core HMAC custody files.

For both files:

```text
mode = 0640
owner = wandora-admin
group = wandora-ops
size = 64 bytes
Core read = true
```

No HMAC plaintext was read or printed during this preflight.

Paperclip health remains:

```text
Organization Adapter plugin status = ready
Organization Adapter plugin healthy = true
```

## PROVEN EVIDENCE — ELIGIBILITY OPERATOR AUTHORITY

The live dedicated role remains:

```text
wandora_customer_hire_operator
  LOGIN = false
  SUPERUSER = false
  CREATEDB = false
  CREATEROLE = false
  INHERIT = false
  REPLICATION = false
  BYPASSRLS = false
```

Live privilege proof:

```text
wandora_core_runtime
  schema USAGE = true
  eligibility SELECT = true
  eligibility INSERT/UPDATE/DELETE = false
  eligibility setter EXECUTE = false

wandora_customer_hire_operator
  schema USAGE = true
  eligibility direct SELECT/INSERT/UPDATE/DELETE = false
  eligibility setter EXECUTE = true

wandora_platform_provisioner
  eligibility direct SELECT/INSERT/UPDATE/DELETE = false
  eligibility setter EXECUTE = false

anon / authenticated / service_role
  eligibility direct DML = false
  eligibility setter EXECUTE = false
```

The only eligibility RLS policy is the tenant-scoped Core read policy.

### Protected operator session identity

A read-only live authority check found an important Supabase-specific detail:

```text
postgres
  LOGIN = true
  SUPERUSER = false
  member of wandora_customer_hire_operator = false

supabase_admin
  LOGIN = true
  SUPERUSER = true
```

Therefore the frozen local operator path must use the already protected local `supabase_admin` administration boundary, then immediately narrow the mutation with `SET LOCAL ROLE wandora_customer_hire_operator`. No membership is granted to `postgres`, Core, Platform Admin or an application/service login.

The first disposable harness correctly failed when it assumed `postgres` could set the NOLOGIN role. That failure produced no production effect and was used to correct the harness rather than weakening production authority.

## PROVEN EVIDENCE — SERIALIZED FIRST-ROLLOUT TRANSACTION

The second adversarial review found a concurrency hole in the first draft of the future transaction: a post-write `enabled count = 1` assertion alone does not serialize two simultaneous first-rollout sessions. Two transactions could theoretically each observe only their own uncommitted row before either commit.

The frozen transaction was therefore strengthened with:

```text
protected local supabase_admin session
-> BEGIN
-> EXCLUSIVE lock on eligibility table
-> assert enabled rows = 0 before role narrowing
-> SET LOCAL ROLE wandora_customer_hire_operator
-> call controlled setter for exactly one target
-> RESET ROLE
-> assert exactly one enabled row and it is the reviewed target
-> COMMIT
```

A disposable concurrency proof ran on the same pinned PostgreSQL family image (`supabase/postgres:17.6.1.136`) in an isolated no-port/no-network container. The proof database was created from `template0` and reproduced the canonical eligibility table/setter boundary with synthetic organizations only.

Two concurrent first-rollout sessions were deliberately raced:

```text
session A target -> acquired lock -> enabled target A -> held transaction
session B target -> blocked on same lock
session A -> postcondition passed -> COMMIT
session B -> acquired lock -> precondition saw enabled row -> rejected before setter
```

Observed result:

```text
CONCURRENT_A_OK=true
CONCURRENT_B_REJECTED=true
enabled rows = 1
target A enabled rows = 1
target B rows = 0
```

The frozen rollback was then executed in the same disposable harness:

```text
enabled rows = 0
target A disabled rows = 1
```

The disposable container and proof files were removed.

A broader disposable schema-restore attempt was rejected because Supabase GraphQL DDL event triggers interfered with replay inside the throwaway database. It never targeted production and was not used as evidence. The final concurrency proof intentionally reduced the harness to the exact eligibility objects and operator semantics under test.

## GAPS

There is no clean current production tenant for a first new `ana-commercial-v1` availability rollout.

The exact blockers are:

1. **Empresa Exemplo** — matching legacy Ana exists and Paperclip control-plane binding is absent.
2. **Customer Hire Canary** — the exact catalog hire is already completed.
3. **Internal Supervised Proof** — the exact catalog hire is already completed and the tenant contains proof state.

No gap is solved by adding an eligibility row to one of these tenants.

## DECISION

**Do not select an existing tenant and do not enable eligibility.**

The first tenant rollout must wait for a separately reviewed clean target satisfying all of these before the setter is called:

```text
organization active
exactly one active owner/admin path
global customer-hire gate ON
Human Send OFF
Gateway outbound OFF
no ana-commercial-v1 eligibility row enabled
no unfinished ana-commercial-v1 operation
no completed ana-commercial-v1 operation
no matching legacy Ana collision
exactly one Paperclip control-plane binding
Paperclip company active
Organization Adapter plugin config present
config HMAC = company-owned secret_ref
Organization Adapter plugin healthy/ready
Core deterministic HMAC custody present and readable
no existing Paperclip catalog Ana collision
```

A new clean customer tenant prepared through the already accepted Private Tenant Provisioning V2 + Paperclip Organization Adapter wiring is preferred over mutating or “adopting” incompatible legacy state merely to obtain a rollout target.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

1. **Enable the Customer Hire Canary anyway** — rejected because the exact catalog operation is already completed; eligibility would not represent a new rollout and the UI correctly remains `already-hired`.
2. **Enable Internal Supervised Proof** — rejected for the same completed-catalog reason plus proof/legacy state.
3. **Treat Empresa Exemplo as clean** — rejected because a matching legacy Ana already exists and no control-plane binding exists.
4. **Silently adopt/migrate the Empresa Exemplo Ana** — rejected; ADR 0065 already refused unproven legacy adoption and no new evidence justifies reopening it.
5. **Provision a dummy production tenant inside this preflight** — rejected; tenant provisioning/provider wiring are separate production effects and a synthetic tenant would not advance real customer rollout.
6. **Insert an eligibility row disabled=false/true merely to test the setter** — rejected; ADR 0080 CI/disposable proofs already cover setter behavior and production must remain zero-row in this preflight.
7. **Use a broad application/service login for eligibility** — rejected; the accepted NOLOGIN capability remains sufficient.
8. **Combine eligibility with employee activation or outbound** — rejected; `Contratar`, future `Ativar`, Human Send and Gateway outbound remain distinct effects.
9. **Rely on a post-write count without serialization** — rejected after adversarial concurrency analysis; the first-rollout transaction now takes an EXCLUSIVE table lock and checks the zero-enabled invariant before the setter.

## FROZEN FUTURE ELIGIBILITY TRANSACTION

No current UUID is authorized. The following transaction shape is frozen for the **future separately reviewed clean target**; `<TARGET_ORG_UUID>` is intentionally unresolved in this ADR.

The future execution must begin from:

```text
enabled eligibility rows = 0
target eligibility row absent
target has no completed/unfinished ana-commercial-v1 operation
target has no matching legacy Ana
target provider wiring/custody/config = green
```

Activation:

```sql
BEGIN;

LOCK TABLE wandora_private.digital_employee_catalog_hire_eligibility
  IN EXCLUSIVE MODE;

DO $
BEGIN
  IF EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE enabled
  ) THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_not_zero';
  END IF;
END
$;

SET LOCAL ROLE wandora_customer_hire_operator;

SELECT organization_id, catalog_key, enabled, updated_at
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '<TARGET_ORG_UUID>'::uuid,
  'ana-commercial-v1',
  true
);

RESET ROLE;

DO $
BEGIN
  IF (SELECT count(*)
        FROM wandora_private.digital_employee_catalog_hire_eligibility
       WHERE enabled) <> 1 THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_enabled_count_drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE organization_id = '<TARGET_ORG_UUID>'::uuid
       AND catalog_key = 'ana-commercial-v1'
       AND enabled = true
  ) THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_target_not_enabled';
  END IF;
END
$;

COMMIT;
```

The pre-commit assertion makes the first rollout fail closed if any other tenant is already enabled or if the target row is not exactly the reviewed organization+catalog.

Immediate post-commit validation must require:

```text
enabled eligibility rows = exactly 1
enabled row = exactly TARGET_ORG_UUID + ana-commercial-v1
all other active tenants remain available=false
target projects available=true only if every other canonical safety check still passes
durable employees / hire operations / provider bindings unchanged before human hire action
Human Send OFF
Gateway outbound OFF
```

The eligibility transaction itself must not create a digital employee, reserve a hire operation or call Paperclip.

## FROZEN ROLLBACK

For the first rollout, tenant-specific rollback is the same controlled setter with `false`:

```sql
BEGIN;

LOCK TABLE wandora_private.digital_employee_catalog_hire_eligibility
  IN EXCLUSIVE MODE;

SET LOCAL ROLE wandora_customer_hire_operator;

SELECT organization_id, catalog_key, enabled, updated_at
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  '<TARGET_ORG_UUID>'::uuid,
  'ana-commercial-v1',
  false
);

RESET ROLE;

DO $
BEGIN
  IF EXISTS (
    SELECT 1
      FROM wandora_private.digital_employee_catalog_hire_eligibility
     WHERE enabled
  ) THEN
    RAISE EXCEPTION 'customer_hire_first_rollout_disable_incomplete';
  END IF;
END
$;

COMMIT;
```

Rollback intentionally retains the provider-neutral policy row with `enabled=false`; it does not delete history or provider state.

The process-wide Core gate remains the broad emergency kill switch, but global gate rollback is not a substitute for the scoped tenant rollback and is not part of this preflight.

## EXECUTION

Production operations performed by this preflight were read-only:

- Git/main/open-PR revalidation;
- container health/image/flag reads;
- Wandora organization/employee/binding/hire/eligibility reads;
- eligibility role/privilege/RLS reads;
- Paperclip company/agent/config/health reads;
- Organization Adapter secret-file metadata/readability checks without secret content.
- disposable no-network PostgreSQL transaction/concurrency proof using synthetic organizations only.

Documentation is the only durable change produced by this slice.

This preflight did **not**:

- call the eligibility setter;
- insert/update/delete any eligibility row;
- provision a tenant;
- create a Paperclip company;
- mutate Paperclip config/secrets/agents;
- create or resume a hire operation;
- create or activate a digital employee;
- enable Human Send;
- enable Gateway outbound;
- recreate Core/Web/Gateway/Paperclip.

## VALIDATION

Final observed production invariants before documentation:

```text
active organizations = 3
digital employees = 4
Paperclip control-plane bindings = 2
digital-employee provider bindings = 2
hire operations = 2 completed / 0 unfinished
eligibility rows = 0
enabled eligibility rows = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Core/Web/Paperclip/Gateway = healthy
```

No existing tenant qualifies for a first new `ana-commercial-v1` eligibility rollout.

## DECISION RESULT

**First Tenant Eligibility Rollout Preflight V1 is green as a no-target decision.**

The safe outcome is not to force eligibility onto an incompatible tenant. Production remains globally capable but tenant-closed.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Clean Tenant Rollout Candidate Preparation Preflight V1.**

Preflight only.

It must decide between:

1. a real new/customer tenant already suitable for rollout; or
2. a separately reviewed clean tenant created through the accepted employee-free provisioning path.

It must not provision a tenant, create provider wiring or enable eligibility merely to satisfy the preflight.
