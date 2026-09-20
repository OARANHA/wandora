# ADR 0131 — Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1

Status: Accepted  
Date: 2026-09-20

## Context

ADR 0116 froze the first real MEDICSPRO digital-employee activation preflight while Paperclip production was still on v2026.831.1. At that time three concrete blockers remained:

1. the live Paperclip instance did not have `wandora_mastra` installed;
2. the Organization Adapter did not possess `agents.resume`;
3. Wandora Core/Web did not expose a customer-owner activation contract with provider reconciliation.

ADRs 0117–0125 subsequently activated the Paperclip -> Wandora/Mastra execution bridge without activating Ana. ADRs 0126–0128 canonicalized capability authority and qualified Paperclip v2026.916.0. ADRs 0129–0130 then promoted the exact qualified v916 candidate to production.

This refresh re-evaluates ADR 0116 against the live v916 control plane. It is a readiness decision only. It does not authorize resume, wakeup, Human Send, Gateway outbound or any real customer effect.

## REAL NOW

Canonical Git at the start of this slice:

`main@1c1c3c88aa4ef50d56a66d8a1948b96464b49ee3`

PR #180 is already merged and no later open PR exists. All six workflows associated with its merged head completed successfully.

Live Paperclip:

```text
image       = wandora/paperclip:v2026.916.0
image ID    = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
source      = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health      = ok / healthy
restarts    = 0
migrations  = 278 / max 278
```

The current live Paperclip automatic logical backup created at 2026-09-20T08:41:22Z independently shows for the MEDICSPRO Paperclip company `a63f27a8-dbac-4552-a456-b3a21302226b`:

```text
agents              = exactly 1
name                = Ana
status              = paused
adapter             = wandora_mastra
budget              = 0
last heartbeat      = none
wakeup requests     = 0
heartbeat runs      = 0
```

Wandora durable state for MEDICSPRO:

```text
organization        = active
digital employees   = exactly 1
Ana status          = paused
Ana autonomy        = supervised
control binding     = exactly 1 / paperclip
employee binding    = exactly 1 / paperclip
hire operation      = exactly 1 / completed
unfinished hires    = 0
outbound attempts   = 0
```

Core and Messaging Gateway remain healthy with zero restarts. The execution bridge, Organization Adapter, customer-hire route and deterministic Mastra runtime remain enabled. Human Send is absent/OFF and Gateway outbound is absent/OFF.

The live Organization Adapter manifest still grants exactly:

```text
agents.managed
webhooks.receive
secrets.read-ref
```

It does not grant `agents.resume`.

## Proven v916 lifecycle semantics

Direct inspection of the exact live Paperclip v2026.916.0 source establishes:

- `agentService.resume(id)` changes a non-terminated, non-pending-approval agent to `idle`, clears pause/error fields and does not call heartbeat/wakeup;
- plugin host `agents.resume` is company-scoped and requires the distinct `agents.resume` capability;
- plugin host `agents.invoke` is the separate operation that requests a heartbeat wakeup;
- `agents.managed.reconcile` requires `agents.managed`, not `agents.resume`;
- existing managed-agent reconciliation does not reapply the declaration's initial `status: paused` to an already materialized agent;
- managed reset patches declared configuration but does not force the agent status back to `paused`;
- timer heartbeats are opt-in for new hires in current Paperclip guidance/source, while the current MEDICSPRO Ana has no heartbeat history or queued wakeup/run.

Therefore:

> Paperclip `idle` means resumed and waiting for work. It is not equivalent to a running execution and does not itself create a wakeup.

## ADR 0116 explicit review

| ADR 0116 premise / requirement | Refresh classification | Evidence / decision |
| --- | --- | --- |
| Ana must remain paused + supervised until a separately reviewed activation | **still valid** | Live Wandora/Paperclip state remains paused; no activation occurs in this slice |
| `wandora_mastra` is absent, so execution cannot be activated | **already implemented / obsolete as blocker** | ADRs 0125 and 0130 prove exactly one live adapter, v916-compatible, testEnvironment PASS |
| Execution bridge must exist before activation | **already implemented** | Bridge is live, healthy and v916-accepted; unknown company mapping remains fail-closed |
| Organization Adapter lacks `agents.resume` | **still valid / blocker** | Live manifest still exposes only `agents.managed`, `webhooks.receive`, `secrets.read-ref` |
| Core/Web have no customer activation contract | **still valid / blocker** | Current Core collection route supports hire/read only; Team UI has no activate action |
| Paperclip owns provider lifecycle; Wandora must not build a second lifecycle engine | **still valid** | ADR 0126 authority split plus v916 native pause/resume |
| Provider must be resumed before Wandora marks the product projection active | **still valid, refined** | Paperclip native target is `idle`; Wandora `active` is a product eligibility projection |
| Provider outcome must be reconciled before local finalization | **still valid** | Needed for timeout/crash recovery across the Paperclip/Wandora boundary |
| Human Send / Gateway outbound are independent effect gates | **still valid / non-prerequisite** | Both remain OFF and are not activated by employee lifecycle |
| A new generic Wandora lifecycle subsystem is needed | **obsolete / forbidden** | Native Paperclip lifecycle is authoritative |
| A dedicated activation journal is necessarily required | **not proven / do not add now** | Resume is convergent, creates no wakeup, and exact provider readback can recover an ambiguous response without duplicating lifecycle state |

