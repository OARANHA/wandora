# ADR 0232 — VendaERP Comment-Driven One-Shot V3 Failed-Safe Proof V1

Status: **FAILED SAFELY / NO-GO FURTHER PROVIDER READS / SUPERSEDES ADR 0231 EXECUTION AUTHORIZATION**
Date: 2026-09-23

## Objective

Record the real 28PRO execution evidence for the ADR 0231 V3 comment-driven one-shot product-read proof and reconcile the result against the provider-native safety assumptions accepted in ADR 0231.

The execution intentionally attempted only the bounded read:

```text
vendaerp_search_products
{"pageSize":5,"skip":0}
```

No write tool, outbound action or customer-work operation was authorized.

## Canonical entry

```text
main at execution = f25d89d55646b43f135b44b79e0ee452aea8e787
ADR 0231 = merged
open PRs at execution entry = 0
Paperclip = v2026.916.0
Core = wandora/core:organization-adapter-candidate-fc8721ccaedd
VendaERP MCP server.mjs =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

Before the proof:

- Task Drain was OFF/quiescent;
- 28PRO live runs = 0;
- Ana was idle on `wandora_mastra`;
- Core/Paperclip were healthy/restart 0;
- work operations = 0;
- outbound attempts = 0.

## Temporary proof state

The proof created only temporary Paperclip-owned state:

```text
issue = PRO-10
issue id = 56f2d6f7-79b7-4cac-8f71-e932dd74180f
initial status = backlog

profile id =
2fe8102b-b14b-4781-98a6-1e05717ad50a

policy id =
3f7e7002-faa0-44fd-bc5e-3b944e1d842e

connection id =
8e2c23f4-73f5-444a-8647-71428819ea91

product catalog entry =
165fcdca-8021-41dd-90e5-f0f143adeac3
```

The profile was issue-bound, deny-by-default and exposed exactly one active VendaERP catalog entry.

A dry Paperclip policy test proved exactly:

```text
vendaerp_search_products = allow
other seven VendaERP tools = deny
```

The temporary rate-limit policy was intended to enforce:

```text
limit = 1
windowSeconds = 3600
keyBy = agent + tool
selectors =
  issueId + catalogEntryId + toolName
```

No run existed before the explicit human comment.

## Single human trigger

Exactly one Board/user comment was posted with a stable client request id:

```text
comment id =
6d3436ef-134e-4489-9054-4ec5f46ba696

clientRequestId =
a2310001-7f2a-4ab9-9d34-0231aabbccdd
```

No manual wake and no manual retry were issued.

The comment authorized exactly one `vendaerp_search_products` call and instructed the runtime to stop on failure.

## Real run graph

Paperclip created three runs from that one human comment.

### Run 1 — comment-driven source

```text
run =
2264dd50-a5dd-41f7-adb4-22bfc1214e97

status = succeeded
runtimeMode = legacy
wakeReason = issue_commented
```

This run performed the only Tool Gateway invocation evidenced for the proof.

The persisted Tool Gateway request summary is exactly:

```json
{"pageSize":5,"skip":0}
```

The MCP result was a standard tool-error result:

```text
isError = true
safe error code = invalid-provider-response
error marker = MCP tool returned an error result
```

No product data was obtained from the provider.

### Run 2 — automatic continuation

```text
run =
b53dfb7b-58df-4c3e-a9e7-2a191b1378dc
```

Its lifecycle was:

```text
status = succeeded
wakeReason = issue_continuation_needed
retryReason = issue_continuation_needed
retryOfRunId =
2264dd50-a5dd-41f7-adb4-22bfc1214e97
```

This run had **no Tool Gateway event** for the proof connection/tool.

Its product-like final text therefore has no provider evidence and is not trusted as ERP data.

### Run 3 — successful-run handoff successor

```text
run =
cb892be8-fcad-4930-82a7-e4df24022477

status = succeeded
wakeReason = finish_successful_run_handoff
```

This run also had **no Tool Gateway event** for the proof connection/tool.

Its product-like final text likewise has no provider evidence and is not trusted as ERP data.

The lifecycle eventually emitted a system disposition notice requiring a Board decision and then quiesced.

## Finding 1 — ADR 0231 lifecycle conclusion does not hold end-to-end

ADR 0231 correctly observed that the **source comment-driven run** is excluded from direct `finish_successful_run_handoff`.

The live proof shows that this was not sufficient to establish one-shot lifecycle behavior.

The observed chain was:

```text
human comment
  -> issue_commented
  -> issue_continuation_needed
  -> finish_successful_run_handoff
