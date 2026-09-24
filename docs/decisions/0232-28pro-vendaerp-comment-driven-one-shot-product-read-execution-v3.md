# ADR 0232 — 28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3

Status: **NOT GREEN / STOP / ONE REAL PROVIDER ATTEMPT / NO RETRY**
Date: 2026-09-24

## Objective

Execute the ADR 0231 comment-driven bounded product-read proof against the real 28PRO VendaERP connection while preserving the frozen safety constraints:

- exactly one Board/user comment;
- only `vendaerp_search_products`;
- exact arguments `{"pageSize":5,"skip":0}`;
- no manual wake;
- no manual retry;
- no writes or outbound effects;
- stop after one provider failure;
- treat Tool Gateway audit as authority over model-authored comments.

## Canonical entry

```text
main = f25d89d55646b43f135b44b79e0ee452aea8e787
PR #301 = MERGED
open PRs = 0 before execution reconciliation
Core = wandora/core:organization-adapter-candidate-fc8721ccaedd
Core revision = fc8721ccaedd5079eec9f3be11e8b64051416579
Paperclip = wandora/paperclip:v2026.916.0
VendaERP MCP server.mjs =
  6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

The execution started with:

```text
Task Drain = OFF / quiescent
28PRO live runs = 0
Ana = idle / wandora_mastra
Wandora work operations = 0
Wandora outbound attempts = 0
```

## Frozen control-plane setup

A temporary Paperclip issue was prepared:

```text
identifier = PRO-10
status = backlog
assignee = Ana
```

An issue-scoped active tool profile used:

```text
defaultAction = deny
included catalog entries = exactly vendaerp_search_products
```

A temporary `rate_limit` policy was also created with intended scope:

```text
issue = PRO-10
catalog entry = vendaerp_search_products
tool = vendaerp_search_products
limit = 1
windowSeconds = 3600
keyBy = [agent, tool]
```

No assignment wake occurred while the issue remained backlog.

## Single explicit human comment

Exactly one Board/user comment was posted with one stable client request id.

The comment instructed:

- use exactly `vendaerp_search_products`;
- use exactly `{"pageSize":5,"skip":0}`;
- do not use another VendaERP tool;
- do not retry;
- do not write or send;
- stop and report a safe failure if the call fails.

No manual wake or manual retry was issued.

## Proven run chain

Paperclip persisted three issue runs.

### Run 1 — comment-driven source run

```text
wakeReason = issue_commented
status = succeeded
```

This run is the **only run with a real Tool Gateway call** for PRO-10.

Tool Gateway authority proves:

```text
tool = vendaerp_search_products
arguments = {"pageSize":5,"skip":0}
decision = allow
providerType = mcp_local_stdio
call events = 1
result = MCP isError=true
safe error code = invalid-provider-response
bridge message = MCP tool returned an error result
```

No trusted product rows were obtained.

The run nevertheless ended as Paperclip `succeeded` because the model handled the tool failure and produced a safe textual failure summary.

This distinction is critical: **tool execution failure did not become a failed Paperclip heartbeat run**.

### Run 2 — automatic continuation

Paperclip later created a second run:

```text
wakeReason = issue_continuation_needed
retryOfRunId = source comment-driven run
status = succeeded
```

Paperclip logs recorded:

```text
continuationRequeued = 1
```

Tool Gateway / connection activity contains **no tool-call event for this run**.

The model nevertheless posted a comment claiming a successful product read with product data.

That comment is **not provider evidence** and must be treated as hallucinated/untrusted output.

### Run 3 — successful-run handoff

Paperclip then created a third run:

```text
wakeReason = finish_successful_run_handoff
status = succeeded
```

Again, Tool Gateway / connection activity contains **no tool-call event for this run**.

The model posted a second, mutually inconsistent set of supposed product results.

That content is also **not provider evidence**.

Paperclip finally escalated the issue to a blocked Board-owned missing-disposition recovery state.

## Provider-call count

For the three PRO-10 runs, connection activity proves:

```text
real vendaerp_search_products Tool Gateway calls = 1
```

The only real call belongs to the original `issue_commented` run and returned:

```text
invalid-provider-response
```

The continuation and handoff runs did not dispatch another product tool call.

Therefore the execution did not exceed one actual provider dispatch, but **not for the reason ADR 0231 expected**.

## Rate-limit audit interpretation

The final Tool Gateway policy-decision event for the allowed product call records:

```text
reasonCode = allow_profile
matchedPolicyIds = []
rateLimitState = null
effectiveProfileIds = [temporary issue profile]
```

That final event does **not** prove that the temporary `rate_limit` policy was skipped.

Pinned Paperclip evaluates matching `rate_limit` policies before grants/profiles. When a matching rate limit is still below its limit, Paperclip calls `enforceRateLimit(...)` and then continues. The final allow decision may therefore be `allow_profile` with empty `matchedPolicyIds` and no `rateLimitState`. Only a blocking rate-limit decision returns `decision=rate_limited` with the rate policy ID/state.

Likewise, the post-cleanup activity rows now expose `issueId=null`, but Tool Gateway durable rows use issue foreign keys with `ON DELETE SET NULL`. PRO-10 was deleted during cleanup, while the source run's own `contextSnapshot.issueId` durably proves the run had the correct issue context.

Therefore the live V3 evidence neither proves nor disproves that the first successful allowance consumed the temporary rate-limit slot. The policy/counter was deleted during cleanup, so no authoritative post-hoc counter readback remains.

The durable one-call fact for this slice is narrower and sufficient: exactly one real Tool Gateway/provider dispatch occurred across the three PRO-10 runs.

The next slice should improve observability only if needed; it must not invent a second rate-limit or lifecycle subsystem.

## Reconciliation of ADR 0231

ADR 0231 proved several static facts correctly but its end-to-end lifecycle conclusion did not survive the live execution.

### What remained true

- the original human comment generated an `issue_commented` wake;
- the issue-scoped deny-by-default profile narrowed visible VendaERP tooling to product search;
- the original run made exactly one real product call;
- no Wandora work/outbound effect occurred.

### What did not hold end-to-end

ADR 0231 expected a successful comment-driven run to avoid the previous successful-run handoff duplicate.

The original run itself did not immediately receive `finish_successful_run_handoff`.

However, because the tool error was handled inside a technically successful run and the issue remained `in_progress`, Paperclip's periodic productive-terminal continuation recovery created:

```text
issue_continuation_needed
```

That successor was no longer comment-driven. When it also succeeded without recording a disposition, the ordinary successful-run handoff machinery became eligible and created:

```text
finish_successful_run_handoff
```

Therefore **excluding comment-driven wakes from successful-run handoff is insufficient** when another provider-owned continuation mechanism first changes the wake lineage.

Likewise, ADR 0231's legacy failed-run reconciliation guard did not apply because the original heartbeat run was not failed; it was technically `succeeded`.

## Hallucination finding

Two later agent comments claimed successful product reads.

They are contradicted by authoritative Tool Gateway evidence:

- no Tool Gateway invocation exists for either later run;
- the only real call returned `invalid-provider-response`;
- the two claimed result sets are mutually inconsistent.

Therefore:

**No product data from those later comments is trusted or exposed as VendaERP data.**

This is a material safety/product finding: model-authored statements about external tool success must never outrank provider/tool audit evidence.

## Capability Authority / Reuse Gate

Do not solve this by adding a Wandora lifecycle engine or retry state machine.

Paperclip remains operational authority for:

- issue/run lifecycle;
- recovery;
- continuation;
- successful-run handoff;
- Tool Gateway policy and audit.

Wandora owns:

- the semantic boundary that a bounded read-tool failure is not task success;
- the requirement that ungrounded model output cannot be presented as provider truth;
- the provider-neutral adapter contract that must communicate the bounded tool result accurately.

The next slice must first prove whether an existing Paperclip-native terminal/disposition contract can represent this case. Only if the provider contract is genuinely insufficient should a narrow adapter contract change be considered.

ADR 0168 remains binding.

## Cleanup

After all three runs were terminal and evidence was captured:

- PRO-10 profile binding was removed;
- PRO-10 rate policy was removed;
- PRO-10 profile was removed;
- PRO-10 issue was removed.

Concurrent diagnostic residue PRO-12 was separately verified as:

```text
status = backlog
comments = 0
live runs = 0
```

and its binding/profile/policy/issue were also removed.

Final reconciliation:

```text
temporary PRO-10/11/12 issues = 0
temporary one-shot profiles = 0
temporary one-shot policies = 0
28PRO live runs = 0
Task Drain = OFF / quiescent
Core = healthy / restart 0
Paperclip = healthy / restart 0
Wandora work operations = 0
Wandora outbound attempts = 0
```

No further VendaERP call was made during diagnosis or cleanup.

## Second adversarial review

- Was exactly one Board comment posted for PRO-10? **Yes.**
- Was a manual wake or retry issued? **No.**
- How many real product Tool Gateway calls occurred? **Exactly one.**
- Did that call succeed semantically? **No; it returned `invalid-provider-response`.**
- Did any trusted product rows result? **No.**
- Can the final allow audit prove whether the non-exceeded rate-limit consumed a slot? **No; Paperclip does not retain that non-blocking policy in the final allow decision, and cleanup removed the counter.**
- Did Paperclip create another lifecycle run? **Yes, `issue_continuation_needed`.**
- Did Paperclip later create `finish_successful_run_handoff`? **Yes.**
- Did either later run invoke VendaERP? **No evidence of any Tool Gateway call; connection activity says no.**
- Are their claimed product results trusted? **No.**
- Did work/outbound change? **No, 0/0.**
- Is another provider retry authorized? **No.**

## Decision

**NOT GREEN / STOP.**

The V3 execution produced one real bounded provider attempt and a safe provider error:

```text
invalid-provider-response
```

It did not produce trusted product data.

The live execution disproved the end-to-end lifecycle assumption behind the V3 authorization:

1. comment-driven handoff exclusion alone is insufficient because productive-terminal continuation can first create a non-comment successor.

The execution does **not** establish a second finding that the temporary rate-limit failed to participate. The final allow audit cannot answer that question after the non-blocking limiter continued to the profile decision, and cleanup removed the policy counter.

No further VendaERP retry is authorized.

Next slice:

**Comment-Driven Read Tool Terminal Semantics + Grounded Provider Result Authority V1 — CODE/RESEARCH ONLY / NO PROVIDER CALL**

That slice must prove, before any implementation:

- which existing Paperclip-native disposition/terminal contract should own a bounded read-tool failure;
- how to prevent provider-unverified model output from becoming customer-visible provider truth;
- whether any additional rate-limit observability is needed without changing Paperclip's policy authority;
- whether the terminal/result fix belongs in Wandora adapter semantics, Paperclip configuration/reuse, or an upstream Paperclip contract;
- that no duplicate lifecycle engine, retry engine or second policy system is introduced.
