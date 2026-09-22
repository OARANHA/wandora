# Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1

Status: **CLOSED / NO EFFECT / NO MUTATION REQUIRED**

Authority: ADR 0155.

## Purpose

Determine whether the historical Paperclip agent `error` projection on the MEDICSPRO Ana blocks legitimate future execution, and identify the narrowest provider-native reconciliation path without mutating production.

This runbook is evidence-only. It is not a lifecycle execution authorization.

## Frozen identifiers

```text
Wandora organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Paperclip company     = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana         = da6cfc6b-e16f-483a-95f1-bacee8e54365
MED-1                 = 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
Paperclip pin         = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
Paperclip version     = v2026.916.0
```

## Read-only production proof

Official Paperclip CLI was used by reference to the protected auth store; no token value was read or printed.

Readbacks proved:

- exactly one Ana;
- status `error`;
- `errorReason=wandora_execution_failed_409`;
- healthy org chain;
- heartbeat disabled, interval 0, scheduler inactive;
- MED-1 `done`;
- no live runs;
- exactly two historical runs;
- no active recovery action;
- adapter 0.4.0 loaded/enabled;
- Organization Adapter 0.3.0 ready.

Wandora DB read-only queries proved one customer-work operation in `result_recorded` and zero MEDICSPRO outbound attempts.
## Source proof

The exact pinned source establishes:

1. agent states include `error`;
2. `error` is both assignable and invokable;
3. run failure with no other live run normally projects the agent to `error`;
4. no dedicated `errorAt` exists; `lastHeartbeatAt` and `updatedAt` carry the observed failure time;
5. `clearError` is conditional on current status=error and moves only to `idle`;
6. `clearError` preserves run history/events/runtime diagnostics;
7. route `POST /api/agents/:id/clear-error` is Board-only and audit-logged;
8. plugin SDK has resume but no clear-error primitive;
9. managed-agent reconcile does not force existing lifecycle back to manifest default;
10. pause has cancellation side effects; wake/retry/recovery enter execution authority.

## Disposable proof

Exact production image, non-root, no network:

```text
wandora/paperclip:v2026.916.0
server/src/__tests__/agents-service-clear-error.test.ts
server/src/__tests__/plugin-managed-agents.test.ts

Test Files = 2 passed
Tests      = 17 passed
```

A broader route-authz suite was also probed only for context. Its standalone image harness had unrelated resume/grant fixture failures, so that broad run is **not** treated as a green gate. The relevant Board-only clear-error case was then isolated with a larger harness timeout and passed `1/1`. The pinned route source independently contains the explicit `assertBoard(req)` boundary.

## Decision

Execution-readiness requires **no mutation**.

```text
Paperclip Ana = error
             = still invokable
             = scheduler inactive
             = no live run/recovery
```

Do not clear, resume, pause, wake, retry, reassign or PATCH the agent merely to normalize the display.

The current error remains useful historical evidence of the old failed continuation and does not create a second Wandora lifecycle.
## Optional future operator cleanup

If a separate product/operator requirement later says the lifecycle display itself must be normalized, the only candidate is:

```text
POST /api/agents/{id}/clear-error
```

That is **not authorized here**.

A future effect slice must first:

- add the operation to the Class A maintenance dependency inventory if Wandora will consume it;
- prove current status is still the exact expected historical error;
- use a Board identity with MEDICSPRO access;
- prove scheduler remains inactive and no run/recovery is live;
- execute exactly once;
- reconcile by readback before any retry;
- never fall back to resume/PATCH/SQL;
- validate history stayed at two runs and outbound stayed zero.

There is no inverse rollback after a legitimate clear. Recreating `error` manually would falsify provider history.

## Hard stops

STOP on any drift in:

- main / accepted ADRs;
- Paperclip image/source pin;
- exact Ana identity/count;
- org-chain health;
- scheduler policy;
- MED-1 terminal state;
- live-run/recovery state;
- adapter/plugin identity;
- Wandora work/outbound counters;
- Human Send or Gateway outbound gates.

## Final boundary

This preflight performed no production mutation and authorizes none.

The project may continue to the next separately authorized product/customer-work slice with the historical Paperclip error left intact.