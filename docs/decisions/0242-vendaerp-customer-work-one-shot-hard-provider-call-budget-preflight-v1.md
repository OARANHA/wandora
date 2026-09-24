# ADR 0242 — VendaERP Customer-Work One-Shot Hard Provider-Call Budget Preflight V1

Status: **GREEN / HARD ONE-CALL BUDGET QUALIFIED / NO PROVIDER CALL**
Date: 2026-09-24

## Objective

Qualify, without calling VendaERP or a production model, a hard Paperclip-native budget for the next fresh canonical Wandora customer work so that Ana can reach at most one actual `vendaerp_search_products` Tool Gateway dispatch and cannot substitute any of the other seven live VendaERP read tools.

Required invariant:

```text
temporary Paperclip guards active before customer-work admission
-> seven non-product VendaERP reads blocked before MCP dispatch
-> product read has exactly one atomic rate-limit slot
-> first product Tool Gateway attempt consumes the slot
-> any second product attempt is rate_limited before MCP dispatch
-> existing wandora_mastra@0.5.0 success/failure semantics remain authoritative
-> no Wandora limiter/lifecycle/state-machine duplication
```

This slice is **NO PROVIDER CALL**. It performs no production customer work, model run, VendaERP tool call, outbound effect, migration, runtime replacement or production policy mutation.

## REAL NOW

Repository at preflight entry:

```text
main = 9571e4e98fcd0dec01dc93faa842aafcf008eadc
ADR 0241 = MERGED
open PRs = 0
post-merge workflows = 4/4 GREEN
```

Pinned Paperclip source used for qualification:

```text
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
image family = v2026.916.0
```

Production readback after all disposable proofs:

