# ADR 0112 — Customer Owner First Real Tenant Eligibility Rollout Execution V1

- Status: **Accepted execution — MEDICSPRO + `ana-commercial-v1` eligibility is live; hire/activation/outbound remain untouched**
- Date: 2026-09-19
- Scope: execute only ADR 0111's frozen serialized operator transaction for the first real MEDICSPRO catalog eligibility rollout, then independently prove that no employee/provider/outbound effect occurred.

## REAL NOW

Canonical Git immediately before the production effect:

```text
main = 7eea3661174f8aed3cf5cb2cb97b291e280c1fbe
open PRs = 0
```

Target:

```text
organization_id = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
slug            = medicspro
catalog_key     = ana-commercial-v1
```

Immediately before execution:

```text
target organization          = 1 active
target employees             = 0
target employee bindings     = 0
target hire operations       = 0
target catalog hire ops      = 0
eligibility rows             = 0
enabled eligibility rows     = 0
target eligibility rows      = 0
unfinished hires             = 0
```

Authority remained unchanged:

```text
wandora_customer_hire_operator:
  LOGIN=false
  SUPERUSER=false
  BYPASSRLS=false
  setter EXECUTE=true
  direct eligibility INSERT=false

wandora_core_runtime:
  setter EXECUTE=false
```

Runtime effect boundaries before execution were also revalidated:

```text
Customer Digital-Employee Hire = ON
Human Send                     = OFF
Gateway outbound               = OFF
```

Paperclip/Organization Adapter evidence immediately preceding this slice remained green from ADR 0111: MEDICSPRO company active, plugin ready, exact company-scoped secret/config, matching HMAC hash and zero provider agents.

## PROVEN EVIDENCE / GAPS

The only intended state transition was:

```text
MEDICSPRO + ana-commercial-v1
eligibility absent
        ->
eligibility enabled
```

No employee creation, hire operation, provider-agent creation, activation, Human Send or Gateway outbound was part of this slice.

The transaction itself contains fail-closed checks for any already-enabled eligibility row and any target catalog hire operation. Therefore a concurrent/drifted first-rollout state aborts before commit rather than widening eligibility.

## CAPABILITY AUTHORITY / REUSE GATE

Eligibility is Wandora-owned customer policy already established by ADRs 0079–0085 and implemented by the live migration 013 contract. This slice reused the existing private table, dedicated NOLOGIN operator role and controlled setter.

No new table, service, workflow, Paperclip lifecycle state or provider capability was introduced.

## DECISION

Execute exactly ADR 0111's frozen serialized operator transaction:

```text
supabase_admin
-> BEGIN
-> EXCLUSIVE LOCK eligibility table
-> assert globally zero enabled rows
-> assert no MEDICSPRO ana-commercial-v1 hire operation
-> SET LOCAL ROLE wandora_customer_hire_operator
-> setter(MEDICSPRO, ana-commercial-v1, true)
-> RESET ROLE
-> assert exactly one enabled row and exact target
-> COMMIT
```

Stop immediately after independent validation.

## SECOND ADVERSARIAL REVIEW

Immediately before mutation, production was re-read rather than trusting the prior chat checkpoint.

Rejected conditions remained absent:

- no eligibility row had appeared since ADR 0111;
- no MEDICSPRO employee or hire operation existed;
- no employee-provider binding existed;
- no unfinished hire existed;
- the operator setter remained least-privilege;
- Core still could not execute the setter;
- Human Send and Gateway outbound remained OFF.

The frozen transaction itself remained the smallest reversible mutation. No Paperclip config/secret rotation, Core recreate, Web deploy or outbound activation was needed.

## EXECUTION

The ADR 0111 SQL was executed through the local `supabase_admin` boundary with `ON_ERROR_STOP=1`.

Observed transactional result:

```text
BEGIN
LOCK TABLE
precondition DO = success
SET LOCAL ROLE wandora_customer_hire_operator
setter result:
  organization_id = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
  catalog_key     = ana-commercial-v1
  enabled         = true
  updated_at      = 2026-09-19 04:30:43.983769+00
RESET ROLE
postcondition DO = success
COMMIT
```

No retry was required.

## VALIDATION

A separate post-commit connection proved:

```text
eligibility_total          = 1
eligibility_enabled        = 1
target_enabled             = 1

MEDICSPRO employees        = 0
MEDICSPRO employee bindings= 0
MEDICSPRO hire operations  = 0
unfinished hires           = 0
control binding            = 1

global employees           = 4
global employee bindings   = 2
global hire operations     = 2
```

Paperclip/Organization Adapter remained unchanged:

```text
MEDICSPRO company     = active
plugin health         = ready
config lastError      = empty
Core HMAC / secret    = hash match
Paperclip agents      = 0
```

Runtime postconditions:

```text
Auth / DB / Web / Core / Paperclip / Gateway = healthy
restarts                                      = 0

Customer Digital-Employee Hire = ON
Human Send                     = OFF
Gateway outbound               = OFF
```

Therefore eligibility alone did not create or activate a digital employee and did not cause any outbound effect.

## ROLLBACK CONTRACT

ADR 0111's rollback remains valid and was **not needed**:

```text
EXCLUSIVE LOCK
-> SET LOCAL ROLE wandora_customer_hire_operator
-> setter(MEDICSPRO, ana-commercial-v1, false)
-> RESET ROLE
-> assert enabled rows = 0
-> COMMIT
```

If used later, the historical target row may remain with `enabled=false`.

## RESULT

**Customer Owner First Real Tenant Eligibility Rollout Execution V1 is COMPLETE and GREEN.**

Exactly one eligibility is live:

```text
MEDICSPRO + ana-commercial-v1 = enabled
```

Everything beyond eligibility remains deliberately untouched.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1**

Revalidate the real owner/browser path, customer-facing availability projection, exact idempotency contract, MEDICSPRO wiring, zero target employee/hire/provider-agent state and effect boundaries. The preflight must not hire or activate Ana and must not enable Human Send or Gateway outbound.
