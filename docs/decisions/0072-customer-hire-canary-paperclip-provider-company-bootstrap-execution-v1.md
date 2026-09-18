# ADR 0072 — Customer Hire Canary Paperclip Provider Company Bootstrap Execution V1

- Status: **Accepted and live**
- Date: 2026-09-18
- Scope: create exactly one Paperclip provider company for the employee-free customer-hire canary through the official instance-admin API/CLI boundary, then stop before HMAC custody/config, Wandora provider binding, employee hire, activation or messaging effects

## REAL NOW

Execution began only after ADR 0071 was merged:

```text
main = 6e26ba1bad22a5b5b96d3d64b99be588571e6a9e
PR #116 = merged
PR #116 CI = all green
open PRs = 0
```

Fresh live pre-effect proof matched ADR 0071 exactly:

```text
Wandora Customer Hire Canary
  organization_id = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
  status = active
  digital employees = 0
  control-plane bindings = 0
  employee-provider bindings = 0
  hire operations = 0

Paperclip
  commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
  health = ok
  deployment = authenticated / private
  bootstrapStatus = ready
  database backup = enabled / ok
  Board credential = isInstanceAdmin=true
  companies = 1
  exact canary-name matches = 0
  existing internal company = 815d499e-4231-4e6b-b7fc-67f0ba22a595

Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## ONE-SHOT CLIENT PROOF

Before dispatching the provider effect, the pinned live Paperclip CLI/client source was reviewed again.

The official `company create` command calls:

```text
createCompanyForContext(...)
  -> ctx.api.post("/api/companies", payload)
```

exactly once.

The HTTP client has no transport retry loop. Its only possible request replay is interactive auth recovery after an auth error; the execution path used non-TTY `docker exec` with an already-valid stored Board credential, so interactive auth recovery was disabled.

Therefore the official CLI preserved ADR 0071's one-shot requirement.

## PRE-DISPATCH RECOVERY HISTORY

Two earlier custom executor shapes never reached the provider mutation:

1. a custom `node -e` wrapper failed JavaScript parsing before any code executed;
2. two alternative custom command wrappers were blocked by the remote execution connector before reaching the server.

After the parser failure, an independent read-only provider check proved the baseline was still exactly one internal company and zero canary matches.

No POST was counted as dispatched until the official Paperclip CLI command below.

## EXECUTION

Frozen payload:

```json
{"name":"Wandora Customer Hire Canary"}
```

Frozen payload SHA-256:

```text
e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe
```

The effect was executed once through the official Paperclip CLI using the existing protected Board credential store:

```text
PAPERCLIP_AUTH_STORE=/paperclip/operator-cli/activation-v1/auth.json
company create
api base = private loopback Paperclip API
payload = exact frozen JSON above
```

The credential value never appeared in the command line, output, Git or Wandora business state.

Observed provider response:

```text
provider             = paperclip
providerCompanyRef   = e7422a00-1474-49d5-ac32-34594520015e
name                 = Wandora Customer Hire Canary
status               = active
```

No second create request was sent.

## INDEPENDENT PROVIDER VALIDATION

Independent official CLI reads after creation proved:

```text
Paperclip companies total = 2

internal company:
  id = 815d499e-4231-4e6b-b7fc-67f0ba22a595
  status = active

customer-hire canary company:
  id = e7422a00-1474-49d5-ac32-34594520015e
  name = Wandora Customer Hire Canary
  status = active

current Board credential:
  isInstanceAdmin = true
  canary membership = owner / active

canary agents = 0
```

Provider-internal human identifiers returned by the CLI are deliberately not copied into Wandora documentation because they are not part of the Wandora/provider contract.

Negative Organization Adapter state was also proven through official CLI reads:

```text
canary Organization Adapter plugin config = null
canary secret metadata list = []
```

Therefore company bootstrap did not create company-scoped HMAC custody or plugin configuration.

## INDEPENDENT WANDORA VALIDATION

After provider creation:

```text
canary organization = active
canary digital employees = 0
canary control-plane provider bindings = 0
canary digital-employee provider bindings = 0
canary hire operations = 0

control-plane bindings total = 1
employee-provider bindings total = 1
completed catalog hire operations total = 1
```

Runtime effects remained:

```text
Organization Adapter = ON
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The existing internal Organization Adapter canary state therefore remained unchanged.

## FROZEN PROVIDER TARGET

The clean customer-hire canary provider target is now:

```text
Wandora organization
918d4c7e-fccb-41f0-aba7-04105a9b4ec0

        ↕ future private binding

Paperclip provider company
e7422a00-1474-49d5-ac32-34594520015e
```

This mapping is not yet persisted in Wandora. The provider reference is frozen only as execution evidence for the next reviewed adapter step.

## SECOND ADVERSARIAL REVIEW

Rejected after execution:

- sending the company-create request again merely to demonstrate replay behavior;
- treating same-name lookup as provider idempotency;
- adding the Wandora control-plane binding immediately after successful provider creation;
- generating the canary HMAC merely because the provider company now exists;
- copying provider-internal human IDs into Wandora canonical state;
- creating an Ana provider agent;
- enabling Customer Digital-Employee Hire;
- enabling Human Send or Gateway outbound;
- direct SQL validation or cleanup inside Paperclip.

## EFFECT BOUNDARY

This slice added exactly:

- one Paperclip provider company;
- one provider-native active owner membership established by the official creation flow;
- provider-native company/environment support state that Paperclip owns internally.

It did **not** add:

- Paperclip agents for the canary;
- Organization Adapter HMAC/secret custody;
- Organization Adapter company config;
- Wandora control-plane provider binding;
- Wandora digital-employee/provider binding;
- Wandora hire operation;
- Customer Digital-Employee Hire activation;
- employee activation;
- Human Send;
- Gateway outbound.

## DECISION

**Customer Hire Canary — Paperclip Provider Company Bootstrap Execution V1 is complete and live.**

The canary now has a clean, active Paperclip provider company while all Organization Adapter company-scoped wiring and customer-hire effects remain absent.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Organization Adapter Custody + Config + Binding Preflight V1.**

Observation/plan-first only.

Freeze, before any further mutation:

1. the exact canary Wandora organization and Paperclip provider company pair;
2. deterministic HMAC custody filename/reference derived from the provider company ID;
3. Paperclip company-secret creation and plugin-config contract using the already-proven Organization Adapter pattern;
4. the exact private Wandora control-plane binding operator path;
5. ordering and recovery rules across secret custody, plugin config and Wandora binding because these systems do not share one transaction;
6. duplicate/replay/conflict behavior;
7. postconditions proving zero employees/hire operations before the actual customer-hire canary;
8. cleanup/recovery boundaries without direct provider SQL.

Do not create the HMAC, Paperclip secret/config, Wandora provider binding, employee, hire operation or outbound effect during that preflight.
