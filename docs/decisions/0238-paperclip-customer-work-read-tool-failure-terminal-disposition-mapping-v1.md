# ADR 0238 — Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping V1

Status: **IMPLEMENTED IN CODE / GREEN / NO PROVIDER CALL / NO PRODUCTION EFFECT**
Date: 2026-09-24

## Objective

Close the strict one-shot lifecycle gap proven by ADR 0237 without duplicating Paperclip lifecycle/recovery authority and without making another VendaERP or production model call.

ADR 0237 proved that ADR 0234 failure propagation is semantically correct, but `wandora_mastra@0.4.0` still converts Core `422 read-tool-failed` into a generic adapter exception. Pinned Paperclip classifies `adapter_failed` as transient continuation infrastructure, so an assigned `in_progress` issue could still receive automatic successor runs even though Wandora's durable `execution_uncertain` gate prevents those successors from reaching Tool Gateway/Mastra/provider execution.

The required correction is therefore not a new Wandora retry/lifecycle subsystem. It is a narrow adapter mapping into an existing Paperclip-native terminal/blocking disposition.

## REAL NOW

Canonical entry for this code-only slice:

```text
main = 91d181d09acfc9ba52827a3c5c383bf25d62f4be
PR #310 = MERGED
ADR 0237 = GREEN SEMANTICS / PROVIDER READ NO-GO
open PRs = 0 at slice entry
```

Production remains unchanged:

```text
Core image = wandora/core:organization-adapter-candidate-4a54b5d8f14c
Core revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
Core = healthy / restart 0

Paperclip image = wandora/paperclip:v2026.916.0
Paperclip container id = 3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e
Paperclip = healthy / restart 0

live wandora_mastra = 0.4.0
VendaERP MCP server.mjs sha256 =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

28PRO work operations = 0
28PRO outbound attempts = 0
```

No production mutation is part of this ADR.

## Proven Paperclip-native authority

Pinned Paperclip source remains:

```text
dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
v2026.916.0 family
```

Source inspection proves:

1. `blocked` is a native Paperclip issue status and accepted durable disposition.
2. Successful-run handoff explicitly treats `blocked` as a valid disposition and does not queue continuation solely because the run ended.
3. Generic stranded continuation recovery is centered on assigned `in_progress` work.
4. entering `blocked` through `PATCH /api/issues/:id` requires at least one real blocker path:
   - unresolved first-class blocker;
   - pending interaction/approval; or
   - `unblockDescriptor`.
5. `unblockDescriptor` is native Paperclip state with shape:

```json
{
  "owner": { "agentId": "<uuid>" },
  "action": "<explicit unblock action>"
}
```

6. when the caller is an agent, the descriptor owner may name only that same agent.
7. the existing `wandora_mastra` adapter already uses the run-scoped token plus `x-paperclip-run-id` to update the exact customer-work issue after successful Wandora work completion.

Therefore the correct reuse boundary is the existing Paperclip issue mutation contract. No Paperclip fork or Wandora-owned lifecycle state is required.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- **Wandora** owns customer/business work semantics, durable `execution_uncertain` state, provider-neutral execution success/failure meaning and external-effect authorization.
- **Paperclip** owns issue/run lifecycle, recovery/disposition, Tool Gateway, Connections/grants/secrets and run-scoped issue mutation authority.
- **Mastra** owns the ephemeral supervised model/tool loop.
- **VendaERP MCP** owns bounded provider translation and MCP tool-error representation.

ADR 0168 remains preserved:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

This ADR adds no table, migration, retry engine, lifecycle state machine, policy engine, Paperclip fork or new provider store.

## Decision 1 — exact customer-work read-tool failure maps to native `blocked`

The adapter candidate is versioned as:

```text
wandora_mastra = 0.5.0
```

Only when all of these are true:

1. the Paperclip issue carries the canonical private `wandora-work-v1:<uuid>` marker;
2. Core returns HTTP `422`; and
3. the bounded Core response is exactly:

```json
{ "error": "read-tool-failed" }
```

the adapter uses the same run-scoped Paperclip identity to update the exact issue to:

```json
{
  "status": "blocked",
  "unblockDescriptor": {
    "owner": { "agentId": "<executing-paperclip-agent-id>" },
    "action": "Resolve the read-tool failure, then create a fresh explicitly authorized Wandora customer work if another read is required."
  }
}
```

The adapter then still throws `wandora_execution_failed_422`.

Therefore:

```text
provider/tool failure
!= adapter success
!= successful Paperclip run
```

The original run remains failed. The issue receives a valid provider-native blocker disposition rather than remaining `in_progress` and eligible for generic transient continuation.

## Decision 2 — generic failures preserve existing lifecycle

The new mapping does not apply to:

- non-customer-work issues;
- customer work without the canonical marker;
- any non-422 Core response;
- another bounded 422 such as `employee-unavailable`;
- malformed/unrecognized error payloads.

Those paths preserve the existing adapter behavior.

This prevents the adapter from claiming lifecycle meaning for failures it does not semantically own.

## Decision 3 — ambiguous blocking uses readback before repeat mutation

The blocking path follows the existing bounded success-side issue-finalization discipline:

1. issue one exact PATCH;
2. if transport/5xx outcome is ambiguous, GET the same issue;
3. if status is already `blocked`, accept the committed provider state;
4. only if the issue is still `todo` or `in_progress`, issue at most one second PATCH;
5. read back again before declaring uncertainty.

A 4xx response fails closed immediately because Paperclip definitively rejected the request.

No blind mutation replay is introduced.

## Decision 4 — failure to persist Paperclip disposition remains fail-closed

Core has already marked the Wandora customer work `execution_uncertain` before returning `422 read-tool-failed`.

If the adapter cannot persist the native Paperclip `blocked` disposition, the adapter still fails. The existing Wandora durable gate remains the safety backstop:

```text
execution_uncertain
-> same run rejected before another execution
-> successor run rejected before another execution
-> no second Tool Gateway/Mastra/provider execution for that work
```

Paperclip remains the owner of recovery/disposition. Wandora does not create a parallel recovery mechanism.

## Validation

### Adapter contract tests

`wandora_mastra@0.5.0` unit contract suite:

```text
9/9 GREEN
```

New coverage proves:

- exact customer-work `422 read-tool-failed` -> exact native `blocked` mutation -> adapter still fails;
- run token and run id remain header-only/run-scoped;
- ambiguous PATCH performs GET readback before any repeat;
- active readback permits at most one bounded second PATCH;
- definitive Paperclip 4xx fails closed without readback/repeat;
- unrelated customer-work 422 does not create a blocker disposition;
- non-customer read-tool failure preserves legacy lifecycle.

### Paperclip loader contract

Against the pinned Paperclip source and exact candidate adapter:

```text
loader = ok
type = wandora_mastra
supportsLocalAgentJwt = true
contextMinimized = true
runTokenOnlyInHeaders = true
exactIssueCompletion = true
normalizedUsage = true
```

### Disposable Paperclip E2E

The disposable proof used the exact pinned Paperclip source and synthetic/fake Core only. No VendaERP or model provider was called.

Existing success-side control remained GREEN:

```text
customer_work_run_count = 1
customer_work_continuation_count = 0
customer_work_usage = 11|7|2
```

New failure-side proof:

```text
Core synthetic response = HTTP 422 {"error":"read-tool-failed"}
Paperclip source run status = failed
Paperclip source run errorCode = adapter_failed
Paperclip issue status = blocked
unblockDescriptor owner = exact executing agent
failure_run_count = 1
failure_continuation_count = 0
```

The proof waited beyond the configured scheduler floor and observed no automatic `issue_continuation_needed` successor.

Attestation result:

```text
PAPERCLIP_WANDORA_CUSTOMER_WORK_READ_TOOL_FAILURE_BLOCKED_DISPOSITION_OK
PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK
```

### Wandora durable work safety

Carried forward from ADR 0237, with Core implementation unchanged in this slice, the disposable DB-backed Core verifier remains:

```text
34/34 GREEN
```

It reconfirms:

- read-tool failure after work preparation -> `execution_uncertain`;
- durable success is not recorded;
- same-run replay is rejected before another execution;
- a different successor run is rejected before another execution.

### Deterministic package

The candidate package is deterministic:

```text
package = wandora-paperclip-adapter-mastra-0.5.0.tgz
sha256 = 64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62
files =
  package/README.md
  package/compatibility.json
  package/index.mjs
  package/package.json
```

The repository CI remains authoritative for the exact PR-head artifact/provenance.

## Second adversarial review

- Does this turn a provider/tool failure into success? **No. The adapter still fails the run.**
- Does it invent a Wandora lifecycle state? **No. It uses Paperclip-native `blocked` + `unblockDescriptor`.**
- Is `blocked` merely assumed to suppress recovery? **No. Pinned source treats it as valid disposition and disposable E2E proves zero successor runs beyond the scheduler floor.**
- Can an arbitrary 422 create a blocked issue? **No. Only exact canonical customer work + exact bounded `read-tool-failed`.**
- Can non-customer work be affected? **No.**
- Can an ambiguous mutation be blindly repeated? **No. Readback precedes any second mutation.**
- If Paperclip blocking fails, can Wandora replay the provider call? **No. `execution_uncertain` remains the durable fail-closed gate.**
- Is Paperclip lifecycle duplicated or forked? **No.**
- Is a migration/new table/state machine required? **No.**
- Did this slice call VendaERP or a production model? **No.**
- Did this slice change production? **No.**

## Decision

**CODE COMPLETE / GREEN / NO PROVIDER CALL / NO PRODUCTION EFFECT.**

The strict lifecycle counterexample from ADR 0237 is corrected in the candidate adapter while preserving Paperclip as operational lifecycle authority and Wandora as customer-work semantic authority.

Another real VendaERP/provider read remains prohibited because production still runs `wandora_mastra@0.4.0`.

## Next slice

**ADR 0239 — Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping Production Promotion Preflight V1 — NO PROVIDER CALL**.

That preflight must qualify the exact merged-main `wandora_mastra@0.5.0` artifact, retained 0.4.0 rollback package, Paperclip external-adapter replacement/restart sequence, Task Drain protection, live zero-run/work/outbound state and a no-provider post-promotion validation plan before any runtime effect.