ADR 0116 remains historical evidence. This ADR supersedes only its stale readiness assumptions; it does not rewrite the original record.

## Capability Authority / Reuse Gate

| Capability | Canonical authority | Requestor | Executor | Durable state | Existing equivalent | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Agent pause/resume lifecycle | Paperclip | Wandora owner/admin intent via Wandora contract | Organization Adapter -> Paperclip host service | Paperclip agent status | Paperclip native `agents.resume` | **REUSE + ADAPT** |
| Managed employee identity/config reconcile | Paperclip | Wandora/Core | Organization Adapter `agents.managed` | Paperclip managed resource/binding | Already live | **REUSE**; not a substitute for resume |
| Customer activation authorization | Wandora | authenticated owner/admin | Wandora Core | Wandora membership/policy | No provider equivalent should own it | **KEEP WANDORA** |
| Customer employee product status | Wandora projection | Core after provider reconciliation | Core | `wandora.digital_employees.status` | Paperclip status is provider lifecycle, not product identity | **KEEP WANDORA** |
| Cross-boundary activation recovery | Wandora orchestration over Paperclip state | retry/reconciliation | Core + Organization Adapter readback | existing Wandora employee/binding + Paperclip status | Resume is convergent | **ADAPT; no new journal yet** |
| Run-scoped execution identity | Paperclip + Wandora bridge | Paperclip run | `wandora_mastra` + Core | Paperclip run + Wandora mapping | Already live | **REUSE / COMPLETE** |
| Agent execution | Mastra behind Wandora runtime adapter | authorized Paperclip run | Wandora Agent Runtime/Mastra | execution-local | Already live deterministic runtime | **REUSE / COMPLETE** |
| Human Send | Wandora | explicit human flow | Core -> Gateway | Wandora effect records | Existing separate path | **KEEP WANDORA / FORBID in activation** |
| Gateway outbound | Wandora | authorized effect path | Messaging Gateway | Wandora effect records/provider receipt | Existing separate gate | **KEEP WANDORA / FORBID in activation** |
| Paperclip Routines / Skills / Execution Policy / Connections / Decision Training | Paperclip candidate/authority by map | future product slices | Paperclip | Paperclip | Native v916 capability | **DEFER**; not prerequisites for first activation |
| Tool Gateway | Paperclip experimental/quarantined candidate | future qualification only | Paperclip | Paperclip | Native but not production-qualified by Wandora | **DEFER / FORBID dependency now** |
| Mastra Memory / Evals / richer Observability / Workspace | Mastra runtime candidates | future runtime slices | Mastra | runtime-specific | Not required by current activation | **DEFER** |

## Product/provider state mapping

The activation contract must make this distinction explicit:

```text
Wandora paused
  = employee is not eligible to receive operational work through Wandora

Paperclip paused
  = provider lifecycle is stopped

Paperclip idle
  = provider lifecycle is resumed and waiting; no run is implied

Wandora active + supervised
  = employee is eligible to receive authorized work, but supervision/effect policy still applies

Paperclip running / heartbeat run
  = a concrete execution exists
```

Wandora `active` must never be interpreted as unrestricted autonomy or outbound authorization.

## Minimal blocker-closing implementation

The smallest accepted implementation before a real activation is:

### 1. Narrow Organization Adapter activation action

Extend the Wandora-owned Organization Adapter in a new immutable artifact:

- add only `agents.resume` to the plugin capabilities required for this action;
- add a separate signed, company-scoped activation webhook/action;
- never accept a raw provider agent ID from the customer request;
- resolve the already-existing managed `ana-commercial-v1` resource inside Paperclip;
- use managed `get`/readback and fail if the managed employee is missing instead of silently creating one;
- if status is `paused`, call native `agents.resume`;
- if status is already `idle`, return the converged state;
- never call `agents.invoke`, never request wakeup, never create work;
- do not grant `agents.pause`, `agents.invoke`, Board or instance-admin authority merely for activation;
- preserve company scoping and existing per-company HMAC custody.

The coarse Paperclip capability technically permits the trusted plugin code to resume a same-company agent, so the Wandora plugin implementation must narrow the callable surface to the fixed managed catalog employee and remain hash-pinned/reviewed.

### 2. Wandora owner activation contract

Add a narrow Core contract such as:

`POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/activate`

The exact route name may change during implementation, but its semantics must not.

Before provider mutation, Core must prove:

- authenticated owner/admin membership for the exact organization;
- active MEDICSPRO organization;
- exact employee exists and is `paused + supervised`;
- exact completed catalog hire exists;
- exact employee-provider binding matches Paperclip;
- exact control-plane company binding exists;
- Organization Adapter is configured;
- execution bridge/runtime readiness is GREEN;
- Human Send and Gateway outbound remain independent.

