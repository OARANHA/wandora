# ADR 0231 — Paperclip Comment-Driven One-Shot Reconciliation V2

Status: **GREEN / NO CODE CHANGE REQUIRED / NO PROVIDER CALL**
Date: 2026-09-23

## Context

ADR 0230 correctly proved that Paperclip comment-driven wakes are excluded from `finish_successful_run_handoff`, then stopped with a NO-GO because a failed `adapter_failed` run appeared able to enter generic `issue_continuation_needed` recovery.

Two further adversarial reviews of the exact pinned Paperclip `v2026.916.0` source and live 28PRO control plane supersede that conclusion without changing Wandora code or forking Paperclip:

1. Paperclip's legacy replay-safety gate runs before generic recovery and holds failed runs once adapter/provider work may already have started.
2. Paperclip's existing issue/tool-scoped atomic `rate_limit` can enforce a hard at-most-one Tool Gateway/provider-call budget inside the proof issue.

The first is the primary inter-run replay guard. The second is defense-in-depth and also prevents multiple product calls inside the original model run.

## Canonical entry

```text
main = 0cc4b026a592e88538a040b5e0dc5a5fe7c480a1
PR #300 = MERGED
ADR 0230 = NO-GO at entry
ADR 0229 runtime promotion = COMPLETE / GREEN

Paperclip = wandora/paperclip:v2026.916.0
Paperclip source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca

Core =
  wandora/core:organization-adapter-candidate-fc8721ccaedd
  revision fc8721ccaedd5079eec9f3be11e8b64051416579

VendaERP MCP server.mjs =
  6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

ADR 0230 remains historical evidence. This ADR supersedes only its decision that another code correction is a prerequisite for the bounded one-shot read.

## Successful comment-driven path

Pinned Paperclip `decideSuccessfulRunHandoff()` has an early exclusion for:

```text
issue_commented
issue_comment_mentioned
issue_reopened_via_comment
```

and returns:

```text
skip
reason = comment-driven wake already owns the next action
```

before the generic successful-run missing-disposition handoff.

Therefore a successful comment-driven run cannot create the `finish_successful_run_handoff` duplicate previously observed during PRO-8.

## Failed-run replay-safety — earlier gate than generic recovery

Pinned Paperclip defines:

```text
legacyExecutionNeedsReconciliation(run)
```

For a legacy failed/timed-out/interrupted/cancelled run, the function requires positive evidence before replay can be treated as safe.

The source comment is explicit:

> Error families describe availability, not whether earlier actions happened.

A failed legacy run remains reconciliation-held unless Paperclip has evidence such as:

```text
executionRecovery = {
  kind: "bootstrap",
  providerWorkStarted: false
}
```

or another specifically qualified no-provider-work/recoverable condition.

### Why the Wandora tool-error path is reconciliation-held

Paperclip marks entry into the external adapter before calling `wandora_mastra.execute()`:

```text
legacyAdapterEntered = true
return adapter.execute(...)
```

The bounded tool-error path may then be:

1. Paperclip enters `wandora_mastra`;
2. Wandora Core calls Paperclip Tool Gateway;
3. VendaERP MCP returns standard MCP `isError=true`;
4. Core fails closed;
5. the external adapter can surface a failed bridge execution;
6. Paperclip persists a failed legacy run.

In the heartbeat failure path, Paperclip only stamps:

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

That condition is false after `wandora_mastra.execute()` has been entered.

Therefore a post-adapter-entry failure does not gain positive replay authorization merely because its error code is `adapter_failed`.

### Pre-drain ordering

Before Paperclip reaches the generic release-recovery tail, its wake-queue adapter computes:

```text
legacyExecutionNeedsReconciliation(run)
```

and passes it to `decidePreDrain()`.

When true:

```text
decidePreDrain(...) -> { kind: "released" }
```

The Postgres wake-queue adapter then returns immediately without draining/promoting a generic immediate recovery successor.

Pinned domain tests explicitly cover:

```text
released: legacy execution needs reconciliation
```

Thus ADR 0230's observation that the generic tail *can* queue `issue_continuation_needed` remains true in general, but that tail is not reached for this failed post-adapter-entry legacy provider-attempt shape.

## Runtime evidence that Wandora runs use the legacy gate

Historical PRO-8 runs remain readable in live Paperclip.

Source run:

```text
run = 6c043d53-7f16-45de-8091-9016ce99be28
runtimeMode = legacy
status = succeeded
wakeReason = vendaerp_bounded_product_retry_v2
```

Corrective run:

```text
run = 2da8c2cd-d6c2-4c97-b10a-5e9dcd4ad627
runtimeMode = legacy
status = succeeded
wakeReason = finish_successful_run_handoff
```

This confirms the current `wandora_mastra` Paperclip execution path is within the legacy replay-safety contract reviewed above.

## Remaining one-call objection — multiple tool calls inside one run

Replay-safety closes automatic inter-run replay, but a hard one-provider-call proof should not rely only on model instructions.

The current supervised Mastra runtime has:

```text
maxRetries = 0
```

and ADR 0218 memoizes identical read calls inside one run.

However a model could theoretically request the same product tool again with different arguments during its allowed steps.

A hard provider-call budget therefore benefits from Paperclip's already-existing Tool Gateway policy authority.

## Paperclip-native issue/tool rate-limit

Pinned Paperclip `rate_limit` policy supports:

- selector `issueId`;
- selector `catalogEntryId`;
- selector `toolName`;
- exact context condition `issueId`;
- positive `limit` and `windowSeconds`;
- atomic database counter consumption;
- cleanup by `ON DELETE CASCADE` when the policy is deleted.

The real Tool Gateway path uses:

```text
consumeRateLimit = true
```

and performs policy evaluation before connected MCP/provider dispatch.

The order is:

```text
policyService.decide(...)
recordInvocation(...)
writeAudit(...)

