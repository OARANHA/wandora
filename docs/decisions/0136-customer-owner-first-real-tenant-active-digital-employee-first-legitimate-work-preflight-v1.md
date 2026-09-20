# ADR 0136 — Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Preflight V1

- Status: Accepted — preflight complete / first real work execution blocked pending contract implementation
- Date: 2026-09-20
- Scope: MEDICSPRO first legitimate post-activation work, no effect
- Supersedes: none
- Builds on: ADR 0036, ADR 0037, ADR 0131, ADR 0132, ADR 0133, ADR 0135

## Context

ADR 0135 activated the first real MEDICSPRO Ana without creating work. The post-activation invariant is intentionally:

```text
Wandora Ana  = active + supervised
Paperclip Ana = idle / wandora_mastra
work/run/outbound = zero
```

This preflight determines what may legitimately become Ana's first work. It does not authorize creating a task, wakeup, heartbeat, Mastra run or external effect.

The required sequence was:

```text
REAL NOW
-> PROVEN EVIDENCE
-> GAPS
-> CAPABILITY AUTHORITY / REUSE GATE
-> DECISION
-> SECOND ADVERSARIAL REVIEW
-> EXECUTION
-> VALIDATION
```

## REAL NOW

Git was reconciled first.

```text
main = 1f13f10dc8782a459d01c7c514189e1368650831
open PRs = 0
latest canonical checkpoint = ADR 0135 / PR #186
```

Production readback proved:

```text
MEDICSPRO Wandora org = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Wandora Ana           = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
Wandora state         = active + supervised
control binding       = 1
employee binding      = 1
completed hire        = 1
outbound attempts     = 0

Paperclip company     = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana         = da6cfc6b-e16f-483a-95f1-bacee8e54365
Paperclip state       = idle / wandora_mastra
last heartbeat        = null
assigned issues       = 0
wakeup requests       = 0
heartbeat runs        = 0
routine runs          = 0
task sessions         = 0
run identity contexts = 0
runtime session_id    = null
runtime last_run_id   = null
runtime run status    = null
runtime input tokens  = 0
runtime output tokens = 0
runtime cost          = 0
runtime last error    = null

Human Digital-Employee Activation = ON
Human Send                       = OFF
Gateway outbound                 = OFF
critical services                = healthy
```

No production mutation was performed to obtain this state.

## PROVEN EVIDENCE

### 1. The execution bridge is already the correct runtime path

The existing Core Paperclip execution service:

- resolves the Paperclip company to the exact Wandora organization;
- resolves the exact employee-provider binding;
- requires Wandora employee state `active + supervised`;
- validates the Paperclip run-scoped token through `/api/agents/me`;
- fails closed on unknown company, wrong agent, wrong role/catalog or inactive employee;
- passes only Wandora-owned task content into the Agent Runtime;
- does not expose raw Paperclip company/agent IDs to Mastra.

The reviewed runtime path remains:

```text
Paperclip authorized run
-> wandora_mastra
-> Core Paperclip execution bridge
-> Agent Runtime
-> Mastra
-> result
-> Paperclip run
```

No new execution engine is required.

### 2. Paperclip is the durable work authority

Paperclip v2026.916.0 owns issues/tasks and assignment-triggered work.

The normal public issue-create path creates an assigned issue and, except for the special onboarding-first-task path, invokes `queueIssueAssignmentWakeup(... reason="issue_assigned")`.

The native assignment wake uses:

```text
source        = assignment
triggerDetail = system
reason        = issue_assigned
context       = exact issue id
```

Therefore the first legitimate unit of durable business work should be a Paperclip issue assigned to the already-managed Ana. Wandora must not create a parallel native task engine.

### 3. Plugin work capabilities are deliberately separate

Paperclip Plugin SDK v916 exposes separate capabilities:

```text
issues.read
issues.create
issues.wakeup
```

The SDK's `ctx.issues.create()` persists the issue but does **not** automatically request execution. `ctx.issues.requestWakeup()` is a separate capability and separately auditable operation.

The current live Organization Adapter v0.2.0 has only:

```text
agents.managed
agents.resume
webhooks.receive
secrets.read-ref
```

It does not have `issues.read`, `issues.create` or `issues.wakeup`.

### 4. Paperclip gives enough reconciliation surface for a narrow adapter

The Plugin SDK issue list supports `originKind` and `originId`. This allows a future Wandora work request to be reconciled without exposing Paperclip IDs to the browser.

