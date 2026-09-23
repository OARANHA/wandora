# ADR 0231 — Paperclip Issue-Scoped One-Shot Provider Budget Correction V1

Status: **GREEN / ADR 0230 DECISION SUPERSEDED / NO PROVIDER CALL**
Date: 2026-09-23

## Objective

Revisit ADR 0230's NO-GO after a second adversarial review found a narrower provider-native mechanism that closes the exact remaining gap without changing Wandora Core, `wandora_mastra`, Paperclip source or VendaERP MCP.

ADR 0230 correctly proved:

1. comment-driven wakes are excluded from `finish_successful_run_handoff`;
2. a failed source run may still create one Paperclip `issue_continuation_needed` recovery run.

ADR 0230 then concluded that a new Wandora bridge failure mapping was required before another bounded product read.

That conclusion is superseded by this ADR because pinned Paperclip already provides an issue-scoped atomic Tool Gateway invocation budget through its native `rate_limit` policy.

## Canonical entry

```text
main = 0cc4b026a592e88538a040b5e0dc5a5fe7c480a1
PR #300 = MERGED
ADR 0230 = NO-GO at entry
ADR 0229 runtime promotion = COMPLETE / GREEN

Core =
  wandora/core:organization-adapter-candidate-fc8721ccaedd
  revision fc8721ccaedd5079eec9f3be11e8b64051416579

Paperclip =
  wandora/paperclip:v2026.916.0
  pinned source dffc2b3ca1b9e88fa21cb17493083e682dffd1ca

VendaERP MCP server.mjs =
  6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

No code/runtime promotion followed ADR 0230.

## ADR 0230 evidence retained

The following ADR 0230 findings remain valid and are not rewritten:

- a non-self human comment can create a Paperclip-native `issue_commented` wake;
- a successful comment-driven run is excluded from `finish_successful_run_handoff`;
- comment-driven origin alone does not suppress failed-run immediate recovery;
- a failed source run on an assigned actionable issue can create `issue_continuation_needed`;
- an uncategorized external adapter failure may persist as `adapter_failed`.

The correction is only to the conclusion that this failed-run recovery capability necessarily allows a second provider call.

## Reuse Gate — Paperclip-native rate-limit authority

Pinned Paperclip already owns Tool Gateway access policy.

Its `rate_limit` policy supports:

- selectors by `issueId`;
- selectors by `catalogEntryId`;
- selectors by `toolName`;
- context conditions by exact `issueId`;
- positive `limit` and `windowSeconds`;
- configurable bucket keys;
- atomic rate-counter consumption in Paperclip's database.

The rate counter references its policy with `ON DELETE CASCADE`.

No Wandora-owned counter, retry lock, lifecycle flag or new state machine is required.

## Tool Gateway ordering proof

Pinned Tool Gateway execution constructs policy input with:

```text
consumeRateLimit = true
```

and performs policy evaluation before connected MCP/provider dispatch.

The relevant ordering is:

```text
policyService.decide(...)
recordInvocation(...)
writeAudit(...)

if !accessDecision.allowed:
  record denial
  throw ToolGatewayHttpError

only after allow:
  dispatch connected tool
```

Therefore a `rate_limited` decision prevents MCP process/provider dispatch.

Pinned Paperclip tests also prove atomic final-slot consumption: with `limit=1`, concurrent consumers produce exactly one allow and one rate-limited result.

## Comment-driven issue lifecycle without an assignment wake

Pinned Paperclip explicitly supports assigned backlog work.

Creating:

```text
assigneeAgentId = Ana
status = backlog
```

does not create an `issue_assigned` wake.

A later human comment can create:

```text
wakeReason = issue_commented
source = issue.comment
```

and `shouldAutoCheckoutIssueForWake()` accepts an owned dependency-ready backlog issue for this wake reason.

This permits the future proof issue to have exactly one intended initial lifecycle trigger: the human comment.

## Live control-plane proof

A temporary Paperclip-only proof was executed with no comment, run, model call or provider call.

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

VendaERP connectionId =
8e2c23f4-73f5-444a-8647-71428819ea91
```

### Temporary issue

Paperclip issue:

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

This proves the deliberate assigned-backlog creation did not wake Ana.

### Temporary issue-scoped profile

A temporary active profile was created:

```text
defaultAction = deny
entries = exactly 1
include = catalogEntryId 165fcdca-8021-41dd-90e5-f0f143adeac3
targetType = issue
targetId = PRO-9
```

Native policy-test used:

```text
consumeRateLimit = false
writeAuditEvent = false
```

against all eight active VendaERP catalog entries.

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

### Temporary issue-scoped provider budget

A temporary Paperclip `rate_limit` policy was created with:

```text
issueId = PRO-9 id
catalogEntryId = product catalog entry
toolName = vendaerp_search_products
limit = 1
windowSeconds = 3600
keyBy = [agent, tool]
```

The policy also required exact `context.issueId = PRO-9 id`.

