# ADR 0083 — Customer Digital-Employee Hire — Global Runtime Gate Activation Preflight V1

- Status: **Accepted preflight — global gate remains OFF**
- Date: 2026-09-18
- Scope: freeze the exact process-wide Customer Digital-Employee Hire activation sequence after ADR 0082, without enabling the gate or any tenant eligibility

## REAL NOW

Canonical Git:

```text
main = 2260052be3c4b5afb324b9539c3cdf950fb701bf
PR #130 = merged
open PRs = 0
```

Production:

```text
Core = wandora/core:organization-adapter-candidate-af542864d267
Core health = healthy
Core restarts = 0

Web = wandora/web:candidate-af542864d267
Web health = healthy
Web restarts = 0

migration 013 = LIVE
eligibility rows = 0
enabled eligibility rows = 0
Customer Digital-Employee Hire = OFF / flag absent
Human Send = OFF
Gateway outbound = OFF
```

The canonical hire overlay exists in Git but is deliberately absent from the live Core stack directory:

```text
infra/stacks/core/compose.human-digital-employee-hire.yaml
Git blob = cf188f4e22651f318984f10a17aba3dee05ad2ea

/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml = ABSENT
```

A byte-identical copy was staged only under the isolated preflight directory. No live stack file was added by this preflight.

## PROVEN EVIDENCE — CURRENT CI

PR #130 re-ran the current codebase and completed green:

```text
Core CI                       35346798882 = success
Web CI                        35346798967 = success
Platform Admin CI             35346798913 = success
Messaging Gateway CI          35346798980 = success
Organization Adapter Plugin CI 35346799030 = success
```

Core CI includes the Customer Hire Tenant Eligibility V1 verifier and Organization Adapter production-activation rehearsal.

Relevant behavior already proven in code/CI:

- runtime gate OFF projects hire unavailable;
- eligibility OFF/missing projects unavailable even with runtime gate ON;
- member access remains unavailable;
- legacy matching employee remains unavailable;
- completed catalog operation projects `already-hired`;
- unfinished operation keeps reconciliation semantics;
- readiness with customer hire ON requires the migration-013 eligibility DB boundary.

## PROVEN EVIDENCE — EXACT GATE DELTA

Canonical overlay:

```yaml
services:
  core:
    environment:
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: "true"
```

The current live six-overlay Core composition was rendered and compared to the same composition plus the canonical hire overlay.

Current OFF render SHA-256:

```text
8f76c8dd872974de738109b2c0555e87dbbb9433782a5bcbf4ddec2c0e5e9408
```

Candidate ON render SHA-256:

```text
c3744b7c7319d8eed3bd6254d5cb6384f6ef643c9c2f6e4ceb2185898d5ee658
```

The exact rendered delta is one environment variable only:

```diff
+ WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: "true"
```

No image, network, mount, secret, port, healthcheck, database credential, Organization Adapter setting, Gateway ingress setting, Human API setting or Agent Runtime setting changes.

## PROVEN EVIDENCE — ZERO-ELIGIBILITY TENANT STATE

All active tenants were re-read after ADR 0082:

```text
wandora-internal-supervised-proof
  hire operation = ana-commercial-v1:completed
  eligibility = none
  digital-employee state = non-empty proof state
  Paperclip control binding = 1

empresa-exemplo
  hire operation = none
  eligibility = none
  digital-employee state = one legacy active supervised Ana
  Paperclip control binding = 0

wandora-customer-hire-canary
  hire operation = ana-commercial-v1:completed
  eligibility = none
  digital-employee state = one paused supervised Ana
  Paperclip control binding = 1

global hire-operation state
  completed = 2
  unfinished (planned/creating/uncertain) = 0
```

Therefore global gate ON with the current database state cannot create a new `available` catalog hire:

- Internal Supervised Proof resolves through completed-operation semantics to `already-hired`;
- Customer Hire Canary resolves through completed-operation semantics to `already-hired`;
- Empresa Exemplo has no eligibility row and therefore remains `unavailable` before legacy/provider readiness could authorize anything.

There are no hidden enabled rows waiting behind the global switch, and there is no unfinished operation that could legitimately project `reconciliation-required` ahead of the eligibility check.