```text
Task Drain:
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

Ana:
  id=428b6730-3df4-4b92-b90a-a87f87c401f9
  status=idle
  adapterType=wandora_mastra
  role=commercial-assistant

VendaERP connection:
  id=8e2c23f4-73f5-444a-8647-71428819ea91
  applicationId=6c1b0189-06cb-431d-8efe-fa84a2f2573a

vendaerp_search_products:
  catalogEntryId=165fcdca-8021-41dd-90e5-f0f143adeac3
  status=active
  riskLevel=read

Ana native Tool Gateway:
  id=67d89d09-87eb-4991-bfce-11d318f8d635
  profileId=6b5a8519-81b0-4bad-9135-db3166b21af4
  defaultProfileMode=gateway_only

temporary live block/rate policies = 0
28PRO work operations = 0
28PRO outbound attempts = 0

VendaERP activity:
  events=68
  sha256=47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

The activity hash is unchanged from ADRs 0236, 0239, 0240 and 0241.

## Live VendaERP tool surface

The exact live connection currently exposes eight active read-only tools:

```text
vendaerp_get_product_stock
vendaerp_list_companies
vendaerp_list_price_tables
vendaerp_probe
vendaerp_search_orders
vendaerp_search_parties
vendaerp_search_price_table_products
vendaerp_search_products
```

The Ana gateway profile currently includes all eight.

Therefore a hard one-shot product-read proof needs two independent controls:

1. block the other seven;
2. rate-limit `vendaerp_search_products` to one Tool Gateway attempt.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- **Wandora** owns the business/customer-work contract, durable work receipt semantics and the decision whether a result is accepted as business success.
- **Paperclip** owns issue/run lifecycle, Tool Gateway authorization, profiles, policies, rate-limit counters, Task Drain, audit and MCP dispatch.
- **Mastra** owns the ephemeral supervised model/tool loop.
- **VendaERP MCP** owns bounded read translation to the provider.

ADR 0168 remains binding:

> **Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.**

Rejected:

- Wandora-owned one-shot table;
- Wandora invocation counter;
- Wandora rate limiter;
- new retry/lifecycle state;
- Paperclip fork;
- provider-specific state copied into Core.

The existing Paperclip policy/rate-limit authority is sufficient.

## Proven Paperclip limiter semantics

Pinned source proves rate limits are stored in Paperclip-owned `tool_rate_limit_counters`.

The counter key includes the policy plus the selected bucket. With:

```json
{
  "limit": 1,
  "windowSeconds": 3600,
  "keyBy": ["agent", "tool"]
}
```

the first consuming decision inserts the counter with:

```text
limit=1
remaining=0
```

A second concurrent or sequential consume cannot decrement below zero because the atomic update only runs where `remaining > 0`.

The second decision is:

```text
decision=rate_limited
reasonCode=rate_limited
count=1
limit=1
```

This decision occurs before the Tool Gateway invokes `executeRemoteHttpTool` or `executeLocalStdioTool`.

## VendaERP MCP single-upstream-call proof

The hard budget must bound the real provider request, not only the Paperclip MCP invocation.

The live-equivalent repository MCP implementation proves:

```text
vendaerp_search_products
-> client.searchProducts
-> exactly one getJson('/api/request/Produtos/Pesquisar', ...)
-> exactly one fetchImpl(...)
```

`getJson()` has no retry loop or backoff path. It performs one bounded-timeout GET with `redirect=error` and maps any network/provider failure to a normalized error.

Focused Node test:

```text
test = uses only the template-bound VendaERP origin, GET and exact credential headers
pass = 1
fail = 0
```

The test records provider fetches and requires `calls.length === 1` after one `searchProducts(...)`.

Therefore, for the qualified MCP bytes, one admitted `vendaerp_search_products` Tool Gateway dispatch can generate **at most one HTTP GET** to VendaERP. A second Tool Gateway attempt is stopped by Paperclip rate limiting before the MCP executes.

## Upstream pinned tests

Focused pinned Paperclip tests were re-run.

### Atomic final slot

```text
tool-access-policy-service.test.ts
test = atomically consumes the final rate-limit slot
result = PASS
```

The upstream test races two consumes against a one-slot policy and requires exactly one allow and one rate-limited result.

### Persisted issue/run integrity

```text
tool-access-policy-service.test.ts
test = rejects agent-supplied issue context that differs from the stored heartbeat context
result = PASS
```

Pinned source also resolves `issueId` from `heartbeatRuns.contextSnapshot` before policy evaluation and rejects mismatched supplied context.

### Connected MCP path

```text
tool-gateway.test.ts
test = enforces policy, approvals, retries, rate limits, and company boundaries for connected remote MCP calls
result = PASS
```

That test proves the first connected MCP call completes and the second call is rejected with `429 rate_limited`, with a persisted `rate_limited` invocation.

### Task Drain

```text
heartbeat-task-drain.test.ts
start_task_drain_suppresses_admission = PASS
stop_task_drain_restores_admission = PASS
```

Task Drain is therefore the native preparation/quiescence primitive, not a Wandora-owned maintenance mode.

## Disposable authoritative counter proof

A temporary test was added only to the disposable pinned Paperclip checkout and removed after execution.

It created:

- disposable company;
- disposable Ana-like agent;
- persisted issue;
- persisted heartbeat run carrying that issue in `contextSnapshot`;
- disposable VendaERP-like connection/catalog entry;
- a Paperclip-native `rate_limit` policy;
- no real MCP/provider.

The policy was issue/catalog/tool scoped and used one atomic slot.

Before cleanup, the authoritative Paperclip counter was captured:

```text
persistedIssueId == selectorIssueId
limit=1
remaining=0
secondDecision=rate_limited
secondReasonCode=rate_limited
secondCount=1
```

After deleting the policy:

```text
tool_rate_limit_counters rows for policy = 0
```

This closes ADR 0233/0241's specific evidence gap: the real limiter counter was observed **before cleanup**.

## Adversarial finding 1 — issue-scoped profile is not sufficient

The prior ADR 0231 execution sketch proposed an issue-scoped `defaultAction=deny` profile containing only the product tool.

Fresh live/source review found that Ana's runtime uses:

```text
gateway id = 67d89d09-87eb-4991-bfce-11d318f8d635
defaultProfileMode = gateway_only
gateway profile = 6b5a8519-81b0-4bad-9135-db3166b21af4
```

Paperclip profile precedence is:

```text
gateway
issue
routine
agent
project
company
```

Therefore a gateway binding outranks an ordinary issue binding.

The old “issue profile narrows Ana to one tool” plan cannot be treated as a hard guard for this live runtime.

It is superseded by policy-based denial, because matching `block` and `rate_limit` policies are evaluated before grant/profile allowance.

## Disposable gateway-precedence adversarial proof

A disposable test reproduced the stronger case:

- a gateway-scoped profile permitted all eight VendaERP-like read tools;
- an issue-scoped Paperclip `block` policy denied the seven non-product tools;
- an issue-scoped `rate_limit=1` policy governed the product tool.

Observed matrix:

```text
7 tools -> deny / deny_policy_block
vendaerp_search_products -> allow
```

Then:

```text
counter limit=1
counter remaining=0
second product decision=rate_limited
second product count=1
cleanup counter=0
```

Thus policy enforcement wins even when the active gateway profile itself permits the tools.

## Adversarial finding 2 — Task Drain cannot remain active through canonical work creation

The canonical Organization Adapter work path creates/recovers the Paperclip issue and immediately calls:

```text
ctx.issues.requestWakeup(...)
```

Pinned Paperclip `enqueueWakeup` checks scheduling suppression before creating the run.

When Task Drain is active:

```text
schedulingSuppression.suppressed=true
reason=task_drain
-> skipped wake receipt
-> enqueueWakeup returns null
-> Plugin requestWakeup returns queued=false, runId=null
```

The Wandora Organization Adapter plugin requires:

```text
queued=true
runId present
```

or it throws:

```text
customer_work_dispatch_not_queued
```

Therefore **Task Drain must not remain active while the canonical customer work is submitted**.

## Corrected guard scope before issue creation

Because the future canonical issue does not exist until customer-work admission, the policies cannot safely depend on that future `issueId`.

The corrected preparation guard is temporarily **agent-scoped**:

### Block policy

```text
policyType = block
priority = 1
selectors:
  agentId = Ana
  connectionId = VendaERP
  toolNames = the seven non-product live reads