Two policy-test evaluations were made for:

```json
{"pageSize":5,"skip":0}
```

with `consumeRateLimit=true` and `writeAuditEvent=false`.

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

Policy-test did not execute the tool or provider.

## Failed-run recovery budget

ADR 0230's failed-run objection remains relevant:

```text
source run failed
-> Paperclip may queue issue_continuation_needed
```

However the recovery run carries the same issue context.

Because the issue/tool rate-limit slot was consumed by the first allowed Tool Gateway call, a later recovery run's same product-tool request is denied before MCP/provider dispatch.

Paperclip also prevents unbounded immediate-recovery chaining.

`didAutomaticRecoveryFail()` recognizes an unsuccessful run whose:

```text
contextSnapshot.retryReason = issue_continuation_needed
```

and the release-recovery policy blocks another immediate recovery.

Thus the adverse failure shape is bounded to:

```text
original comment-driven run
  -> at most one VendaERP provider call

optional Paperclip recovery run
  -> product tool denied by rate_limit before provider

no second automatic recovery chain
```

## Cleanup proof

Cleanup completed without errors:

- issue/profile binding removed;
- temporary rate-limit policy deleted;
- its rate counter cascaded with policy deletion;
- temporary profile deleted;
- PRO-9 deleted.

Post-cleanup:

```text
PRO-9 HTTP = 404
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

No model call or provider call occurred.

## Capability Authority / Reuse Gate

Authority remains:

- Wandora = bounded business-read semantics and effect authorization;
- Paperclip = issue lifecycle, comment wake, recovery, profiles, policy, rate-limit counters, connection/grant/secret/catalog, Tool Gateway, audit and MCP execution;
- Mastra = ephemeral supervised runtime;
- VendaERP MCP = bounded provider translation.

Rejected:

- a Wandora one-shot table;
- a Wandora invocation counter;
- a Wandora recovery state machine;
- a Paperclip fork;
- changing `wandora_mastra` only to suppress Paperclip recovery;
- treating provider replacement as capability internalization.

ADR 0168 remains preserved.

## Second adversarial review

- Does comment-driven success eliminate `finish_successful_run_handoff`? **Yes.**
- Can failed-run recovery still exist? **Yes.**
- Does that recovery imply a second VendaERP call? **No.**
- Is the invocation budget enforced by Paperclip before provider dispatch? **Yes.**
- Is it issue-specific? **Yes.**
- Is it tool-specific? **Yes.**
- Is consumption atomic? **Yes.**
- Can a second automatic recovery chain form after the recovery itself fails? **No.**
- Did the live proof call VendaERP? **No.**
- Did it call a model? **No.**
- Did it leave Paperclip control-plane residue? **No.**
- Is a bridge non-retryable mapping required for this one-shot provider-call proof? **No.**
- Could such mapping still be considered independently for error semantics/UX? **Yes, but it is not a prerequisite for this bounded read.**

## Frozen separate execution

A separate **28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY** may only:

1. reconcile canonical main, runtime health, Ana, catalog, open PRs, zero live runs and work/outbound;
2. require the currently qualified Core, MCP, Paperclip and `wandora_mastra` artifacts;
3. create one temporary Paperclip-only issue assigned to Ana with explicit `status=backlog`;
4. prove no assignment wake/run was created;
5. create one active issue-scoped `defaultAction=deny` profile containing only `vendaerp_search_products`;
6. create one issue/tool-scoped Paperclip `rate_limit` policy with `limit=1` and a window longer than the bounded execution;
7. policy-test with no rate consumption and require exactly 1 allow / 7 deny;
8. prove the rate slot remains unused;
9. post exactly one Board/user comment directing Ana to call only:
   ```json
   {"pageSize":5,"skip":0}
   ```
   with `vendaerp_search_products`;
10. require the initial wake reason is `issue_commented`;
11. issue no manual wake or retry;
12. permit no other VendaERP tool and no write/destructive capability;
13. accept at most one actual VendaERP provider call;
14. if Paperclip creates `issue_continuation_needed`, prove any second product-tool attempt is `rate_limited` before MCP/provider dispatch;
15. require no further automatic recovery chain;
16. if zero provider calls occur, classify the execution as not a successful product-read proof and STOP without manual retry;
17. if the provider call fails, preserve only safe normalized evidence and STOP;
18. if successful, expose only name, code, category, brand, unit, sale price and stock balance in proof evidence;
19. exclude provider/internal IDs, barcode, minimum price, credentials/tokens and customer/order PII;
20. after lifecycle settles, clean the temporary binding/profile/policy/issue;
21. reconcile invocation/connection activity, live runs, work/outbound, runtime health and residue;
22. STOP.

## Decision

**GREEN. ADR 0230's NO-GO decision is superseded.**

No code correction or runtime promotion is required before the bounded one-shot read because the exact provider-call budget is already enforceable by Paperclip-native issue-scoped policy.

Next slice:

**28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY**
