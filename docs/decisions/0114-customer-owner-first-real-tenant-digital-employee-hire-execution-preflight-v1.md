# ADR 0114 — Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1

- Status: **Accepted preflight — MEDICSPRO customer hire is ready for one separately reviewed real owner execution; no hire/activation/outbound effect performed**
- Date: 2026-09-19
- Scope: revalidate the first real MEDICSPRO `ana-commercial-v1` customer-hire boundary after ADR 0112 eligibility, freeze the exact customer/browser execution and ambiguity policy, and prove that eligibility has not already materialized any employee/provider effect.

## REAL NOW

Canonical Git at preflight entry:

```text
main = a299b4f7fc1c829c9153f78060507ceca3849460
PR #162 = merged
open PRs = 0
```

ADR 0112 has already made exactly one customer-hire eligibility live:

```text
organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
slug         = medicspro
catalog      = ana-commercial-v1
enabled      = true
```

Current critical runtime observed during this preflight:

```text
wandora-core              = wandora/core:organization-adapter-candidate-af542864d267 | healthy
wandora-web               = wandora/web:owner-access-candidate-5f135e90            | healthy
wandora-paperclip         = wandora/paperclip:v2026.831.1                          | healthy
wandora-messaging-gateway = wandora/messaging-gateway:origin-fix-94cfb4de          | healthy
supabase-auth             = supabase/gotrue:v2.196.0                               | healthy
supabase-db               = supabase/postgres:17.6.1.136                           | healthy
```

Live effect switches:

```text
Organization Adapter                 = ON
Customer Digital-Employee Hire       = ON
Human Send                           = OFF / flag absent
Gateway outbound                     = OFF / flag absent
```

The repository-scoped self-hosted runner from ADR 0113 is active as `wandora-vps-01-ci`. PR #162's exact technical head passed all seven workflows through the isolated rootless-Docker boundary.

## PROVEN EVIDENCE

### MEDICSPRO remains clean before hire

Fresh read-only production evidence:

```text
active MEDICSPRO organization        = 1
active owner/admin                   = 1
active owner                         = 1
owner Supabase identity mapping      = 1

MEDICSPRO digital employees          = 0
MEDICSPRO employee-provider bindings = 0
MEDICSPRO hire operations            = 0
MEDICSPRO control bindings           = 1

MEDICSPRO eligibility rows           = 1
MEDICSPRO eligibility enabled        = 1
global enabled eligibility rows      = 1
global unfinished hire operations    = 0
```

The control binding still targets the canonical Paperclip company:

```text
a63f27a8-dbac-4552-a456-b3a21302226b
```

The protected MEDICSPRO Core HMAC remains:

```text
mode/group = 0640 / wandora-admin:wandora-ops
size       = 64 bytes
sha256     = 020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8
```

That is the same hash accepted by ADR 0110 for Paperclip secret version 2/current. No plaintext was read or printed.

The authenticated Paperclip operator CLI was used read-only against the exact MEDICSPRO company and returned an empty agent list:

```text
MEDICSPRO Paperclip agents = 0
```

The live Paperclip Organization Adapter worker process is running and Paperclip itself is healthy.

### Live customer availability projection is open

The live Core image's packaged `/app/dist` was inspected because the OCI revision label alone was not sufficient evidence after later eligibility work. The running image contains the accepted eligibility/reconciliation implementation, including:

- `digital_employee_catalog_hire_eligibility`;
- `catalog-hire-not-eligible`;
- `reconciliation-required`;
- runtime parsing for `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED`.

A no-effect invocation of the **actual live Core read service** against the live PostgreSQL state, under the canonical owner identity, returned only:

```json
{
  "itemCount": 0,
  "hire": {
    "catalogKey": "ana-commercial-v1",
    "available": true,
    "state": "available"
  }
}
```

This directly proves that the currently running Core projects MEDICSPRO as available for a new Ana hire.

