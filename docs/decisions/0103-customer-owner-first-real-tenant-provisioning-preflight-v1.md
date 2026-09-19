# ADR 0103 — Customer Owner First Real Tenant Provisioning Preflight V1

- Status: **Accepted preflight — execution ready / no tenant created**
- Date: 2026-09-18
- Scope: freeze the first real customer tenant request and execution boundary for Private Tenant Provisioning V2.

## REAL NOW

```text
main = c954c9d66f6a6105746d7465790c47525f65b08f
open PRs = 0
```

The first real owner has already completed invite acceptance, first-password setup and a fresh normal login under ADR 0102.

## FROZEN CUSTOMER IDENTITY

The operator/user explicitly supplied:

```text
organization_display_name = MEDICSPRO
organization_slug         = medicspro
owner_display_name        = Alessandro Aranha
request_key               = customer-owner-first-real:tenant-v2:medicspro:v1
```

The owner e-mail and raw Supabase subject are intentionally omitted from Git.

Runtime proof for the authorized owner:

```text
Auth rows          = 1
confirmed          = 1
signed in          = 1
Wandora identities = 0
memberships        = 0
```

The runtime-resolved Supabase subject is execution-gated by SHA-256:

```text
be1c69b0c444d14746341d40ca1a3da8e2e509cc25091e8287355e443cd052af
```

## COLLISION / IDEMPOTENCY PROOF

```text
slug collision             = 0
display-name CI collision  = 0
request-key collision      = 0
```

## CAPABILITY AUTHORITY

Reuse the already-live:

```text
wandora_private.provision_beta_organization_v2(
  request_key,
  organization_slug,
  organization_display_name,
  owner_supabase_subject,
  owner_display_name
)
```

V2 creates only Wandora organization/user/identity/owner-membership/idempotency state and zero digital employees. It does not create Paperclip/provider/messaging/Auth-user/outbound state.

## LEAST-PRIVILEGE PROOF

Production proves:

```text
V2 present                    = true
platform provisioner executes = true
Core executes V2              = false
authenticated executes V2     = false
platform direct ledger read   = false
platform connection limit     = 0
platform reusable credential  = absent
```

A no-effect transaction proved:

```text
session_user = supabase_admin
SET LOCAL ROLE wandora_platform_provisioner
current_user = wandora_platform_provisioner
can_execute_v2 = true
can_select_ledger = false
ROLLBACK
```

## BASELINE

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

## DECISION

The subsequent execution may only:

1. reverify canonical Git/runtime and zero collisions;
2. resolve the authorized Auth subject transiently;
3. require its SHA-256 to match the frozen gate;
4. begin one local maintenance transaction;
5. assume `wandora_platform_provisioner` with `SET LOCAL ROLE`;
6. invoke V2 with the exact frozen request;
7. require non-null returned organization/user IDs;
8. commit;
9. independently validate all postconditions;
10. stop before Paperclip/provider bootstrap, eligibility or employee-hire effects.

## SECOND ADVERSARIAL REVIEW

Rejected:

- reusing the canary or any existing organization;
- direct inserts into Wandora identity/organization/membership tables;
- V1, which creates an employee;
- a new provisioning implementation;
- a different slug/request key after uncertainty;
- persisting the raw Auth subject/e-mail in Git;
- broadening provisioner access;
- coupling tenant creation to Paperclip, eligibility, hire or outbound.

## FAILURE / REPLAY

If the transaction fails before COMMIT, rollback and stop. If the result is ambiguous after COMMIT, inspect the frozen request key and slug first. Any replay must use the same key and exact payload. Never mint a replacement key to retry.

## REQUIRED POSTCONDITIONS

```text
organizations         = 4
wandora_users         = 2
user_identities       = 2
memberships           = 4
digital_employees     = 4
provisioning_requests = 2

MEDICSPRO = exactly 1 active organization
active owner membership = exactly 1
owner Supabase mapping   = exactly 1
MEDICSPRO employees      = 0

provisioning_version = 2
employee_id = NULL

control_bindings   = 2 total / 0 for MEDICSPRO
employee_bindings  = 2 total / 0 for MEDICSPRO
completed_hires    = 2 total / 0 for MEDICSPRO
unfinished_hires   = 0
eligibility_rows   = 0
eligibility_enabled= 0
```

After provisioning, the owner must be able to log in normally and receive a successful `/api/v1/me` organization context instead of `unlinked`.

## RESULT

**Customer Owner First Real Tenant Provisioning Preflight V1 is complete and accepted. No tenant was created.**

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Provisioning Execution V1**
