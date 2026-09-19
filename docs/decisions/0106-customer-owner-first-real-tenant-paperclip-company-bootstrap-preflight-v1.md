# ADR 0106 — Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1

- Status: **Accepted preflight — MEDICSPRO Paperclip company NOT created**
- Date: 2026-09-19
- Scope: freeze the exact Paperclip company bootstrap request, authenticated instance-admin path, one-shot semantics, ambiguity reconciliation and postconditions for the first real customer tenant before any Paperclip/provider binding, eligibility or employee effect.

## REAL NOW

Canonical Git entering this preflight:

```text
main = 6865551b5c841234714834cc37b904d52eb13768
open PRs = 0
```

Canonical Wandora target:

```text
organization_id   = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
slug              = medicspro
display_name      = MEDICSPRO
status            = active
digital employees = 0
control bindings  = 0
employee bindings = 0
hire operations   = 0
eligibility rows  = 0
```

Current global provider/hire state:

```text
organizations total       = 4
control bindings total    = 2
employee bindings total   = 2
hire operations total     = 2
unfinished hire operations= 0
eligibility rows/enabled  = 0 / 0
```

Live effect/runtime switches:

```text
Organization Adapter                 = ON
Customer Digital-Employee Hire       = ON
Human Send                           = absent / OFF
Gateway outbound                     = absent / OFF
```

The global customer-hire route being ON does not make MEDICSPRO eligible: tenant/catalog eligibility remains exactly zero.

Live Paperclip was reverified read-only:

```text
image               = wandora/paperclip:v2026.831.1
source commit       = 65ec059bde30d98c92165b24a30a540800dd1f6f
health              = ok
deploymentMode      = authenticated
deploymentExposure  = private
bootstrapStatus     = ready
database backup     = enabled / ok

companies total     = 2
MEDICSPRO exact-name matches = 0
```

Existing Paperclip companies remain exactly the already-canonical pair:

```text
815d499e-4231-4e6b-b7fc-67f0ba22a595
  Wandora Internal Supervised Proof

e7422a00-1474-49d5-ac32-34594520015e
  Wandora Customer Hire Canary
```

The protected operator Board credential remains valid when addressed against the stored private API base:

```text
source          = board_key
isInstanceAdmin = true
active company memberships = 2
```

No credential value was printed or copied into Git.

## PROVEN PROVIDER CONTRACT / REUSE GATE

ADR 0037 and the Capability Authority map remain authoritative: Paperclip owns the provider control-plane company capability behind the Wandora Organization Adapter boundary. Wandora must not create a competing company/control-plane subsystem merely because MEDICSPRO has no provider binding yet.

The live Paperclip image and source commit are unchanged from ADRs 0071/0072. Therefore their provider-company contract remains reusable:

1. company creation is the official instance-admin `POST /api/companies` capability;
2. the accepted payload has no provider idempotency-key field;
3. `companies.name` is not unique;
4. provider creation plus route-level owner membership/audit is not an externally atomic operation;
5. a timeout, broken response or later HTTP failure may still have created provider state;
6. blind retry is therefore forbidden;
7. the official CLI path used in ADR 0072 performs one create request when run non-interactively with an already-valid Board credential.

The CLI currently exposes the canonical create boundary as:

```text
paperclipai company create
  --payload-json <CreateCompany JSON>
  --api-base <private API base>
  --json
```

A read-only operator check during this preflight also found an important operational requirement: using the stored auth file without the matching `--api-base http://127.0.0.1:3100` produced `401 Board authentication required` before any mutation. Supplying the matching private API base resolved the expected Board identity and company list. Future execution must therefore pass the API base explicitly rather than relying on CLI defaults.

## FROZEN PROVIDER REQUEST

Exactly one future Paperclip company-create request is authorized:

```json
{"name":"MEDICSPRO"}
```

Canonical UTF-8 request-body SHA-256:

```text
6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b
```

No description, budget override, Organization Adapter binding, HMAC/secret, plugin config, eligibility, employee or messaging effect belongs to this bootstrap.

The future execution path is frozen as:

```text
inside private wandora-paperclip container
  -> use existing protected PAPERCLIP_AUTH_STORE
  -> explicitly target http://127.0.0.1:3100
  -> auth whoami and require isInstanceAdmin=true
  -> company list and require exact frozen two-company baseline
  -> require MEDICSPRO exact-name matches = 0
  -> re-read Wandora MEDICSPRO zero-provider/zero-employee/zero-eligibility state
  -> dispatch company create exactly once with the frozen JSON
  -> reconcile independently through provider reads
  -> STOP
```

The protected auth-store path may be reused in place:

```text
/paperclip/operator-cli/activation-v1/auth.json
```

Its token must never be printed, copied into argv, Git, Wandora PostgreSQL or customer-visible state.

## PRE-DISPATCH GATES

Immediately before the future create request, require all of the following again:

```text
Paperclip health = ok
source commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
Board isInstanceAdmin = true

Paperclip companies total = 2
exact MEDICSPRO matches = 0
existing two company ids/names = exact canonical baseline

MEDICSPRO active org = 1
MEDICSPRO digital employees = 0
MEDICSPRO control bindings = 0
MEDICSPRO employee bindings = 0
MEDICSPRO hire operations = 0
MEDICSPRO eligibility = 0
unfinished hires total = 0
```

Any mismatch is a stop condition. Do not reinterpret a changed baseline as permission to proceed.

## SUCCESS POSTCONDITIONS FOR THE FUTURE EXECUTION

A clean company-bootstrap execution must prove:

```text
Paperclip companies total       = 3
MEDICSPRO exact-name matches    = 1
new MEDICSPRO company id        = non-null and distinct from the two existing ids
new MEDICSPRO company status    = active

operator Board identity:
  isInstanceAdmin               = true
  MEDICSPRO membership          = owner / active

MEDICSPRO Paperclip agents      = 0
MEDICSPRO plugin config         = null
MEDICSPRO company secrets       = 0
```

Paperclip provider-local environment/support state created by its native company service is provider-owned implementation state and is not duplicated into Wandora.

Wandora must remain unchanged by the company bootstrap itself:

```text
MEDICSPRO digital employees     = 0
MEDICSPRO control bindings      = 0
MEDICSPRO employee bindings     = 0
MEDICSPRO hire operations       = 0
MEDICSPRO eligibility           = 0
Human Send                      = OFF
Gateway outbound                = OFF
```

Organization Adapter custody/config/binding is a separate later effect.

## AMBIGUITY / FAILURE POLICY

There is **no blind retry after dispatch**.

### Pre-dispatch failure

If auth, health, source commit, company baseline or Wandora target state does not match the frozen gates, do not call create.

### Case A — complete provider effect is present

If read-only reconciliation finds exactly one new company beyond the frozen two-company baseline, its exact name is `MEDICSPRO`, status is active, the operator has active owner membership, agents are zero, and no config/secret appeared, adopt that provider company ID as the successful effect even if the original response was lost.

Do not POST again.

### Case B — no new company is observed after an ambiguous dispatch

Do not immediately retry.

Because provider creation is not externally atomic and an in-flight request may complete after the client failed, stop the execution slice and preserve evidence. A separately reviewed recovery may re-read durable state later before deciding whether another POST is safe.

### Case C — partial/orphan state

If a new MEDICSPRO company exists but required membership/postconditions are incomplete, stop.

Do not direct-SQL repair, create a second company, create a Wandora provider binding, or continue into HMAC/config/eligibility/hire.

Provider deletion is not assumed as normal rollback for this bootstrap.

### Case D — multiple/unexpected companies or matches

Stop immediately. Company name is not a provider uniqueness boundary.

## SECOND ADVERSARIAL REVIEW

Rejected:

- assuming `MEDICSPRO` name is unique in Paperclip;
- treating the create endpoint as idempotent;
- retrying after timeout/reset/unreadable response;
- using a custom curl/client when the proven official CLI path already exists;
- relying on CLI default API-base selection after the observed no-effect 401;
- creating the Paperclip company and Wandora control-plane binding in one script;
- generating the Organization Adapter HMAC or Paperclip secret/config in the same slice;
- enabling MEDICSPRO eligibility merely because the global hire gate is already ON;
- creating or hiring a digital employee in the bootstrap;
- disabling/re-enabling the unrelated global hire gate just for this provider mutation;
- using direct Paperclip SQL for creation, repair or cleanup;
- assuming DELETE is the normal rollback for partial creation;
- enabling Human Send or Gateway outbound.

The strongest safe path is the already-proven ADR 0072 one-shot official CLI pattern with a frozen pre-call baseline and read-only reconciliation.

## EXECUTION

This preflight performed only read-only Git/runtime/database/provider inspection and documentation.

No Paperclip company-create request was sent.

No control-plane binding, HMAC file, Paperclip secret/config, eligibility, digital employee, hire operation or outbound effect was created.

## VALIDATION

Post-preflight read-only state remains:

```text
Paperclip companies           = 2
Paperclip MEDICSPRO company   = absent

Wandora organizations         = 4
MEDICSPRO active org          = 1
MEDICSPRO digital employees   = 0
MEDICSPRO control bindings    = 0
MEDICSPRO employee bindings   = 0
MEDICSPRO hire operations     = 0
MEDICSPRO eligibility         = 0

unfinished hires total        = 0
eligibility rows/enabled      = 0 / 0

Organization Adapter          = ON
Customer Digital-Employee Hire= ON
Human Send                    = OFF
Gateway outbound              = OFF

Auth / DB / Web / Core / Paperclip / Messaging Gateway = healthy
```

## RESULT

**Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1 is complete and GO for a separate bounded execution slice.**

The exact MEDICSPRO provider request, current two-company baseline, explicit private API-base/auth path, non-idempotent one-shot semantics, ambiguity reconciliation and no-coupling boundary are frozen.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1**

Create exactly one Paperclip company named `MEDICSPRO` through the frozen official CLI path, reconcile it independently, and stop.

Do not create Organization Adapter HMAC/secret/config, Wandora provider binding, eligibility or any digital employee during that execution.
