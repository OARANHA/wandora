# ADR 0148 — Model Provider / Mistral Production Runtime Activation Execution V1

Date: 2026-09-21  
Status: **Accepted — EXECUTED / GREEN; model-backed runtime live and dormant**

Builds on: ADR 0142, ADR 0143, ADR 0144, ADR 0145, ADR 0147

## Decision summary

The reviewed production activation was executed exactly to the ADR 0145 / ADR 0147 stop boundary.

Production now has:

~~~text
Paperclip
  wandora_mastra = 0.3.0

Core
  Agent Runtime = mastra-supervised-model
  logical profile = wandora-supervised-v1
  current implementation = Mistral / mistral-small-2603

External effects
  Human Send = OFF
  Gateway outbound = OFF
~~~

Activation itself created no MEDICSPRO work, no Paperclip run and no model invocation.

The first genuine model-backed customer work remains a separate effect slice.

## REAL NOW before mutation

Canonical repository immediately before execution:

~~~text
main = fd190a4dd8cd42647defaee33fecfb065b00b5e0
open PRs = 0

Core CI              = GREEN
Web CI               = GREEN
Messaging Gateway CI = GREEN
Platform Admin CI    = GREEN
~~~

The executable source tree had not changed since the candidate source SHA
`d5f98ed92a29b351b243c4873bf17a2d13cdfc78`.
The commits between that SHA and the activation main changed canonical documentation only.

Production baseline:

~~~text
Core image   = wandora/core:organization-adapter-candidate-ad93c055d6f8
Core image id= sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
Core health  = healthy / restart count 0
runtime      = mastra-deterministic
model env    = absent
model mount  = absent

Paperclip image = wandora/paperclip:v2026.916.0
Paperclip       = healthy / restart count 0
wandora_mastra  = 0.2.0

Human Send      = OFF
Gateway outbound= OFF
~~~

MEDICSPRO baseline:

~~~text
Wandora Ana             = exactly 1 / active + supervised
work operations         = 0
outbound attempts       = 0

Paperclip Ana           = idle / wandora_mastra
issues                  = 0
wakeups                 = 0
heartbeat runs          = 0
task sessions           = 0
routines / routine runs = 0 / 0
runtime session/run     = null / null
runtime usage/cost      = 0
~~~

## PROVEN EVIDENCE

### 1. Exact Paperclip adapter artifact

~~~text
workflow run          = 35578136446
artifact id           = 10629535625
artifact outer sha256 = 696b9182ba6207b622ac017a3292cc31d681f2d01e3c1d6e63631c147ca91799
package               = @wandora/paperclip-adapter-mastra
version               = 0.3.0
tgz sha256            = 78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798
Wandora source        = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
Paperclip image       = wandora/paperclip:v2026.916.0
Paperclip source      = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
bridge timeout        = 60000 ms
~~~

The artifact was downloaded immediately before activation and its GitHub artifact digest and internal tgz digest matched the frozen values exactly.

### 2. Exact Core artifact

~~~text
workflow run          = 35578136473
artifact id           = 10628609430
artifact outer sha256 = e4d8dd621fec16e1828ebee993f9b50aa38f231a392d1a433d206f8a9d3fee3b
source sha            = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
source tree           = 96969fb043225e3b633ba90b6f3e5f3a5cd60c3c
image tag             = wandora/core:organization-adapter-candidate-d5f98ed92a29
archive sha256        = c82f46093c3e371d128d7a2832e75840f15a1c9388e03bb73d9a5a16bfd6511d
image id              = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
image user            = node
~~~

The exact archive was loaded and Docker image metadata matched the candidate manifest.

### 3. Credential custody remained least-privilege

The existing platform model credential remained at the reviewed host-side secret path.

Only metadata was inspected:

~~~text
mode  = 0640
owner = wandora-admin
group = wandora-ops
~~~

The value was never printed or placed in Compose environment values.

The live Core uses supplemental group 987 and receives the credential only as the reviewed read-only mount:

~~~text
/run/secrets/wandora/model-provider.api-key
rw = false
~~~

## CAPABILITY AUTHORITY / REUSE GATE

No new model router, provider catalog, pricing engine, usage ledger, budget engine or secret manager was introduced.

The accepted authority split remains:

~~~text
Wandora
  -> logical runtime/AI profile
  -> customer policy/entitlement
  -> commercial semantics
  -> external-effect authorization

Paperclip
  -> organization / work / run authority
  -> operational budgets

Agent Runtime / Mastra
  -> current execution implementation
  -> provider invocation
  -> per-execution technical guardrails

Mistral
  -> current replaceable inference provider
~~~

ADR 0147 continues to govern provider-neutral risk/cost interpretation.

## DECISION + SECOND ADVERSARIAL REVIEW

The activation order remained adapter-first / Core-second because the provider deadline is 45 seconds and the reviewed Paperclip bridge timeout in adapter 0.3.0 is 60 seconds.

Before the first mutation, the exact pre-state and rollback assets were frozen.

Adversarial checks rejected:

1. promoting Core while Paperclip still used adapter 0.2.0;
2. reading or copying the provider secret value;
3. installing a second `wandora_mastra` registration;
4. re-running an adapter install after an ambiguous response without readback;
5. adding the Human Send overlay;
6. enabling Gateway outbound;
7. using readiness to call Mistral;
8. creating customer work as an activation smoke;
9. introducing provider-specific account controls into the stable Wandora runtime contract;
10. changing the database or applying a migration.