That second invariant matters: existing unfinished operations are intentionally checked before eligibility so the original idempotency key can safely reconcile an ambiguous prior attempt. Future global-gate activation therefore requires **both**:

```text
eligibility rows = 0
unfinished hire operations = 0
```

## PROVEN EVIDENCE — EXECUTABLE ZERO-ELIGIBILITY CONTRACT PROOF

The fail-closed behavior was executed outside production using the **same Core image currently live**:

```text
wandora/core:organization-adapter-candidate-af542864d267
```

The disposable database was derived from the accepted pre-migration production backup plus the exact canonical migration 013. A synthetic active organization was given an owner membership and one Paperclip control-plane binding so that missing eligibility — rather than missing provider wiring — was the decisive gate.

No eligibility row, employee, hire operation or employee-provider binding existed for the synthetic organization.

The proof invoked the compiled Core read + hire services with the runtime-hire path enabled only inside the disposable harness. It did **not** set the production Core environment flag or recreate any live container.

Result:

```text
GET_HIRE_STATE=unavailable
GET_AVAILABLE=false
POST_STATUS=404
POST_ERROR=employee-not-available
PROVIDER_CALLS=0
SYNTHETIC_COUNTS={"eligibility":0,"operations":0,"employees":0,"employee_bindings":0,"control_bindings":1}
ZERO_ELIGIBILITY_FAIL_CLOSED_PROOF_OK=true
```

This proves a brand-new hire stops before journal reservation and before the Organization Adapter provider call when the global runtime path exists but tenant/catalog eligibility does not.

Two earlier disposable harness attempts were rejected rather than treated as evidence: one exposed missing schema-level `USAGE` in the scoped restore harness because pre-created namespaces prevented those ACLs from being restored, and one hit the official PostgreSQL image's temporary startup phase. Production was read-only checked to establish its actual namespace/function privileges; only the disposable harness was corrected. Neither failure changed production.

The proof database/network were removed afterwards.

## BASELINE LIVE ROUTE PROOF

With the global gate OFF, a syntactically valid customer-hire POST to the private live Core returns:

```text
404 {"error":"not-found"}
```

The probe used no authorization and produced no durable delta.

Post-probe state remained:

```text
eligibility rows = 0
hire operations = 2
employee provider bindings = 2
```

This proves the current process-wide route effect is still absent before activation.

## GAPS

Only one runtime gap remains for global capability activation:

```text
materialize exact canonical hire overlay in the live Core stack
-> recreate same Core image with that one overlay
```

No new image, migration, credential, Paperclip config, HMAC, tenant state or Web deploy is required.

Tenant rollout remains a separate gap because there is currently no active tenant selected for a fresh catalog hire.

## DECISION — ACTIVATION ORDER

The selected rollout order is:

```text
1. global runtime gate ON while eligibility rows = 0
2. validate zero tenant-specific availability and zero durable side effects
3. STOP
4. later select/review one clean tenant
5. enable exactly that tenant+catalog eligibility as a separate effect
```

### Why global gate first

This is safer than creating eligibility rows while the global gate is OFF.

If eligibility were enabled first, one or more tenants could become latent/pending behind the process switch. A later global activation could expose every pre-enabled tenant simultaneously.

With global gate ON first and zero eligibility rows:

- no tenant is newly available;
- each later tenant rollout is one explicit scoped eligibility transaction;
- the global flag remains the broad kill switch;
- disabling the global flag immediately closes all future tenant hire routes without deleting eligibility/history.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

1. **Eligibility first, global gate second** — rejected because it creates latent tenant exposure behind a broad switch.
2. **Global gate and first eligibility in one deployment** — rejected because broad runtime activation and tenant rollout are independently reversible effects.
3. **Rebuild/redeploy a new Core image** — rejected; the current live image already contains the reviewed gate code.
4. **Change Web again** — rejected; ADR 0082 already promoted the reviewed Web and it is projection-driven.
5. **Create the overlay directly in the live stack during preflight** — rejected; preflight keeps the live stack unchanged.
6. **Use a new feature-flag service/table** — rejected; the accepted architecture is global process kill switch plus tenant+catalog eligibility.
7. **Use Paperclip binding as availability** — rejected; binding is wiring, not customer policy.
8. **Insert a dummy eligibility row just to test ON behavior** — rejected; CI/disposable proofs already cover that contract and production must remain zero-row until a real tenant is selected.
9. **Use the existing canary as a new-hire availability test** — rejected; its completed operation must remain `already-hired`, not become a second hire.

