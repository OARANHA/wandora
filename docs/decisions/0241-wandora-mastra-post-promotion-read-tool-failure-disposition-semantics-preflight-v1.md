# ADR 0241 — wandora_mastra@0.5.0 Post-Promotion Read-Tool Failure Disposition Semantics Preflight V1

Status: **GREEN / SEMANTICS RE-ATTESTED / PROVIDER READ STILL NO-GO / NO PROVIDER CALL**
Date: 2026-09-24

## Objective

Re-attest, after ADR 0240 production promotion, that the exact live `wandora_mastra@0.5.0` bytes preserve the intended customer-work read-tool failure semantics without executing any real customer work, production model, VendaERP tool/provider call or outbound effect.

The required invariant is:

```text
MCP/provider read failure
-> Wandora read tool preserves tool-failed
-> model text cannot convert failure into success
-> Core returns bounded 422 read-tool-failed
-> exact Wandora customer work becomes execution_uncertain / no durable success
-> wandora_mastra maps only that exact customer-work failure to Paperclip-native blocked
-> adapter run remains failed
-> issue has a real unblockDescriptor
-> no generic issue_continuation_needed successor
-> no second provider execution
```

This slice is evidence-only. It does not create a production issue, customer work, heartbeat run, wakeup, tool session, rate-limit policy or provider call.

## REAL NOW

Repository:

```text
main = f19715f2a90a3ea36c0194b33cbe02d11f353ac0
PR #313 = MERGED
open PRs = 0 at preflight entry
post-merge workflows = 4/4 GREEN
```

Production:

```text
Paperclip image = wandora/paperclip:v2026.916.0
Paperclip container =
4b187dc595ea9787964d882a88cb88e9ddbaf8fa01742b12ec1e5e2a5babbcb5
Paperclip = healthy / restart 0

wandora_mastra = 0.5.0
loaded = true
disabled = false
isLocalPath = true
installedAt = 2026-09-24T03:54:19.123Z

Core image =
wandora/core:organization-adapter-candidate-4a54b5d8f14c

Core revision =
4a54b5d8f14c469989fad277189f6ebdfb8fb1f0

Core = healthy / restart 0
```

The exact live adapter path remains:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/
package
```

## Capability Authority / Reuse Gate

Authority remains unchanged:

- **Wandora** owns customer/business work semantics, durable success-vs-uncertain receipts, provider-neutral execution correlation and the rule that provider/tool failure is not business success.
- **Paperclip** owns issue/run lifecycle, recovery/disposition, Tool Gateway policy/audit/rate limiting, external adapter loading and run-scoped operational identity.
- **Mastra** owns the ephemeral supervised model/tool loop implementation.
- **VendaERP MCP** owns bounded provider translation and MCP tool-error representation.

ADR 0168 remains binding:

> **Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.**

No Wandora retry engine, task lifecycle, rate limiter, Tool Gateway fork, state machine, table, migration or provider registry is justified by this preflight.

## Live-byte identity proof

The four files used by the adapter from exact `main@f19715f...` are byte-identical to the four files in the live retained 0.5.0 package.

SHA-256 for both main and live package:

```text
README.md =
f7fa768533bd6f1daa627203428e3efd66ecda05531049809676f89613e02287

compatibility.json =
be434e6bf3c7366a601fda63e5c5995bf7ebc592078b4fb5cfd1bd3d652cc7d8

index.mjs =
d76571aa107316683feda2f1222a61f559be47544ff60b04e1592d9f7f06cd95

package.json =
9b79cd5e192936c6ad3d0ec346d28e2c05b5e63325b59eddf7cf186e1b4b513d
```

Metadata:

```text
version = 0.5.0
customerWorkReadToolFailureDisposition =
run-scoped-issue-blocked-before-failed-adapter-return
customerWorkReadToolFailureScope =
exact-422-read-tool-failed-only
paperclipSourceCommit =
dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

Therefore the repository tests below exercise the same implementation bytes that are live in production.

