# ADR 0150 — Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1 — Execution Result + Lifecycle Remediation

Date: 2026-09-21  
Status: **Accepted checkpoint — legitimate work/result succeeded; exact-one-Paperclip-run postcondition failed in production; contained remediation qualified in disposable only**

Builds on: ADR 0136, ADR 0137, ADR 0138, ADR 0139, ADR 0141, ADR 0144, ADR 0147, ADR 0148, ADR 0149

## Decision summary

The authenticated MEDICSPRO owner submitted the first genuine model-backed work request through the Wandora customer work surface.

The business work succeeded: exactly one Wandora work operation was admitted, exactly one provider/model inference occurred, a bounded supervised result was recorded, and Human Send / Gateway outbound remained OFF.

The production execution did **not** satisfy the planned postcondition of exactly one Paperclip run. The first run succeeded, but the legacy/direct external-adapter lifecycle left the assigned issue open. Paperclip's native stranded-issue reconciler then created one automatic `issue_continuation_needed` run. Wandora's exact-run binding rejected that second run with HTTP 409 before Agent Runtime/model execution.

```text
legitimate Wandora work     = 1
Paperclip issue             = 1
Paperclip runs              = 2 historical runs
model calls                 = 1
structured result           = 1
outbound attempts           = 0
external effects            = 0

business result             = SUCCESS
exact-one-run invariant     = FAILED
duplicate model execution   = PREVENTED
containment                 = SUCCESS
```

The repository remediation is `wandora_mastra@0.4.0`: after Core has durably committed the exact supervised result, the same executing adapter/run transitions the exact Paperclip issue to `done` using Paperclip's own run-scoped identity and local resolved listener, then reports normalized per-run usage.

That candidate is **not yet promoted to production** by this ADR.

## REAL NOW

Starting repository authority:

```text
main = 683f5fbeaeaef7bab58b0ebfe1559ff9bd4de572
latest pre-effect checkpoint = ADR 0149
```

Live runtime inherited from ADR 0148:

```text
Paperclip              = v2026.916.0 / healthy
live wandora_mastra    = 0.3.0
Core runtime           = mastra-supervised-model
logical profile        = wandora-supervised-v1
current implementation = mistral / mistral-small-2603
model credential       = read-only mount
Human Send             = OFF
Gateway outbound       = OFF
Ana / Wandora          = active + supervised
Ana / Paperclip        = wandora_mastra
```

The owner-authenticated work title was:

```text
Preparar abordagem comercial inicial para apresentar o MedicsPro
```

The instruction requested only an internal commercial approach draft and explicitly forbade sending or claiming external contact.

## PROVEN EVIDENCE

### Wandora result

```text
work id          = 9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab
status           = result_recorded
provider run ref = 9bbeb869-fe06-4eb2-bfdd-f51a60d536ac
execution id     = exec_ff6c2c7434790da2a76111baa735d0476220d16e19b96c67a12ab0b57f34088c
result model     = wandora-supervised-v1
```

The recorded result is a customer-safe internal commercial draft.

### Model usage

Core emitted exactly one model-usage event:

```text
logical profile = wandora-supervised-v1
provider        = mistral
model           = mistral-small-2603
input tokens    = 333
output tokens   = 372
cached input    = 0
total tokens    = 705
model calls     = 1
```

Mastra and Mistral remain replaceable implementations. The stable identity is `wandora-supervised-v1`.

### Paperclip history

One issue:

```text
issue id   = 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
identifier = MED-1
origin id  = 9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab
```

Intended run:

```text
run id     = 9bbeb869-fe06-4eb2-bfdd-f51a60d536ac
source     = assignment
reason     = wandora_customer_work_v1
status     = succeeded
model call = yes
```

Automatic lifecycle continuation:

```text
run id        = dca7387e-07fe-4119-93f0-3c5af8080d1d
source        = automation
reason        = issue_continuation_needed
retry_of      = 9bbeb869-fe06-4eb2-bfdd-f51a60d536ac
status        = failed
adapter error = wandora_execution_failed_409
model call    = no
```

The second run was rejected by the exact Wandora work/run correlation before Agent Runtime/model execution. The issue subsequently became `blocked`; later reconciliation found no third run.

### Effect boundary

```text
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
routines          = 0
routine runs      = 0
task sessions     = 0
second model call = 0
```

Ana remains `active + supervised`.

## GAPS

The first legitimate work exposed two integration gaps:

1. successful legacy/direct adapter execution did not terminalize the Paperclip issue, so native liveness recovery treated the issue as stranded;
2. `wandora_mastra@0.3.0` did not return Core's normalized runtime usage through `AdapterExecutionResult`, so Paperclip's historical runtime token counters remained zero.

