# Paperclip Customer-Work Terminal Disposition + Usage Core/Adapter Production Promotion V2

Status: **EXECUTED / COMPLETE — production promotion closed by ADR 0154**

Canonical authority:

- ADR 0150 — historical first-work truth/remediation;
- ADR 0151 — adapter 0.4.0 candidate, Task Drain and MED-1 repair;
- ADR 0152 — capability reuse / provider portability;
- ADR 0153 — companion Core correction and paired execution order;
- ADR 0154 — production execution result and final validation.

## Hard stop conditions

STOP before mutation if any of these differ from the accepted baseline without a separately reviewed reason:

- MED-1 is no longer blocked/quiescent;
- a new Paperclip live run/recovery exists;
- historical Paperclip runs are not exactly 2;
- historical Core model calls are not exactly 1;
- outbound attempts are not 0;
- Human Send or Gateway outbound is enabled;
- live adapter is not exactly one loaded 0.3.0;
- live Core is not the accepted rollback image/config;
- Core companion artifact cannot be verified;
- adapter 0.4.0 candidate/rollback hashes cannot be verified.

## Pre-effect evidence

Re-read:

```text
main / open PRs / relevant workflows
Paperclip health + adapter get + test-environment
MED-1 + live-runs + recovery-actions
Core inspect + healthz + readyz
Core model-usage log count
Wandora outbound attempts
Human Send / Gateway outbound
```

Never replay customer work to validate maintenance readiness.

## Paired promotion

### A. Task Drain

Start Paperclip's native Task Drain with a bounded maintenance TTL using the protected instance-admin/Board path.

Wait for:

```text
draining     = true
activeRuns   = 0
pendingWakes = 0
quiescent    = true
```

Task Drain is process-local and disappears when Paperclip restarts.

### B. Companion Core first

Verify/load the exact qualified Core artifact.

Preserve all active live overlays byte-for-byte.

Recreate only `wandora-core`.

Require:

```text
healthy
/healthz = 200
/readyz  = 200
runtime = mastra-supervised-model
Human Send = OFF
Gateway outbound = OFF
Paperclip still draining
adapter still 0.3.0
no new run/model/outbound
```

The live 0.3.0 adapter is compatible because it ignores additive Core response fields.

### C. Adapter 0.4.0

Stage the exact qualified 0.4.0 package under persistent content-addressed Paperclip storage.

Read current adapter through the official authenticated boundary.

Install/replace exactly once.

If response is ambiguous:

> read back before any repeat.

Require:

```text
version = 0.4.0
requiresRestart = true
```

Restart/recreate only Paperclip exactly once.

After restart:

```text
health = healthy
exactly one wandora_mastra
version = 0.4.0
loaded = true
test-environment = PASS
```

Remember: Paperclip restart cleared Task Drain.

Immediately prove:

```text
no new live run
historical runs = 2
Core model calls = 1
outbound = 0
Human Send = OFF
Gateway outbound = OFF
```

### D. MED-1 status-only repair

Only after both components are healthy:

```text
Board authority
MED-1 blocked -> done
status only
```

No comment, run ID, agent token, reassignment, resume or direct SQL.

Ambiguous mutation -> issue readback before repeat.

Final invariants:

```text
MED-1 = done
historical Paperclip runs = 2
historical Core model calls = 1
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

STOP.

## What this promotion proves

It proves that production is capable of prospective:

```text
one customer work
-> one Paperclip executing run
-> one Core model execution
-> one durable Wandora result
-> Paperclip issue done by the same run
-> normalized token usage returned to Paperclip
```

It does **not** create a new work item to demonstrate that path during maintenance.

The next legitimate work may attest token/cost-event propagation.

## Cost semantics after promotion

For positive normalized usage Paperclip will create a cost event.

Without authoritative monetary provider cost:

```text
costStatus = unpriced
costCents  = 0
```

Do not describe billed-cents budgets as enforcing Mistral spend until authoritative monetary cost attribution is separately qualified.

## Rollback

Follow ADR 0153's state-dependent rollback order.

Important drain rule:

- if abort occurs before Paperclip restart, explicitly end Task Drain after safe rollback;
- if Paperclip restarted, drain is already gone.

Never delete retained 0.3.0 package or old Core rollback image during the promotion.


## Execution closure — 2026-09-21 / ADR 0154

This runbook has been executed in production and reached its STOP boundary.

- companion Core promotion: complete / healthy / ready;
- `wandora_mastra@0.4.0`: exactly one / loaded / test-environment PASS;
- Paperclip recreated exactly once after adapter replacement;
- MED-1: `done` through one Board status-only mutation;
- historical Paperclip runs: exactly 2;
- historical run usage: unchanged/null (no backfill);
- historical model calls: exactly 1;
- outbound attempts: 0;
- Human Send: OFF;
- Gateway outbound: OFF;
- no replay, synthetic work, provider validation call, migration or external message.

The inherited Paperclip Ana `error` state from the historical continuation failure was observed and intentionally not mutated. See ADR 0154 for the next no-effect reconciliation slice.
