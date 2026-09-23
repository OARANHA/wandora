# ADR 0227 — 28PRO VendaERP Product Retry V2 Failure + MCP Tool Error Semantics V1

Status: **RETRY NOT GREEN / CORRECTION CANDIDATE / NO FURTHER PROVIDER CALL**
Date: 2026-09-23

## Objective

Record the real outcome of **28PRO VendaERP Bounded Product Read Retry Execution V2** and qualify the minimum correction required before any later provider retry.

ADR 0226 authorized one bounded product read only after Paperclip-native issue scoping proved exactly one visible read capability.

## Canonical entry

```text
main = 5e832426e0064b1c0438501a6e1e701f4144e3a4
ADR 0226 = merged
Core = wandora/core:organization-adapter-candidate-da4289034575
Paperclip = wandora/paperclip:v2026.916.0
wandora_mastra = retained package 6390812d...
VendaERP MCP = safe-logging build 067e7f98...
work operations = 0
outbound attempts = 0
```

## Frozen native scope

The execution created one temporary Paperclip-only issue:

```text
identifier = PRO-8
issue id = abee3cae-3f78-4be6-9eec-954ef3e8a47c
customer-work marker = absent
```

and one temporary Paperclip profile:

```text
profile id = 7d3ec031-3f98-48ad-9634-f59b3ab0c17a
defaultAction = deny
entries = exactly 1
targetType = issue
catalogEntryId = 165fcdca-8021-41dd-90e5-f0f143adeac3
tool = vendaerp_search_products
```

Immediately before execution, Paperclip native policy-test returned:

```text
vendaerp_search_products = allow / allow_profile
other seven VendaERP catalog entries = deny / deny_default
summary = allow 1 / deny 7
```

No Wandora-owned task allowlist was used.

## First run

Exactly one manual/on-demand wake was issued.

Paperclip run:

```text
run = 6c043d53-7f16-45de-8091-9016ce99be28
status = succeeded
```

Tool Gateway audit proves exactly one invocation in that run:

```text
tool = vendaerp_search_products
arguments = {"pageSize":5,"skip":0}
risk = read
policy = allow
status = failed
errorCode = local_stdio_protocol_error
errorMessage = Local stdio MCP server returned a JSON-RPC error
```

The supervised summary reported that product data could not be recovered.

No second manual wake or retry was issued by Wandora/operator.

## Paperclip lifecycle handoff

Because the adapter-level run returned `succeeded` while the issue remained `in_progress`, Paperclip's native recovery service created one automatic corrective run:

```text
reason = finish_successful_run_handoff
run = 2da8c2cd-d6c2-4c97-b10a-5e9dcd4ad627
status = succeeded
```

That corrective run made the same single read invocation again:

```text
tool = vendaerp_search_products
arguments = {"pageSize":5,"skip":0}
risk = read
policy = allow
status = failed
errorCode = local_stdio_protocol_error
```

Therefore the execution produced **two provider read attempts across two distinct Paperclip lifecycle runs**.

This violates ADR 0226's one-provider-read execution budget even though:

- each individual run made only one Tool Gateway call;
- no other tool was visible;
- no write/destructive tool was called;
- no automatic retry exists in the VendaERP adapter itself.

## Cleanup and post-effect state

After evidence capture:

- issue/profile binding was removed;
- temporary profile was deleted;
- PRO-8 was deleted;
- no profile/issue residue remains;
- Wandora work operations = 0;
- Wandora outbound attempts = 0;
- Core = healthy / restart 0;
- Paperclip = healthy / restart 0.

No further VendaERP call is authorized by this ADR.

## Root cause 1 — lifecycle handoff

Pinned Paperclip v2026.916.0 proves:

```text
DEFAULT_MAX_SUCCESSFUL_RUN_HANDOFF_ATTEMPTS = 1
```

A legacy successful run on an assigned `in_progress` issue without a valid disposition is eligible for one corrective `finish_successful_run_handoff` wake.

The same provider implementation also proves that **comment-driven runs are explicitly excluded** from that recovery path when:

```text
wakeReason =
  issue_commented
  | issue_comment_mentioned
  | issue_reopened_via_comment
```

Therefore a future one-shot proof must reuse a Paperclip-native lifecycle that does not generate the corrective handoff. No Wandora lifecycle flag or duplicate recovery state is justified.

