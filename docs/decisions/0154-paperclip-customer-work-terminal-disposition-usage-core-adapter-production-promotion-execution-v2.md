# ADR 0154 — Paperclip Customer-Work Terminal Disposition + Usage Core/Adapter Production Promotion Execution V2

Date: 2026-09-21  
Status: **Accepted — production execution COMPLETE; no new customer work/model call/outbound effect**

Builds on: ADR 0150, ADR 0151, ADR 0152, ADR 0153

## Decision summary

The paired production promotion defined by ADR 0153 and the V2 runbook is complete.

Production now runs:

```text
Core
  image    = wandora/core:organization-adapter-candidate-61cbb34d4bfd
  image id = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
  revision = 61cbb34d4bfde0350cc765111dc778b22a2a168f
  runtime  = mastra-supervised-model
  healthz  = 200
  readyz   = 200

Paperclip
  image    = wandora/paperclip:v2026.916.0
  image id = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
  adapter  = exactly one wandora_mastra@0.4.0
  loaded   = true
  disabled = false
  test-environment = PASS

MED-1
  status              = done
  checkoutRunId       = null
  executionRunId      = null
  scheduledRetry      = null
  activeRecoveryAction= null
  live runs           = []
  historical runs     = exactly 2
```

No customer work was replayed. No historical usage was backfilled. No additional provider/model inference occurred. Human Send and Gateway outbound remained OFF and MEDICSPRO outbound attempts remained zero.

## REAL NOW / continuity recovery

Execution started from:

```text
main = 7dbf7d671989c7dd5d41da86ebcb370286c89100
PR #207 = merged
push workflows:
  Web CI #581               = GREEN
  Platform Admin CI #506    = GREEN
  Messaging Gateway CI #613 = GREEN
  Core CI #649              = GREEN
```

A chat/tool-response stall occurred during the operational slice. The continuity rule from ADR 0034 was applied before any repeat:

> verify whether the operation actually executed before issuing it again.

Remote execution history proved that the promotion had continued during the stalled response. Therefore no already-executed mutation was repeated.

The stale draft PR #206 was later closed as superseded by merged PR #207. A separate draft PR #208 for the repository-only OpenAPI compatibility gate is not part of this production execution and is not production authority.

## PROVEN PRE-EFFECT EVIDENCE

Immediately before mutation:

```text
Wandora work operations    = 1
Paperclip MED-1            = blocked / quiescent
Paperclip historical runs  = 2
Core historical model calls= 1
MEDICSPRO outbound attempts= 0
Human Send                 = OFF
Gateway outbound           = OFF

live Core image =
wandora/core:organization-adapter-candidate-d5f98ed92a29
sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14

live adapter =
exactly one wandora_mastra@0.3.0
loaded=true
test-environment=PASS
```

The exact 0.4.0 candidate and 0.3.0 rollback hashes from ADR 0151 were reverified before effect.

## EXECUTION

### 1. Companion Core artifact provenance

The exact qualified CI artifact from ADR 0153 was retrieved and verified before loading:

```text
workflow run      = 35603026602
artifact id       = 10640665492
artifact source   = 61cbb34d4bfde0350cc765111dc778b22a2a168f
image tag         = wandora/core:organization-adapter-candidate-61cbb34d4bfd
archive sha256    = f278d4466a849a55379297b043dd62eb037eb1659d50513179c35a3d012087a5
OCI manifest      = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
image user        = node
candidate contract= organization-adapter-core-v1
```

The candidate archive checksum passed and the image was loaded with `docker load`. No Core image was built on the VPS.

### 2. Paperclip Task Drain

Paperclip native Task Drain was started with a bounded 15-minute TTL.

Readback before Core mutation:

```json
{"draining":true,"activeRuns":0,"pendingWakes":0,"quiescent":true}
```

### 3. Companion Core promotion

Only `wandora-core` was recreated with the qualified companion image.

All previously frozen compose inputs/overlays were preserved with the ADR 0153 SHA-256 values.

Post-promotion:

```text
Core healthy = true
restarts     = 0
healthz      = 200
readyz       = 200
runtime      = mastra-supervised-model
new model-usage events in new Core container = 0
Paperclip Task Drain still active/quiescent  = true
```

### 4. Adapter 0.4.0 stage and replacement

The frozen candidate:

```text
wandora-paperclip-adapter-mastra-0.4.0.tgz
sha256 = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c
```

