# ADR 0065 — Customer Hire Canary Selection + Legacy Employee Reconciliation Preflight V1

- Status: **Accepted preflight — no production mutation executed**
- Date: 2026-09-18
- Scope: select the first safe customer-like hire canary, reject unproven legacy adoption, and define the minimum prerequisites for a bounded paused-first live proof

## REAL NOW

Canonical Git at preflight:

```text
main = b858192d8e686be41e990b04572d54493a62fb73
open PRs = 0
```

Live runtime reverified read-only:

```text
Core      = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Web       = wandora/web:team-read-b31db507, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de, healthy

Paperclip deployment mode/exposure = authenticated/private
Paperclip bootstrapStatus          = ready
Paperclip database backup status   = ok

Organization Adapter              = ON
Customer Digital-Employee Hire    = OFF / flag absent
Human Send                        = OFF / flag absent
Gateway outbound                  = OFF / flag absent
```

Live Wandora state:

```text
organizations = 2
digital employees = 3
control-plane provider bindings = 1
digital-employee provider bindings = 1
completed catalog hire operations = 1
```

Tenant detail:

```text
Wandora Internal Supervised Proof
  -> already owns the completed Organization Adapter catalog canary
  -> canonical Ana is provider-bound
  -> catalog hire operation already completed
  -> not a first-hire candidate

Empresa Exemplo
  -> legacy Ana exists
  -> Ana is active + supervised
  -> no control-plane provider binding
  -> no digital-employee provider binding
  -> no catalog hire operation
  -> no tenant_provisioning_requests evidence for the organization/employee
```

The legacy organization, owner membership and Ana share the same original creation timestamp. A later guarded operation linked the existing owner identity to Supabase Auth, but that evidence proves human ownership only; it does not prove that the legacy Ana was intended to be catalog identity `ana-commercial-v1`.

The production platform provisioner remains inert:

```text
wandora_platform_provisioner
  LOGIN = true
  CONNECTION LIMIT = 0
  password = absent
  BYPASSRLS = false

provision_beta_organization_v1(...) = present
platform provisioner EXECUTE grant = present
Platform Admin runtime container = absent
```

## PROVEN EVIDENCE — CURRENT TENANT PROVISIONER CONFLICTS WITH PAUSED-FIRST HIRE

ADR 0030 / migration 008 predates the separated customer hire contract.

Its canonical V1 transaction creates:

1. organization;
2. canonical user / identity mapping;
3. owner membership;
4. **one active supervised commercial-assistant digital employee**;
5. provisioning idempotency evidence.

Therefore a new tenant provisioned with the default `Ana` immediately contains the exact legacy shape that ADR 0064 now blocks with `catalog-conflict`.

Passing another employee display name would avoid only the name match. It would still create an unrelated active employee before the customer hire canary and would leave a non-representative extra employee in `Equipe`.

That is not a clean paused-first hiring proof.

## CAPABILITY AUTHORITY / REUSE GATE

The missing capability is not a second organization system.

Wandora already owns canonical organization, user and membership identity. ADR 0030 already owns the operator-only provisioning primitive. Paperclip must not create Wandora tenants, and Customer Hire must not become a tenant-provisioning API.

The required change is therefore a **narrow V2 of the existing Wandora provisioning boundary**, not a new domain subsystem:

```text
tenant provisioning V2
  -> organization
  -> canonical user / identity mapping
  -> active owner membership
  -> provisioning idempotency evidence
  -> zero digital employees
```

Digital employees are then created only by the separately reviewed Customer Hire contract.

## DECISION — DO NOT ADOPT EMPRESA EXEMPLO ANA

`Empresa Exemplo` is not selected for the first customer hire canary.

Automatic or operator-assisted adoption is rejected in this preflight because the durable evidence does not prove:

- catalog key `ana-commercial-v1`;
- prior Paperclip company identity;
- prior Paperclip managed-agent identity;
- prior Organization Adapter operation;
- intended provider binding;
- intended paused-first lifecycle.

Name, role and autonomy similarity are insufficient identity evidence.

The existing local state also says `active`, while the accepted first-hire contract says a new hire finalizes `paused + supervised`. Rewriting that row into catalog history during the first customer canary would combine legacy migration, provider bootstrap and hire validation into one effect surface.

A future explicit legacy reconciliation ADR may still be designed if retaining that legacy employee as the catalog Ana is valuable. It is not required to prove the normal customer path.

## DECISION — SELECT A FRESH CUSTOMER-LIKE CANARY

The first paused-first customer hire canary will use a new internal customer-like Wandora organization with no digital employees at the start of the hire proof.

Canonical future fixture identity:

```text
display name = Wandora Customer Hire Canary
slug         = wandora-customer-hire-canary
purpose      = internal customer-like production canary only
```

It may reuse an already-authorized canonical human owner through the existing Supabase-subject mapping behavior. No new Auth user is required merely for the canary.

The organization must be created only after Tenant Provisioning V2 exists and its live application is separately reviewed.

Pre-hire invariant:

```text
organization = 1
active owner membership = 1
digital employees = 0
control-plane provider binding = 0 initially
digital-employee provider bindings = 0
catalog hire operations = 0
messaging/provider/outbound effects = 0
```

