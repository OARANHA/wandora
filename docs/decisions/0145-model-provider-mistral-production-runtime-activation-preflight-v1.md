# ADR 0145 — Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT

Date: 2026-09-21
Status: **Accepted historical preflight — technical mechanics retained; cost-based NO-GO superseded by ADR 0147 / NO EFFECT**

Builds on: ADR 0142, ADR 0143, ADR 0144

## Decision summary

The production-runtime activation preflight for the already-qualified Mistral-backed Agent Runtime is complete without changing production.

The Core candidate, provider credential injection, Paperclip bridge timeout promotion, fail-closed model behavior, retry policy, Runtime-X portability boundary and rollback assets are all sufficiently qualified for a later activation execution.

The preflight is nevertheless **NO-GO for Model Provider / Mistral Production Runtime Activation Execution V1** because cost governance is not yet end-to-end for this execution path:

- MEDICSPRO/Ana currently has no active Paperclip budget policy;
- Paperclip budgets hard-stop against recorded billed-cents cost events;
- Core/Mastra inference currently returns normalized token usage but does not report a Paperclip cost event;
- Paperclip's cost-event API requires a caller-supplied `costCents`; it is not a pricing engine;
- Mastra's native cumulative `TokenCostControl` path is supported by the pinned core generation but its observability/storage prerequisites are not installed/configured in Wandora.

The correct response is **not** to create a Wandora cost engine, provider-pricing table, second budget ledger or second model router.

A separate no-effect native-cost-governance qualification slice must choose the smallest provider-native path before production activation.

## REAL NOW

Repository:

```text
main = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
PR #198 = merged
open PRs before this checkpoint branch = 0

push workflows on exact main:
  Core CI                    = GREEN
  Platform Admin CI          = GREEN
  Messaging Gateway CI       = GREEN
  Web CI                     = GREEN
  Core Candidate Artifact    = GREEN
  Paperclip Mastra Adapter CI= GREEN
```

Production:

```text
Core image   = wandora/core:organization-adapter-candidate-ad93c055d6f8
Core image id= sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
Core         = healthy
Agent Runtime= mastra-deterministic
model provider/model/base/key env = absent
model-provider secret mount       = absent
Human Send                         = OFF / absent

Paperclip    = wandora/paperclip:v2026.916.0 / healthy
live wandora_mastra = 0.2.0
Gateway outbound     = OFF / absent
```

Credential metadata only:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
mode  = 0640
owner = wandora-admin
group = wandora-ops
wandora-ops gid = 987
live Core supplemental group = 987
```

The credential value was not read or emitted.

MEDICSPRO:

```text
Wandora Ana          = exactly 1 / active + supervised
work journal         = 0
outbound attempts    = 0

Paperclip Ana        = idle / wandora_mastra
issues               = 0
wakeups              = 0
heartbeat runs       = 0
task sessions        = 0
routines             = 0
routine runs         = 0
runtime session      = null
runtime last run     = null
runtime input/output/cached tokens = 0 / 0 / 0
runtime cost cents   = 0
spent monthly cents  = 0
budget monthly cents = 0
active MEDICSPRO budget policies = 0
```

ADR 0143's real-provider attestation was not repeated.

## PROVEN EVIDENCE

### 1. Exact Core candidate

The exact current-main candidate is the output of Core Candidate Artifact run #115.

```text
artifact id          = 10628609430
artifact outer sha256= e4d8dd621fec16e1828ebee993f9b50aa38f231a392d1a433d206f8a9d3fee3b
source sha           = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
source tree          = 96969fb043225e3b633ba90b6f3e5f3a5cd60c3c
image tag            = wandora/core:organization-adapter-candidate-d5f98ed92a29
archive sha256       = c82f46093c3e371d128d7a2832e75840f15a1c9388e03bb73d9a5a16bfd6511d
oci config digest    = sha256:7fdb0b34b3c1db06eccd937c28c7091b94d8329ca594c0854bdb98e1fac4ce0c
oci manifest digest  = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
image user           = node
```

The workflow itself re-loads the image archive and re-verifies source revision, candidate contract, non-root user, portable digests and absence of baked sensitive/enable environment values.

### 2. Exact Paperclip adapter candidate

The exact current-main adapter candidate is the output of Paperclip Mastra Adapter CI #68.

```text
artifact id          = 10629535625
artifact outer sha256= 696b9182ba6207b622ac017a3292cc31d681f2d01e3c1d6e63631c147ca91799
package              = @wandora/paperclip-adapter-mastra
version              = 0.3.0
tgz sha256           = 78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798
Wandora source       = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
Paperclip image      = wandora/paperclip:v2026.916.0
Paperclip source     = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
bridge timeout       = 60000 ms
```

The live adapter remains 0.2.0 at:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
65cbc1ca02a0623c624414133cc618b8bf3f8d35e2b6a68dc53b2c763e81fc5d/package
```

