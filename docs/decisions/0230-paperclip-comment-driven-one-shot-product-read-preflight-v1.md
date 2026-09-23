# ADR 0230 — Paperclip Comment-Driven One-Shot Product Read Preflight V1

Status: **GREEN / PREFLIGHT COMPLETE / NO PROVIDER CALL**
Date: 2026-09-23

## Objective

Qualify one future bounded 28PRO product read so that a human comment may trigger the supervised Ana runtime while the effective provider-call budget remains at most one `vendaerp_search_products` call even if Paperclip later attempts lifecycle recovery.

This preflight itself performs no VendaERP provider call and no model run.

## Canonical entry

```text
main = 7d36d33a569b0ad72348f9e81812d1673b271c13
ADR 0229 = COMPLETE / GREEN
open PRs = 0 at entry reconciliation

Core =
  wandora/core:organization-adapter-candidate-fc8721ccaedd
  revision fc8721ccaedd5079eec9f3be11e8b64051416579
  healthy / restart 0

VendaERP MCP server.mjs =
  6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

Paperclip =
  wandora/paperclip:v2026.916.0
  pinned source dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

All four post-merge push workflows for the canonical entry were GREEN before the live control-plane proof.

## Proven Paperclip lifecycle — comment-driven success does not hand off again

Pinned Paperclip source defines comment-driven wake reasons as:

```text
issue_commented
issue_comment_mentioned
issue_reopened_via_comment
```

`decideSuccessfulRunHandoff()` returns:

```text
skip
reason = comment-driven wake already owns the next action
```

before the generic successful-run missing-disposition handoff path.

The pinned source includes a focused test proving `issue_commented` does not queue a successful-run corrective handoff.

Therefore the duplicate mechanism observed in ADR 0227/PRO-8 through:

```text
finish_successful_run_handoff
```

does not apply to a successful comment-driven run.

## Proven Paperclip lifecycle — create the proof issue without an assignment wake

Pinned Paperclip explicitly supports deliberately assigned backlog work.

Creating an issue with:

```text
assigneeAgentId = Ana
status = backlog
```

parks the issue and skips `issue_assigned`.

The route and its existing test record:

```text
assignmentWakeSkipped = true
assignmentWakeSkipReason = assigned_backlog
```

A later non-self human comment is independently wake-eligible through:

```text
reason = issue_commented
source = issue.comment
contextSnapshot.wakeReason = issue_commented
commentId / wakeCommentId = exact comment
```

Paperclip `shouldAutoCheckoutIssueForWake()` accepts an owned, dependency-ready `backlog` issue for this wake reason.

This gives the future execution a Paperclip-native sequence with no preliminary assignment/status wake.

## Adversarial gap discovered — a failed run can still enter immediate recovery

The first review found an independent duplicate path.

For an assigned `todo` or `in_progress` issue whose source run finishes:

```text
failed | timed_out | cancelled
```

Paperclip's release-recovery tail can queue:

```text
wakeReason = issue_continuation_needed
retryReason = issue_continuation_needed
retryOfRunId = failed source run
```

when no existing path/blocker/monitor/pause/non-retryable classification suppresses it.

Comment-driven origin alone is not a suppression fact.

The current external adapter failure boundary can also persist an uncategorized thrown bridge failure as `adapter_failed`.

Therefore comment-driven wake semantics alone are insufficient to prove an at-most-one provider-call budget.

## Reuse Gate — provider-native invocation budget

A second adversarial review searched Paperclip's existing policy authority before proposing any Wandora state or lifecycle mechanism.

Pinned Paperclip already provides a generic Tool Gateway `rate_limit` policy with:

- exact selectors including `issueId`, `catalogEntryId` and `toolName`;
- context conditions including `issueId`;
- configurable positive `limit` and `windowSeconds`;
- atomic counter consumption in the Paperclip database;
- counter cleanup by FK cascade when the policy is deleted;
- normal Tool Gateway enforcement with `consumeRateLimit=true` before provider dispatch.

The pinned tests prove concurrent consumption of a final `limit=1` slot admits exactly one decision and rate-limits the other.

This is already Paperclip-owned operational authority. No Wandora retry table, lock, invocation counter or state machine is justified.

## Live Paperclip-only proof

The live proof used the existing 28PRO company, Ana and VendaERP catalog.

Pre-proof state:

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

connectionId =
8e2c23f4-73f5-444a-8647-71428819ea91
```

### Temporary issue

One Paperclip-only issue was created:

```text
identifier = PRO-9
id = bf33e38d-e705-4597-9dce-ec8afa997770
status = backlog
assignee = Ana
```

Immediate readback proved:

```text
live runs = 0
```

No comment was created.

### Temporary issue-scoped profile

A temporary active profile was created with:

```text
defaultAction = deny
entries = exactly 1
include catalogEntryId =
165fcdca-8021-41dd-90e5-f0f143adeac3
```

It was bound with:

```text
targetType = issue
targetId = PRO-9 id
```

Native policy-test with `consumeRateLimit=false` and `writeAuditEvent=false` evaluated all eight active VendaERP catalog entries.

Result:

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

### Temporary issue-scoped invocation budget

A temporary active Paperclip policy was created:

```text
policyType = rate_limit
selectors =
  issueId = PRO-9 id
  catalogEntryId = product catalog entry
  toolName = vendaerp_search_products
conditions.context.issueId = PRO-9 id
limit = 1
windowSeconds = 3600
keyBy = [agent, tool]
```

Two policy-test decisions were then made for exactly:

```json
{"pageSize":5,"skip":0}
```

with `consumeRateLimit=true` and `writeAuditEvent=false`.

