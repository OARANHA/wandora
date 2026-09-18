# ADR 0086 — Customer Digital-Employee Hire — Clean Tenant Rollout Candidate Preparation Preflight V1

- Status: **Accepted preflight — real blocker is owner onboarding; no tenant/provider/eligibility effect**
- Date: 2026-09-18
- Scope: determine whether a real clean customer target already exists for the first `ana-commercial-v1` rollout and, if not, freeze the minimum preparation chain before any new tenant/provider/eligibility mutation

## REAL NOW

Canonical Git at the start of this preflight:

```text
main = 791def679b228af4b78c2defc6529100c440731b
PR #133 = merged
open PRs = 0
```

Live runtime remains healthy:

```text
Core      = wandora/core:organization-adapter-candidate-af542864d267
Web       = wandora/web:candidate-af542864d267
Paperclip = wandora/paperclip:v2026.831.1
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de

Core/Web/Paperclip/Gateway = healthy / 0 restarts
Customer Digital-Employee Hire = ON
Human Send = OFF / flag absent
Gateway outbound = OFF / flag absent
```

Live tenant-hire safety state remains:

```text
active organizations = 3
completed ana-commercial-v1 operations = 2
unfinished ana-commercial-v1 operations = 0
eligibility rows = 0
enabled eligibility rows = 0
```

## PROVEN EVIDENCE — NO REAL CLEAN TARGET EXISTS

The active organization inventory remains unchanged.

### Wandora Internal Supervised Proof

```text
active owner/admin path = yes
digital employees = 2
matching Ana = 1
Paperclip control binding = 1
employee provider binding = 1
ana-commercial-v1 completed = 1
eligibility = 0
```

Not a candidate because the exact catalog hire is already completed and the organization is proof state.

### Empresa Exemplo

```text
active owner/admin path = yes
digital employees = 1
matching legacy Ana = 1
Paperclip control binding = 0
employee provider binding = 0
ana-commercial-v1 operations = 0
eligibility = 0
```

Not a clean new-hire target because a matching legacy Ana already exists and no Paperclip control-plane wiring exists.

### Wandora Customer Hire Canary

```text
active owner/admin path = yes
digital employees = 1
matching Ana = 1
Paperclip control binding = 1
employee provider binding = 1
ana-commercial-v1 completed = 1
eligibility = 0
```

Not a candidate because the exact catalog hire is already completed.

Paperclip independently still contains exactly two active companies:

```text
Wandora Customer Hire Canary
Wandora Internal Supervised Proof
```

There is no third provider company waiting to be bound to a new Wandora tenant.

## PROVEN EVIDENCE — OWNER IDENTITY INVENTORY

Current identity cardinality is:

```text
Supabase Auth users = 1
canonical Wandora users = 1
distinct Wandora users with memberships = 1
canonical Wandora users without memberships = 0
```

Therefore there is no already-authenticated, unlinked customer owner waiting for Private Tenant Provisioning V2.

The only V2 provisioning ledger row is the existing employee-free customer-hire canary proof:

```text
provisioning_version = 2
rows = 1
employee-free rows = 1
```

Creating another organization with the same internal owner merely to obtain a rollout target would create another synthetic proof tenant, not a real customer candidate.

## PROVEN EVIDENCE — AUTH BOUNDARY

Live Supabase Auth is:

```text
GoTrue = v2.196.0
public signup = disabled
external e-mail auth = enabled
mailer auto-confirm = false
site URL = https://app.wandora.com.br
SMTP host/port/user/password/admin-email = configured
invite and recovery mailer paths = configured
```

The public-signup closure is intentional and remains correct for beta.

Read-only/no-auth probes against the live private GoTrue service prove both administrative onboarding routes exist and are protected before request-body semantics:

```text
POST /admin/invite
  -> 401 no_authorization

POST /admin/generate_link
  -> 401 no_authorization
```

