# ADR 0066 — Private Tenant Provisioning V2 — Employee-Free Contract Implementation V1

- Status: **Accepted implementation — code/CI only, not applied to production**
- Date: 2026-09-18
- Scope: version the existing private tenant provisioner so a clean customer-like organization can be created idempotently with an active owner and zero digital employees

## REAL NOW

Canonical base for this implementation:

```text
main = 3e38e518e48d3dbc21a3c2c1f658cc6cf36622db
PR #110 = merged
open PRs = 0
```

Read-only live revalidation before implementation:

```text
Core      = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de, healthy

Organization Adapter           = ON
Customer Digital-Employee Hire = OFF / flag absent
Human Send                     = OFF / flag absent
Gateway outbound               = OFF / flag absent
```

ADR 0065 selected a fresh employee-free customer-like tenant for the first paused-first hire canary. The current V1 private provisioner cannot create that state because it always creates one active supervised commercial-assistant employee.

## PROVEN EVIDENCE

The existing boundary already provides the correct ownership model:

- Wandora owns canonical organization, user/identity mapping and membership;
- tenant provisioning is private/operator-only;
- Supabase Auth identity creation is outside the provisioner;
- `wandora_platform_provisioner` is the dedicated least-privilege execution role;
- V1 already provides normalization, advisory-lock serialization, request fingerprinting, exact replay and slug conflict behavior;
- V1 is already live and must retain historical replay behavior.

The gap is therefore only an employee-free version of the same private capability.

## CAPABILITY AUTHORITY / REUSE GATE

No new organization subsystem is justified.

Paperclip must not create Wandora organizations or owner memberships. Customer Hire must not become a tenant-provisioning API. The accepted Organization Adapter remains responsible only for digital-employee/provider reconciliation after a Wandora organization exists.

Minimum new Wandora state is limited to versioning the existing private provisioning evidence so V1 and V2 can share one idempotency namespace safely.

## DECISION

Add:

```text
wandora_private.provision_beta_organization_v2(
  request_key,
  organization_slug,
  organization_display_name,
  owner_supabase_subject,
  owner_display_name
)
  -> organization_id
  -> user_id
```

V2 atomically creates or reuses only:

1. one active Wandora organization;
2. one canonical Wandora user / Supabase identity mapping as required;
3. one active owner membership;
4. private idempotency evidence;
5. **zero digital employees**.

It creates no Paperclip state, provider binding, messaging connection, auth user or outbound effect.

## SHARED IDEMPOTENCY LEDGER

Creating a second V2-only provisioning table was rejected because it would create two request-key namespaces for one operator capability and permit ambiguous cross-version reuse.

Instead, the existing private ledger is extended backward-compatibly:

```text
provisioning_version = 1 -> employee_id IS NOT NULL
provisioning_version = 2 -> employee_id IS NULL
```

Existing rows become version 1 through the column default. The V1 function signature and behavior remain unchanged; future V1 inserts continue receiving version 1 automatically.

V2 fingerprints include the explicit version marker. Reusing a request key across versions fails closed with the existing `wandora_provisioning_idempotency_conflict`.

## LEAST-PRIVILEGE BOUNDARY

Only `wandora_platform_provisioner` receives EXECUTE on V2.

V2 remains unavailable to:

- PUBLIC / anonymous browser roles;
- `authenticated`;
- `wandora_core_runtime`.

The platform provisioner still receives no direct table privileges.

## SECOND ADVERSARIAL REVIEW

Rejected:

- changing V1 to stop creating employees, which would rewrite historical semantics;
- a new V2-only ledger, which would duplicate idempotency state and split request-key authority;
- direct SQL insertion of the canary organization;
- granting V2 to Core or authenticated browser roles;
- creating the future canary tenant in this implementation slice;
- creating a Paperclip company or provider binding in this slice;
- enabling Customer Digital-Employee Hire merely because the V2 function exists;
- modifying Human Send or Gateway outbound.

The shared-ledger design was retained because it is the smallest change that preserves one idempotency authority while making the V1/V2 row shape explicit and enforceable.

## VALIDATION CONTRACT

A dedicated reproducible PostgreSQL verifier must apply migrations 001 through 012 in order, reapply migration 012, and prove:

1. V2 creates organization + canonical user/identity + active owner membership;
2. V2 creates zero digital employees;
3. V2 exact replay returns the same IDs without duplicate state;
4. same key + changed payload fails closed;
5. different key + same slug fails closed;
6. existing Supabase subject reuses the same canonical user without overwriting display name;
7. the shared ledger records V2 with `provisioning_version=2` and `employee_id IS NULL`;
8. cross-version request-key reuse fails closed;
9. V1 still creates an active supervised commercial-assistant employee and records version 1;
10. only `wandora_platform_provisioner` can execute V2;
11. the platform provisioner has no direct ledger/table access;
12. the migration is idempotent.

Core CI gets a separate V2 verifier step rather than changing the historical Ana harness that intentionally preserves its older migration boundary.

## EFFECT BOUNDARY

This implementation does **not**:

- apply migration 012 to production;
- create `Wandora Customer Hire Canary`;
- create a Paperclip company;
- change provider secret custody/config;
- deploy PR #109 Core/Web;
- enable Customer Digital-Employee Hire;
- activate any employee;
- enable Human Send or Gateway outbound.

## NEXT EXECUTABLE SLICE

After merge + green CI:

**Private Tenant Provisioning V2 — Production Migration Preflight V1.**

That slice must reverify backup/reversibility, exact live role/table/function state and the migration 012 diff before any production application. Applying 012 remains a separate reviewed effect.
