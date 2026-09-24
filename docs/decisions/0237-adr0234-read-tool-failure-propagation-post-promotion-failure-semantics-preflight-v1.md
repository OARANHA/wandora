# ADR 0237 — ADR 0234 Read Tool Failure Propagation Post-Promotion Failure-Semantics Preflight V1

Status: **GREEN SEMANTICS / NO PROVIDER CALL / NO-GO FOR ANOTHER REAL PROVIDER READ YET**
Date: 2026-09-24

## Objective

Re-attest the ADR 0234 read-tool failure semantics after the ADR 0236 Core-only production promotion and decide whether a future real read can be executed without repeating the ADR 0232 one-shot counterexample.

This slice performs no VendaERP call, production model call, customer work, Paperclip issue/run/wakeup, outbound effect, migration or runtime mutation.

## REAL NOW

Repository reconciliation:

```text
main = 3fcd90481bb9b55cb0cb470197e6e413756de450
PR #309 = MERGED
open PRs = 0
ADR 0236 = COMPLETE / GREEN
```

Live Core:

```text
image = wandora/core:organization-adapter-candidate-4a54b5d8f14c
revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
health = healthy
restart = 0
healthz = 200
readyz = 200
```

Current main has no executable Core/Core-compose delta from the promoted revision:

```text
git diff 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0..3fcd90481bb9b55cb0cb470197e6e413756de450 -- apps/core infra/stacks/core
= empty
```

The live bundle itself contains the ADR 0234 failure markers:

```text
PaperclipToolGatewayReadBridgeError('tool-failed')
HTTP 422 {"error":"read-tool-failed"}
```

Live Paperclip remains the same ADR 0236 container:

```text
container id = 3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e
image = wandora/paperclip:v2026.916.0
health = healthy
restart = 0
created = 2026-09-23T22:07:07.108505365Z
```

VendaERP MCP remains byte-identical:

```text
server.mjs sha256 = 6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f
```

28PRO remains:

```text
organization = active
Ana = exactly one / active + supervised
Wandora work operations = 0
outbound attempts = 0
```

A protected Task Drain GET requires Board authority. A token-backed read attempt was blocked by the execution safety layer before reaching the VPS. This preflight therefore does not claim a fresh credentialed Task Drain readback. ADR 0236 already proved explicit drain completion, and this slice makes no live mutation.

## Proven semantic boundary

### MCP error -> bounded Wandora tool failure

The read bridge maps canonical MCP tool-error results (`data.isError === true` or the canonical gateway error marker) to:

```text
PaperclipToolGatewayReadBridgeError("tool-failed")
```

Repeated identical execution of that failed read collapses to one upstream call inside the run.

### Model text cannot manufacture provider success

The supervised Mastra runtime preserves the first read-tool exception across the execution. A focused regression deliberately performs:

```text
model requests read tool
-> read tool throws
-> model endpoint offers valid structured textual success
-> Wandora still rejects the original tool failure
```

Therefore model-authored text cannot convert a failed provider/tool read into successful Wandora execution.

### Private Core response stays bounded

Only the bounded read-tool failure category maps to:

```text
HTTP 422
{"error":"read-tool-failed"}
```

No raw provider payload, credentials, tool arguments or provider-specific error details cross that private boundary.

### `wandora_mastra@0.4.0` does not convert the failure to success

The adapter still uses:

```text
if (!response.ok) throw new Error(`wandora_execution_failed_${response.status}`)
```

So Core HTTP 422 remains a failed adapter execution. The adapter closes a customer-work issue as `done` only after Core success.

## Customer-work durability proof

The disposable DB-backed verifier ran against the real Wandora migrations/services and finished:

```text
34 tests
34 passed
0 failed
```

The additional regression introduced by this preflight is test-only:

```text
execution-uncertain work blocks same-run replay and successor runs before another execution
```

It proves:

1. exact customer work binds to the first Paperclip run before runtime/tool execution;
2. read-tool failure marks the work `execution_uncertain`;
3. no durable result is recorded;
4. the failing read tool is called exactly once in the regression;
5. same-run replay is rejected;
6. a different successor run is also rejected;
7. rejection occurs in work preparation before Tool Gateway or Mastra can run again;
8. the durable row keeps the original `provider_run_ref`, with no execution/result success fields.

Focused non-DB failure tests also finished 13/13 GREEN.

Disposable DB/network resources were removed. No proof residue remained.

## Second adversarial review — the remaining one-shot gap

A preliminary draft of this ADR considered the durable `execution_uncertain` gate sufficient for GO. Before commit/PR, pinned Paperclip v2026.916.0 recovery source was re-read and disproved that stronger one-shot conclusion.

### The adapter failure is still generic `adapter_failed`

Core returns 422, but `wandora_mastra@0.4.0` throws a generic adapter exception. Paperclip's heartbeat failure path falls back to:

```text
errorCode = "adapter_failed"
```