was staged under persistent content-addressed Paperclip storage:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
```

Exactly one authenticated adapter install/replace was dispatched.

The unambiguous response returned:

```text
type            = wandora_mastra
version         = 0.4.0
requiresRestart = true
```

No retry was issued.

### 5. Paperclip restart

Only Paperclip was recreated once.

The restart cleared Task Drain as designed.

Post-restart:

```text
Paperclip health             = healthy
Paperclip restarts           = 0
wandora_mastra registrations = exactly 1
version                      = 0.4.0
loaded                       = true
disabled                     = false
test-environment             = PASS
live MED-1 runs              = []
historical MED-1 runs        = 2
new Core model calls         = 0
outbound                     = 0
```

### 6. MED-1 status-only historical repair

After both components were healthy, the historical issue was updated exactly once through the Board-authenticated official CLI:

```text
MED-1
blocked -> done
```

The command carried only `--status done` plus the private API base and JSON output.

It did not include:

- comment;
- run id;
- agent API key;
- reassignment;
- resume/reopen;
- direct SQL.

The response was unambiguous and showed only the expected terminal status/completion changes. No repeat was issued.

## VALIDATION

Final production state:

```text
Wandora Ana                = active + supervised
Wandora work operations    = 1
MEDICSPRO outbound attempts= 0

Paperclip                  = v2026.916.0 / healthy
wandora_mastra             = exactly one 0.4.0 / loaded / PASS
MED-1                      = done
MED-1 historical runs      = exactly 2
MED-1 live runs            = []
MED-1 active recovery      = none

historical Core model calls before promotion = exactly 1
new Core model calls after promotion         = 0
effective historical model calls             = exactly 1

Human Send                 = OFF
Gateway outbound           = OFF
```

Historical Paperclip run usage remains null for the two already-existing runs. This is intentional: no historical usage backfill was authorized.

A later legitimate work event may naturally prove prospective 0.4.0 + companion-Core token/cost-event ingestion. Do not create work merely as telemetry smoke.

Protected host-side execution evidence is retained under:

```text
/home/wandora-admin/executions/
paperclip-customer-work-terminal-usage-promotion-v2-20260921T2255Z/
```

## CAPABILITY AUTHORITY / REUSE GATE

No capability authority changed.

```text
Paperclip
  = issue/run lifecycle
  = runtime usage/cost-event ledger
  = billed-cents operational budget policy

Wandora Agent Runtime
  = normalized model usage production
  = logical execution profile
  = model-execution safety policy

Wandora
  = customer work/result semantic contract
  = customer commercial/billing semantics
  = final external-effect authorization
```

No new task engine, retry engine, usage table, pricing engine, model router, scheduler, migration or outbound authority was created.

## SECOND ADVERSARIAL REVIEW

### Retry after stalled response

Rejected.

Tool history proved Task Drain, Core promotion, adapter install, Paperclip restart and MED-1 repair had already occurred. Repeating any of them would have violated the ambiguity/readback rule.

### Roll back because the current Core log contains zero model events

Rejected.

The old Core was observed with exactly one historical model-usage event before recreate. The new Core has zero new model events after promotion. Container-log reset on recreate is not evidence that historical model work disappeared.

### Backfill the historical 705 tokens into Paperclip

Rejected.

ADR 0150/0151 explicitly preserve historical truth. Prospective telemetry begins with future legitimate work.

### Clear Paperclip Ana's historical error state inside this slice

Rejected as scope expansion.

Final readback shows:

```text
Paperclip Ana status = error
errorReason           = wandora_execution_failed_409
updatedAt             = 2026-09-21T11:49:40.115Z
```

That timestamp/error predates the production promotion by many hours and is the already-known failed continuation from ADR 0150. It was not caused by Core/adapter promotion or MED-1 terminalization.

This slice was authorized only for Core/adapter promotion and MED-1 status-only repair. It therefore does not perform `resume`, clear-error, wake, reassignment or another state transition to hide that historical evidence.

## GAP / next slice

The paired lifecycle+usage production promotion is complete.

Before another legitimate MEDICSPRO work event, separately qualify the correct Paperclip-native reconciliation for Ana's historical control-plane `error` state.

Next recommended slice:

**Paperclip Historical Agent Error-State Reconciliation Preflight V1 — NO EFFECT**

It must determine the narrow official Paperclip operation that can reconcile the historical `wandora_execution_failed_409` error without creating work, wakeup, run, model inference or outbound effect, and without erasing the two-run historical evidence.