This read-model proof intentionally did **not** manufacture or extract a browser bearer token and therefore does not claim to re-prove JWT authentication. The genuine owner browser/session path was already proven by ADR 0105. The live Web source has no `apps/web/` delta from its deployed source commit to current main, and the owner/membership/Supabase identity mapping remains exact. The future execution must nevertheless revalidate a fresh normal owner session before dispatch.

### Customer/browser hire contract

The live Web route remains:

```http
POST /api/v1/organizations/:organizationId/digital-employees
Authorization: Bearer <normal Supabase owner session>
Idempotency-Key: <browser-generated UUIDv4>
Content-Type: application/json

{"catalogKey":"ana-commercial-v1"}
```

The Web Nginx allow-list proxies only the canonical organization UUID route, forwards `Authorization` and `Idempotency-Key`, strips browser cookies, and does not expose provider credentials.

The Web idempotency helper is organization+catalog scoped:

```text
wandora:customer-hire:idempotency:v1:<organizationId>:ana-commercial-v1
```

It:

1. reuses the same UUIDv4 from `sessionStorage` across refresh/retry;
2. persists the key **before** the POST;
3. generates a new key only when there is no current/persisted operation;
4. keeps the key after an ambiguous `employee-hiring-uncertain` response;
5. clears it only after a validated successful response;
6. never lets another tenant reuse the same browser operation key.

The Core/Organization Adapter contract remains fail-closed in this order for a brand-new catalog hire:

```text
normal human session
-> active owner/admin membership
-> existing same-key operation
-> existing same-catalog operation
-> tenant/catalog eligibility
-> legacy employee collision
-> control-plane binding
-> reserve one durable hire operation
-> Paperclip catalog reconciliation
-> local finalization
```

Existing unfinished same-catalog state may be resumed only with its original idempotency key. A completed same-catalog operation is deduplicated even if a different key is later presented.

### Paused-first is still the contract

The catalog/provider definition remains:

```text
catalogKey = ana-commercial-v1
name       = Ana
role       = commercial-assistant
autonomy   = supervised
status     = paused
budget     = 0
adapter    = wandora_mastra
```

The Paperclip capability used by the plugin is managed-agent reconciliation, not resume/activation. Core finalization inserts the Wandora employee as `paused + supervised`.

Therefore **Contratar Ana is not Ativar Ana**.

## GAPS

No architecture or domain-model gap remains for the hire effect itself.

One runtime fact is intentionally deferred to execution because proving it now would require unnecessary handling of a live browser credential:

- a **fresh normal owner browser session** must still be present immediately before the real POST.

That execution gate is satisfied only by normal customer login/session behavior. Service-role impersonation, admin-minted JWTs, token extraction into chat/docs, or direct Organization Adapter invocation are rejected.

No activation route/control is part of this slice. Ana may exist after hire only as `paused + supervised`.

## CAPABILITY AUTHORITY / REUSE GATE

The requested capability is already implemented by the accepted boundary:

```text
Wandora customer hire contract/policy
  -> Wandora Core authorization + idempotency/reconciliation journal
  -> Organization Adapter
  -> Paperclip managed-agent capability
```

Wandora-owned durable state is already the minimum justified state:

- customer-facing employee projection/stable ID;
- tenant-scoped eligibility policy;
- provider binding;
- hire operation journal for idempotency/ambiguity;
- employee-provider mapping after success.

No new table, scheduler, employee lifecycle, Paperclip clone, workflow engine or provider-specific browser contract is justified.

**Reuse Gate result: PASS — reuse existing Organization Adapter/Paperclip capability; build nothing new for this execution.**

## DECISION

The first real MEDICSPRO digital-employee hire may proceed in the next separately reviewed slice **only through the normal customer/browser path**.

Frozen execution sequence:

```text
fresh REAL NOW / Git / runtime / zero-state recheck
-> owner logs in normally if needed
-> /api/v1/me = 200 and MEDICSPRO owner
-> GET MEDICSPRO /digital-employees
-> require items=[] + hire.available=true + state=available
-> human chooses Contratar Ana
-> Web persists one UUIDv4 idempotency key
-> exactly one canonical POST is dispatched
-> no blind retry
-> independent Wandora + Paperclip reconciliation
-> same-key replay only if an ambiguous result requires it
-> prove Ana = paused + supervised
-> prove Human Send OFF
-> prove Gateway outbound OFF
```