```

Therefore the statement that a successful comment-driven source run necessarily ends without an automatic successor is false for the live V3 composition.

The successor did not originate as a direct successful-run handoff from the source run; it originated through a separate Paperclip continuation path. That distinction matters for the next authority review.

## Finding 2 — issue-scoped rate-limit did not apply to the real Tool Gateway call

The real Tool Gateway policy-decision event for Run 1 persisted:

```text
issueId = null
matchedPolicyIds = []
rateLimitState = null
reasonCode = allow_profile
```

The effective issue-bound profile **did** apply and correctly restricted visible tools.

However the temporary `rate_limit` policy selected on `issueId`, so it did not match the actual Tool Gateway context.

A post-call read-only policy test using a synthetic `runContext.issueId` still returned allow, confirming that no live rate-limit slot had been consumed by the real invocation.

Therefore ADR 0231's issue-scoped `rate_limit=1` composition did not provide a hard one-call budget on the actual:

```text
Paperclip run
  -> wandora_mastra
  -> Wandora Core read bridge
  -> Paperclip Tool Gateway
```

path.

## Provider-call count

Despite the failed rate-limit assumption, the persisted audit evidence contains exactly **one real Tool Gateway call** for PRO-10.

The two automatic successor runs contain no Tool Gateway events for the proof connection/tool.

This means:

- exactly one real bounded provider/tool attempt is evidenced;
- the one-call count was **not** enforced by the intended issue-scoped rate-limit policy;
- no claim should be made that the current composition safely guarantees one provider call.

## Untrusted successor output

The successor runs produced product-shaped text despite having no Tool Gateway/provider evidence.

Those summaries are model output without an evidenced ERP source and must not be treated as real customer/provider data.

Only Tool Gateway/provider-backed evidence is authoritative for the ERP read proof.

## Cleanup

PRO-10 temporary state was completely removed:

```text
profile unbind = 200
policy delete = 200
profile delete = 200
issue delete = 200
```

Final readback:

```text
PRO-10 = 404
temporary profile residual = 0
temporary policy residual = 0
live runs = 0
Task Drain = OFF / quiescent
work operations = 0
outbound attempts = 0
Core = healthy / restart 0
Paperclip = healthy / restart 0
```

A separate concurrent PRO-12 proof setup was detected and deliberately not modified by this execution. The owning session subsequently removed its issue/profile/policy/binding itself and independently confirmed no V3 residual state.

## Capability Authority / Reuse Gate

The failed proof does **not** authorize a Wandora-owned retry engine, run state machine, Tool Gateway fork, second policy system or duplicate rate limiter.

The two discovered gaps must first be resolved at their existing provider/adapter boundaries:

1. **run lifecycle / continuation authority**
   - identify the exact Paperclip-native condition that produced `issue_continuation_needed` after the successful comment-driven source run;
   - determine whether an already-supported disposition/continuation contract can terminate that path without inventing Wandora lifecycle state.

2. **Tool Gateway context / policy authority**
   - determine why the live Tool Gateway execution context lost `issueId` even though issue-scoped profile binding remained effective;
   - determine whether the existing Paperclip run/tool contract can propagate the required context or whether another already-present native selector can provide a safe temporary one-call budget.

ADR 0168 remains binding:

**Portability = contract decoupling, not implementation duplication. Provider replacement does not imply capability internalization.**

## SECOND ADVERSARIAL REVIEW

- Did the source run use `wakeReason=issue_commented`? **Yes.**
- Did the source run directly create a successful-run handoff? **No evidence of that direct edge.**
- Did the overall lifecycle create automatic successors anyway? **Yes.**
- Was `issue_continuation_needed` observed? **Yes.**
- Was a later `finish_successful_run_handoff` observed? **Yes.**
- Did the intended issue-scoped rate policy match the real Tool Gateway call? **No.**
- Did the real call carry `issueId` in Tool Gateway audit context? **No; persisted audit shows null.**
- Did the issue-bound tool profile work? **Yes.**
- Was exactly one real Tool Gateway/provider attempt evidenced? **Yes.**
- Was that one-call count guaranteed by the intended rate-limit guard? **No.**
- Did successor product-like text have provider evidence? **No.**
- Were customer work/outbound effects created? **No.**
- Is another provider read currently authorized? **No.**

## Decision

**FAILED SAFELY / NO-GO.**

ADR 0232 supersedes ADR 0231 only where ADR 0231 authorized the V3 provider-read execution based on:

- no automatic successor after the comment-driven source run; and
- an issue-scoped `rate_limit=1` hard provider-call budget.

Both assumptions were disproved by the live proof.

No further VendaERP provider read is authorized until both gaps are resolved by a separate no-provider-call slice.

## Next slice

**Paperclip One-Shot Lifecycle + Tool Gateway Run-Context Authority Review V1 — CODE/SOURCE ONLY / NO PROVIDER CALL**

That slice must:

1. reconstruct the exact source-run -> `issue_continuation_needed` decision from pinned Paperclip source and persisted run facts;
2. identify the minimum existing Paperclip-native disposition/continuation mechanism that prevents unwanted successor admission;
3. trace `issueId` from Paperclip run context through `wandora_mastra`, Core and Tool Gateway;
4. prove whether context propagation can be corrected at a Wandora-owned adapter boundary without duplicating Paperclip policy/lifecycle;
5. separately qualify a hard one-call budget using only context actually present in real Tool Gateway decisions;
6. stop before any provider call.
