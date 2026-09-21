# ADR 0143 — Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1

Status: **Accepted — preflight GREEN / credential custodied / real provider proven / production runtime still dormant / NO REAL WORK**
Date: 2026-09-21
Canonical repository base: `main@82ea046ede32605f8d5511ef06bc47ecf060d2ea`
Builds on: ADR 0137, ADR 0138, ADR 0141, ADR 0142

## Decision summary

The production credential-custody and disposable real-provider attestation preflight is complete and GREEN.

A fresh intended Mistral credential is now held only at the reviewed host custody path:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
mode  = 0640
owner = wandora-admin
group = wandora-ops
```

The credential value was entered directly by the operator on the VPS. It was not placed in Git, Compose environment values, this ADR, chat-visible command arguments or customer payloads.

One deliberate disposable, synthetic, non-customer invocation through the exact qualified Core candidate reached Mistral and returned a valid schema-constrained supervised result:

```text
provider             = mistral
model                = mistral-small-2603
logical Wandora model= wandora-supervised-v1
input tokens         = 222
output tokens        = 44
total tokens         = 266
cached input tokens  = 0
attestation exit     = 0
```

The live Core was not changed. No MEDICSPRO work, Paperclip issue/wakeup/run/session, Human Send, Gateway outbound or customer message was created.

## REAL NOW

Repository and artifact provenance:

```text
main = 82ea046ede32605f8d5511ef06bc47ecf060d2ea
open PRs before checkpoint branch = 0

post-merge CI on main:
  Paperclip Mastra Adapter CI = GREEN
  Platform Admin CI           = GREEN
  Web CI                      = GREEN
  Core CI                     = GREEN
  Core Candidate Artifact     = GREEN
  Messaging Gateway CI        = GREEN

Core candidate artifact:
  workflow run = 35565861871
  artifact id  = 10623839103
  artifact zip sha256
    = 31acdb798864a26d16dbce8a67531d196a7621bfd1f3683c3574ee29ad21307d
  source sha
    = 82ea046ede32605f8d5511ef06bc47ecf060d2ea
  source tree
    = 1c00c85425ea65b5f7db703c9dc73562be3e0273
  image
    = wandora/core:organization-adapter-candidate-82ea046ede32
  image id
    = sha256:75f597d126433c1e962844dc60ddf869763a256e879d11f052160ed6f75799fe
```

Fresh post-attestation production state:

```text
wandora-core
  image        = wandora/core:organization-adapter-candidate-ad93c055d6f8
  health       = healthy
  restart      = 0
  Agent Runtime= mastra-deterministic
  work gate    = ON
  model provider env = absent
  model id env       = absent
  model key file env = absent
  Human Send         = OFF

wandora-web               = healthy / restart 0
wandora-paperclip         = v2026.916.0 / healthy / restart 0
wandora-messaging-gateway = healthy / restart 0
Gateway outbound          = OFF
supabase-auth             = healthy / restart 0
supabase-db               = healthy / restart 0

MEDICSPRO Wandora
  Ana              = exactly 1 / active + supervised
  work journal rows= 0
  outbound attempts= 0

MEDICSPRO Paperclip Ana
  status                  = idle
  adapter                 = wandora_mastra
  assigned issues         = 0
  wakeups                 = 0
  heartbeat runs          = 0
  task sessions           = 0
  routines                = 0
  routine runs            = 0
  runtime session         = null
  runtime last run        = null
  runtime input tokens    = 0
  runtime output tokens   = 0
  runtime cached tokens   = 0
  runtime cost cents      = 0
  spent monthly cents     = 0
  last heartbeat          = null