No invite, link or user was created by these probes.

The existing Private Tenant Provisioning V2 boundary remains live:

```text
wandora_platform_provisioner
  login = true
  superuser = false
  inherit = false
  connection limit = 0
  EXECUTE provision_beta_organization_v2 = true

wandora_core_runtime
  EXECUTE provision_beta_organization_v2 = false
```

V2 deliberately does **not** create an Auth user. It requires a Supabase provider subject that already exists.

## PROVEN EVIDENCE — CURRENT WEB IS LOGIN-ONLY

The current Web auth client supports:

```text
password grant
refresh-token grant
sessionStorage browser session
logout
/api/v1/me canonical bootstrap
```

The current Login page explicitly states that only previously provisioned accounts may enter and public signup remains closed.

Current source contains no invite-acceptance or initial-password contract:

- no public invite callback flow;
- no provider-issued invite-session consumption;
- no first-password/update-user flow;
- no password-reset flow;
- no customer onboarding UI.

ADR 0019 explicitly listed password reset and onboarding/provisioning UI as non-goals for Web Human Session V1.

Therefore the live Auth service can issue a protected invite, but the customer Web does not yet provide the reviewed first-access experience needed to complete that invitation safely.

## CAPABILITY AUTHORITY / REUSE GATE

Identity credential issuance remains a **Supabase Auth capability**.

Wandora must not implement its own password store, invite-token state machine or credential authority merely because first-customer onboarding is missing.

Wandora owns:

- the customer-facing onboarding experience;
- the decision that a reviewed beta customer may receive access;
- mapping the resulting Auth subject into the canonical Wandora user/organization boundary;
- tenant provisioning policy;
- downstream provider-neutral Organization Adapter wiring and rollout policy.

Supabase Auth remains authoritative for:

- Auth users;
- password/session credentials;
- invitation/verification/recovery tokens;
- email identity confirmation.

Paperclip remains irrelevant to human identity creation.

## GAPS

The current first-real-customer path has one prerequisite ahead of tenant creation:

```text
reviewed owner onboarding
  -> real Supabase Auth subject exists
  -> employee-free Wandora tenant V2
  -> Paperclip company bootstrap
  -> Organization Adapter custody/config/binding
  -> tenant eligibility
  -> customer Contratar
```

The missing reviewed product contract is **invite acceptance + first password/session bootstrap**.

A real target-specific provisioning request cannot yet be frozen because no real customer owner identity exists in Auth and no customer organization identity/slug has been selected.

## DECISION

**Do not create another synthetic production tenant.**

Select an **invite-only first-customer onboarding model** while beta signup remains closed.

The preparation sequence is frozen as:

```text
A. implement reviewed Web invite acceptance / first-password flow
B. separately preflight one real customer owner + organization identity
C. issue one protected Supabase Auth administrative invite
D. resolve/read back exactly one provider Auth subject
E. provision one employee-free Wandora tenant through V2
F. create exactly one Paperclip company through the reviewed one-shot bootstrap
G. create Organization Adapter HMAC custody + company secret_ref config + Wandora control binding
H. require zero employee / zero catalog operation / zero eligibility before rollout
I. enable exactly one tenant+catalog eligibility using ADR 0085 serialized transaction
J. customer hires Ana through normal Wandora Web
K. Ana remains paused + supervised; activation/outbound remain separate
```

No real customer's e-mail, Auth subject, organization slug or target UUID is invented or committed by this preflight.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