## Root cause 2 — MCP execution failure is encoded as protocol error

The VendaERP MCP currently catches a tool execution exception and returns JSON-RPC:

```text
message.error
  code = -32000
  data.code = <safe normalized adapter code>
```

Paperclip local_stdio treats any `message.error` as a **protocol failure** and normalizes it to:

```text
local_stdio_protocol_error
```

The adapter's safe stderr event does contain the normalized provider category, but pinned Paperclip collects child stderr only for process-exit diagnostics. On a JSON-RPC `message.error`, it rejects immediately from stdout and the captured stderr is not persisted into the invocation error path.

That is why the live provider category remains unproven.

## Proven Paperclip MCP capability

Paperclip already supports standard MCP tool execution failures represented as:

```json
{
  "result": {
    "content": [...],
    "structuredContent": {...},
    "isError": true
  }
}
```

Its `normalizeMcpToolResult()` preserves:

- `data.isError=true`;
- structured content;
- local_stdio transport provenance;
- an explicit logical error marker.

Therefore the provider adapter must use **tool result error semantics** for tool execution failures rather than JSON-RPC protocol error semantics.

This remains provider-translation responsibility and does not require a Paperclip fork.

## Core fail-closed requirement

The ADR 0211 bridge currently accepts every HTTP 200 Tool Gateway result and returns `result.data` to the runtime.

For an MCP `isError=true` response this is too permissive.

The bridge must reject:

```text
data.isError = true
```

as `PaperclipToolGatewayReadBridgeError("unavailable")`.

ADR 0218 run-scoped memoization then guarantees that repeated identical calls in the same run reuse the same rejected Promise and do not hit the provider again.

No provider error code is sent to the model by this bridge behavior.

## Capability Authority / Reuse Gate

The correction does not introduce new durable Wandora state or operational authority.

Paperclip remains authoritative for:

- issue lifecycle;
- run identity;
- issue-scoped profile binding;
- policy evaluation;
- Tool Gateway;
- audit;
- MCP execution.

VendaERP MCP remains responsible only for provider translation and safe normalized error representation.

Wandora Core owns only the semantic/fail-closed adapter contract between an authorized read tool and supervised runtime.

ADR 0168 remains preserved.

ADR 0208 remains preserved.

## Candidate change

### VendaERP MCP

For execution errors inside `tools/call`:

```text
JSON-RPC result
content = safe normalized error code only
structuredContent.error.code = safe normalized error code
isError = true
```

Protocol-level errors such as invalid JSON-RPC/method shape remain JSON-RPC errors.

Safe stderr logging remains unchanged.

### Wandora Core bridge

On Tool Gateway HTTP 200:

```text
if result.data.isError === true
  -> fail closed as unavailable
```

The same applies if Paperclip exposes its normalized `MCP tool returned an error result` marker.

No provider response, credential or sensitive payload enters the model.

## Second adversarial review

- Are we adding a Wandora retry engine? **No.**
- Are we overriding Paperclip lifecycle? **No.**
- Are we adding a second tool-policy system? **No.**
- Are we modifying Paperclip core? **No.**
- Is MCP `isError` an existing provider-supported semantic? **Yes.**
- Does Core remain fail closed? **Yes.**
- Does ADR 0218 still collapse repeated identical failures inside one run? **Yes.**
- Is the future one-shot lifecycle provider-native? **Yes; use a comment-driven wake path already excluded from successful-run handoff.**
- Is another provider retry authorized now? **No.**

## Effect boundary

This ADR/code slice performs no:

- production Core promotion;
- MCP production staging;
- Paperclip restart;
- provider call;
- model run;
- temporary issue/profile;
- customer work;
- outbound;
- migration.

## Decision

**Product Retry Execution V2 = NOT GREEN.**

The read capability remains quarantined from another provider retry until the correction above is merged, fully validated and promoted separately.

Next safe slices:

1. **VendaERP MCP Tool Error Semantics + Core Fail-Closed Candidate V1 — CODE ONLY / NO EFFECT**;
2. separate runtime promotion preflight/execution;
3. **Paperclip Comment-Driven One-Shot Product Read Preflight V1 — NO PROVIDER CALL**;
4. only then may a new single-provider-read execution be considered.