## Adapter contract validation

Node 24 contract suite:

```text
tests = 9
pass = 9
fail = 0
```

The suite proves:

1. successful canonical customer work still terminalizes the exact Paperclip issue as done and reports normalized usage;
2. ambiguous success terminalization reads back before any repeat mutation;
3. non-customer work preserves legacy lifecycle;
4. exact customer-work `422 read-tool-failed` writes Paperclip-native `blocked` and still fails the adapter;
5. ambiguous block mutation reads back before repeat;
6. active readback permits at most one bounded second block mutation;
7. definitive Paperclip 4xx fails closed without mutation retry;
8. unrelated customer-work 422 does not claim the read-tool disposition;
9. non-customer `read-tool-failed` does not mutate issue lifecycle.

## Pinned Paperclip loader validation

The exact live-equivalent adapter bytes loaded successfully against pinned Paperclip source:

```text
Paperclip commit =
dffc2b3ca1b9e88fa21cb17493083e682dffd1ca

loader = ok
type = wandora_mastra
supportsLocalAgentJwt = true
contextMinimized = true
runTokenOnlyInHeaders = true
exactIssueCompletion = true
normalizedUsage = true
```

No production Paperclip mutation occurred.

## Disposable pinned-Paperclip E2E using live-equivalent bytes

The verifier used:

- pinned Paperclip commit `dffc2b3c...`;
- the adapter files from `main@f19715f...`, already proven byte-identical to live 0.5.0;
- a disposable PostgreSQL database;
- a disposable Paperclip instance;
- a fake Wandora Core;
- no real model;
- no VendaERP MCP/provider call.

The successful-work control remained:

```text
PAPERCLIP_WANDORA_CUSTOMER_WORK_SINGLE_RUN_COMPLETION_OK
customer_work_run_count=1
customer_work_continuation_count=0
customer_work_usage=11|7|2
```

The read-tool failure control proved:

```text
PAPERCLIP_WANDORA_CUSTOMER_WORK_READ_TOOL_FAILURE_BLOCKED_DISPOSITION_OK
failure_run_status=failed
failure_issue_status=blocked
failure_run_count=1
failure_continuation_count=0
```

The blocker also preserved:

```text
owner = exact executing Paperclip agent
action =
Resolve the read-tool failure, then create a fresh explicitly authorized
Wandora customer work if another read is required.
```

The verifier waited beyond the Paperclip scheduler floor and still observed exactly one run and zero `issue_continuation_needed` successors.

Final marker:

```text
PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK
paperclip_commit=dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

The process exited 0.

Cleanup removed its containers, network, image and temporary proof tree. No proof residue remained.

## Core durable-work validation

The disposable Organization Adapter / Core verifier ran against the real Wandora migrations and services and finished:

```text
tests = 34
pass = 34
fail = 0
```

The relevant regressions remain GREEN:

### Execution uncertainty blocks replay

```text
execution-uncertain work blocks same-run replay and successor runs before another execution
```

It proves:

- the first Paperclip run binds to the work before runtime execution;
- after uncertainty, same-run replay is rejected;
- a different successor run is also rejected;
- rejection occurs before another runtime/tool/provider execution;
- the original provider_run_ref remains frozen;
- execution_id and result_summary remain null.

### Runtime failure

```text
runtime failure marks exact work execution uncertain and never retries inside the bridge
```

### Tool Gateway failure after preparation

```text
Tool Gateway failure after work preparation marks execution uncertain before runtime
```

### Read-tool failure after preparation

```text
read-tool failure after work preparation marks execution uncertain and never records success
```

This preserves Wandora-owned durable work semantics while leaving Paperclip lifecycle/recovery authority intact.

## Final live readback

After all disposable proofs, production remained unchanged.

Runtime:

```text
Paperclip =
same container 4b187dc5...
same image v2026.916.0
healthy / restart 0

