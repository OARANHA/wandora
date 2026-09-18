# ADR 0070 — Customer Hire Canary Employee-Free Tenant Provisioning Execution V1

- Status: **Accepted and live**
- Date: 2026-09-18
- Scope: create exactly one employee-free customer-like production canary through the already-live Private Tenant Provisioning V2 contract, then stop before any Paperclip/provider/hire/activation/outbound effect

## REAL NOW

Execution began only after ADR 0069 was merged:

```text
main = 777e8feaba1fa27a41beee740b77115e8b944b18
PR #114 = merged
PR #114 CI = all green
```

Immediately before the production effect:

```text
organizations                       = 2
digital_employees                   = 3
control_plane_provider_bindings     = 1
digital_employee_provider_bindings  = 1
completed catalog hire operations   = 1
tenant_provisioning_requests        = 0
customer-hire canary organization   = absent

V2 function                         = present
platform provisioner EXECUTE V2     = true
Core EXECUTE V2                     = false
authenticated EXECUTE V2            = false
platform provisioner password       = absent
platform provisioner connlimit      = 0
```

Runtime effect state was also unchanged:

```text
Organization Adapter           = ON
Customer Digital-Employee Hire = OFF / absent
Human Send                     = OFF / absent
Gateway outbound               = OFF / absent
```

The frozen owner had exactly one Supabase identity and its runtime-resolved subject still matched ADR 0069's SHA-256:

```text
owner_user_id = e1000000-0000-4000-8000-000000000001
subject sha256 = 72c3ee28cf311358ece8b06c5b07f47ede5f6c7e3b48a38b46e5953883c61bcc
```

The raw provider subject was never printed or written to Git.

The ADR 0067 backup checksum still matched:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

This snapshot now represents pre-canary historical rollback material. Restoring it after this execution would remove the accepted canary state and therefore requires a separate recovery decision rather than being treated as a routine structural rollback.

## DECISION / SECOND ADVERSARIAL REVIEW

The effect remained exactly the ADR 0069 boundary.

Rejected immediately before execution:

- creating a password for `wandora_platform_provisioner`;
- increasing its `CONNECTION LIMIT 0`;
- invoking V2 directly under the superuser effective identity;
- changing the frozen request key after a timeout;
- exposing or persisting the raw Supabase provider subject;
- inserting organization/membership/idempotency state directly;
- creating a Paperclip company in the same operation;
- creating provider custody/config/bindings;
- enabling Customer Digital-Employee Hire;
- creating/hiring/activating Ana;
- enabling Human Send or Gateway outbound.

## EXECUTION

Exact frozen request:

```text
request_key               = customer-hire-canary:tenant-v2:v1
organization_slug         = wandora-customer-hire-canary
organization_display_name = Wandora Customer Hire Canary
owner_user_id             = e1000000-0000-4000-8000-000000000001
owner_display_name input  = Wandora Customer Hire Canary Owner
```

One private local PostgreSQL maintenance session executed:

```text
BEGIN
  -> resolve existing owner Supabase subject
  -> SHA-256 gate against ADR 0069
  -> store subject transaction-locally only
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> provision_beta_organization_v2(...)
  -> require returned user_id = frozen canonical owner
  -> require non-null organization_id
COMMIT
```

Observed transaction result:

```text
BEGIN
DO
SET
DO
COMMIT
```

No new login credential was created and no provider API was called by the provisioning transaction.

## INDEPENDENT POST-VALIDATION

Durable Wandora state after COMMIT:

```text
organizations                       = 3
digital_employees total             = 3
tenant_provisioning_requests total  = 1

canary organization                 = exactly 1 / active
canary active owner membership      = exactly 1
canary owner                        = frozen existing canonical user
canary digital employees            = 0
canary V2 provisioning row          = exactly 1
canary provisioning_version         = 2
canary provisioning employee_id     = NULL

control_plane_provider_bindings     = 1 total / 0 canary
digital_employee_provider_bindings  = 1 total / 0 canary
completed catalog hire operations   = 1 total / 0 canary
```

The platform role remained:

```text
CONNECTION LIMIT = 0
password = absent
```

Effect switches remained:

```text
Organization Adapter           = ON
Customer Digital-Employee Hire = OFF
Human Send                     = OFF
Gateway outbound               = OFF
```

Independent Paperclip API validation returned:

```text
HTTP 200
companies = 1
company = Wandora Internal Supervised Proof
```

Therefore no Paperclip company was created for the new canary and the provider boundary remained untouched.

## FAILURE / REPLAY AUTHORITY AFTER EXECUTION

The frozen request key is now durable production evidence.

Any later uncertainty about tenant provisioning must first inspect:

```text
request_key = customer-hire-canary:tenant-v2:v1
slug        = wandora-customer-hire-canary
```

Do not mint a second provisioning key or recreate the organization.

A same-key replay is permitted only with the exact frozen V2 payload and only when a later reviewed recovery/proof actually needs it. The normal next step does not need a V2 replay.

## EFFECT BOUNDARY

This slice created only:

- one canonical Wandora organization;
- one active owner membership reusing the existing canonical owner;
- one V2 private provisioning-idempotency row.

It did **not**:

- create any digital employee;
- create any Paperclip company;
- create/change HMAC custody or plugin config;
- create a control-plane provider binding;
- create a digital-employee provider binding;
- create a hire operation;
- deploy/enable Customer Digital-Employee Hire;
- activate any employee;
- enable Human Send;
- enable Gateway outbound.

## DECISION

**Customer Hire Canary — Employee-Free Tenant Provisioning Execution V1 is complete and live.**

The canary now exists as the clean employee-free Wandora tenant required by ADR 0065, with provider state still absent.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Paperclip Provider Company Bootstrap Preflight V1.**

Observation/plan-first only.

Before creating a provider company, freeze:

1. current Paperclip company/API/admin state;
2. exact canary Wandora organization identity;
3. exact provider-company name and intended one-to-one mapping;
4. duplicate/timeout detection and recovery semantics for Paperclip company creation;
5. the authenticated instance-admin execution identity/path;
6. exact post-bootstrap invariants and official cleanup/recovery boundary.

Do not create the Paperclip company during that preflight. Keep company-scoped HMAC custody/config, Wandora control-plane binding, customer hire, activation, Human Send and Gateway outbound as later separately reviewed effects.
