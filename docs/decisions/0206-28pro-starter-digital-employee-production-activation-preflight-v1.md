# ADR 0206 — 28PRO Starter Digital Employee Production Activation Preflight V1

Status: **GREEN / NO EFFECT / PRODUCTION EXECUTION QUALIFIED**
Date: 2026-09-23

## Context

ADR 0204 defines the V1 product rule that a commercially activated Wandora customer starts with one included digital employee. ADR 0205 implements a provider-neutral starter-workforce readiness projection.

28PRO has completed real invite acceptance and company-profile onboarding, but has not yet received its starter employee. This preflight qualifies the production sequence without creating any provider/customer effect.

## REAL NOW

Canonical Git:

- `main = 52b16079096aa9a00e7d1b5c6a1d22806c716d7e` at preflight entry;
- open PRs = 0.

Production runtime:

- Core = `wandora/core:organization-adapter-candidate-0a7f36833188`, healthy, restart 0;
- Web = `wandora/web:candidate-0a7f36833188`, healthy, restart 0;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy, restart 0;
- Messaging Gateway = `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy, restart 0;
- Organization Adapter = enabled;
- Customer Digital-Employee Hire = enabled;
- Customer Digital-Employee Activation = enabled;
- company onboarding = enabled;
- no live Human Send flag observed;
- no live Gateway outbound enable flag observed;
- Paperclip Organization Adapter plugin = ready, version 0.3.1.

28PRO Wandora state:

- organization id = `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- organization active = true;
- active owners = 1;
- `ana-commercial-v1` eligibility rows = 0 / enabled = false;
- Paperclip control-plane bindings = 0;
- digital employees = 0;
- matching Ana commercial-assistant/supervised = 0;
- `ana-commercial-v1` hire operations = 0;
- digital-employee provider bindings = 0.

Paperclip provider state:

- authenticated Board credential readback = HTTP 200 / `isInstanceAdmin=true`;
- companies total = 3;
- `Wandora Customer Hire Canary` = active;
- `Wandora Internal Supervised Proof` = active;
- `MEDICSPRO` = active;
- exact `28PRO` company matches = 0.

Therefore 28PRO classifies as `commercial-activation-required` under ADR 0205 and has no collision in either Wandora or Paperclip.

## Commercial activation authority

Billing/checkout is not yet the canonical entitlement source.

ADR 0204 permits an explicit operator-reviewed entitlement for controlled early-beta tenants. The product owner has explicitly directed continuation of the 28PRO starter activation path in this controlled environment.

This preflight therefore treats 28PRO as the selected commercially activated early-beta tenant for the future execution slice. This does not generalize into an automatic entitlement mechanism for future customers.

## Capability Authority / Reuse Gate

No new provisioning subsystem is approved.

The execution must reuse, in order:

1. Paperclip official company creation;
2. existing Organization Adapter company binding + HMAC custody + Paperclip company secret/config pattern;
3. existing `digital_employee_catalog_hire_eligibility` operator capability;
4. existing idempotent `ana-commercial-v1` hire contract;
5. existing activation contract backed by Paperclip `agents.resume`;
6. existing fail-closed execution/effect gates.

Wandora remains semantic/product authority. Paperclip remains company/agent lifecycle authority. Mastra remains execution-only and must not be invoked merely by activation.

## Frozen target

Provider company name:

`28PRO`

Future Paperclip company-create payload:

```json
{"name":"28PRO"}
```

Provider company creation remains non-idempotent. Exactly one POST may be dispatched only after a fresh read proves zero exact-name matches. Any transport uncertainty requires read-only reconciliation before deciding whether a retry is safe.

## Frozen production execution sequence

### Phase A — Paperclip company

1. Reconcile Git/main, open PRs, runtime health and exact zero state again.
2. Re-read Paperclip companies and require exact `28PRO` matches = 0.
3. Verify existing Board credential still returns `isInstanceAdmin=true`.
4. Dispatch exactly one official Paperclip company-create request with name `28PRO`.
5. Independently re-read provider state and require exactly one active `28PRO` company with zero agents.
6. Do not POST again after any ambiguous dispatch until durable provider state is reconciled.