1. **Create another clean tenant under the existing internal owner** — rejected because it would be another synthetic canary rather than a real-customer rollout target.
2. **Reuse Customer Hire Canary or Internal Supervised Proof** — rejected because the exact catalog hire is already completed.
3. **Adopt Empresa Exemplo** — rejected because it carries matching legacy employee state and no control binding.
4. **Enable public signup** — rejected; it would widen identity enrollment globally merely to solve a controlled beta onboarding problem.
5. **Insert directly into `auth.users`** — rejected; use the supported Supabase Auth admin capability rather than bypassing provider semantics.
6. **Build a Wandora password/invite subsystem** — rejected by capability authority; credentials/tokens remain Supabase Auth state.
7. **Put a service-role/admin credential into Web or normal Core runtime** — rejected; admin Auth actions remain operator-only.
8. **Send an invite before the customer Web can safely consume it** — rejected; a real customer must not be used as the test harness for missing first-access UX.
9. **Provision a Wandora tenant before a reviewed Auth identity exists** — rejected because V2 correctly requires a real provider subject.
10. **Create Paperclip/provider state ahead of the Wandora tenant** — rejected; provider company/wiring remains downstream of canonical tenant ownership.
11. **Enable eligibility as part of onboarding preparation** — rejected; eligibility remains the final tenant-specific rollout switch.
12. **Enable Human Send, Gateway outbound or employee activation** — rejected; those effects remain independent.

## FROZEN NEXT IMPLEMENTATION BOUNDARY

The next implementation slice may change Web/code/CI only.

It must add a provider-compatible **invite acceptance + first password** contract while preserving:

```text
public signup = OFF
service/admin credentials absent from Web
service/admin credentials absent from normal Core runtime
session material browser-scoped
normal password login unchanged
/api/v1/me remains canonical organization authority
zero tenant provisioning
zero Paperclip mutation
zero eligibility
Human Send OFF
Gateway outbound OFF
```

Before implementation, it must inspect the exact live GoTrue v2.196.0 invitation redirect/session contract rather than assuming a generic Supabase client behavior.

At minimum it must prove:

1. an invite callback/session can be consumed only from provider-issued material;
2. URL/session material is cleared or normalized immediately after consumption;
3. the invited human can define the first password through the Auth provider boundary;
4. normal password login works after password definition;
5. an invited-but-not-yet-linked account remains fail-closed through existing `unlinked` behavior;
6. a linked account bootstraps normally through `/api/v1/me`;
7. no browser code receives any admin/service credential;
8. no public signup route is introduced;
9. no customer tenant/provider/hire/outbound effect is required to prove the browser contract.

## EXECUTION

This preflight performed only read-only or unauthenticated no-effect inspection:

- current Git/main/PR authority;
- Core/Web/Paperclip/Gateway health and effect flags;
- Wandora organizations/memberships/employees/bindings/hire/eligibility inventory;
- tenant-provisioning ledger counts;
- Auth-user / canonical-user cardinality;
- non-secret GoTrue signup/mailer configuration presence;
- unauthenticated admin-route protection probes;
- source review of current Web login/session behavior;
- Paperclip company inventory.

It did **not**:

- create an Auth user;
- send an invite or generate an invite link;
- expose an Auth admin/service credential;
- enable public signup;
- provision an organization;
- create a Paperclip company;
- create HMAC/provider binding/config;
- create or modify an eligibility row;
- create or activate an employee;
- create/resume a hire operation;
- enable Human Send or Gateway outbound.

## VALIDATION

Final live invariants remain:

```text
Supabase Auth users = 1
Wandora users = 1
active organizations = 3
Paperclip companies = 2
completed ana-commercial-v1 operations = 2
unfinished ana-commercial-v1 operations = 0
eligibility rows = 0
enabled eligibility rows = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Core/Web/Paperclip/Gateway = healthy
```

## DECISION RESULT

**Clean Tenant Rollout Candidate Preparation Preflight V1 is green.**

There is no real clean tenant to select today. The correct next move is to close the customer-owner first-access gap without weakening signup/auth boundaries.

## NEXT EXECUTABLE SLICE

**Customer Owner Invite Acceptance + First Password Contract Implementation V1.**

Code/CI only.

Do not send a real invite, create a customer Auth user, provision a tenant, create provider state or enable eligibility during that implementation slice.