However, generic plugin issue creation does not expose a first-class create idempotency key. Issue creation and wakeup are two distinct provider effects. Therefore a timeout or partial success cannot be blindly retried.

### 5. The customer product does not yet expose this work contract

The current Core customer surface exposes:

- session;
- Team/digital-employee read;
- hire;
- activation;
- legacy `GET .../work/attention-required`;
- conversations;
- Human Send for an already-created canonical proposal.

The current `Trabalho` read is backed by legacy `wandora.work_items` + conversations + `work_proposals`. There is no owner-facing POST that creates a Paperclip issue for an active employee, and there is no customer-safe Paperclip first-work projection.

Using the Paperclip native UI or a board/operator credential as the customer path would violate the canonical product boundary.

## GAPS

The first real work execution is not yet authorized because four product-contract gaps remain:

1. **customer work issuance** — authenticated Wandora owner/admin contract for one explicit employee and one explicit work request;
2. **provider materialization** — narrow company-scoped Paperclip adapter support for issue read/create/wakeup, without generic Paperclip credentials in Core or Web;
3. **idempotency/reconciliation** — minimum Wandora-owned operation journal so ambiguous issue-create/wakeup outcomes are reconciled and never blindly repeated;
4. **supervised result projection** — a customer-safe Wandora read of the Paperclip work/result so the owner can inspect what Ana produced without using the Paperclip console.

No gap justifies a second Wandora task engine, scheduler or run engine.

## CAPABILITY AUTHORITY / REUSE GATE

| Capability | Authority | Decision |
| --- | --- | --- |
| customer intent / product action | Wandora | KEEP WANDORA |
| tenant + owner authorization | Wandora | KEEP WANDORA |
| stable customer work request ID | Wandora | KEEP WANDORA |
| durable business issue/task | Paperclip | REUSE |
| issue assignment | Paperclip | REUSE |
| work-triggered wakeup/run | Paperclip | REUSE |
| model/workflow execution | Mastra through existing Agent Runtime | REUSE |
| run-scoped identity | Paperclip asserts, Wandora verifies | KEEP EXISTING |
| raw provider IDs | private adapter/reconciliation only | FORBID in Web |
| work idempotency/reconciliation | minimum Wandora integration-safety state | ADD MINIMUM ONLY |
| customer result projection | Wandora UX over Paperclip state | ADAPT / PROJECT |
| outbound authorization | Wandora | KEEP WANDORA |
| Human Send | Wandora | KEEP OFF |
| Gateway outbound | Wandora | KEEP OFF |
| routines/heartbeat polling | Paperclip capability, not needed for first one-off work | DEFER |
| direct `agents.invoke` | not required | FORBID for first-work path |

The Capability Reuse Gate therefore rejects reviving the abandoned native Wandora assignment/task-control-plane direction.

## DECISION

### Legitimate source of the first work

The first work must originate as an **explicit real business instruction from the authenticated MEDICSPRO owner through the Wandora customer product**.

It must not originate from:

- an operator command;
- Paperclip native UI;
- a synthetic fixture;
- a fabricated inbound WhatsApp event;
- an automatic routine;
- a timer heartbeat;
- direct `agents.invoke`;
- a manual wakeup whose only purpose is demonstration.

V1 should initially support one bounded work class:

```text
supervised internal work / draft
external effect = forbidden
```

The owner supplies real business content. Wandora supplies authorization and a stable request ID. Paperclip owns the durable issue and dispatch. Mastra executes. The result returns for human review.

### Future reviewed contract

The next implementation slice should establish a customer-safe contract conceptually equivalent to:

```text
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/work
Idempotency-Key: required

{
  title,
  description
}
```

Exact route/schema naming remains an implementation detail, but the contract must:

1. authenticate the normal Wandora session;
2. authorize active owner/admin membership;
3. require the exact employee to be `active + supervised`;
4. require the exact completed hire + provider binding;
5. reject provider IDs supplied by the browser;
6. require a bounded title/description;
7. reserve a Wandora-owned idempotency/reconciliation operation before provider effects;
8. call a signed company-scoped Organization Adapter work action;
9. materialize exactly one Paperclip issue with a Wandora-specific `originKind` and stable Wandora `originId`;
10. assign only the fixed managed Ana;
11. request execution exactly once through Paperclip's issue wake capability;
12. reconcile ambiguous create/wakeup outcomes instead of blindly retrying;
13. expose only a customer-safe work/result projection back to Wandora.

The Organization Adapter capability expansion should be no broader than required. Candidate set:

```text
issues.read
issues.create
issues.wakeup
```

