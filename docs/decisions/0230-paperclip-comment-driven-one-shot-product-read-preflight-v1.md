# ADR 0230 — Paperclip Comment-Driven One-Shot Product Read Preflight V1

Status: **NO-GO / NO PROVIDER CALL / GAP IDENTIFIED**
Date: 2026-09-23

## Objective

Determine whether a single human comment can safely trigger exactly one bounded `vendaerp_search_products` attempt without any provider call during preflight and without permitting provider-owned automatic follow-up to repeat the read.

This preflight is strictly NO EFFECT toward VendaERP.

## Canonical entry

```text
main = 7d36d33a569b0ad72348f9e81812d1673b271c13
open PRs = 0
ADR 0229 = COMPLETE / GREEN
Core live = wandora/core:organization-adapter-candidate-fc8721ccaedd
VendaERP MCP live server.mjs = 6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
Paperclip = wandora/paperclip:v2026.916.0
```

All four post-merge push workflows for `main@7d36d33a...` were GREEN before this decision.

## PROVEN EVIDENCE — comment-driven wake

Pinned Paperclip source is exactly `v2026.916.0` at commit `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`.

`shouldWakeAssigneeForIssueComment()` proves:

- a non-self human comment on a non-terminal assigned issue is wake-eligible;
- ordinary self-comments are inert;
- an already-terminal issue is not reawakened unless the comment explicitly reopened it;
- a completed prior run may explicitly resume, but the currently owning run cannot self-create a duplicate turn.

The issue route emits a Paperclip-native wake with:

```text
reason = issue_commented
contextSnapshot.wakeReason = issue_commented
source = issue.comment
commentId/wakeCommentId = exact comment id
```

No Wandora-owned lifecycle flag or retry subsystem is required.

## PROVEN EVIDENCE — successful-run handoff exclusion

Pinned Paperclip `decideSuccessfulRunHandoff()` has an early exclusion for:

```text
issue_commented
issue_comment_mentioned
issue_reopened_via_comment
```

and returns:

```text
skip: comment-driven wake already owns the next action
```

Therefore a **successful** comment-driven run cannot create the previous `finish_successful_run_handoff` corrective run that duplicated ADR 0226.

## Adversarial gap — failed run recovery can still create another run

The one-shot requirement must hold when the read fails, not only when the run succeeds.

Paperclip's release recovery tail applies to an assigned `todo`/`in_progress` issue when the source run finishes as:

```text
failed | timed_out | cancelled
```

If no independent wake/path/monitor/blocker/pause suppresses recovery and the source is not classified as explicitly non-retryable, `decideReleaseRecovery()` may return:

```text
queue_recovery
```

which creates a new run with:

```text
wakeReason = issue_continuation_needed
retryReason = issue_continuation_needed
retryOfRunId = failed source run
```

This path is independent of `finish_successful_run_handoff`.

## PROVEN EVIDENCE — comment-driven origin does not itself block immediate recovery

`isImmediateRecoverySourceBlocked()` blocks only when at least one of these conditions is true:

- the source is owned by a chat inbound/failed-run retry action;
- `run.errorCode === chat_failed_run_retry_not_authorized`;
- `classifyContinuationFailure(run).kind === non_retryable`.

It does **not** block merely because `contextSnapshot.wakeReason === issue_commented`.

Therefore comment-driven origin alone does not guarantee one-shot failed-run behavior.

## Why the current Wandora error maps into retryable Paperclip state

The promoted Core bridge correctly fails closed when an MCP tool result has `isError=true` by throwing:

```text
PaperclipToolGatewayReadBridgeError("unavailable")
```

However the Core HTTP server currently catches an uncategorized exception from `/internal/v1/paperclip/execution` and returns:

```text
HTTP 500
{ "error": "internal-error" }
```

`wandora_mastra` treats every non-2xx bridge response as:

```text
throw new Error(`wandora_execution_failed_${response.status}`)
```

The Paperclip heartbeat adapter failure path then persists the default run error code:

```text
errorCode = adapter_failed
```

Paperclip `classifyContinuationFailure()` explicitly places `adapter_failed` in:

```text
TRANSIENT_INFRA_CONTINUATION_ERROR_CODES
```

with a bounded automatic continuation recovery budget.

Therefore a failed bounded VendaERP read may still authorize a second Paperclip run after the first run fails, even though comment-driven wakes are protected from successful-run handoff.

## Capability Authority / Reuse Gate

The gap does **not** justify a Wandora retry engine, lifecycle table, wake state machine, second policy system or Paperclip fork.

Correct ownership remains:

- Paperclip owns run lifecycle and recovery;
- Wandora owns the semantic meaning of its bridge failure boundary;
- `wandora_mastra` is the adapter boundary where Wandora bridge semantics are translated into Paperclip adapter semantics.

ADR 0168 remains binding: provider replacement does not justify internalizing provider lifecycle.

## SECOND ADVERSARIAL REVIEW

- Does comment-driven execution eliminate the ADR 0226 successful-run handoff duplicate? **Yes.**
- Does that alone prove exactly one provider attempt? **No.**
- Can a failed run enter Paperclip's immediate recovery tail? **Yes.**
- Is comment-driven origin itself an immediate-recovery suppression fact? **No.**
- Does the current bridge failure become a Paperclip non-retryable code? **No.**
- Does it currently become `adapter_failed`? **Yes.**
- Is `adapter_failed` classified as retryable/transient infrastructure? **Yes.**
- Would a provider call now satisfy the one-shot contract? **No.**
- Is a Paperclip fork required to close the gap? **Not proven; first reuse Paperclip's existing non-retryable classification boundary.**

## Minimum correction boundary

Before another provider read can be authorized, the Wandora bridge/adapter must preserve the distinction between:

1. retryable infrastructure failures; and
2. a bounded tool/provider execution failure that must fail closed **without automatic Paperclip continuation**.

The correction should reuse Paperclip's existing non-retryable continuation classification rather than create a Wandora-owned retry/one-shot mechanism.

A follow-up code slice must determine the narrowest contract-safe mapping, with tests proving:

- MCP `isError=true` still fails closed before model-visible success;
- the resulting Paperclip run is terminal and classified non-retryable for automatic continuation;
- no `finish_successful_run_handoff` is created for comment-driven wakes;
- no `issue_continuation_needed` automatic successor is created for this bounded tool failure;
- unrelated genuine transient infrastructure failures remain retryable;
- no Paperclip fork/change is required if the adapter can map into an already-qualified native non-retryable code.

## Effect boundary

This preflight performed repository/source/runtime readback only.

It did not:

- create a Paperclip issue;
- create a comment;
- create a profile/binding;
- start a run;
- invoke Tool Gateway;
- call VendaERP;
- call a model;
- create customer work/outbound;
- mutate production;
- restart any service.

## Decision

**NO-GO for another VendaERP product read.**

The comment-driven path solves the `finish_successful_run_handoff` duplicate, but it does not yet prove one-shot behavior across the failed-run recovery path.

Next slice:

**Wandora Bridge Non-Retryable Tool Failure Mapping V1 — CODE ONLY / NO PROVIDER CALL**

Only after that slice is reviewed, merged, promoted and separately preflighted may another bounded product read be considered.
