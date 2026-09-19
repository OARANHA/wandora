# ADR 0104 — Customer Owner First Real Tenant Provisioning Execution V1

- Status: **Accepted execution — MEDICSPRO tenant live / owner access read validation next**
- Date: 2026-09-18
- Scope: execute exactly the ADR 0103 Private Tenant Provisioning V2 request and stop before Paperclip/provider, eligibility or employee-hire effects.

## REAL NOW

Before mutation:

```text
main = 7d2de0c4972c8151b29a8c797e514a48888e93cc
open PRs = 0
organization slug collision = 0
display-name CI collision = 0
request-key collision = 0
```

The frozen owner Auth subject still resolved to exactly one confirmed and previously signed-in Supabase Auth user. Its runtime SHA-256 matched the ADR 0103 gate:

```text
be1c69b0c444d14746341d40ca1a3da8e2e509cc25091e8287355e443cd052af
```

The raw owner e-mail and Supabase subject remain outside Git and this ADR.

## PROVEN EVIDENCE

Pre-execution business baseline remained exactly ADR 0103:

```text
organizations         = 3
wandora_users         = 1
user_identities       = 1
memberships           = 3
digital_employees     = 4
provisioning_requests = 1
control_bindings      = 2
employee_bindings     = 2
completed_hires       = 2
unfinished_hires      = 0
eligibility_rows      = 0
eligibility_enabled   = 0
```

The live V2 function was re-read from PostgreSQL before mutation. It creates only Wandora organization/user/identity/owner-membership/idempotency state and does not call Paperclip, Messaging Gateway, Evolution or Auth administration.

Least-privilege revalidation:

```text
V2 present                    = true
platform provisioner executes = true
Core executes V2              = false
authenticated executes V2     = false
platform direct ledger read   = false
platform connection limit     = 0
platform reusable password    = absent
supabase_admin SET ROLE path  = true
```

## GAPS

The database-side execution can prove the owner subject is now mapped to MEDICSPRO and that Core has the canonical authorization state it needs.

A fresh authenticated browser call to `/api/v1/me` was not fabricated during this execution. No owner password, refresh token or privileged JWT impersonation is stored or extracted merely to make that proof green. The next no-mutation slice must validate the customer's normal authenticated read using a genuine owner session.

## DECISION

Execute exactly the ADR 0103 request:

```text
organization_display_name = MEDICSPRO
organization_slug         = medicspro
owner_display_name        = Alessandro Aranha
request_key               = customer-owner-first-real:tenant-v2:medicspro:v1
```

Only:

```text
supabase_admin local maintenance transaction
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> wandora_private.provision_beta_organization_v2(...)
  -> require one non-null organization/user result
  -> COMMIT
```

No direct inserts, V1 provisioning, replacement request key, Paperclip bootstrap, provider binding, eligibility mutation, hire, outbound or e-mail effect are permitted.

## SECOND ADVERSARIAL REVIEW

Rejected before execution:

- direct identity/organization/membership inserts;
- reusing an existing canary/internal tenant;
- invoking V1, which creates an employee;
- broadening Core/authenticated database privileges;
- minting a replacement request key;
- extracting or persisting the raw owner Auth subject;
- coupling tenant creation to Paperclip/provider configuration;
- enabling eligibility or hiring an employee in the same transaction;
- using a privileged/synthetic customer JWT to fake the later `/api/v1/me` proof.

The live provisioner is login-capable at the PostgreSQL role attribute level, but remains operationally disabled for reusable direct login by `CONNECTION LIMIT 0` plus no stored password. The reviewed execution continued to assume it only transaction-locally from `supabase_admin`.

## EXECUTION

The owner subject was resolved transiently by the frozen SHA-256 gate and never printed.

Inside one transaction:

```text
BEGIN
SET LOCAL lock_timeout = 5s
SET LOCAL statement_timeout = 20s
recheck zero slug/display/request-key collisions
SET LOCAL ROLE wandora_platform_provisioner
call provision_beta_organization_v2(exact frozen request)
require exactly one row and non-null organization/user ids
COMMIT
```

The maintenance client returned:

```text
PROVISION_TX_COMMIT=true
```

There was no timeout or ambiguous commit, so no replay was attempted.

## VALIDATION

Independent post-commit reconciliation:

```text
organizations         = 4
wandora_users         = 2
user_identities       = 2
memberships           = 4
digital_employees     = 4
provisioning_requests = 2

MEDICSPRO active organizations = 1
owner Supabase mappings        = 1
active owner memberships       = 1
MEDICSPRO employees            = 0
exact V2 request rows          = 1
```

The request row is V2 and has `employee_id = NULL`.

Provider/effect boundary remained clean:

```text
control_bindings total / MEDICSPRO    = 2 / 0
employee_bindings total / MEDICSPRO   = 2 / 0
completed_hires total / MEDICSPRO     = 2 / 0
unfinished_hires                      = 0
eligibility rows / enabled            = 0 / 0
eligibility rows for MEDICSPRO        = 0
messaging connections MEDICSPRO       = 0
messaging provider bindings MEDICSPRO = 0
```

Runtime after execution:

```text
supabase-auth              healthy / restarts 0
supabase-db                healthy / restarts 0
wandora-web                healthy / restarts 0
wandora-core               healthy / restarts 0
wandora-paperclip          healthy / restarts 0
wandora-messaging-gateway  healthy / restarts 0

Customer Hire global gate = ON
Human Send                = OFF / absent
Gateway outbound          = OFF / absent
```

No Paperclip/provider API call was issued by this slice and the V2 function has no provider side effect.

## RESULT

**Customer Owner First Real Tenant Provisioning Execution V1 is complete. MEDICSPRO is live as one active employee-free Wandora tenant with exactly one active owner and exact V2 idempotency state.**

This result does not claim the customer's post-provision browser read has already been observed. That proof intentionally remains separate rather than using privileged impersonation.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Access Validation V1**

Use a genuine normal owner session to prove `/api/v1/me` now returns the MEDICSPRO organization context instead of `unlinked`. The validation must be read-only: no Paperclip/provider bootstrap, no eligibility, no hire and no outbound effect.
