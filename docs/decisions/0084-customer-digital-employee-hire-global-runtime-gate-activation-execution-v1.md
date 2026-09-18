# ADR 0084 — Customer Digital-Employee Hire — Global Runtime Gate Activation Execution V1

- Status: **Accepted execution — global gate live, tenant eligibility still zero**
- Date: 2026-09-18
- Scope: enable only the process-wide Customer Digital-Employee Hire runtime gate selected by ADR 0083, with no tenant eligibility and no outbound/activation effect

## REAL NOW

Canonical Git before execution:

```text
main = cc6434ca6cce3721f30e8ffc15df46dd798463f1
PR #131 = merged
open PRs = 0
```

Production before execution:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Core = healthy / 0 restarts
Web  = wandora/web:candidate-af542864d267
Web  = healthy / 0 restarts

migration 013 = LIVE
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2

Customer Digital-Employee Hire = OFF / flag absent
Human Send = OFF / flag absent
Gateway outbound = OFF / flag absent
```

The live Core stack did not yet contain the customer-hire overlay.

## PROVEN EVIDENCE — EXACT CONFIG DELTA

The canonical overlay remained:

```text
infra/stacks/core/compose.human-digital-employee-hire.yaml
Git blob = cf188f4e22651f318984f10a17aba3dee05ad2ea
```

Immediately before execution, the OFF and ON compositions were rendered again from the live Core stack inputs.

```text
OFF render SHA-256 = 8f76c8dd872974de738109b2c0555e87dbbb9433782a5bcbf4ddec2c0e5e9408
ON  render SHA-256 = c3744b7c7319d8eed3bd6254d5cb6384f6ef643c9c2f6e4ceb2185898d5ee658
```

The only rendered difference was:

```diff
+ WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: "true"
```

No image, network, mount, secret, port, database credential, Human API, Organization Adapter, Gateway ingress or Agent Runtime setting changed.

## DECISION

Proceed with the ADR 0083 order:

```text
global runtime gate ON
while eligibility rows = 0
and unfinished hire operations = 0
-> independently validate no tenant becomes available
-> STOP before tenant eligibility
```

No Web deployment, image rebuild, migration, Paperclip mutation or tenant policy change is required.

## SECOND ADVERSARIAL REVIEW

The execution was allowed only after re-proving:

1. current `main` still matched ADR 0083;
2. no PR was open;
3. Core/Web/Paperclip/Gateway were healthy;
4. eligibility rows were exactly zero;
5. enabled eligibility rows were exactly zero;
6. unfinished hire operations were exactly zero;
7. Human Send and Gateway outbound were still OFF;
8. the staged overlay Git blob matched canonical Git;
9. the OFF/ON render delta remained one environment variable;
10. the current Core image was already the reviewed image containing the gate code.

Rejected during this review:

- enabling tenant eligibility in the same slice;
- rebuilding the Core image;
- changing Web;
- changing Paperclip config;
- enabling Human Send or Gateway outbound;
- using an existing completed-hire tenant as a new-hire rollout target.

## EXECUTION

The canonical overlay was materialized at:

```text
/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml
```

Its live Git blob was verified as:

```text
cf188f4e22651f318984f10a17aba3dee05ad2ea
```

Rollback metadata for the previous Core container/image was written under the protected execution preflight directory.

Only the Core service was recreated, using:

- the same reviewed Core image;
- the existing six live Core overlays;
- the one canonical customer-hire overlay;
- `--no-deps`;
- no Web/database/Paperclip/Gateway recreation.

The resulting Core started with:

```json
{
  "gatewayIngress": true,
  "humanApi": true,
  "humanSendProposal": false,
  "humanDigitalEmployeeHire": true,
  "organizationAdapter": true,
  "agentRuntime": "mastra-deterministic"
}
```

## VALIDATION — CORE

Post-recreation:

```text
Core image = wandora/core:organization-adapter-candidate-af542864d267
status = running
health = healthy
readyz = 200
healthz = 200
restarts = 0
read-only root filesystem = true
```

Effect flags:

```text
Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

Database invariants remained:

```text
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2
digital employees = 4
employee provider bindings = 2
control-plane bindings = 2
```

## VALIDATION — ROUTE BOUNDARY

Before activation, the syntactically valid unauthenticated hire POST was structurally absent and returned `404 not-found`.

After activation, the same class of request reaches the authenticated hire route and returns:

```text
401 {"error":"unauthorized"}
```

No durable state changed across that probe:

```text
eligibility rows: 0 -> 0
hire operations: 2 -> 2
employee provider bindings: 2 -> 2
digital employees: 4 -> 4
```

This proves the global route is live while authentication remains the first external request boundary.

## VALIDATION — CUSTOMER HIRE PROJECTION

The live compiled `HumanDigitalEmployeesReadService` was executed read-only against each active production organization using an existing active owner/admin identity for projection only.

Results:

```text
wandora-internal-supervised-proof -> available=false / already-hired
wandora-customer-hire-canary      -> available=false / already-hired
empresa-exemplo                   -> available=false / unavailable
```

Exactly three active organizations were checked.

No active organization projected `available=true`.

This is the key rollout invariant: the process-wide gate is ON, but customer hire remains unavailable everywhere until a separately reviewed tenant+catalog eligibility is enabled.

## VALIDATION — PLATFORM HEALTH

Final service state:

```text
Core              = healthy / 0 restarts
Web               = healthy / 0 restarts
Paperclip         = healthy / 0 restarts
Messaging Gateway = healthy / 0 restarts
```

Public Web routes returned 200:

```text
/healthz
/
/login
/team
/work
/conversations
/company
/start
```

Final durable state:

```text
organizations = 3
digital_employees = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

No tenant eligibility, employee, provider binding, hire operation or Paperclip resource was created by this execution.

## ROLLBACK

The rollback remains config-only and image-stable:

```text
omit/remove compose.human-digital-employee-hire.yaml
-> recreate the same Core image with the existing six overlays
-> require humanDigitalEmployeeHire=false
-> require healthy/ready
```

Migration 013 remains live. No database reversal is required.

If tenant eligibility is later enabled, the global gate remains the broad kill switch, but disabling it must not delete tenant policy or completed hire history.

## EFFECT BOUNDARY

This execution did **not**:

- enable any tenant/catalog eligibility;
- create a new digital employee;
- create or resume a hire operation;
- change a provider binding;
- mutate Paperclip;
- activate any employee;
- enable Human Send;
- enable Gateway outbound;
- deploy Web;
- rebuild Core.

## DECISION RESULT

**Global Runtime Gate Activation Execution V1 is green.**

Production now has:

```text
global Customer Digital-Employee Hire = ON
eligibility rows = 0
unfinished hire operations = 0
new tenant availability = 0
Human Send = OFF
Gateway outbound = OFF
```

The process-wide capability is live, but no customer tenant is authorized to begin a new catalog hire.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — First Tenant Eligibility Rollout Preflight V1.**

Preflight only.

It must:

1. revalidate current `main` and live gate state;
2. re-enumerate active tenants and existing catalog/legacy state;
3. select exactly one clean tenant for a future `ana-commercial-v1` rollout, or prove that none of the existing tenants qualifies;
4. validate that tenant's Paperclip company, Organization Adapter binding, custody/config and collision state;
5. freeze the exact eligibility setter transaction and rollback;
6. prove no other tenant can become eligible through that transaction;
7. keep Human Send, Gateway outbound and employee activation OFF.

Do not enable a tenant eligibility row during the preflight.