```

### Product budget

```text
policyType = rate_limit
priority = 2
selectors:
  agentId = Ana
  connectionId = VendaERP
  catalogEntryId = vendaerp_search_products
  toolName = vendaerp_search_products

config:
  limit = 1
  windowSeconds >= bounded execution window
  keyBy = [agent, tool]
```

This budget can be installed **before** the future issue/work exists.

It is intentionally conservative: while active, it applies to any Ana execution using that exact VendaERP connection. The execution slice must therefore prove Ana has no active/pending work before releasing Task Drain and must create the single authorized customer work immediately after release.

## Disposable agent-scoped adversarial proof

A second temporary test was executed in disposable pinned Paperclip and then removed.

The test used a deliberately permissive gateway:

```text
gateway defaultProfileMode = gateway_only
gateway profile defaultAction = allow
```

The policies were installed without knowing the future issue:

```text
block selectors = agent + connection + non-product tool
rate selectors = agent + connection + product catalog/tool
```

Results:

```text
blocked tool:
  decision=deny
  reasonCode=deny_policy_block
  effectiveProfileIds=[permissive gateway profile]

product dry-run:
  decision=allow
  reasonCode=allow_profile
  rate counters=0

first consuming product decision:
  allowed=true
  limit=1
  remaining=0

second consuming product decision:
  decision=rate_limited
  count=1

cleanup:
  counter rows=0