Its current tree hash is:

```text
b144a1de6b532b2eac9f71f8eb312ce3fd082ff6dda4be06b56b9dbe0233f1e8
```

That package is retained as the adapter rollback asset.

### 3. Credential injection

The model overlay renders only:

```text
WANDORA_MODEL_API_KEY_FILE=/run/secrets/wandora/model-provider.api-key
```

with a read-only bind:

```text
host platform secret
  -> /run/secrets/wandora/model-provider.api-key
  -> read_only=true
```

No credential value enters Compose environment values.

The existing Core supplemental secret group already matches `wandora-ops`; no permission broadening is required.

### 4. Local readiness and fail-closed configuration

`loadRuntimeConfig()` rejects startup when:

- runtime mode is invalid;
- provider is not exactly the approved V1 provider;
- model is not exactly the approved V1 model;
- base URL differs from the approved endpoint;
- key path is relative, missing, non-regular or locally invalid;
- max-output or request-timeout bounds are invalid.

The server is created only after this configuration load succeeds.

The normal `/readyz` continues to prove database/tenant/control-plane boundaries. It deliberately does not call the external model provider.

A revoked/unavailable provider is therefore an execution-time fail-closed condition, not a Core liveness/readiness dependency.

### 5. Timeout, invalid structured output and provider unavailability

A disposable synthetic local provider probe against the exact source tree tested:

```text
provider HTTP 503        -> rejected / requests=1
invalid structured output-> rejected / requests=1
provider timeout         -> rejected / requests=1
automatic retry          -> 0
```

The first harness attempt failed during TypeScript transform before any HTTP request because it used the host Node 18/CJS path. Its state was reconciled, then the same synthetic probe was executed under canonical Node 22/ESM. No provider/customer effect was repeated.

The production Mistral provider was not called.

### 6. Technical per-execution bounds

The current model-backed runtime is bounded by:

```text
maxSteps              = 1
maxRetries            = 0
title max             = 12,000 characters
description max       = 12,000 characters
maxOutputTokens       = 768
provider deadline     = 45,000 ms
candidate bridge limit= 60,000 ms
```

Thus one admitted execution is technically bounded and Core terminates before the Paperclip bridge.

This is a per-execution safety guard, not a substitute for aggregate spend governance.

## CAPABILITY AUTHORITY / REUSE GATE

The authority split remains:

```text
Paperclip
  = organizational work/run state
  = company/agent/project operational budget control plane
  = cost-event ledger once real cost evidence is reported

Mastra / Agent Runtime
  = model execution
  = per-execution technical token/deadline/retry guardrails
  = candidate native cumulative token/cost controls when their prerequisites are qualified

Wandora
  = tenant/product policy
  = stable logical AI profile
  = commercial plan/price/margin/entitlement/billing semantics
  = external-effect authorization

Mistral
  = replaceable inference provider
```

Rejected as duplicated authority:

- Wandora provider registry;
- Wandora model router;
- Wandora provider-pricing table;
- Wandora token-accounting engine;
- Wandora cost engine;
- second operational budget ledger;
- second tenant secret manager.

### Cost-governance finding

Paperclip v2026.916.0 has native budget enforcement and cost events, but its cost-event contract requires a caller-provided integer `costCents`.

The current Core/Mastra boundary exposes normalized tokens, not authoritative provider cost.

Therefore posting token usage alone does not make Paperclip's billed-cents hard stop effective.

Mastra's native `TokenCostControl` remains the leading runtime-native cumulative guard, but Wandora has not yet installed/qualified the observability/storage prerequisites recorded in ADR 0144.

## GAPS

Exactly one activation-blocking gap remains:

> **A production-qualified native aggregate cost guard that observes this Core/Mastra inference path before the model-backed runtime is enabled for customer work.**

This gap must be solved without introducing a second Wandora budget/cost engine.

Candidate native paths to qualify in the next slice:

1. Mastra native cumulative token/cost guard with its official observability/storage prerequisites; and/or
2. a Paperclip-native cost-event reporting path if an authoritative provider/runtime cost source can supply `costCents` without Wandora becoming the pricing authority.

The next slice must select the minimum safe path by evidence rather than implement both by default.

## DECISION

### Technical activation mechanics

The future activation order, once cost governance is GREEN, is frozen as:

```text
1. reconcile main/runtime/zero-work/zero-outbound again
2. verify host secret metadata only
3. verify exact adapter 0.3.0 artifact/hash/provenance
4. install/promote adapter 0.3.0 and recreate/restart only Paperclip as required
5. prove Paperclip healthy, adapter test-environment GREEN, Ana still idle, zero runs
6. verify exact Core artifact/hash/provenance
7. compose current live Core overlays + model overlay with read-only secret mount
8. recreate/promote only Core
9. require Core healthy + readyz=200 + runtime mode=mastra-supervised-model
10. prove Human Send OFF and Gateway outbound OFF
11. STOP — do not create customer work in the runtime-activation slice
```

Core must not be promoted before adapter 0.3.0 because the live 0.2.0 bridge deadline is shorter than the reviewed 45-second provider deadline.

### Rollback order

If adapter promotion fails before Core promotion:

```text
restore adapter-plugins registration to retained 0.2.0 package
restart/recreate only Paperclip as required
verify Paperclip + Ana idle + zero runs
STOP
```

If Core model activation fails after adapter 0.3.0 is healthy:

```text
first restore Core to current deterministic image/config and remove model overlay
verify Core healthy/ready and model secret mount absent
then, only if exact pre-activation state is required,
restore retained adapter 0.2.0 registration and restart Paperclip
```

No database migration is part of this activation or rollback.

The host Mistral secret remains custodied even when unmounted.

### Activation verdict

```text
Model Provider / Mistral Production Runtime Activation Execution V1
= NO-GO
```

Reason: native aggregate cost governance for this inference path is not production-qualified.

All other reviewed activation gates are GREEN.

## SECOND ADVERSARIAL REVIEW

1. **Treat maxOutputTokens as complete cost governance?** Rejected. It bounds one response but not aggregate customer work.
2. **Turn on a Paperclip budget now?** Rejected. With no cost events from this inference path, its billed-cents hard stop would observe zero and give false confidence.
3. **Report costCents=0 with token usage?** Rejected. It would preserve token telemetry while defeating spend enforcement.
4. **Create a Wandora price table from Mistral public pricing?** Rejected. That makes Wandora a duplicate pricing/cost engine and creates freshness/accounting authority problems.
5. **Call Mistral in readiness?** Rejected. ADR 0143 already attested the credential. Runtime readiness must not create provider spend or make Core availability depend on a remote inference request.
6. **Promote Core before adapter 0.3.0?** Rejected. The current 0.2.0 bridge timeout can expire before the provider deadline.
7. **Use provider/model identity as durable product state?** Rejected. Customer/durable result identity remains `wandora-supervised-v1`.
8. **Retry transient 503 automatically?** Rejected for V1. Synthetic proof confirms one attempt only.
9. **Broaden secret permissions?** Rejected. Existing supplemental group already reads the 0640 platform secret.
10. **Enable outbound while model runtime is activated?** Rejected. Human Send and Gateway outbound remain separate Wandora-owned effects and stay OFF.

## EXECUTION PERFORMED

This preflight performed only read-only production inspection, repository/artifact inspection, Compose rendering with a synthetic host path, and disposable local-provider failure probes.

It did not:

- change live Core runtime mode;
- mount the Mistral key into live Core;
- read or emit the Mistral key value;
- call Mistral;
- replace the live Paperclip adapter;
- create MEDICSPRO work;
- create a Paperclip issue, wakeup, run or session;
- apply a production migration;
- enable Human Send;
- enable Gateway outbound;
- send any message.

## VALIDATION

Post-preflight production must remain:

```text
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF
Gateway outbound    = OFF

MEDICSPRO Ana / Wandora   = exactly 1 / active + supervised
MEDICSPRO work journal    = 0
MEDICSPRO outbound        = 0

MEDICSPRO Ana / Paperclip = idle / wandora_mastra
issues/wakeups/heartbeat runs/task sessions/routines/routine runs = 0
runtime run/session       = none
runtime tokens/cost       = 0
```

## Next slice

**Model Provider Runtime Native Cost Governance Qualification V1 — NO EFFECT**

That slice must:

1. start from the canonical state created by this ADR;
2. re-run the Capability Authority / Reuse Gate;
3. qualify the minimum Mastra/Paperclip-native aggregate spend guard for the Core/Mastra inference path;
4. avoid a Wandora pricing table, cost engine, second budget ledger or second model router;
5. use only synthetic/disposable evidence;
6. leave production Core deterministic, leave the provider secret unmounted and make no real provider call;
7. if GREEN, return to a separate **Model Provider / Mistral Production Runtime Activation Execution V1**.

## Upstream references reviewed

- Paperclip costs/budgets: https://docs.paperclip.ing/guides/day-to-day/costs/
- Paperclip cost-event API: https://docs.paperclip.ing/reference/api/costs/
- Mastra token limiting/cost-control overview: https://mastra.ai/blog/introducing-token-limiting
