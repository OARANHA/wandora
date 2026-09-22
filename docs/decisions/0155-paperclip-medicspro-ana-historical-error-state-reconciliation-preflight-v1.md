# ADR 0155 — Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1

Status: **ACCEPTED / NO EFFECT / NO LIFECYCLE MUTATION REQUIRED FOR EXECUTION READINESS**
Date: 2026-09-21

## Context

ADR 0154 closed the Core + `wandora_mastra@0.4.0` production promotion while deliberately preserving one historical Paperclip agent projection: Ana remained `error` with `errorReason=wandora_execution_failed_409` and `updatedAt=2026-09-21T11:49:40.115Z`.

That projection came from the second historical continuation run of MED-1, before the promotion. MED-1 is now `done`, the two historical runs are preserved, the Core model was called exactly once, historical usage was not backfilled, and outbound remained zero.

This preflight answers one narrow question: does Ana require a Paperclip lifecycle mutation before she is execution-ready again, and, if not, what native reconciliation primitive would be appropriate should a separate operator-facing cleanup ever be required?

This ADR is explicitly **NO EFFECT**. It does not clear, resume, pause, wake, retry, reassign, invoke, run or otherwise mutate Ana, MED-1, Core, Mastra, Mistral, Human Send or Gateway outbound.

## REAL NOW

Repository reconciliation:

- canonical `main = 90d109854dfbcf38e33516d85b2ac97d28c51806`;
- PR #208 merged: Paperclip OpenAPI Compatibility Gate V1;
- PR #209 merged: customer-work terminal disposition + usage production promotion V2;
- open PR count before this branch: 0;
- ADR 0155 is the next available decision number.

Production readback before documentation:

- Paperclip image: `wandora/paperclip:v2026.916.0`, healthy, restart count 0;
- pinned Paperclip source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- exactly one `wandora_mastra@0.4.0`, loaded=true, disabled=false;
- Organization Adapter: `0.3.0`, status `ready`, with `agents.managed`, `agents.resume`, `issues.read/create/wakeup`, plugin state, webhook and secret-ref capabilities;
- Core image: `wandora/core:organization-adapter-candidate-61cbb34d4bfd`;
- Core image id: `sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873`;
- Core healthy, restart count 0, runtime `mastra-supervised-model`;
- Human Send flag absent/OFF;
- Gateway outbound flag absent/OFF;
- MEDICSPRO outbound attempts = 0;
- MEDICSPRO digital employee work operations = exactly 1, status `result_recorded`.
Paperclip official CLI readback:

- MED-1 id `42a8a8df-f6d9-4a4e-a3aa-662a05dc6154` is `done`;
- MED-1 live runs = `[]`;
- MED-1 historical runs = exactly 2;
- first run = `succeeded`, invocation source `assignment`, usage null;
- second run = `failed`, invocation source `automation`, error code `adapter_failed`, usage null;
- active recovery action = null and recovery action list = empty;
- Ana id = `da6cfc6b-e16f-483a-95f1-bacee8e54365`;
- Ana status = `error`;
- Ana errorReason = `wandora_execution_failed_409`;
- Ana pauseReason = null;
- Ana pausedAt = null;
- Ana lastHeartbeatAt = `2026-09-21T11:49:40.115Z`;
- Ana updatedAt = `2026-09-21T11:49:40.115Z`;
- Ana org chain = healthy;
- heartbeatEnabled = false;
- intervalSec = 0;
- schedulerActive = false.

No mutation was used to obtain any of those facts.

## PROVEN EVIDENCE — exact v2026.916.0 source

All lifecycle conclusions below come from the pinned source commit, not Paperclip master.

### Valid agent states

`packages/shared/src/constants.ts` defines:

```text
active
paused
idle
running
error
pending_approval
terminated
```

The agent schema stores `status`, `pauseReason`, `pausedAt`, `errorReason`, `lastHeartbeatAt` and `updatedAt`. It has **no dedicated `errorAt` column**.

### What `error` means

`server/src/services/heartbeat.ts::finalizeAgentStatus` projects terminal run outcome onto the agent:

```text
running run(s) remain      -> running
succeeded                  -> idle
interrupted                -> idle
cancelled                  -> idle
selected failed exceptions -> idle
ordinary failed/timed_out  -> error
```