### Phase B — Organization Adapter company wiring

Reuse the proven ADR 0073/0076 order:

1. create exactly one Wandora private `organization -> paperclip company` binding;
2. create one protected deterministic company HMAC in host custody;
3. create one Paperclip company-owned `local_encrypted` secret for the Organization Adapter HMAC;
4. persist the company-scoped plugin config referencing that secret LAST;
5. independently verify binding, secret reference/config and zero agents.

No HMAC plaintext may enter Git, chat, browser/API payloads or Wandora PostgreSQL.

### Phase C — starter entitlement / eligibility

Use the existing least-privilege operator function to enable exactly:

`organization = 28PRO / catalog = ana-commercial-v1 / enabled = true`

Eligibility is starter-provisioning policy only; it is not billing state.

After this phase, ADR 0205 readiness should be `hire-required`.

### Phase D — starter hire

Use the existing owner-authorized customer hire contract with one stable idempotency key:

`catalogKey = ana-commercial-v1`

Expected postcondition:

- exactly one Wandora Ana;
- status = paused;
- autonomy = supervised;
- exactly one completed hire operation;
- exactly one employee/provider binding;
- exactly one Paperclip managed Ana;
- Paperclip Ana = paused;
- no work, no Mastra run, no outbound.

Any ambiguous result must be reconciled before replay. Only the original idempotency key may be reused for an incomplete/uncertain existing operation.

### Phase E — starter activation

After independently proving the exact paused state, invoke the existing owner-authorized activation contract once.

Expected postcondition:

- same Wandora Ana = active + supervised;
- same Paperclip managed Ana = idle;
- same provider bindings/hire;
- zero work items created by activation;
- zero Mastra executions caused by activation;
- Human Send remains OFF;
- Gateway outbound remains OFF.

Activation is the lifecycle point of no automatic rollback. Do not add `agents.pause` or direct SQL status updates merely to create an undo path.

## Second adversarial review

Rejected:

- combining all cross-system effects into one opaque transaction;
- direct Paperclip SQL;
- precreating an Ana to simplify binding;
- creating provider company from company-profile onboarding;
- creating ERP connection before starter workforce readiness;
- using a new provider company name after an ambiguous `28PRO` create;
- generating a second HMAC on retry;
- inserting eligibility directly instead of the existing least-privilege function;
- using a new hire idempotency key after uncertain dispatch;
- calling Mastra or manufacturing work to prove Ana is active;
- enabling Human Send/Gateway outbound as part of starter activation;
- treating a phone number/channel as authorization.

Accepted:

- staged, independently reconciled effects;
- existing provider/company/secret/hire/activation boundaries;
- read-only reconciliation between every non-atomic external step;
- stop on ambiguity.

## Stop conditions

STOP before any next effect if any of these occur:

- exact `28PRO` Paperclip company already appears unexpectedly before the company-create dispatch;
- 28PRO gains an unexpected employee, binding, hire operation or eligibility row;
- Paperclip/Organization Adapter health is not ready;
- customer hire or activation runtime gate is OFF;
- Human Send or Gateway outbound becomes enabled unexpectedly;
- more than one candidate provider company/binding/employee/hire appears;
- any HMAC/secret/config result is uncertain or mismatched;
- provider agent lifecycle differs from the expected paused-first contract.

## Effect boundary

This preflight performed read-only Git/runtime/database/provider inspection plus documentation only.

It did NOT:

- create a Paperclip 28PRO company;
- create a control-plane binding;
- create HMAC/secret/plugin config;
- enable eligibility;
- hire Ana;
- activate Ana;
- create work/Mastra runs;
- connect VendaERP;
- enable/send messaging.

## Decision

**28PRO Starter Digital Employee Production Activation Preflight V1 is GREEN.**

The next separately reconciled effectful slice is:

**28PRO Starter Digital Employee Production Activation Execution V1**

After successful execution and proof of `ready`, resume the ERP roadmap with:

**Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**, followed by a real 28PRO VendaERP read-only connection activation.