## FROZEN FUTURE EXECUTION

A separate **Global Runtime Gate Activation Execution V1** may proceed only in this order:

```text
1. revalidate current main + open PRs
2. revalidate Core/Web health and require eligibility rows exactly 0
3. require unfinished hire operations exactly 0; every existing hire operation must be completed
4. revalidate Customer Hire/Human Send/Gateway outbound switches
5. copy the exact canonical overlay into /opt/wandora/stacks/core/
6. verify overlay Git blob = cf188f4e22651f318984f10a17aba3dee05ad2ea
7. render OFF and ON compositions again
8. require the same one-line environment delta
9. retain the OFF render as rollback composition
10. recreate Core using the same image + existing six overlays + hire overlay
11. require healthy + ready
12. require startup humanDigitalEmployeeHire=true
13. require eligibility rows still exactly 0
14. require unfinished hire operations still exactly 0
15. require durable employee/binding/hire counts unchanged
16. run a no-auth syntactically valid POST probe:
      expected transition from gate-OFF 404 to gate-ON 401
      no provider effect is possible before authentication
17. validate customer read projection: no active organization may expose available=true
18. validate Web/Core health
19. STOP — do not enable any tenant eligibility
```

Human Send and Gateway outbound overlays remain absent.

## ROLLBACK

Rollback requires no database reversal and no image downgrade.

Exact rollback:

```text
remove/omit compose.human-digital-employee-hire.yaml
-> recreate the same Core image with the existing six overlays
-> require humanDigitalEmployeeHire=false
-> require healthy/ready
```

Eligibility rows remain zero throughout this execution, so rollback does not need to mutate tenant policy.

Migration 013 remains live and dormant.

## STOP CONDITIONS

Abort before recreation if:

- current main contains unexpected product/runtime changes;
- migration 013 is missing or authority drift is detected;
- any eligibility row exists unexpectedly;
- any hire operation is `planned`, `creating` or `uncertain`;
- Core/Web is unhealthy;
- current Core image differs unexpectedly;
- Human Send or Gateway outbound is ON;
- the staged/live overlay hash differs from canonical Git;
- rendered ON composition contains any difference beyond the hire environment variable;
- existing durable employee/binding/hire counts changed unexpectedly.

After recreation, rollback immediately if:

- Core is not healthy/ready;
- startup does not report `humanDigitalEmployeeHire=true`;
- eligibility rows become nonzero;
- any unfinished hire operation appears;
- any active organization projects `available=true`;
- durable employee/provider state changes;
- unrelated capabilities disappear or appear;
- no-auth route behavior is inconsistent with the reviewed contract.

## EXECUTION PERFORMED BY THIS PREFLIGHT

Production work was read-only/config-render only. The only writes performed by the proof were isolated disposable PostgreSQL/harness fixtures that were removed after validation; they never targeted production.

This preflight did **not**:

- add the overlay to the live stack directory;
- recreate Core;
- enable the global hire gate;
- add tenant eligibility;
- execute a hire;
- mutate Paperclip;
- activate an employee;
- enable Human Send or Gateway outbound.

## DECISION RESULT

**Global Runtime Gate Activation Preflight V1 is green.**

The next bounded effect is a Core-only recreation with the same reviewed image plus one canonical environment overlay, while eligibility remains exactly zero **and unfinished hire operations remain exactly zero**. Completed operations may project `already-hired`, and the no-auth POST boundary is expected to move from structural 404 to authentication 401, but no active organization may become newly `available`.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Global Runtime Gate Activation Execution V1.**

That slice may enable only the process-wide gate.

It must stop with:

```text
global Customer Hire = ON
eligibility rows = 0
unfinished hire operations = 0
new tenant availability = 0
Human Send = OFF
Gateway outbound = OFF
```

The first tenant eligibility remains a later, separately reviewed effect.