When the next state is `error`, Paperclip persists a bounded human-readable `errorReason`, sets `lastHeartbeatAt` and `updatedAt`, and publishes an `agent.status` event. When the agent leaves error through ordinary finalization, `errorReason` is cleared.

Therefore agent `error` is an operator-facing lifecycle/diagnostic projection of a terminal run failure. It is not the failed run itself and it does not rewrite issue history.
### Error is execution-eligible

`packages/shared/src/agent-eligibility.ts` explicitly allow-lists:

```text
assignable: active, paused, idle, running, error
invokable:  active, idle, running, error
```

Only `paused`, `terminated` and `pending_approval` are direct non-invokable lifecycle states.

`server/src/services/agent-invokability.ts` uses the same rule. Ana's current org chain is healthy.

This proves hypothesis E: **the current `error` status does not block new work. Ana is already execution-ready at the Paperclip lifecycle gate.**

The proof is source-based; no second customer work was created to discover this.

### Native lifecycle primitives

Pinned `server/src/services/agents.ts` proves:

- `pause(id)`: any non-terminated agent -> `paused`; writes pause reason/time and clears `errorReason`;
- `resume(id)`: any non-terminated/non-pending-approval agent -> `idle`; clears pause reason/time and `errorReason`;
- `clearError(id)`: only an agent currently in `error` -> `idle`; clears pause reason/time and `errorReason`; an already non-error agent returns 409.

The route layer adds important behavior:

- `POST /api/agents/:id/pause` also cancels active heartbeat execution for that agent;
- `POST /api/agents/:id/resume` calls the resume service and records `agent.resumed`; it does not directly create a wakeup/run;
- `POST /api/agents/:id/clear-error` requires a Board actor, validates accessible agent + org-chain health, calls only `clearError`, and records `agent.error_cleared`;
- `POST /api/agents/:id/wakeup` / heartbeat invoke enters heartbeat/run execution authority and is therefore a different, higher-effect primitive.

Current scheduler readback proves Ana has no periodic heartbeat path enabled. Moving her to `idle` would not activate an existing periodic scheduler policy.

### Clear-error preserves history

Pinned upstream test `server/src/__tests__/agents-service-clear-error.test.ts` proves that `clearError`:

- changes `error -> idle`;
- clears lifecycle error/pause fields;
- leaves the historical failed heartbeat run intact;
- leaves run events/transcript intact;
- leaves runtime-state diagnostics, including last failed run/error, intact;
- rejects non-error, terminated and pending-approval agents.

A disposable, networkless run of the exact production image as non-root executed the upstream clear-error + managed-agent tests:

```text
Test Files = 2 passed
Tests      = 17 passed
```

No production data, network, HMAC or MEDICSPRO identity was mounted into that proof.

A second isolated route-authz proof ran the exact upstream case `requires board access before clearing an agent error` with a larger harness timeout and passed `1/1`. A broader route-authz run also exposed unrelated resume/grant fixture failures in the standalone image context; that broad run is not treated as a green gate and does not support this decision.

### Authority and SDK/CLI surface

`clear-error` route authority is **Board**, not agent/plugin and not instance-admin-specific:

- route calls `assertBoard(req)`;
- company/resource accessibility is still enforced;
- instance-admin is not a route requirement.

The plugin SDK exposes `agents.resume` under capability `agents.resume`, but exposes **no `clearError` primitive**.

The official CLI exposes `agent pause` and `agent resume`, but does not expose a dedicated `agent clear-error` command in this pin. The dedicated official surface is the REST operation documented by Paperclip:

```text
POST /api/agents/{id}/clear-error
```

The pinned OpenAPI registry declares that route. Wandora's current OpenAPI compatibility manifest does not list it because Wandora does not currently consume it. Since the decision below is NO-OP, no new HTTP dependency is adopted in this slice.

### Managed-agent reconciliation does not own runtime lifecycle

`server/src/services/plugin-managed-agents.ts` reconciles/binds the manifest-declared managed resource but does not force an existing agent back to the manifest status. It only has special lifecycle backfill for a still-paused managed declaration missing its managed pause reason.

Pinned tests explicitly prove that an explicit resume remains durable across managed-agent reconcile.

Therefore hypothesis F is false: Organization Adapter managed reconciliation is not expected to auto-clear this historical error projection.