if !accessDecision.allowed:
  deny and throw

only after allow:
  dispatch connected MCP/tool
```

Therefore `rate_limited` prevents a provider dispatch.

## Live Paperclip-only control-plane proof

A temporary proof was performed without comment, model run, Tool Gateway tool invocation or provider call.

Pre-proof:

```text
Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

28PRO live runs = 0
Ana = idle / wandora_mastra

vendaerp_search_products catalogEntryId =
165fcdca-8021-41dd-90e5-f0f143adeac3

VendaERP connectionId =
8e2c23f4-73f5-444a-8647-71428819ea91
```

### Assigned backlog issue

Temporary Paperclip issue:

```text
identifier = PRO-9
id = bf33e38d-e705-4597-9dce-ec8afa997770
status = backlog
assignee = Ana
```

Immediate readback:

```text
live runs = 0
```

This matches pinned Paperclip's deliberate assigned-backlog contract: assigned backlog work is parked without `issue_assigned`.

A later human comment can wake this owned backlog issue with `issue_commented`, and Paperclip's auto-checkout contract accepts that wake reason.

### Issue-scoped tool profile

A temporary active `defaultAction=deny` profile contained exactly the product catalog entry and was bound to PRO-9.

Native policy-test with:

```text
consumeRateLimit = false
writeAuditEvent = false
```

returned:

```text
vendaerp_search_products             = allow / allow_profile
vendaerp_get_product_stock           = deny / deny_default
vendaerp_list_companies              = deny / deny_default
vendaerp_list_price_tables           = deny / deny_default
vendaerp_probe                       = deny / deny_default
vendaerp_search_orders               = deny / deny_default
vendaerp_search_parties              = deny / deny_default
vendaerp_search_price_table_products = deny / deny_default

summary = allow 1 / deny 7
```

### Issue-scoped rate budget

A temporary Paperclip policy used:

```text
policyType = rate_limit
issueId = PRO-9 id
catalogEntryId = product catalog entry
toolName = vendaerp_search_products
context.issueId = PRO-9 id
limit = 1
windowSeconds = 3600
keyBy = [agent, tool]
```

Two policy-test evaluations for:

```json
{"pageSize":5,"skip":0}
```

with `consumeRateLimit=true` and `writeAuditEvent=false` produced:

First:

```text
allowed = true
decision = allow
reasonCode = allow_profile
```

Second:

```text
allowed = false
decision = rate_limited
reasonCode = rate_limited
count = 1
limit = 1
```

Policy-test itself did not call Tool Gateway execution or VendaERP.

Pinned Paperclip tests independently prove atomic final-slot consumption for concurrent callers.

## Composition of the two provider-native guards

The qualified one-shot boundary is now:

```text
assigned backlog proof issue
  -> no assignment wake

one human comment
  -> issue_commented run

successful run
  -> no finish_successful_run_handoff

failed post-adapter-entry legacy run
  -> legacyExecutionNeedsReconciliation
  -> pre-drain released
  -> no generic automatic replay

within any admitted run
  -> product tool limit = 1
  -> any second product-tool request is rate_limited before provider
