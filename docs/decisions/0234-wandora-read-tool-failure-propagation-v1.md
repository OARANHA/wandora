# ADR 0234 — Wandora Read Tool Failure Propagation V1

Status: **IMPLEMENTED IN CODE / NO PROVIDER CALL / NO PRODUCTION EFFECT**
Date: 2026-09-24

## Context

ADR 0233 established the authority boundary after the real ADR 0232 V3 counterexample.

The proven Wandora-owned semantic failure was:

```text
MCP tool returns isError=true
-> Core read bridge throws
-> Mastra absorbs tool exception
-> model emits structured text
-> Core accepts model text as task success
-> wandora_mastra returns successful adapter result
-> Paperclip persists succeeded run
```

This erased the distinction between provider-backed success and model-authored text after provider/tool failure.

ADR 0233 explicitly rejected:

- a Paperclip lifecycle fork;
- a Wandora retry engine;
- converting the read-tool failure into adapter success;
- an unproven Tool Gateway issue-context patch.
## Decision 1 — preserve first read-tool failure across Mastra

The supervised Mastra runtime now maintains an ephemeral per-execution failure latch.

For read tools supplied to one `executeAssignedTask()` call:

1. the first tool exception is retained;
2. later read-tool calls in that same execution throw the retained failure;
3. if `Agent.generate()` throws after the tool failure, the retained tool failure is rethrown;
4. if `Agent.generate()` returns valid structured text after the tool failure, the retained tool failure is still thrown.

Therefore model-authored text can no longer convert a failed provider/tool read into successful Wandora task execution.

The latch is memory-only and scoped to one runtime execution.
## Decision 2 — preserve a bounded tool-failure category

The Core Paperclip Tool Gateway read bridge now classifies only the standard MCP tool-error result:

```text
data.isError === true
or
result.error === "MCP tool returned an error result"
```

as:

```text
PaperclipToolGatewayReadBridgeError("tool-failed")
```

Transport failures, timeouts, malformed responses and gateway failures retain their existing semantics.

Repeated identical calls inside one run still collapse to one upstream call.
## Decision 3 — expose only a safe private failure response

The Core private Paperclip execution handler maps only `tool-failed` to:

```text
HTTP 422
{ "error": "read-tool-failed" }
```

No raw provider payload, tool arguments, token or provider-specific error body crosses this boundary.

The live `wandora_mastra` behavior is intentionally unchanged by this slice.

A non-2xx Core response remains an adapter failure.

This preserves Paperclip as run/recovery authority and avoids the false-success design rejected by ADR 0233.
## Customer-work semantics

The existing `PaperclipExecutionService` already has the correct durable business boundary:

- work execution is prepared before runtime;
- any runtime exception marks the prepared work execution uncertain;
- durable successful work result is recorded only after runtime success.

A new DB-backed regression specifically drives a read-tool `tool-failed` exception after work preparation and proves:

```text
tool call count = 1
recordCatalogEmployeeWorkResult = not called
markCatalogEmployeeWorkExecutionUncertain = called
service result = rejected with tool-failed
```

No customer work is falsely recorded as successful.
## Capability Authority / Reuse Gate

Authority remains unchanged:

- Paperclip owns issue/run lifecycle, recovery and final provider-native disposition;
- Wandora owns business-work semantics and the private execution success/failure contract;
- Mastra owns the ephemeral supervised model/tool loop;
- VendaERP MCP owns provider translation and MCP tool-error representation.

No table, migration, durable state, retry service, lifecycle engine, policy system or Paperclip fork is introduced.

ADR 0168 remains preserved.
## Validation

Local code-only validation:

```text
focused Core tests = 13/13 GREEN
Core typecheck = GREEN
Core build = GREEN
```

The focused regression reproduces the live failure shape:

1. model requests a read tool;
2. tool throws;
3. model endpoint attempts to return textual success afterward;
4. Wandora runtime still rejects with the first tool failure;
5. the read tool executes exactly once.

The database-backed customer-work regression is included in the Core integration suite and remains CI-authoritative.

No provider call, model call to production, Paperclip mutation or production restart occurred.
## Second adversarial review

- Can a read-tool failure become accepted model text? **No, by focused regression.**
- Can the same runtime execution make another read-tool attempt after the first failure? **No.**
- Is MCP `isError=true` still distinct from network unavailability? **Yes.**
- Does the Core private boundary leak provider error details? **No.**
- Is `wandora_mastra` converted to technical success on failure? **No.**
- Can customer work record durable success after read-tool failure? **No; regression marks uncertain.**
- Is Paperclip lifecycle duplicated? **No.**
- Is Tool Gateway context changed by this ADR? **No.**
- Is production changed? **No.**
- Is another VendaERP provider read authorized? **No.**

## Decision

**CODE COMPLETE / NO PRODUCTION EFFECT.**

Next slice:

**ADR 0234 Read Tool Failure Propagation Promotion Preflight V1 — NO PROVIDER CALL**

That slice must qualify exact Core artifacts, rollback, production composition and the existing adapter contract before any production promotion or future provider read.