## Relevant lifecycle state machine

The relevant state is three separate machines:

```text
ISSUE
todo/in_progress/blocked/... -> done

RUN
queued/running -> succeeded | failed | cancelled | timed_out | interrupted

AGENT PROJECTION
paused                  -> non-invokable
idle/active/running     -> invokable
error                   -> invokable, diagnostic last-failure projection
pending_approval        -> non-invokable
terminated              -> non-invokable
```

A failed run may leave the agent in `error` even after the issue is later reconciled to `done`. That is exactly the present MED-1/Ana state and is not a contradiction.
## Options considered

| Hypothesis | Proven behavior | Decision |
| --- | --- | --- |
| A. `resume` is the correct native primitive | It is native and does not directly invoke work, but is generic: it can turn multiple lifecycle states into `idle` and is exposed to plugins through `agents.resume`. | **REJECT for this reconciliation.** Broader than necessary and readiness already exists. |
| B. `resume` creates work automatically | The route/service do not directly create wakeup/run. Reaching `idle` can make an already-enabled scheduler policy eligible, but Ana's scheduler is explicitly disabled/0s. | **FALSE for current Ana, but still not selected.** |
| C. pause -> resume | Pause is an extra mutation and cancels active heartbeat execution; resume is a second mutation. | **REJECT.** Two mutations are strictly worse than zero/one. |
| D. dedicated clear/reconcile primitive exists | `clear-error` is exact, Board-only, conditional on status=error, history-preserving and audit-logged. | **TRUE**, but not needed to make Ana executable. |
| E. error is historical projection and does not block new work | Pinned eligibility/invokability source explicitly includes `error`. Current org chain is healthy. | **TRUE / DECISIVE.** |
| F. managed plugin should auto-reconcile | Managed-agent reconcile preserves explicit lifecycle and has no clear-error SDK primitive. | **REJECT.** |
| G. PATCH/SQL can rewrite status | Generic PATCH can write status broadly and does not supply the dedicated clear-error invariant/audit; direct SQL bypasses Paperclip authority entirely. | **REJECT.** |

Additional rejected paths:

- wakeup / heartbeat invoke: creates execution authority and can create a run;
- retry / recovery action: run/issue recovery semantics, not agent diagnostic reconciliation; MED-1 has no active recovery action;
- issue reassignment: mutates work control-plane state for no lifecycle need;
- direct status PATCH to `idle`: broader than `clear-error` and can leave stale diagnostic fields inconsistent;
- direct SQL/admin patch: bypasses provider authority and audit.

## CAPABILITY AUTHORITY / REUSE GATE

Authority remains unchanged:

```text
Wandora
  -> tenant/product semantics
  -> active + supervised customer contract
  -> external-effect authorization

Paperclip
  -> operational agent lifecycle
  -> issue/run lifecycle
  -> historical diagnostics

Organization Adapter
  -> company-scoped product-to-Paperclip bridge
  -> managed resource + accepted lifecycle actions

Mastra/Mistral
  -> execution only after an admitted Paperclip run
```

No new Wandora state machine, recovery table, retry engine or lifecycle projection is justified.
## DECISION

**Do not mutate Ana merely to make her execution-ready. She already is execution-ready according to the exact pinned Paperclip source.**

The least-authority action for the requested readiness objective is therefore:

```text
NO OP
```

Specifically, do not call:

- `resume`;
- `pause`;
- `clear-error`;
- wakeup/heartbeat;
- retry/recovery;
- status PATCH;
- direct SQL;
- managed-agent reconcile for the purpose of clearing the error.

This is intentionally stricter than choosing the narrowest mutation: the prompt required us not to "correct" a historical projection that does not block work.

The stale `error` remains truthful evidence that the historical second run failed. The historical run itself, error reason and timestamps remain queryable. MED-1 is independently `done`.

### If operator-facing cleanup is ever separately required

A future, separately authorized UX/operations cleanup may choose the Paperclip-native `clear-error` primitive, **not resume**, provided the new requirement is specifically "remove the resolved historical error projection from the agent lifecycle display".

That would be a different effect authorization. Before such an execution:

1. add `POST /api/agents/{id}/clear-error` to Wandora's Class A maintenance API dependency inventory with pinned-source supplement if the OpenAPI export still omits it;
2. require a Board identity with MEDICSPRO access; do not require instance-admin and do not route through an agent/plugin capability;
3. re-read Ana and require the exact expected historical error, healthy org chain, scheduler inactive, no live run, MED-1 done and no active recovery;
4. execute exactly one conditional `clear-error`;
5. validate `idle + errorReason=null` while preserving 2 historical runs and all runtime diagnostics;
6. stop without wakeup, issue creation, model call or outbound.

This preflight does **not** authorize that optional cleanup.

## SECOND ADVERSARIAL REVIEW

The second review tried to disprove NO-OP by asking whether `error` secretly blocks:

- assignment;
- invocation;
- scheduler dispatch;
- managed-agent reconciliation;
- execution bridge admission.

The pinned eligibility source disproves the first two: `error` is explicitly assignable and invokable.

The current scheduler readback proves no periodic scheduler path is active for Ana.

Managed-agent source/tests prove reconcile does not own this lifecycle transition.

The Wandora execution bridge still independently checks Wandora employee/binding/work admission; none of those gates requires Paperclip agent `idle` as a prerequisite once Paperclip has admitted a legitimate run.

Therefore a mutation would improve cosmetics/operator projection, not readiness, and is not justified by this slice.
## Ambiguity / retry rules

Because the chosen decision is NO-OP, there is no mutation to retry.

For any future separately authorized `clear-error` execution:

- never blind-retry after timeout;
- first GET/read back the exact agent;
- if it is already `idle` with `errorReason=null`, treat the clear as converged and only validate history/counters;
- if it still has the exact old `error + wandora_execution_failed_409` projection and unchanged historical timestamp, a separately reviewed retry may be considered;
- if status, error reason, org chain, scheduler policy or timestamps differ unexpectedly, STOP;
- a 409 because the agent is no longer in error is reconciliation input, not permission to fall back to resume/PATCH/SQL.

## Rollback / reconciliation

NO-OP requires no rollback.

A future successful `clear-error` also has **no legitimate inverse rollback**. Re-introducing `error` would fabricate a diagnostic state that no new failed run produced. If post-clear validation found unexpected effects, stop and investigate; do not rewrite status back to error.

Historical runs, run events and runtime diagnostics are the durable rollback-independent evidence of what happened.

## Hard stop conditions

Stop without mutation if any future context shows:

- more or fewer than one MEDICSPRO Ana;
- agent id/company mismatch;
- org chain unhealthy;
- live run present;
- active recovery action present;
- MED-1 not `done`;
- scheduler heartbeat enabled/active unexpectedly;
- Paperclip image/pin differs from qualified v2026.916.0;
- adapter or Organization Adapter drift;
- Wandora work count differs from 1;
- outbound attempts nonzero for this flow;
- Human Send or Gateway outbound enabled unexpectedly;
- any proposed path requires replaying MED-1 or calling Core/Mastra/Mistral.

## VALIDATION / NO EFFECT

After all read-only inspection and disposable proofs:

```text
main                         = 90d109854dfbcf38e33516d85b2ac97d28c51806
Paperclip                    = v2026.916.0 / healthy / restart 0
wandora_mastra               = 0.4.0 / loaded / enabled
Organization Adapter         = 0.3.0 / ready
Core                         = 61cbb34d... candidate / healthy / restart 0
Ana / Wandora                = unchanged active + supervised
Ana / Paperclip              = unchanged error
Ana errorReason              = unchanged wandora_execution_failed_409
Ana scheduler                = disabled / interval 0 / inactive
MED-1                        = done
MED-1 live runs              = 0
MED-1 historical runs        = 2
active recovery actions      = 0
Wandora work operations      = 1 / result_recorded
MEDICSPRO outbound attempts  = 0
Human Send                   = OFF
Gateway outbound             = OFF
```

No production mutation, model call, issue/task, wakeup, heartbeat, run, task session, retry, recovery action, outbound effect or direct SQL write occurred.

## Next checkpoint

There is **no required Historical Error-State Clear Execution slice for readiness**.

The project may proceed to whatever separately authorized customer-work/product slice is next, carrying the Paperclip `error` as a truthful historical diagnostic. If operator-facing lifecycle cleanup becomes an explicit requirement later, first open a new clear-error execution preflight/authorization rather than silently using resume.
