# ADR 0107 — Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1

- Status: **Accepted execution — MEDICSPRO Paperclip company live / no binding, eligibility or employee effect**
- Date: 2026-09-19
- Scope: execute exactly the ADR 0106 one-shot provider-company bootstrap for MEDICSPRO, reconcile provider state independently, and stop before Organization Adapter custody/config/binding, eligibility or employee hire.

## REAL NOW

Canonical Git entering execution:

```text
main = dac7d009170cef8cd6135373eda43750b04cc849
open PRs = 0
```

The ADR 0106 target was still exact immediately before dispatch:

```text
Wandora MEDICSPRO
  organization_id   = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
  slug              = medicspro
  display_name      = MEDICSPRO
  status            = active
  digital employees = 0
  control bindings  = 0
  employee bindings = 0
  hire operations   = 0
  eligibility rows  = 0

unfinished hires total = 0
eligibility rows/enabled = 0 / 0
```

Live Paperclip pre-dispatch:

```text
image               = wandora/paperclip:v2026.831.1
source commit       = 65ec059bde30d98c92165b24a30a540800dd1f6f
health              = ok
deploymentMode      = authenticated
deploymentExposure  = private
bootstrapStatus     = ready
database backup     = enabled / ok

companies total             = 2
MEDICSPRO exact-name matches= 0
Board source                = board_key
Board isInstanceAdmin       = true
Board active memberships    = 2
```

The two existing companies matched ADR 0106 exactly:

```text
815d499e-4231-4e6b-b7fc-67f0ba22a595
  Wandora Internal Supervised Proof

e7422a00-1474-49d5-ac32-34594520015e
  Wandora Customer Hire Canary
```

Runtime remained healthy. Organization Adapter and the global customer-hire gate were ON; MEDICSPRO still had zero tenant eligibility. Human Send and Gateway outbound remained absent/OFF.

## PROVEN EVIDENCE / SECOND ADVERSARIAL REVIEW

The exact live CLI source was re-read before the effect.

Installed command:

```text
company create
  -> createCompanyForContext(...)
  -> ctx.api.post("/api/companies", payload)
```

The live HTTP client can repeat a request only after interactive auth recovery. The execution path used non-TTY `docker exec`; the installed `resolveCommandContext` therefore sets `recoverAuth = undefined` when no explicit API key is passed and the process is non-interactive.

Consequences:

- the selected official CLI path is one-shot for this execution;
- the already-valid Board credential is reused in place;
- there is no transport retry loop for connection failures;
- any ambiguity after dispatch still requires read-only reconciliation and never authorizes a second create.

ADR 0106's explicit private API base remained mandatory:

```text
--api-base http://127.0.0.1:3100
```

## DECISION

Execute exactly one provider request:

```json
{"name":"MEDICSPRO"}
```

Canonical UTF-8 body SHA-256:

```text
6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b
```

Execution boundary:

```text
private wandora-paperclip container
  -> existing protected auth store
  -> explicit private API base
  -> official non-TTY company create exactly once
  -> independent provider reconciliation
  -> independent Wandora/no-effect reconciliation
  -> STOP
```

Rejected:

- a second create for any reason;
- custom curl/provider SQL instead of the proven official CLI;
- bundling Wandora provider binding with company creation;
- generating the Organization Adapter HMAC;
- creating Paperclip company secret/config;
- enabling MEDICSPRO eligibility;
- creating/hiring a digital employee;
- toggling global hire merely for company bootstrap;
- enabling Human Send or Gateway outbound.

## EXECUTION

Immediately before the effect, the payload hash was recalculated and matched ADR 0106.

Exactly one command invocation reached the official create boundary.

Paperclip returned a normal successful response:

```text
provider           = paperclip
providerCompanyRef = a63f27a8-dbac-4552-a456-b3a21302226b
name               = MEDICSPRO
status             = active
issuePrefix         = MED
createdAt           = 2026-09-19T03:23:39.363Z
```

There was no timeout, connection reset, unreadable response or ambiguous commit.

No second create was sent.

## INDEPENDENT PROVIDER VALIDATION

Read-only official CLI reconciliation proved:

```text
Paperclip companies total = 3
MEDICSPRO exact matches    = 1

MEDICSPRO
  id     = a63f27a8-dbac-4552-a456-b3a21302226b
  status = active

Board identity:
  isInstanceAdmin        = true
  MEDICSPRO membership   = owner / active

MEDICSPRO agents         = []
MEDICSPRO secrets        = []
MEDICSPRO plugin config  = null
```

The two earlier provider companies remained present and unchanged.

No Paperclip secret or Organization Adapter company config was created by the company bootstrap.

## INDEPENDENT WANDORA / CUSTODY VALIDATION

Post-create PostgreSQL reconciliation:

```text
organizations total       = 4
control bindings total    = 2
employee bindings total   = 2
hire operations total     = 2
unfinished hires total    = 0
eligibility rows/enabled  = 0 / 0

MEDICSPRO
  active organization     = 1
  digital employees       = 0
  control bindings        = 0
  employee bindings       = 0
  hire operations         = 0
  eligibility rows        = 0
```

The deterministic future Core HMAC filename seed is:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e
```

The corresponding custody file is absent:

```text
/opt/wandora/secrets/organization-adapter/
  paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac

exists = false
```

Therefore this slice did not create HMAC custody.

## RUNTIME / EFFECT BOUNDARY

After the provider effect:

```text
supabase-auth              healthy
supabase-db                healthy
wandora-web                healthy
wandora-core               healthy
wandora-paperclip          healthy
wandora-messaging-gateway  healthy

Organization Adapter                 = ON
Customer Digital-Employee Hire       = ON
Human Send                           = absent / OFF
Gateway outbound                     = absent / OFF
```

No runtime was recreated.

MEDICSPRO remains ineligible despite the global customer-hire gate being ON.

A post-effect aggregate SQL validation command initially failed because shell quoting removed a SQL string literal before PostgreSQL could run the query. The failed command was read-only and did not mutate state. The checks were immediately reissued as smaller independent read-only commands and produced the canonical results above.

## RESULT

**Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1 is complete and live.**

Exactly one Paperclip provider company now exists for MEDICSPRO. It is active, has the operator as active owner, and has zero agents, zero company secrets and no Organization Adapter company config.

Wandora still has no MEDICSPRO control-plane binding, employee-provider binding, eligibility or hire state.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1**

Observation/plan-first only.

Reuse ADRs 0073–0076 and revalidate, before any wiring mutation:

1. the exact MEDICSPRO Wandora organization ↔ Paperclip company pair;
2. the protected Paperclip `local_encrypted` recovery snapshot / DB + `master.key` prerequisite;
3. deterministic Core HMAC custody path derived from the frozen provider company ref;
4. exact operator-owned Wandora control-plane binding insert;
5. Paperclip company secret creation and same-company `secret_ref` plugin config;
6. ordering, ambiguity and rollback/recovery boundaries;
7. zero MEDICSPRO employees/hire/eligibility before wiring;
8. no Human Send or Gateway outbound effect.

Do not create the HMAC, Paperclip secret/config, Wandora provider binding, eligibility or employee during that preflight.
