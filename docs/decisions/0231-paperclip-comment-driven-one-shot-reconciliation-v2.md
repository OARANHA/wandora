# ADR 0231 — Paperclip Comment-Driven One-Shot Reconciliation V2

Status: **GREEN / NO CODE CHANGE REQUIRED / NO PROVIDER CALL**
Date: 2026-09-23

## Context

ADR 0230 correctly proved that Paperclip comment-driven wakes are excluded from `finish_successful_run_handoff`, but it stopped its failed-run analysis too late in the release-recovery path and therefore concluded that `adapter_failed` could create an automatic `issue_continuation_needed` successor.

A second adversarial review of the exact pinned Paperclip `v2026.916.0` source found an earlier replay-safety gate that changes that conclusion.

## Canonical entry

```text
main = 0cc4b026a592e88538a040b5e0dc5a5fe7c480a1
ADR 0230 = merged, but failed-run conclusion superseded by this ADR
Paperclip = v2026.916.0
Paperclip source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
Core live = wandora/core:organization-adapter-candidate-fc8721ccaedd
VendaERP MCP live server.mjs = 6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

No provider call or production mutation occurred during this reconciliation.

## Proven successful-run path

Paperclip `decideSuccessfulRunHandoff()` explicitly skips corrective handoff for:

```text
issue_commented
issue_comment_mentioned
issue_reopened_via_comment
```

Therefore a successful comment-driven run cannot produce the ADR 0226 `finish_successful_run_handoff` duplicate.

## Proven failed-run path

Paperclip's legacy replay-safety contract is:

```text
legacyExecutionNeedsReconciliation(run)
```

For a legacy failed/timed-out/interrupted/cancelled run, the function returns `true` unless Paperclip has positive evidence that provider work never started, such as:

```text
executionRecovery = {
  kind: "bootstrap",
  providerWorkStarted: false
}
```

The function's own source comment states that error families describe availability, not whether earlier actions happened.

A failed provider execution without that positive no-provider-work evidence therefore requires reconciliation rather than replay.

## Why the Wandora MCP tool-error case is held

The live `wandora_mastra` adapter marks entry into adapter execution before calling its `execute()` implementation:

```text
legacyAdapterEntered = true
return adapter.execute(...)
```

The current bounded tool-error path is:

1. Paperclip enters `wandora_mastra.execute()`;
2. Wandora Core calls Paperclip Tool Gateway;
3. MCP returns `isError=true`;
4. Core fails closed with `PaperclipToolGatewayReadBridgeError("unavailable")`;
5. Core HTTP boundary returns 500;
6. `wandora_mastra` throws `wandora_execution_failed_500`;
7. Paperclip persists the failed run as `adapter_failed`.

Critically, the heartbeat failure catch only adds:

```text
executionRecovery = {
  kind: "bootstrap",
  providerWorkStarted: false
}
```

when:

```text
!legacyAdapterEntered && runtimeMode !== "native"
```

That condition is false for this path because the adapter was already entered.

Therefore the failed run has no positive replay authorization.

## Pre-drain proof

Before Paperclip reaches the generic release recovery tail, `decidePreDrain()` receives:

```text
legacyExecutionNeedsReconciliation = true
```

and returns:

```text
{ kind: "released" }
```

The Postgres wake-queue adapter then returns immediately with no promoted deferred wake and no immediate recovery successor.

Paperclip's own domain tests explicitly cover:

```text
released: legacy execution needs reconciliation
```

The generic `issue_continuation_needed` branch is therefore unreachable for this failed Wandora provider-attempt case unless independent explicit recovery authority is later supplied.

## Reconciliation of ADR 0230

ADR 0230 remains correct on these facts:

- comment-driven wakes exclude `finish_successful_run_handoff`;
- comment origin alone is not a non-retryable error classification;
- `adapter_failed` is in the transient continuation classification set.

ADR 0230 is superseded only on the conclusion that this necessarily permits an automatic second provider run.

It does not, because replay-safety is decided earlier by `legacyExecutionNeedsReconciliation()`.

## Capability Authority / Reuse Gate

No new Wandora code is justified.

Do **not** add:

- a Wandora retry engine;
- a one-shot state flag;
- a lifecycle table;
- a custom fake Paperclip error code;
- an issue state machine;
- a Paperclip fork;
- a duplicated recovery policy.

Paperclip already owns the exact replay-safety capability required.

This is the preferred ADR 0168 outcome: **reuse provider implementation behind the existing adapter boundary**.

## Second adversarial review

- Successful comment-driven run can create `finish_successful_run_handoff`? **No.**
- Failed post-adapter-entry run receives `providerWorkStarted:false`? **No.**
- Failed post-adapter-entry run requires legacy reconciliation? **Yes.**
- Pre-drain proceeds into immediate recovery when reconciliation is required? **No.**
- Automatic `issue_continuation_needed` successor is admitted for that source? **No.**
- Does `adapter_failed` classification alone override the earlier reconciliation hold? **No.**
- Is a Wandora code patch required? **No.**
- Is a Paperclip fork required? **No.**
- Was VendaERP called during this proof? **No.**

## Decision

**GREEN / NO CODE CHANGE REQUIRED.**

The current promoted Core + MCP + retained `wandora_mastra@0.4.0` already provide the one-shot safety needed for a comment-driven bounded product read:

- success: comment-driven wake is excluded from successful-run handoff;
- failure after adapter/provider execution begins: Paperclip holds the source for reconciliation and does not automatically replay it.

ADR 0230's failed-run NO-GO conclusion is superseded by this ADR.

Next slice:

**28PRO Comment-Driven Bounded Product Read Retry V3 Preflight — NO PROVIDER CALL**

That preflight must freeze the exact issue/profile/comment sequence, prove zero residual live runs/work/outbound, and STOP before the VendaERP invocation.