```

This proves the temporary guard can be installed before the future canonical issue exists and still wins over a gateway-only permissive profile.

## Safe production execution sequence

A separate real execution may proceed only in this order.

1. Reconcile exact `main`, open PRs, workflows, runtime hashes/health, Ana, Tool Gateway, catalog and current policies.
2. Require Ana `idle`, Paperclip activeRuns=0, pendingWakes=0, Wandora work/outbound=0/0 and no residual temporary block/rate policy.
3. Start Paperclip native Task Drain with a bounded TTL.
4. Require Task Drain `draining=true` and `quiescent=true`.
5. Create the temporary Ana+VendaERP `block` policy for the seven non-product reads.
6. Create the temporary Ana+product `rate_limit=1` policy.
7. Run Paperclip policy-test with `consumeRateLimit=false` against the live Ana gateway context and require exactly:
   - seven `deny_policy_block`;
   - one allowed `vendaerp_search_products`.
8. Prove the rate-limit counter has not been consumed.
9. Re-read Task Drain and require activeRuns=0, pendingWakes=0, quiescent=true.
10. Stop Task Drain and require `draining=false`.
11. Immediately submit exactly one fresh canonical Wandora customer work for Ana, using one idempotency key and a request that authorizes only `vendaerp_search_products({"pageSize":5,"skip":0})`.
12. Do not issue a manual wake, retry, comment-triggered duplicate, or second customer-work admission.
13. Recover the exact Paperclip issue by:
    ```text
    originKind=plugin:wandora.organization-adapter-v1:customer-work-v1
    originId=<Wandora workId>
    includePluginOperations=true
    ```
14. Require the canonical work wake/run only; any unrelated Ana run is a STOP condition.
15. Permit at most one product Tool Gateway consume/provider dispatch.
16. Any request for the other seven VendaERP tools must terminate at `deny_policy_block` before MCP dispatch.
17. Any second product attempt must terminate at `rate_limited` before MCP dispatch.
18. If no product provider dispatch occurs, classify the slice as not a successful provider-read proof and STOP without retry.
19. If the first product call fails, preserve safe normalized failure evidence, require Wandora `execution_uncertain` + Paperclip native blocked semantics, and STOP without retry.
20. If a later blocked/rate-limited tool attempt occurs after one successful product call, the read-tool failure latch remains authoritative; do not accept model text as durable success.
21. If the run succeeds, require exactly one durable Wandora result and Paperclip done semantics with no continuation.
22. Before deleting the rate policy, capture:
    - exact counter key;
    - `limit=1`;
    - `remaining=0`;
    - derived count=1.
23. Capture VendaERP Connection activity delta and require exactly one new product-call event attributable to the execution.
24. Delete only the temporary block and rate-limit policies. Do **not** delete the canonical Wandora customer work or its Paperclip issue.
25. Prove policy/counter cleanup, Task Drain OFF, no live runs/pending wakes, outbound unchanged and runtime healthy.
26. STOP.

## Timeout / ambiguity rules

The next slice must fail closed.

- If work admission times out after the request may have reached Core/Paperclip, reconcile by the original idempotency key; never submit a new key.
- If policy creation times out, read policies before repeating creation.
- If Task Drain start/stop times out, read current drain state before repeating.
- If the first product call outcome is ambiguous, do not retry; the one-slot counter is part of the evidence.
- If cleanup deletion times out, read the policy/counter before repeating.
- A missing result is not permission to create another work or provider call.

## Second Adversarial Review

- Is a Wandora-owned limiter required? **No.**
- Is a new Wandora table/migration/state machine required? **No.**
- Is the Paperclip counter authoritative and atomic? **Yes.**
- Was the real counter observed before disposable cleanup? **Yes.**
- Can an issue profile reliably override Ana's live gateway profile? **No; gateway precedence is narrower.**
- Does the corrected policy design depend on profile precedence? **No.**
- Can `block` deny a tool that the gateway profile permits? **Yes, disposable proof GREEN.**
- Can the product budget be installed before the future issue exists? **Yes, by agent+connection+catalog/tool scope.**
- Can Task Drain remain active through canonical work submission? **No.**
- Can Task Drain safely protect policy installation? **Yes.**
- Is the transition after Task Drain release unguarded? **No; the block/rate policies are already active.**
- Could an unrelated Ana run consume the single product slot? **In principle yes; therefore zero active/pending runs is mandatory immediately before drain release and any unrelated run is a STOP condition.**
- Could a second product attempt dispatch upstream? **No; it is rate-limited before MCP execution.**
- Could another VendaERP read dispatch upstream? **No while the temporary block policy is active.**
- Does cleanup delete canonical work/issue state? **No; only temporary policy state is removed.**
- Did this ADR call VendaERP or a production model? **No.**
- Did this ADR mutate production policy/runtime/work state? **No.**

## Decision

**GREEN / HARD ONE-CALL BUDGET QUALIFIED / NO PROVIDER CALL.**

The remaining ADR 0241 budget gate is closed without duplicating Paperclip capability.

The prior issue-profile narrowing sketch is superseded for the current live gateway architecture. The safe guard is:

```text
Paperclip Task Drain for preparation
+ agent-scoped block of seven non-product VendaERP reads
+ agent-scoped product rate_limit=1
+ dry-run policy matrix with zero consumption
+ Task Drain release
+ exactly one canonical customer work
+ authoritative counter/activity capture before cleanup
```

A real provider read is now eligible only as a **separate bounded READ-ONLY execution slice** following the frozen order above.

## Next Slice

**28PRO VendaERP Canonical Customer-Work One-Shot Product Read Execution V1 — READ ONLY.**

No further code or provider-capability implementation is authorized by this ADR.