First decision:

```text
allowed = true
decision = allow
reasonCode = allow_profile
```

Second decision:

```text
allowed = false
decision = rate_limited
reasonCode = rate_limited
count = 1
limit = 1
windowSeconds = 3600
```

No Tool Gateway tool call was made by policy-test.

## Why this closes the failed-run recovery objection

The real Tool Gateway call path builds the policy input with:

```text
consumeRateLimit = true
```

then executes:

```text
policyService.decide(...)
recordInvocation(...)
writeAudit(...)
if !accessDecision.allowed:
  deny
  throw ToolGatewayHttpError
```

before connected MCP/provider dispatch.

Therefore, after the first product call consumes the single issue/tool slot:

- the same run cannot reach VendaERP a second time;
- a model attempt with changed arguments still matches the issue/tool rate policy;
- a Paperclip `issue_continuation_needed` recovery run for the same issue still matches the same policy;
- its attempted Tool Gateway call is denied before MCP/VendaERP dispatch.

The earlier `adapter_failed` recovery objection remains a valid lifecycle observation, but it no longer permits a second provider call.

This guard composes with ADR 0218's in-run identical-call memoization rather than replacing it.

## Cleanup proof

The temporary binding was removed.

The temporary rate-limit policy was deleted, which also cascades its counter.

The temporary profile was deleted.

PRO-9 was deleted.

Post-cleanup readback:

```text
PRO-9 = 404
temporary profiles = 0
temporary policies = 0
recent VendaERP connection activity = 0

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

28PRO live runs = 0
Wandora work operations = 0
Wandora outbound attempts = 0
provider log scan = empty
```

No provider call or model run occurred.

## Capability Authority / Reuse Gate

Authority remains:

- Wandora = business semantics, bounded read contract and external-effect authorization;
- Paperclip = issue lifecycle, comment wake, recovery, profiles, policy, rate-limit counter, connection/grant/secret/catalog, Tool Gateway, audit and MCP execution;
- Mastra = ephemeral supervised runtime;
- VendaERP MCP = provider translation only.

No Wandora lifecycle flag, retry engine, rate-limit table, lock, policy engine or provider-call counter is introduced.

ADR 0168 is preserved and strengthened by reusing provider-native operational authority.

ADR 0208 remains preserved: generic REST Tool Gateway execution remains NO-GO.

## Second adversarial review

- Does a human comment use Paperclip-native lifecycle? **Yes.**
- Is an assignment wake required first? **No; assigned backlog is deliberately parked.**
- Can the comment wake auto-checkout the backlog issue? **Yes.**
- Can a successful comment-driven run create `finish_successful_run_handoff`? **No.**
- Could a failed run create a Paperclip recovery run? **Yes.**
- Does that recovery run get a second VendaERP provider-call budget? **No; the issue/tool rate-limit slot is already consumed.**
- Is rate-limit consumption atomic? **Yes.**
- Is the limiter scoped to the temporary issue/tool rather than all Ana work? **Yes.**
- Does policy-test itself execute the tool? **No.**
- Did the live preflight create any run/model/provider/outbound effect? **No.**
- Does cleanup remove the rate counter? **Yes; policy FK is ON DELETE CASCADE.**
- Is a Wandora one-shot subsystem required? **No.**
- Is a Paperclip fork required? **No.**

## Frozen separate execution

A separate **28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY** may only:

1. reconcile canonical main, open PRs, runtime health, Ana, catalog, zero live runs and work/outbound;
2. require Core `fc8721ccaedd...`, MCP `6f27914c...`, Paperclip `v2026.916.0` and `wandora_mastra@0.4.0`;
3. create one temporary Paperclip-only issue assigned to Ana with explicit `status=backlog`;
4. require no assignment wake/run was created;
5. create one temporary active `defaultAction=deny` profile containing only `vendaerp_search_products`;
6. bind it natively to that issue;
7. create one temporary Paperclip `rate_limit` policy scoped to that exact `issueId + catalogEntryId + toolName`, with `limit=1` and a window covering the bounded execution;
8. policy-test with `consumeRateLimit=false` and require exactly `1 allow / 7 deny`;
9. require the rate slot is still unconsumed;
10. post exactly one Board/user comment instructing Ana to call exactly:
    ```json
    {"pageSize":5,"skip":0}
    ```
    with `vendaerp_search_products`;
11. permit no other VendaERP tool and no write/destructive capability;
12. require the resulting wake reason is `issue_commented`;
13. observe Paperclip lifecycle without manual wake/retry;
14. treat **exactly one** Tool Gateway/provider invocation as the maximum allowed budget;
15. if a second run is created by Paperclip recovery, require any second product-tool attempt to be `rate_limited` before MCP/provider dispatch;
16. do not manually retry a failed or zero-call result in the same execution slice;
17. on successful data recovery accept only:
    - name;
    - code;
    - category;
    - brand;
    - unit;
    - sale price;
    - stock balance;
18. exclude provider/internal IDs, barcode, minimum price, credentials/tokens and customer/order PII from proof output;
19. wait until no live/pending execution remains, then remove the temporary issue binding/profile/rate policy/issue;
20. reconcile Tool Gateway invocation count, connection activity, work/outbound, runtime health and cleanup residue;
21. STOP.

If the model never invokes the product tool, the execution is not a successful product-read proof and must stop without a manual retry.

If the first provider call fails, capture only safe normalized evidence; no second provider call is permitted.

## Decision

**GREEN.**

The comment-driven one-shot product read is qualified through Paperclip-native lifecycle + Paperclip-native issue-scoped invocation budget.

Next slice:

**28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY**