```

The rate-limit is defense-in-depth for inter-run behavior and the hard guard for multiple product calls inside one run.

No Wandora-owned one-shot implementation is required.

## Cleanup proof

The temporary profile binding was removed.

The temporary rate-limit policy was deleted; its rate counter cascaded with policy deletion.

The temporary profile was deleted.

PRO-9 was deleted.

Post-cleanup:

```text
PRO-9 = 404
temporary profile residual = 0
temporary policy residual = 0
VendaERP connection recent activity = 0

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

28PRO live runs = 0
Wandora work operations = 0
Wandora outbound attempts = 0
VendaERP/provider log scan = empty
```

No model or provider call occurred.

## Capability Authority / Reuse Gate

Authority remains:

- Wandora = bounded business-read semantics and external-effect authorization;
- Paperclip = issue/comment lifecycle, replay reconciliation, profiles, policies, rate-limit counters, connection/grant/secret/catalog, Tool Gateway, audit and MCP execution;
- Mastra = ephemeral supervised runtime;
- VendaERP MCP = bounded provider translation.

Rejected:

- Wandora retry engine;
- Wandora one-shot table/flag;
- Wandora invocation counter;
- new lifecycle state machine;
- fake Paperclip error code solely to suppress recovery;
- Paperclip fork;
- provider capability duplication.

ADR 0168 remains preserved: the required operational safeguards already exist behind the provider boundary.

## Second adversarial review

- Can successful comment-driven execution create `finish_successful_run_handoff`? **No.**
- Are current `wandora_mastra` runs legacy? **Yes.**
- Does a post-adapter-entry failed legacy run get `providerWorkStarted=false` bootstrap evidence? **No.**
- Does it require reconciliation before generic recovery? **Yes.**
- Does pre-drain stop before generic immediate recovery? **Yes.**
- Does `adapter_failed` classification override that earlier hold? **No.**
- Could one model run still request the product tool more than once? **In principle yes.**
- Does issue/tool `rate_limit=1` hard-stop the second Tool Gateway attempt before provider dispatch? **Yes.**
- Is the limiter scoped only to the temporary proof issue/tool? **Yes.**
- Is its consumption atomic? **Yes.**
- Did the live proof call a model or VendaERP? **No.**
- Did cleanup leave control-plane residue? **No.**
- Is any Core/adapter/Paperclip code change required before the bounded proof? **No.**

## Frozen next execution

A separate **28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY** may only:

1. reconcile main, open PRs, runtime health, Ana, catalog, live runs and work/outbound;
2. require the currently qualified Core, MCP, Paperclip and `wandora_mastra` artifacts;
3. create one temporary Paperclip-only issue assigned to Ana with explicit `status=backlog`;
4. prove no assignment wake/run was created;
5. create one issue-scoped active `defaultAction=deny` profile containing only `vendaerp_search_products`;
6. bind that profile to the issue;
7. create one issue/catalog/tool-scoped Paperclip `rate_limit` policy with `limit=1` and a window longer than the bounded proof;
8. run policy-test without consumption and require exactly `1 allow / 7 deny`;
9. prove the rate slot remains unused;
10. post exactly one Board/user comment instructing Ana to call only:
   ```json
   {"pageSize":5,"skip":0}
   ```
   with `vendaerp_search_products`;
11. require the admitted wake reason is `issue_commented`;
12. issue no manual wake or retry;
13. permit no other VendaERP tool and no write/destructive capability;
14. permit at most one actual provider dispatch;
15. if the model attempts a second product call, require `rate_limited` before provider dispatch;
16. if the run succeeds, require no `finish_successful_run_handoff`;
17. if it fails after adapter entry, require the legacy reconciliation hold and no automatic generic successor;
18. if zero provider calls occur, classify the execution as not a successful product-read proof and STOP without retry;
19. if the single provider call fails, preserve only safe normalized evidence and STOP;
20. if it succeeds, expose only name, code, category, brand, unit, sale price and stock balance in proof evidence;
21. exclude provider/internal IDs, barcode, minimum price, credentials/tokens and customer/order PII;
22. after lifecycle settles, remove temporary binding/profile/policy/issue;
23. reconcile Tool Gateway/connection activity, live runs, work/outbound, runtime health and cleanup residue;
24. STOP.

## Decision

**GREEN / NO CODE CHANGE REQUIRED.**

ADR 0230's failed-run NO-GO conclusion is superseded.

The current promoted Wandora runtime plus Paperclip-native replay reconciliation and issue-scoped Tool Gateway policy are sufficient to qualify the next separate bounded read-only execution.

Next slice:

**28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY**
