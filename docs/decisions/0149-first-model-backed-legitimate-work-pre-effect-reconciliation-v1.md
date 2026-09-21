# ADR 0149 — Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1 — Pre-Effect Reconciliation

Date: 2026-09-21  
Status: **Accepted — NO-GO for effect; legitimate owner work content not yet admitted**

Builds on: ADR 0136, ADR 0137, ADR 0138, ADR 0139, ADR 0141, ADR 0144, ADR 0147, ADR 0148

## Decision summary

The production system is technically ready to execute exactly one bounded model-backed MEDICSPRO work request, but this execution checkpoint MUST NOT manufacture the first customer work.

The accepted customer-work contract from ADR 0136/0141 requires the exact title and description to originate as a genuine business instruction from the authenticated MEDICSPRO owner through the Wandora customer surface.

No such owner-authenticated work request exists yet.

Therefore:

```text
FIRST MODEL-BACKED LEGITIMATE WORK EXECUTION V1
= NO-GO FOR EFFECT

technical readiness
= GREEN

legitimate customer work admission
= ABSENT

work / issue / run / model call
= 0 / 0 / 0 / 0
```

No synthetic task, operator-authored task, Paperclip-console task, direct wakeup or Mastra smoke execution is permitted to bypass this boundary.

## REAL NOW

Canonical repository before this checkpoint:

```text
main = 506800c45467c020a49aef340866dea806c8cfb5
open PRs = 0
latest accepted effect checkpoint = ADR 0148
```

Read-only production reconciliation proved:

```text
Paperclip = v2026.916.0 / healthy / restart 0
wandora_mastra = exactly 1 / 0.3.0 / loaded
Organization Adapter = 0.3.0 / ready
Core = healthy / restart 0 / healthz 200 / readyz 200
Core runtime = mastra-supervised-model
logical profile = wandora-supervised-v1
current provider/model = Mistral / mistral-small-2603
model credential mount = read-only

MEDICSPRO Ana / Wandora = exactly 1 / active + supervised
MEDICSPRO Ana / Paperclip = idle / wandora_mastra
provider bindings = 1
completed hires = 1

work operations = 0
outbound attempts = 0
Paperclip issues = 0
wakeups = 0
heartbeat runs = 0
task sessions = 0
routines / routine runs = 0 / 0
runtime session / last run = null / null
runtime input/output/cached tokens = 0 / 0 / 0
runtime cost = 0
last runtime error = null

Human Send = OFF
Gateway outbound = OFF
```

No model-usage event was observed during this reconciliation.

## PROVEN EVIDENCE

### Existing bounded model execution contract

Current Core implementation proves:

- `maxSteps = 1`;
- model `maxRetries = 0`;
- structured output is mandatory and validated as a bounded `summary`;
- maximum model output is 768 tokens in live configuration;
- provider deadline is 45 seconds;
- Paperclip bridge deadline is 60 seconds;
- one pinned provider/model is configured with no automatic provider fallback path;
- provider/model identity remains an implementation detail; the durable result identity is `wandora-supervised-v1`;
- the runtime instructions forbid external actions and require draft/analysis-only output when an instruction implies an external effect.

### Existing end-to-end work idempotency

The accepted ADR 0137/0138/0141 contract remains the authority.

Wandora owns the stable work reservation and exact request hash. Paperclip owns the durable issue/run. Organization Adapter `plugin.state` stores the provider-side dispatch receipt.

The current path prevents blind duplication:

1. browser preserves one UUID plus exact request fingerprint for an uncertain request;
2. Core reconciles same-key concurrent admission to one Wandora work operation;
3. Paperclip issue is reconciled by Wandora `originKind + originId`;
4. before wakeup the plugin stores `dispatching`;
5. a replay seeing unresolved `dispatching` fails closed;
6. a completed dispatch receipt returns without a second wakeup;
7. the Paperclip wake request uses the stable key `wandora-work:<workId>`;
8. Core binds one exact Paperclip run to the Wandora work;
9. a different run fails closed;
10. an exact already-recorded run returns the cached supervised result without a second Agent Runtime/model execution;
11. `execution_uncertain` is not auto-replayed.