Neither gap authorizes a new Wandora task engine, scheduler, retry engine, model router, usage ledger or pricing subsystem.

## CAPABILITY AUTHORITY / REUSE GATE

```text
owner work intent / tenant authorization / stable request receipt
  = Wandora

durable issue / assignment / wakeup / run / terminal task lifecycle
  = Paperclip

execution contract
  = Wandora Agent Runtime boundary

current execution implementation
  = Mastra

current inference implementation
  = Mistral

external-effect authorization
  = Wandora Human Send / Gateway outbound
```

Paperclip remains task-lifecycle authority. Wandora does not persist a second task-status state machine.

## DECISION

Qualify `wandora_mastra@0.4.0` with two narrow changes:

1. return normalized Agent Runtime token usage to Paperclip as `usageBasis=per_run`;
2. only for reviewed Wandora customer work, after Core has committed the exact supervised result, transition the exact executing Paperclip issue to `done` with the same run-scoped JWT and run id.

The self-call uses Paperclip's server-owned resolved listener (`PAPERCLIP_LISTEN_HOST` / `PAPERCLIP_LISTEN_PORT`). Wildcard binds are resolved to an internal loopback interface at runtime, so the mutation does not traverse the public URL, Traefik or an identity-only proxy. No development endpoint is hard-coded in the installable artifact.

An ambiguous issue-completion write requires exact issue readback before any repeat. A repeat is allowed only if readback proves the issue still non-terminal. That recovery never re-invokes Core/model execution.

No Organization Adapter permission is added. No Paperclip scheduler is disabled.

## SECOND ADVERSARIAL REVIEW

- **Duplicate work:** no replacement real MEDICSPRO work was created for diagnosis or proof.
- **Duplicate run:** disposable validation waits beyond the heartbeat scheduler interval and requires exactly one run and zero continuation runs.
- **Ambiguous completion:** readback occurs before any repeat Paperclip-local PATCH; provider inference is never replayed.
- **Provider retry/fallback:** unchanged at zero automatic retry and no fallback.
- **Secret exposure:** model secret untouched; run JWT remains header-only.
- **Outbound:** no messaging authority is introduced; both outbound gates remain OFF.
- **Heartbeat/routine:** no scheduler/routine is added; the fix prevents completed work from looking stranded.
- **Provider/model drift:** none; stable profile remains `wandora-supervised-v1`.
- **Usage inflation:** issue finalization creates no model usage; runtime usage is reported once as per-run usage.

## EXECUTION / REPOSITORY REMEDIATION

The legitimate production work already occurred through the owner-authenticated surface.

Repository remediation is isolated in PR #204 and bumps the adapter candidate from `0.3.0` to `0.4.0`. No production plugin/Core/Paperclip recreation, migration, secret mutation, outbound enablement or additional MEDICSPRO work is part of this repository remediation.

Disposable Paperclip proof against source commit `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca` proves:

```text
PAPERCLIP_WANDORA_CUSTOMER_WORK_SINGLE_RUN_COMPLETION_OK
customer_work_run_count          = 1
customer_work_continuation_count = 0
customer_work_usage              = 11|7|2
run_status                       = succeeded
```

The focused lifecycle proof uses a deterministic fake Core and performs no real model call.

## VALIDATION

Live historical truth remains:

```text
Wandora work operations = 1
Paperclip issue         = 1 / blocked
Paperclip runs          = 2 historical
Core model calls        = 1
Core model tokens       = 705
outbound attempts       = 0
Human Send              = OFF
Gateway outbound        = OFF
Ana                     = active + supervised
live adapter            = wandora_mastra@0.3.0
```

Paperclip's historical runtime token counters remain zero because live 0.3.0 did not propagate usage. Core's model-usage event is authoritative evidence for the historical 705 tokens.

Qualified future behavior for the 0.4.0 candidate is:

```text
one admitted customer work
-> one Paperclip issue
-> one Paperclip run
-> one Agent Runtime/model execution
-> result committed
-> exact Paperclip issue done
-> normalized per-run usage
-> zero continuation recovery
-> zero outbound
```

The first legitimate work must **not be repeated** to obtain a cleaner historical run count. The historical two-run evidence must remain visible.

## Next executable slice

**Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Preflight V1 — NO EFFECT**

It must start from the merged immutable 0.4.0 artifact, reconcile the one historical work / one model call / zero outbound state, qualify promotion and rollback without creating work or inference, and determine an explicit no-wake remediation for historical MED-1 if terminalization is appropriate.

A later separately reviewed execution may promote the adapter and repair historical issue state. It must not replay the MEDICSPRO work or model call.