No `agents.invoke`, arbitrary agent selection, generic Paperclip API credential or provider ID is needed.

### Runtime execution

After a legitimate issue is admitted and Paperclip schedules its run:

```text
owner instruction
-> Wandora authorization/idempotency boundary
-> Organization Adapter
-> Paperclip issue assigned to Ana
-> Paperclip assignment wakeup/run
-> Paperclip run-scoped JWT
-> wandora_mastra
-> Core HMAC + run identity + company mapping + active/supervised binding
-> Agent Runtime
-> Mastra
-> supervised internal result
-> Paperclip durable run/result
-> Wandora customer-safe projection
-> STOP
```

The existing bridge already provides the execution half of this flow and should be reused.

### Stop boundary

The first real work stops after a durable, customer-reviewable **internal result** exists.

For this slice and the future first-work execution:

```text
NO Human Send enablement
NO Gateway outbound enablement
NO WhatsApp send
NO e-mail send
NO order creation
NO payment action
NO provider mutation outside Paperclip work/run state
```

If the work logically suggests an external action, Ana may only prepare a draft/proposal. A later separately reviewed Wandora effect contract decides whether that action can occur.

## SECOND ADVERSARIAL REVIEW

The initial idea — "create an assigned Paperclip issue and let the bridge run" — was rejected as incomplete.

### Challenge 1 — use Paperclip UI directly

Rejected. It would make a provider console part of the customer product and bypass Wandora tenant/product authorization.

### Challenge 2 — use existing `wandora.work_items`

Rejected as the first Paperclip work source. Those rows support the existing messaging supervision vertical slice; treating them as a generic task engine would duplicate Paperclip's accepted work authority.

### Challenge 3 — call `issues.wakeup` directly

Rejected. A wakeup is execution of an already-existing issue, not the durable customer work itself. First work must have an authoritative issue.

### Challenge 4 — add only `issues.create` to the plugin

Rejected. Plugin issue creation and wakeup are separate operations. Create-only could leave durable work that never executes, while blind retry after timeout could duplicate work.

### Challenge 5 — use broad Paperclip board/service credentials from Core

Rejected. The project already established that broad Paperclip credentials are not the normal tenant Organization Adapter authority. The company-scoped plugin boundary is narrower and already accepted.

### Challenge 6 — run now and show the result only in Paperclip

Rejected. "Supervised" is a customer-product promise. The owner must be able to inspect the result through a Wandora-owned projection; the provider console is not an acceptable supervision surface.

### Challenge 7 — enable outbound to make the first work commercially visible

Rejected. Work execution and external-effect authorization are separate authorities. Turning on outbound would collapse the safety boundary proven by ADR 0135.

The revised decision survives the adversarial review.

## EXECUTION

This preflight performed only:

- Git/PR/canonical-document reconciliation;
- read-only live Wandora/Paperclip state checks;
- exact-source inspection of Paperclip v2026.916.0 issue assignment, Plugin SDK capabilities and wake semantics;
- current Wandora Core/Organization Adapter contract inspection;
- temporary read-only diagnostic files/processes, removed after use;
- documentation of this decision.

It did **not** create a Paperclip issue, work item, wakeup, heartbeat, run, task session, routine execution or outbound attempt.

## VALIDATION

Final state remains within the requested no-effect boundary:

```text
Wandora Ana         = active + supervised
Paperclip Ana       = idle / wandora_mastra
assigned issues     = 0
wakeups             = 0
heartbeat runs      = 0
routine runs        = 0
task sessions       = 0
run identity ctx    = 0
runtime last_run_id = null
runtime tokens/cost = 0
outbound attempts   = 0
Human Send          = OFF
Gateway outbound    = OFF
```

## Outcome

```text
FIRST LEGITIMATE WORK PREFLIGHT
= COMPLETE

ARCHITECTURAL DECISION
= GREEN

FIRST REAL WORK EXECUTION NOW
= NO-GO / BLOCKED

blocker
= missing customer-safe, idempotent Paperclip work-admission + supervised-result projection contract
```

## Next executable slice

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1 — NO REAL WORK**

Implement and test the minimum Wandora/Core + Organization Adapter contract defined above, preferably with disposable/candidate Paperclip proof. Do not create MEDICSPRO real work, wakeups or runs during implementation. Keep Human Send and Gateway outbound OFF.

Only after that implementation is merged, deployed through a separate reviewed production preflight/execution, and the owner supplies a genuine business instruction may the first real work run be authorized.
