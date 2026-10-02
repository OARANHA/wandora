# ADR 0398 — Paperclip Dynamic Managed Agent Initial Status Contract Reconciliation V1

- Status: **IMPLEMENTED ON PR CANDIDATE / EXACT-HEAD CI PENDING / NO PRODUCTION EFFECT**
- Date: 2026-10-02
- Scope: reconcile ADR 0396 requested initial lifecycle state with the fifth Paperclip provider patch before Organization Adapter integration
- Production effect: **none**

## Context

Fresh reconciliation on PR #397 proved the branch still open, draft, mergeable
and unmerged at `acc177ff292904a0939f5999810ec3e8ea7c9c29`, based on the live PR #396 branch ref.
The exact observed head was 13/13 GREEN.

During the mandatory next-slice Reuse Gate, the Organization Adapter integration
was compared against the accepted lifecycle contract before any code was written.
That review found a provider-candidate defect:

- ADR 0396 explicitly qualified a bounded requested initial status
  `idle | paused`;
- ADR 0396 requires Paperclip to force `pending_approval` when Board approval
  is required, otherwise apply the requested allowed initial status;
- ADR 0063/0064 require Wandora customer hire to remain **paused-first /
  supervised**, with activation as a separate effect;
- the ADR 0397 fifth patch contained no `initialStatus` field and created every
  non-approval dynamic Agent as `idle`.

The prior CI result was valid for the exact prior bytes, but it did not prove
conformance to this accepted semantic requirement.

## Capability Authority / Reuse Gate

No new Wandora lifecycle is justified.

Wandora continues to own:

- canonical DigitalEmployee identity;
- product meaning of hire versus activation;
- the policy that a newly hired customer employee is paused-first.

Paperclip continues to own:

- provider Agent lifecycle implementation;
- creation transaction;
- native Board approval;
- pause/resume operational state;
- dynamic marker/fingerprint;
- exactly-one concurrency and provider audit.

Therefore the correction belongs inside the existing provider primitive. An
Organization Adapter sequence of “create idle, then pause” is rejected because
it would introduce a non-atomic window in which the Agent is operational.

No new credential, control plane, table, migration, state machine or retry
engine is introduced.

## Decision

Reconcile the fifth patch with ADR 0396 before any Organization Adapter dynamic
wiring.

`PluginDynamicManagedAgentSpec` gains:

```ts
initialStatus?: "idle" | "paused"
```

Provider rules:

1. missing `initialStatus` normalizes to `idle` for compatibility;
2. any runtime value outside `idle | paused` fails closed;
3. normalized `initialStatus` participates in the host-owned creation
   fingerprint;
4. when Board approval is **not** required, Agent creation uses the requested
   initial status atomically;
5. a requested paused Agent receives provider-owned `pauseReason` and
   `pausedAt`;
6. when Board approval **is** required, Paperclip continues to force
   `pending_approval` and reuse the native `hire_agent` approval lifecycle;
7. same resource + same spec/status replays to the same Agent;
8. same resource + changed initial status conflicts as changed immutable
   creation semantics.

This slice does not change the native post-approval transition. A future
Organization Adapter/customer-hire integration must not assume that a
Board-approved Agent remains paused after approval unless that behavior is
separately proven. That question is outside this narrow candidate correction.

## Validation added

The focused provider tests now require:

- explicit `initialStatus: paused` creates an Agent already paused;
- paused replay returns the same Agent;
- pause reason and timestamp are present;
- replay with `initialStatus: idle` conflicts;
- Board-approval mode still forces `pending_approval` even when paused was
  requested;
- existing concurrency, uniqueness, rejection, cross-company and capability
  isolation tests remain in the candidate suite.

The unified provider patch hunk counts are recalculated as part of the repository
artifact update; GitHub CI remains the authoritative exact-composition proof.

## Second adversarial review

The initial attempt to move directly into Organization Adapter wiring was
rejected by repeated deep-review outcomes because the employee/template-to-Agent
projection was not yet sufficiently closed.

After the initial-status mismatch was isolated, the focused review returned:

```text
proceed_fast = 0.61
deep_review  = 0.36
block        = 0.01
split_task   = 0.02
```

The deterministic accepted ADR conflict is the controlling evidence.

## Effect boundary

This correction does **not** authorize:

- merge of PR #397;
- registry push;
- production deployment or migration;
- Paperclip restart/recreation;
- Organization Adapter upgrade;
- Core/schema changes;
- real Agent creation;
- workforce activation;
- customer/provider/model/outbound work.

## Current gate

**CODE CORRECTION WRITTEN / EXACT-HEAD CI MUST REQUALIFY / NO PRODUCTION EFFECT**.

The next decision after exact-head CI GREEN may return to the Organization
Adapter dynamic managed employee bridge. Production promotion remains a separate
effect-authorizing slice.