Core =
same image organization-adapter-candidate-4a54b5d8f14c
same revision 4a54b5d8...
healthy / restart 0

wandora_mastra =
exactly one
version 0.5.0
loaded=true
disabled=false
exact qualified package path

official test-environment =
PASS
```

Task Drain:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
expiresAt=null
```

Wandora counters:

```text
28PRO work operations = 0
28PRO outbound attempts = 0
```

VendaERP Connection activity:

```text
historical events = 68
response sha256 =
47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

The response hash is unchanged from ADRs 0236, 0239 and 0240.

Core production logs during the disposable validation window contained no VendaERP, Mistral, read-tool, Paperclip-execution or Mastra execution markers.

Therefore ADR 0241 made no production provider/model/tool execution and no outbound effect.

## ADR 0232 counterexample reconciliation

ADR 0232 exposed two distinct concerns.

### 1. Lifecycle / continuation after source run

This gap is now resolved for canonical customer work.

On success:

```text
durable Wandora result
-> same-run native Paperclip done
-> exactly 1 run
-> 0 continuations
```

On exact read-tool failure:

```text
no durable success
-> Wandora execution_uncertain
-> same-run native Paperclip blocked
-> run remains failed
-> exactly 1 run
-> 0 continuations
```

Therefore product-shaped text from an automatic successor cannot become the authoritative outcome for this failure path.

### 2. Hard one-provider-call budget

ADR 0233 superseded the claim that Tool Gateway issue context was proven broken. Pinned Paperclip already resolves run context, including issueId, from persisted run state. However, ADR 0233 intentionally left actual rate-limit participation **unresolved post-cleanup** because the temporary issue/policy/counter had already been deleted.

This preflight did not recreate a production rate-limit policy or call the provider.

That is the remaining safety gate for a future real one-shot read.

## Second Adversarial Review

- Are the tested adapter bytes the live production bytes? **Yes, four-file SHA equality.**
- Can read-tool failure become a successful adapter result? **No.**
- Can model-authored text override a retained read-tool failure? **No, Core regression remains GREEN.**
- Can customer work become durable success after read-tool failure? **No.**
- Can same-run replay re-enter runtime after uncertainty? **No.**
- Can a successor Paperclip run re-enter runtime after uncertainty? **No.**
- Does Paperclip create generic continuation after native blocked failure disposition? **No in pinned disposable E2E beyond scheduler floor.**
- Does successful customer work still converge to one done run with zero continuations? **Yes.**
- Is blocked a Wandora lifecycle invention? **No, it is Paperclip-native disposition.**
- Is the unblock contract real and named? **Yes.**
- Was production customer work created? **No.**
- Was VendaERP called? **No.**
- Was a production model called? **No.**
- Did outbound occur? **No.**
- Is the one-provider-call budget now proven live? **No. That remains the next separate gate.**

## Decision

**GREEN / POST-PROMOTION FAILURE SEMANTICS RE-ATTESTED / NO PROVIDER CALL.**

The ADR 0232 lifecycle/read-tool semantic counterexample no longer reproduces in the qualified canonical customer-work path under the exact live `wandora_mastra@0.5.0` bytes.

A real VendaERP/provider read remains **NO-GO** until a separate no-provider-call slice qualifies a hard one-call budget using existing Paperclip Tool Gateway policy/rate-limit authority and captures authoritative limiter/counter evidence before cleanup.

## Next Slice

**ADR 0242 — VendaERP Customer-Work One-Shot Hard Provider-Call Budget Preflight V1 — NO PROVIDER CALL.**

That slice must:

1. reuse Paperclip Tool Gateway policy/rate-limit authority;
2. prove the run-context selector used by the budget before any issue/policy cleanup;
3. qualify a hard budget of exactly one provider dispatch for the future fresh customer work;
4. define setup/readback/cleanup and timeout ambiguity handling without calling VendaERP;
5. preserve `wandora_mastra@0.5.0` done/blocked semantics;
6. stop before any provider/model call.