Core asks the company-scoped Organization Adapter to activate the managed employee. It then reads/reconciles the provider state.

Only after Paperclip reports `idle` may Core atomically change the Wandora projection from `paused` to `active`.

### 3. Ambiguous outcome recovery without a new table

A lost response after Paperclip commit must not trigger blind compensating behavior.

Because native `resume` is convergent and does not create work:

```text
activation call ambiguous
-> keep Wandora paused
-> read exact managed Paperclip employee
-> provider idle  => finalize Wandora active
-> provider paused => safe retry of the same state transition
-> provider unavailable/unknown => return uncertain/fail closed
```

A future implementation may add a minimal activation journal only if tests prove a durable safety/audit requirement that cannot be satisfied by the existing stable employee/binding state and exact provider reconciliation. This readiness refresh does not authorize such a migration.

### 4. Customer UI projection

The customer surface may expose **Ativar** only after Core returns activation availability for the exact paused supervised employee. UI state is never authorization; Core revalidates every request.

## SECOND ADVERSARIAL REVIEW

The second review attempted to invalidate the design.

### Could managed reconcile silently pause Ana again after resume?

No. v916 `managed.reconcile()` leaves the existing agent lifecycle status unchanged. It only backfills the managed pause reason when the existing agent is already paused and the reason is missing. `reset()` also does not patch lifecycle status.

### Could resume itself wake Ana or run Mastra?

No. `agents.resume` changes lifecycle state to `idle`. `agents.invoke` / heartbeat wakeup is a separate host operation. The activation action must never call it.

### Could a crash leave Paperclip idle while Wandora remains paused?

Yes. This is the principal partial-success case.

It remains fail-closed because the live Core execution bridge independently requires the mapped Wandora employee to be active before invoking Mastra. Provider readback on retry can converge the local projection without a blind second external effect.

### Does adding `agents.resume` give the plugin more authority than ideal?

Yes, Paperclip's capability is coarser than the Wandora product action. The accepted mitigation is to grant it only to the already trusted, company-scoped Organization Adapter artifact and expose only the fixed managed catalog activation action. No arbitrary agent ID may cross the Wandora API or plugin webhook.

Using a Board/instance-admin token instead would be broader and is rejected.

### Is `agents.pause` required as rollback authority?

No for the first activation contract. Adding it broadens privilege without being required for convergence. If provider resume succeeds and local finalization is temporarily unavailable, the local paused state still blocks the Wandora execution bridge and a later readback can complete the projection.

### Could timer heartbeat start work immediately after resume?

The live MEDICSPRO Ana has zero wakeups/runs and no heartbeat history. Current Paperclip explicitly treats timer heartbeat as opt-in for new hires, and the managed declaration does not configure a heartbeat schedule. The real execution must revalidate zero pending wakeup/run and no enabled timer heartbeat immediately before resume.

### Could new v916 features replace the Wandora activation boundary?

No. Skills, Routines, Connections, Connection Intents, Execution Policy, Decision Training and Tool Gateway do not own Wandora customer authorization or product projection. Adopting them now would expand scope without closing an activation blocker.

### Could Paperclip approval or Mastra tool hooks authorize outbound?

No. External customer-visible effects remain Wandora-owned. Activation must leave Human Send and Gateway outbound OFF.

## Decision

**Activation Readiness Refresh V1 = BLOCKED / NOT GREEN for real activation.**

The v916 upgrade and bridge foundation are ready. The remaining gap is intentionally small:

```text
1. Organization Adapter: narrow managed Ana activation action + agents.resume
2. Wandora Core: owner-authorized activation + exact provider readback + paused->active finalization
3. Web/read model: customer-safe activation availability/action
4. Tests: concurrency, timeout-after-provider-commit, already-idle reconciliation,
          wrong tenant/employee, missing binding, plugin unavailable, no wakeup,
          bridge still fail-closed while Wandora remains paused
5. Candidate/preflight proof with zero real MEDICSPRO activation
```

No new scheduler, lifecycle engine, task engine, Mastra upgrade, Paperclip upgrade, generic credential plane or activation journal is approved by this ADR.

## Execution in this readiness slice

Documentation/read-only validation only.

No production service, database row, secret, plugin capability, adapter package, employee status or effect gate was changed.

## Validation

At slice completion the required safety boundary remains:

```text
MEDICSPRO Ana / Wandora   = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip = exactly 1 / paused
MEDICSPRO wakeups/runs    = 0 / 0
agents.resume             = absent
Human Send                = OFF
Gateway outbound          = OFF
MEDICSPRO outbound        = 0
Paperclip/Core/Gateway    = healthy / restart 0
```

## Next executable slice

**Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1**

It is a code/test/candidate slice. It must not resume MEDICSPRO Ana or enable Human Send/Gateway outbound.

After that implementation is merged and independently qualified, a separate activation execution preflight/execution may authorize the first real resume.