## EXECUTION

### 1. Rollback freeze

The execution retained:

- the exact pre-activation `adapter-plugins.json`;
- the exact `wandora_mastra@0.2.0` package;
- pre-activation Paperclip/Core inspect evidence;
- the exact live Compose/overlay set;
- SHA-256 evidence for the rollback files.

Rollback root:

~~~text
/home/wandora-admin/executions/model-provider-runtime-activation-execution-v1-20260921/rollback
~~~

The old adapter package remains at its persistent hash-addressed path.

The old deterministic Core image remains available.

### 2. Paperclip adapter promotion

The 0.3.0 package was staged under its persistent content-addressed path:

~~~text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798/
package/
~~~

The existing protected instance-admin CLI credential store was reused without exposing its token.

Pre-effect official readback proved exactly one live `wandora_mastra@0.2.0`.

The official local-path adapter install/replace was dispatched exactly once.

Observed response:

~~~text
type            = wandora_mastra
version         = 0.3.0
requiresRestart = true
~~~

Immediate readback and the adapter store independently proved exactly one 0.3.0 registration.

Paperclip was then recreated exactly once with the existing bridge wrapper/HMAC custody and the pinned v2026.916.0 image.

Post-restart:

~~~text
Paperclip health      = healthy
restart count         = 0
wandora_mastra        = 0.3.0
loaded                = true
disabled              = false
supportsLocalAgentJwt = true
adapter store count   = 1
~~~

Official `test-environment` was executed once after restart:

~~~text
status  = pass
code    = wandora-bridge-config
message = Private Wandora bridge configuration is valid.
~~~

No Ana execution or model call is part of that environment test.

### 3. Core model-backed runtime promotion

The canonical model overlay was copied byte-identically to:

~~~text
/opt/wandora/stacks/core/compose.agent-runtime-model.yaml
~~~

Overlay SHA-256:

~~~text
f5e1989a6e1d9560c70d06d202d078eecebce597421f949b45657ec6dd8e7f8c
~~~

The complete pre-effect Compose render proved:

~~~text
image                = wandora/core:organization-adapter-candidate-d5f98ed92a29
runtime              = mastra-supervised-model
provider             = mistral
model                = mistral-small-2603
model key            = read-only file mount
max output tokens    = 768
provider timeout     = 45000 ms
Human Send           = absent / OFF
Gateway outbound     = absent / OFF
organization adapter = enabled
Paperclip bridge     = enabled
customer work gate   = enabled from the already-live prior slice
~~~

Core was then recreated exactly once, with all already-live overlays preserved and the model overlay appended last.

No dependent service was intentionally recreated.

## VALIDATION

### Core

~~~text
image      = wandora/core:organization-adapter-candidate-d5f98ed92a29
image id   = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
health     = healthy
restarts   = 0
user       = node
/healthz   = 200
/readyz    = 200

runtime    = mastra-supervised-model
provider   = mistral
model      = mistral-small-2603
max output = 768
timeout    = 45000 ms

model secret mount = read-only
Human Send         = OFF
Gateway outbound   = OFF
~~~

No provider request is performed by readiness.

Activation log reconciliation showed:

~~~text
model usage events during activation = 0
recent Core runtime errors            = 0
~~~

### Paperclip

~~~text
image                = wandora/paperclip:v2026.916.0
health               = healthy
restarts             = 0
wandora_mastra       = 0.3.0
adapter store count  = 1
test-environment     = PASS
~~~

### MEDICSPRO final state

~~~text
Wandora Ana             = exactly 1 / active + supervised
work operations         = 0
outbound attempts       = 0

Paperclip Ana           = idle / wandora_mastra
issues                  = 0
wakeups                 = 0
heartbeat runs          = 0
task sessions           = 0
routines / routine runs = 0 / 0
runtime session/run     = null / null
runtime input tokens    = 0
runtime output tokens   = 0
runtime cached tokens   = 0
runtime cost cents      = 0
~~~

Therefore activation changed runtime capability only.

It did not create customer work, execute Ana, call Mistral, enable outbound or send a message.

## Execution-recovery notes

Several non-effect command failures were reconciled rather than blindly retried:

- ZIP inspection initially found no host `unzip`; artifact downloads and hashes had already completed, so Python was used for inspection and no package was installed.
- an initial Paperclip Compose recreation attempt failed during environment interpolation before Docker recreation;
- command-construction/quoting failures occurred before Docker recreation;
- the real Paperclip container ID was re-read after each failure and remained unchanged until the one successful recreation.

The adapter install itself was not repeated after its successful response/readback.

## Final verdict

~~~text
Model Provider / Mistral Production Runtime Activation Execution V1
= COMPLETE / GREEN
~~~

The model-backed runtime is now live but dormant.

## STOP / next slice

This ADR does not authorize customer work.

The next separately reviewed effect is:

**Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1**

It must start from fresh REAL NOW evidence and admit at most one legitimate owner-driven MEDICSPRO work request through the existing Wandora -> Paperclip -> Agent Runtime contract.

It must keep Human Send and Gateway outbound OFF and stop at the supervised internal/customer projection result.

No recurring, unattended or bulk model-backed workload is authorized by this checkpoint.