## DECISION — TENANT PROVISIONING V2

The next implementation slice will introduce a versioned employee-free provisioning primitive rather than changing V1 in place.

Expected shape:

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

Rules:

- same normalization/idempotency model as V1;
- same existing-user reuse semantics;
- active owner membership;
- no digital employee creation;
- no Paperclip/provider state;
- no messaging connection;
- no outbound effect;
- no browser access;
- no `wandora_core_runtime` access;
- only the dedicated platform provisioner role may execute after the reviewed migration grants it;
- V1 remains unchanged for historical compatibility.

This supersedes only ADR 0030's assumption that tenant provisioning must create an initial employee. The newer customer lifecycle contract makes employee hire a separate explicit operation.

## DECISION — FIRST LIVE CANARY MUST NOT ENABLE THE PUBLIC CORE GLOBALLY

PR #109 introduced a dedicated customer-hire runtime gate, but that gate is runtime-wide rather than tenant-specific.

Turning it on in the public live Core merely to exercise one canary would expose the POST contract to every authenticated owner/admin whose Web can reach that Core.

That is broader than required for a first production effect proof.

Therefore the first live hire proof must use a **private production-connected candidate Core**:

```text
private candidate Core
  + production DB
  + Human API
  + Organization Adapter
  + Customer Digital-Employee Hire gate ON
  + no public customer ingress
```

The normal live Core remains customer-hire OFF during the canary.

The candidate request must use a real authorized human session and the exact customer POST contract. The browser/public Web does not need to be widened merely to prove the server-side production effect.

After the proof, the candidate is removed. A later separately reviewed rollout decides when the normal live Core/Web may expose hiring generally.

## FUTURE CANARY PREREQUISITE SEQUENCE

After Provisioning V2 is code-reviewed, merged and separately applied live, the bounded execution sequence is:

1. provision exactly one `Wandora Customer Hire Canary` organization with zero employees;
2. verify exact organization/owner/idempotency state;
3. bootstrap exactly one matching Paperclip provider company through the authenticated instance-admin path;
4. freeze the provider company reference;
5. establish company-scoped HMAC custody + plugin config using the already-proven Organization Adapter pattern;
6. insert the exact private Wandora organization -> provider company binding through a reviewed operator step;
7. verify still zero digital employees / employee bindings / hire operations;
8. start a private production-connected candidate Core with the #109-or-later reviewed source and customer-hire gate ON;
9. call the exact authenticated customer hire POST for `ana-commercial-v1`;
10. prove one Wandora employee is created `paused + supervised`;
11. prove one provider managed Ana exists and remains paused;
12. prove same-key replay returns the same employee;
13. prove different-key same-catalog replay does not duplicate the employee/provider resource;
14. prove no provider refs/secrets cross the customer response;
15. prove Human Send and Gateway outbound remain OFF;
16. remove the private candidate;
17. leave the normal live Core customer-hire gate OFF.

Each external-effect group remains separately reviewed. Tenant creation, Paperclip company bootstrap, custody/config/binding, and the actual hire are not collapsed into one blind script.

## SECOND ADVERSARIAL REVIEW

Rejected:

- using `Empresa Exemplo` merely because it already has a real owner session;
- declaring the legacy Ana to be `ana-commercial-v1` from name/role similarity;
- changing its status from active to paused as part of a canary;
- using the internal supervised-proof organization, because its catalog hire is already completed and cannot prove first-time paused behavior;
- provisioning a new tenant through V1 with default Ana, because it immediately creates the legacy collision;
- provisioning through V1 with a fake alternate employee name, because it leaves an unrelated active employee and does not represent normal onboarding;
- direct SQL inserts for a clean organization that bypass the canonical provisioning boundary;
- changing V1 in place and altering historical replay semantics;
- creating a new organization subsystem instead of versioning the existing private provisioner;
- enabling customer hire on the public live Core solely for one canary;
- coupling canary hire to Human Send or Gateway outbound;
- creating the canary tenant or Paperclip company during this preflight.

## EFFECT BOUNDARY

This preflight performs no live business/provider mutation.

Still unchanged:

```text
production organizations = 2
Empresa Exemplo provider binding = absent
new customer-hire canary organization = absent
new Paperclip canary company = absent
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Customer Hire Canary Selection + Legacy Employee Reconciliation Preflight V1 is complete.**

Selected direction:

```text
fresh employee-free Wandora tenant
  -> separately bootstrapped Paperclip company
  -> private candidate Core hire proof
  -> paused-first Ana
```

Legacy `Empresa Exemplo` adoption is explicitly deferred.

## NEXT EXECUTABLE SLICE

**Private Tenant Provisioning V2 — Employee-Free Contract Implementation V1, code/CI only.**

Implement the versioned employee-free private provisioner, least-privilege grant/verifiers and continuity documentation.

Do not apply the new migration to production, create the canary organization, create a Paperclip company, enable Customer Digital-Employee Hire, deploy the #109 Core/Web code, activate employees, or enable outbound effects in that implementation slice.