Expected successful durable/provider postcondition:

```text
MEDICSPRO digital employees          = 1
employee name/role                   = Ana / commercial-assistant
employee status/autonomy             = paused / supervised

MEDICSPRO employee-provider bindings = 1
MEDICSPRO ana-commercial-v1 hire ops = 1
hire status                          = completed

MEDICSPRO Paperclip managed Ana      = 1
Paperclip Ana status                 = paused
adapter                              = wandora_mastra

Human Send                           = OFF
Gateway outbound                     = OFF
activation/resume                    = NOT performed
```

Eligibility is policy and may remain enabled after the completed deduplicated hire; the completed operation/read projection must then report `already-hired`.

## AMBIGUITY / FAILURE POLICY

If the browser response is lost, times out, the chat/tool connection drops after dispatch, or Core returns `employee-hiring-uncertain`:

1. **do not create a new idempotency key**;
2. do not click from another browser/session as a recovery shortcut;
3. inspect the exact MEDICSPRO hire operation and Paperclip managed-agent state;
4. if fully completed and all invariants match, adopt success;
5. if incomplete/uncertain and the original browser session still owns the persisted key, only that same key may retry;
6. if provider state exists while Wandora finalization is inconsistent, stop for a separately reviewed recovery;
7. never delete/recreate provider state merely to make the first execution look clean.

If login, availability or zero-state checks fail **before** the POST, stop with no hire effect.

## SECOND ADVERSARIAL REVIEW

The following shortcuts were rejected:

- infer readiness merely from ADR 0112 eligibility;
- trust the live Core OCI revision label without inspecting its actual packaged eligibility code;
- use a direct operator/Core POST instead of proving the customer browser contract;
- extract or persist the owner's bearer token for convenience;
- mint an admin/service-role session;
- call Paperclip or the Organization Adapter directly;
- pre-create a hire operation before the customer action;
- retry an ambiguous effect under a new key;
- treat an empty Wandora employee table as sufficient without also checking Paperclip;
- treat `Contratar` as permission to resume/activate Ana;
- enable Mastra execution, Human Send or Gateway outbound as part of hiring;
- introduce a new Wandora employee control plane when Paperclip already supplies it.

The most important adversarial finding was provenance-related: the live Core image label by itself does not express every later eligibility change. Inspection of the **running image's packaged JS** plus direct live read-model execution closed that gap without redeploying anything.

## EXECUTION

This preflight performed only read-only repository/runtime/database/provider inspection plus documentation.

It did **not**:

- call the customer hire POST;
- create Ana in Wandora or Paperclip;
- create a hire operation;
- create an employee-provider binding;
- resume/activate any agent;
- enable Human Send;
- enable Gateway outbound;
- rotate Organization Adapter HMAC/secret state;
- change eligibility;
- deploy/recreate any customer runtime.

## VALIDATION

Final no-effect validation for this preflight must retain:

```text
MEDICSPRO employees          = 0
MEDICSPRO employee bindings  = 0
MEDICSPRO hire operations    = 0
MEDICSPRO Paperclip agents   = 0
MEDICSPRO eligibility        = 1 enabled
global unfinished hires      = 0
Human Send                   = OFF
Gateway outbound             = OFF
```

The live Core read-model proof must remain `available=true` until the future hire effect or another reviewed policy/state change occurs.

## DECISION RESULT

**Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1 is GREEN.**

The first real customer hire boundary is fully prepared. Eligibility is no longer the gate; the remaining effect is one explicitly initiated normal-owner browser hire that must materialize **paused + supervised** Ana and nothing more.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Hire Execution V1.**

Execute only the frozen normal-owner browser hire, reconcile one Wandora employee + one employee-provider binding + one completed operation + one Paperclip managed Ana, and keep Ana paused/supervised with Human Send and Gateway outbound OFF.