unless a more specific Paperclip-owned failure type is recognized.

### Paperclip explicitly classifies `adapter_failed` as transient continuation infrastructure

Pinned Paperclip source defines:

```text
TRANSIENT_INFRA_CONTINUATION_ERROR_CODES = {
  adapter_failed,
  codex_transient_upstream,
  codex_harness_crash,
  claude_transient_upstream,
  provider_quota,
  timeout
}
```

and permits up to three continuation recovery attempts for that transient class.

Its own integration tests prove failed `adapter_failed` continuation runs can be requeued before the cap.

Therefore the current failure path can still be:

```text
real customer-work run
-> read tool/provider failure
-> Wandora work execution_uncertain
-> Core 422
-> wandora_mastra throws
-> Paperclip run = adapter_failed
-> Paperclip may schedule successor recovery run(s)
```

The durable Wandora work gate prevents those successors from reaching Tool Gateway/Mastra again, so a second provider/model execution through the same work is blocked. That is a major safety improvement over ADR 0232.

But it does **not** prove the stricter one-shot invariant used by ADR 0232/0230:

```text
one intended source run
-> no automatic successor runs
```

A successor would fail earlier than ADR 0232 and could not synthesize product text, but it would still be an automatic Paperclip run. Calling that a one-shot execution would be inaccurate.

## Capability Authority / Reuse Gate

Authority remains:

- **Wandora**: customer/business work semantics, durable success-vs-uncertain state, provider-neutral private execution contract, external-effect authorization;
- **Paperclip**: issue/run lifecycle, recovery/disposition, Tool Gateway, policy/rate limiting, Connections/grants/secrets and run-scoped authorization;
- **Mastra**: ephemeral supervised model/tool loop;
- **VendaERP MCP**: bounded provider translation and standard MCP tool-error representation.

The next correction must reuse Paperclip-native lifecycle/disposition. It must not add:

- Wandora retry engine;
- Wandora lifecycle/recovery state machine;
- Wandora one-shot counter/table;
- Paperclip fork;
- duplicated Tool Gateway policy;
- automatic provider retry owned by Wandora.

ADR 0168 remains preserved.

## Decision

**Failure semantics are GREEN, but another real provider read is NO-GO.**

What is proven live/source-equivalent:

```text
MCP isError=true
-> tool-failed
-> model text cannot override
-> Core 422 read-tool-failed
-> customer work execution_uncertain
-> no durable success
-> same-run/successor work replay blocked before Tool Gateway/Mastra
```

What is not yet proven:

```text
failed customer-work source run
-> provider-native terminal disposition
-> zero automatic successor Paperclip runs
```

Therefore another VendaERP/provider read remains prohibited.

## Required next code-only slice

**Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping V1 — CODE ONLY / NO PROVIDER CALL**

The slice must first inspect/reuse Paperclip-native disposition semantics and then implement the minimum adapter mapping needed so a known customer-work `read-tool-failed` does not leave the issue in a state that generic `adapter_failed` recovery treats as transient continuation work.

Preferred authority-correct shape to qualify:

```text
Core has already durably marked work execution_uncertain
-> Core returns bounded 422 read-tool-failed
-> wandora_mastra recognizes only that exact bounded failure for canonical customer work
-> same run-scoped Paperclip authority records a native terminal/blocking disposition on the exact issue
-> adapter still reports execution failure; it must not fabricate success
-> Paperclip recovery observes the native disposition and does not enqueue a successor execution
```

The exact Paperclip native disposition (`blocked` or another already-supported non-retryable terminal form) must be proven from pinned source/tests before implementation. Do not assume it.

The code-only proof must include:

1. no provider/model call;
2. no production mutation;
3. no Paperclip fork;
4. no new table/migration;
5. exact customer-work-only scope — generic/non-work failures keep existing behavior;
6. ambiguous disposition update uses readback, not blind repeat;
7. Core work remains `execution_uncertain` and never becomes successful;
8. pinned Paperclip disposable E2E proves one failed source run and zero successor runs;
9. failure to persist the provider-native disposition remains fail-closed, with the existing Wandora uncertainty gate still preventing a second provider execution.

Only after that slice is merged, promoted if necessary, and separately re-preflighted may a new bounded provider read be designed.

## Validation summary

```text
focused failure tests = 13/13 GREEN
disposable DB-backed tests = 34/34 GREEN
new replay regression = GREEN
Core live bundle contains 422/tool-failed implementation
promoted source -> current main Core/compose executable diff = empty
Core live = healthy / restart 0 / healthz 200 / readyz 200
Paperclip live = same v2026.916.0 container / healthy / restart 0
VendaERP MCP hash = unchanged
28PRO work = 0
28PRO outbound = 0
provider calls in this slice = 0
production model calls in this slice = 0
```

## Next slice

**Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping V1 — CODE ONLY / NO PROVIDER CALL**