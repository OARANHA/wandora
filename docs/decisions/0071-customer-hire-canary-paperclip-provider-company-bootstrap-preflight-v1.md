# ADR 0071 — Customer Hire Canary Paperclip Provider Company Bootstrap Preflight V1

- Status: **Accepted preflight — no Paperclip company created**
- Date: 2026-09-18
- Scope: freeze the exact provider-company bootstrap request, authenticated operator path, ambiguity/reconciliation policy and postconditions for the employee-free customer-hire canary before any provider mutation

## REAL NOW

Canonical Git entering this preflight:

```text
main = 38f5a702fe3bcc3efcfebbe479a61201e4731fcd
PR #115 = merged
open PRs = 0
```

Canonical Wandora canary state:

```text
organization_id   = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
slug              = wandora-customer-hire-canary
display_name      = Wandora Customer Hire Canary
status            = active
digital employees = 0
control bindings  = 0
hire operations   = 0
```

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

Paperclip live state was reverified read-only:

```text
image               = wandora/paperclip:v2026.831.1
commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
health              = ok
deploymentMode      = authenticated
deploymentExposure  = private
bootstrapStatus     = ready
database backup     = enabled / ok
companyDeletionEnabled = false

companies total     = 1
Wandora Customer Hire Canary name matches = 0
existing company id = 815d499e-4231-4e6b-b7fc-67f0ba22a595
existing company    = Wandora Internal Supervised Proof
```

The protected operator Board API key was verified through the live read-only endpoint:

```text
GET /api/cli-auth/me
HTTP = 200
source = board_key
isInstanceAdmin = true
current company memberships = 1
```

The token/key value was not printed or written to Git.

## PROVEN PROVIDER CONTRACT

The pinned Paperclip source at the live commit proves:

1. `POST /api/companies` requires a Board actor and then requires either local-implicit or `isInstanceAdmin`;
2. the validated creation contract accepts `name`, optional description/budget/default responsible user and has no idempotency-key field;
3. the route calls `companyService.create()`, then creates/ensures the human owner membership and default owner grants, then records `company.created`;
4. `companyService.create()` persists the company, ensures the provider-local environment and invokes bundled-agent auto-provisioning before the route-level membership/audit steps;
5. the whole HTTP route is therefore not one externally atomic transaction;
6. `companies.name` is not unique;
7. the unique company field is the provider-owned issue prefix, and the service resolves prefix collisions by allocating another prefix.

Consequences:

- replaying the same POST is **not idempotent**;
- a timeout, broken response or HTTP failure after request dispatch can still have created a company;
- same-name lookup alone is not a general provider idempotency mechanism;
- this preflight can safely use exact-name reconciliation only because it first proves there are zero existing companies with this exact canary name and freezes the complete pre-call company baseline.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora company-control-plane subsystem is approved.

Paperclip owns provider company creation. Wandora only needs the eventual private organization → provider company reference in its already-accepted Organization Adapter state.

Therefore this slice uses the official Paperclip instance-admin API rather than:

- direct Paperclip SQL;
- a new Wandora company registry;
- hidden company creation inside the customer hire POST;
- provider IDs in customer-facing contracts.

## FROZEN PROVIDER REQUEST

Exactly one future provider request is authorized:

```json
{"name":"Wandora Customer Hire Canary"}
```

Canonical UTF-8 request-body SHA-256:

```text
e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe
```

No description, budget override, provider binding, plugin config, HMAC, employee or messaging effect is included.

Execution path:

```text
inside private wandora-paperclip container
  -> read existing protected operator CLI Board credential
  -> GET /api/cli-auth/me and require isInstanceAdmin=true
  -> GET /api/companies and require frozen baseline
  -> POST /api/companies exactly once
  -> reconcile independently through GET state
```

The existing credential is reused in place. Its value must never be printed, copied into a shell transcript, persisted to Git or copied into Wandora business state.

## SUCCESS POSTCONDITIONS

A clean successful execution must establish:

```text
Paperclip companies total                      = 2
exact-name canary matches                      = 1
new company name                               = Wandora Customer Hire Canary
new company status                             = active
new company id                                 = non-null and different from the internal company id

operator /api/cli-auth/me:
  isInstanceAdmin                              = true
  new company membership                      = active owner

GET /api/companies/:newCompanyId/agents        = 0 agents

Wandora canary:
  digital employees                            = 0
  control-plane provider bindings              = 0
  digital-employee provider bindings           = 0
  hire operations                              = 0

Customer Digital-Employee Hire                 = OFF
Human Send                                     = OFF
Gateway outbound                               = OFF
```

A provider-local environment created by Paperclip as part of its native company service is provider-owned implementation state and is not duplicated into Wandora.

No Organization Adapter plugin config/custody/binding is created in this slice.

## AMBIGUITY / FAILURE POLICY

There is **no blind retry**.

After the POST is dispatched, any of the following is treated as potentially effectful until state proves otherwise:

- client timeout;
- connection reset;
- malformed/unreadable response;
- non-201 HTTP status;
- process/chat interruption before the response is observed.

Recovery begins with read-only reconciliation against the frozen pre-call baseline.

### Case A — complete company is present

If exactly one new company exists, its exact name matches the frozen name, and all success postconditions including active owner membership and zero agents hold, adopt that provider company ID as the successful effect even if the original response was lost.

Do not POST again.

### Case B — no new company is observed

Do not immediately retry.

Because the route is not externally atomic and an in-flight request may still complete after a client-side failure, stop the execution slice and preserve evidence. A later reviewed recovery can recheck durable state before deciding whether another POST is safe.

### Case C — partial/orphan company is present

If a new exact-name company exists but required owner membership/postconditions are incomplete, stop.

Do not:

- direct-SQL repair;
- mint a second company;
- invent a Wandora provider binding to the incomplete state;
- continue to custody/config/hire.

The live health contract currently reports `companyDeletionEnabled=false`; therefore deletion is not accepted as the normal rollback assumption for this canary. Preserve the provider state and handle it in a separately reviewed recovery.

### Case D — multiple unexpected companies/matches

Stop immediately and investigate. Name is not a provider uniqueness boundary.

## SECOND ADVERSARIAL REVIEW

Rejected:

- assuming company name is unique;
- treating a failed HTTP response as proof of no effect;
- retrying after timeout with the same body merely because the request is small;
- creating a Wandora idempotency row before a provider company exists;
- creating the provider company and Organization Adapter binding in one blind script;
- relying on DELETE as normal rollback while the live feature reports company deletion disabled;
- using direct provider SQL for creation or cleanup;
- creating company-scoped HMAC custody/config in this slice;
- enabling customer hire in the public live Core;
- creating/hiring Ana;
- enabling Human Send or Gateway outbound.

## EFFECT BOUNDARY

This preflight performs no provider/business mutation.

Still true after the preflight:

```text
Paperclip companies = 1
Paperclip canary company = absent
Wandora canary employees = 0
Wandora canary provider binding = 0
Wandora canary hire operations = 0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Customer Hire Canary — Paperclip Provider Company Bootstrap Preflight V1 is complete.**

The exact request, live instance-admin execution path, non-idempotent provider semantics, stop-on-ambiguity recovery rule and postconditions are frozen.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Paperclip Provider Company Bootstrap Execution V1.**

Send the exact company-create request once, reconcile the provider state independently, and stop after a single clean provider company exists.

Do not create HMAC custody/config, Wandora control-plane binding, customer hire, activation or messaging/outbound effects in the same execution slice.