## CAPABILITY AUTHORITY / REUSE GATE

No new scheduler, task engine, model router, pricing engine, usage table, retry engine or alternate execution path is justified.

```text
customer business intent / tenant authorization / stable request ID
  = Wandora

durable organizational issue / assignment / wakeup / run
  = Paperclip

execution
  = existing wandora_mastra -> Core -> Agent Runtime -> Mastra

current inference provider
  = Mistral, replaceable implementation

external-effect authorization
  = Wandora Human Send / Gateway outbound
```

The work journal remains minimum integration-safety state, not a parallel task engine.

## DECISION

The technical execution gate is ready, but the effect gate remains closed until the customer product has one genuine owner-authenticated business instruction.

The first real work must be admitted only through:

```text
authenticated MEDICSPRO owner
-> Wandora Web work panel
-> Wandora Core owner/admin authorization + idempotency
-> Organization Adapter employee-work
-> exactly one Paperclip issue + wakeup/run
-> wandora_mastra
-> Core execution bridge
-> Agent Runtime / Mastra
-> current provider
-> structured supervised result
-> Wandora customer projection
-> STOP
```

The operator/engineering channel must not invent the title or description and must not mint/extract an owner session merely to cross this gate.

## SECOND ADVERSARIAL REVIEW

### Duplicate Wandora work

Mitigated by the stable idempotency key, request fingerprint and database reconciliation. No new work key may be generated to recover an uncertain request.

### Duplicate Paperclip issue/run

Mitigated by `originKind/originId`, provider dispatch receipt and stable wake idempotency key. An unresolved `dispatching` receipt is fail-closed.

### Replay after `execution_uncertain`

Forbidden. Core binds exact run identity and rejects unresolved replay rather than issuing a second model execution.

### Provider retries/fallback

The model runtime uses `maxRetries=0`; the bridge performs one bounded fetch and contains no retry loop. No provider fallback path is authorized.

### Secret exposure

The model credential remains a read-only runtime mount. Its value was not read or emitted during this reconciliation.

### Accidental outbound

Human Send and Gateway outbound remain OFF. The model runtime itself is instructed to produce only internal supervised output and never claim an external effect.

### Spontaneous heartbeat/routine

No routine exists for MEDICSPRO Ana and heartbeat/wakeup counters remain zero. The customer-work path creates one issue/wakeup only after a real owner work request; it does not create a heartbeat or recurrence.

### Provider/model drift

No deployment or runtime configuration change is part of this checkpoint. Mistral/Mastra remain replaceable implementations under `wandora-supervised-v1`.

### Cost/usage outside the single authorized work

Pre-state usage/cost is zero. Because no legitimate work was admitted, this checkpoint creates zero model usage.

## EXECUTION

Only read-only Git/runtime/database reconciliation and canonical documentation were performed.

Explicitly NOT executed:

- no work POST;
- no Wandora work row;
- no Paperclip issue;
- no wakeup/run/session;
- no model call;
- no retry/replay;
- no migration;
- no adapter/plugin/Core/Paperclip recreation;
- no outbound;
- no secret mutation.

## VALIDATION

Final state remains equal to the zero-work baseline:

```text
Ana = active + supervised
Paperclip Ana = idle / wandora_mastra
work operations = 0
issues = 0
wakeups = 0
heartbeat runs = 0
task sessions = 0
routines / routine runs = 0 / 0
runtime run = null
runtime tokens / cost = 0 / 0
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

## Next executable effect

The next effect is still **Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1**, but it can begin only after the authenticated MEDICSPRO owner supplies the actual work title and description through the Wandora work surface.

After any ambiguous submission response, reconcile the existing work/issue/run before any retry. Never invent a replacement request.