```

The host had no uninterruptible-I/O backlog after the earlier CI recovery:

```text
D-state processes = 0
```

## PROVEN EVIDENCE

### 1. Secure credential custody

The credential was written operator-side without exposing its value.

The resulting file metadata is:

```text
mode=640 owner=wandora-admin group=wandora-ops
```

The Core production container still has no model-provider environment or model-key mount, so custody does not equal runtime activation.

### 2. Exact candidate provenance

The GitHub artifact outer digest matched:

```text
sha256:31acdb798864a26d16dbce8a67531d196a7621bfd1f3683c3574ee29ad21307d
```

Its internal `SHA256SUMS` passed. The manifest pinned the exact merged main source and the image loaded with the expected OCI/image identity.

The disposable image contains the compiled `mastra-supervised-model` runtime and runs as non-root `node`.

### 3. Real provider attestation

The successful synthetic invocation used no customer or MEDICSPRO content.

Input was intentionally synthetic and asked only for an internal confirmation. The call returned the reviewed logical model:

```text
wandora-supervised-v1
```

Usage evidence:

```text
inputTokens       = 222
outputTokens      = 44
totalTokens       = 266
cachedInputTokens = 0
```

The returned structured summary explicitly stated that no external action was executed.

The captured success log contains no Authorization/API-key markers.

### 4. Reconciled earlier credential attempts

Before the successful attestation, an operator-entered credential attempt failed local validation before network use.

A later attempt used a credential that the operator subsequently identified as not the intended current key. That request reached Mistral but returned provider HTTP 429 with zero request quota for that credential/workspace. It is retained only as failure evidence and is **not** treated as provider qualification.

The operator then replaced the secret through the same reviewed file-custody path. Only the subsequent intended-key invocation is the successful attestation recorded by this ADR.

There was no automatic model retry. Each operator execution was a distinct reviewed attempt after reconciling the prior result.

### 5. Zero state delta

After the successful provider call:

- Wandora work journal remained zero;
- MEDICSPRO outbound attempts remained zero;
- Ana remained exactly one active + supervised employee;
- Paperclip remained idle with no issues, wakeups, heartbeats, task sessions, routines or runtime runs;
- Paperclip runtime token/cost counters remained zero because the provider attestation did not traverse Paperclip;
- Human Send and Gateway outbound remained OFF;
- the live Core remained `mastra-deterministic`.

Therefore the disposable real-provider proof did not mutate customer/control-plane work state.

## GAPS

The real provider boundary is now proven, but production execution is still deliberately dormant.

Remaining activation gaps are operational composition gaps, not inference-contract gaps:

1. live `wandora_mastra` is still the pre-model activation package and must be reconciled against the qualified `0.3.0` bridge-timeout contract;
2. Paperclip adapter replacement requires a separately reviewed restart;
3. the live Core does not mount the model-provider secret;
4. the live Core remains `mastra-deterministic`;
5. exact activation/rollback ordering for Paperclip adapter + Core model overlay has not yet been executed;
6. a live-runtime readiness proof must occur before any genuine customer work;
7. Human Send and Gateway outbound must remain independent and OFF.

## CAPABILITY AUTHORITY / REUSE GATE

No new domain state is justified.

The accepted boundary remains:

```text
Paperclip
  durable issue / assignment / wakeup / run authority

Wandora
  customer work admission, policy, idempotency,
  provider-neutral model boundary and result projection

Mastra
  execution-local agent/model invocation

Mistral
  replaceable model inference provider
```

The credential file is infrastructure custody, not customer-domain state.

## DECISION

Close **Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1** as GREEN.

Keep the intended credential in the reviewed host secret path, but do not mount it into the live Core yet.

Do not alter the live Core runtime, Paperclip adapter, Human Send or Gateway outbound in this slice.

## SECOND ADVERSARIAL REVIEW

### Treat the disposable success as authorization to switch production immediately

Rejected.

The provider contract is proven, but the live composition is not yet activated or rollback-qualified as one ordered change set.

### Skip the Paperclip adapter update because the provider call worked

Rejected.

The disposable call bypassed Paperclip by design. The reviewed production contract requires the longer 60-second Paperclip->Core bridge timeout so Core's 45-second provider deadline remains the inner deadline.

### Re-run a real provider call every time a chat changes

Rejected.

The successful intended-key attestation is durable evidence. A future re-attestation requires a concrete freshness reason such as credential rotation, provider/model drift or a later preflight requirement.

### Enable Human Send or Gateway outbound together with model activation

Rejected.

Those are independent external-effect capabilities. Model-backed internal work does not authorize customer messaging.

### Submit a synthetic MEDICSPRO task to test activation

Rejected.

The first customer work must remain a genuine authenticated owner instruction. Infrastructure qualification must not invent organizational work.

## EXECUTION

This slice performed:

- post-merge main/CI reconciliation;
- secure credential custody;
- exact Core candidate artifact download/hash/manifest verification;
- candidate image load without service recreation;
- one successful synthetic real-provider invocation with the intended credential;
- post-call Wandora/Paperclip/outbound reconciliation.

It did **not**:

- recreate live Core;
- replace the live Paperclip adapter;
- create MEDICSPRO work;
- create a Paperclip issue, wakeup or run;
- enable Human Send;
- enable Gateway outbound;
- send WhatsApp or e-mail.

## VALIDATION / CHECKPOINT

This preflight is **GREEN and closed**.

The successful provider call proves the model boundary. Production remains dormant.

## NEXT EXECUTABLE SLICE

**Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT**

That preflight must, from fresh REAL NOW evidence:

1. reconcile `main`, live Core, live Paperclip and the exact installed `wandora_mastra` package/version;
2. reconcile current secret metadata without emitting its value;
3. freeze the exact Paperclip `0.3.0` artifact/provenance and restart requirement;
4. freeze the exact Core candidate and `compose.agent-runtime-model.yaml` render;
5. prove the model-provider secret mount is read-only and not present in environment values;
6. freeze activation order and rollback order so the provider deadline remains 45s and bridge deadline 60s;
7. prove Human Send and Gateway outbound remain OFF;
8. stop before changing the live Paperclip adapter or live Core runtime.

A later separate execution slice may activate the qualified runtime. The first genuine MEDICSPRO model-backed work remains a further separate owner-driven effect and must stop at the supervised internal result.
