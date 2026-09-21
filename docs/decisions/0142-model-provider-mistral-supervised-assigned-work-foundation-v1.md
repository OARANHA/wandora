# ADR 0142 — Model Provider / Mistral Supervised Assigned-Work Foundation V1

Status: **Accepted — implementation qualified / production dormant / NO REAL WORK**
Date: 2026-09-21
Canonical implementation base: `main@aa7608144e79d30d03abd762eac6386bfd1044b4`
Builds on: ADR 0014, ADR 0036, ADR 0126, ADR 0135, ADR 0137, ADR 0138, ADR 0141

## Decision summary

Wandora may now qualify a real model-provider path for the already-approved Paperclip-assigned supervised-work flow without widening the current WhatsApp/inbound path or any external-effect authority.

The accepted V1 boundary is:

```text
authenticated owner legitimate work
-> Wandora work admission
-> Organization Adapter
-> Paperclip issue / wakeup / run authority
-> wandora_mastra
-> private Core execution bridge
-> Agent Runtime / Mastra
-> approved model-provider boundary
-> bounded structured internal summary
-> Wandora customer-safe result projection
-> STOP before external effect
```

The concrete first provider is Mistral with `mistral-small-2603`, but customer-facing contracts expose only the logical Wandora model identifier `wandora-supervised-v1`.

This ADR does **not** provision a real credential, call Mistral, deploy the new runtime, replace the live Paperclip adapter or create MEDICSPRO work.

## REAL NOW

Fresh production reconciliation before documenting this decision proved:

```text
main = aa7608144e79d30d03abd762eac6386bfd1044b4
open repository PRs = 0

wandora-core
  image = wandora/core:organization-adapter-candidate-ad93c055d6f8
  healthy
  WANDORA_AGENT_RUNTIME_MODE = mastra-deterministic
  WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED = true
  WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent / OFF
  WANDORA_MODEL_PROVIDER = absent
  WANDORA_MODEL_ID = absent
  WANDORA_MODEL_API_KEY_FILE = absent

MEDICSPRO Wandora
  Ana = exactly 1 / active + supervised
  work journal rows = 0
  outbound attempts = 0

live Paperclip adapter registration
  wandora_mastra = 0.2.0

model-provider secret files under /opt/wandora
  = none found
```

Core, Web, Paperclip and Messaging Gateway were all healthy.

ADR 0141's final zero-work Paperclip run/session/token checkpoint remains historical evidence. This implementation slice does not rely on that historical counter state to authorize a production effect and performs no Paperclip work dispatch.

## PROVEN EVIDENCE

### 1. Mastra 1.66 OpenAI-compatible contract proof

A disposable Node 22 contract server was used with the currently pinned `@mastra/core@1.66.0`.

No real provider credential was used and the container had no external network requirement.

The proof established that Mastra `Agent.generate(...)` with the reviewed model config sends:

```text
POST /v1/chat/completions
Authorization: Bearer <synthetic-key>
model = mistral-small-2603
response_format.type = json_schema
max_tokens = reviewed maxOutputTokens
temperature = reviewed value
```

and returns normalized usage including input/output/total token counts.

An adversarial spike also proved that Mastra's V1 setting must be `maxOutputTokens`; an initial `maxTokens` assumption did not emit the required request limit and was rejected before implementation.

### 2. Provider timeout ordering

The new Core runtime bounds a provider request to 45 seconds.

The Paperclip `wandora_mastra` bridge is changed from the earlier fixed 10-second timeout to a reviewed 60-second timeout.

Therefore:

```text
Core model deadline = 45s
Paperclip -> Core bridge deadline = 60s

45s < 60s
```

Core must terminate first rather than leaving Paperclip to abandon a request while Core may still be waiting on the provider.

The bridge timeout itself is bounded to 10-120 seconds and validated by the adapter environment check.

### 3. Current Core test qualification

The exact worktree implementation passed the canonical disposable PostgreSQL Core verifier:

```text
base suite:
tests = 126
pass  = 126
fail  = 0

post-migration Organization Adapter / activation / work harness:
tests = 30
pass  = 30
fail  = 0

WANDORA_CORE_PRIVATE_RUNTIME_V1_OK
ANA_VERTICAL_SLICE_V1_VERIFY_OK
exit code = 0
```

New focused tests separately passed:

```text
8 / 8 GREEN
```

covering:

- file-backed provider credential config;
- provider/model/base-URL pinning;
- output-token and timeout bounds;
- deterministic inbound with zero model egress;
- one synthetic assigned-work model request;
- JSON-schema structured result;
- provider/private identifier exclusion;
- logical Wandora model result;
- abort before bridge deadline.

The Paperclip adapter contract passed under Node 24:

```text
1 / 1 GREEN
```

### 4. Reconciled harness false failure

The first manual invocation of the canonical Core verifier incorrectly forced `WANDORA_CI_CONTAINER_SECRET_GID=0`, a value intended for the isolated rootless CI runner rather than the operator's rootful Docker environment.

The code tests and image build were already green, but a later disposable runtime smoke could not read its synthetic secret.

The operation was not blindly repeated.

A standalone smoke proved the built image starts correctly, the incorrect GID premise was identified, and the canonical verifier was rerun without that override. The rerun completed fully GREEN with exit code 0.

No production container was changed by either verifier run.

## GAPS

The deterministic runtime from ADR 0014 is sufficient to prove execution plumbing but not to perform useful language-model reasoning for the first legitimate assigned work.

The gap is specifically **model inference for an already-authorized internal assigned task**.

The gap is not:

- a new organizational task engine;
- a new employee lifecycle;
- a new scheduler;
- new persistent Mastra memory;
- a generic prompt endpoint;
- direct browser-to-model access;
- autonomous outbound;
- model inference for every inbound WhatsApp event.

## CAPABILITY AUTHORITY / REUSE GATE

The capability split remains:

```text
Paperclip
  durable organizational issue / assignment / wakeup / run authority

Wandora
  customer identity / tenant authorization
  work admission / idempotency / policy
  provider-neutral Agent Runtime + Model Provider contract
  customer-safe result projection
  external-effect authorization

Mastra
  execution-local agent/workflow/model invocation

Mistral
  replaceable model inference provider
```

No new Wandora table, workflow engine, scheduler or control-plane state is created by this ADR.

The existing minimum work journal from ADR 0137 remains sufficient.

## DECISION

### 1. New Agent Runtime mode

Add:

```text
WANDORA_AGENT_RUNTIME_MODE=mastra-supervised-model
```

The existing `mastra-deterministic` mode remains valid and unchanged.

### 2. Approved V1 model configuration

V1 is fail-closed to:

```text
WANDORA_MODEL_PROVIDER=mistral
WANDORA_MODEL_ID=mistral-small-2603
WANDORA_MODEL_BASE_URL=https://api.mistral.ai/v1
WANDORA_MODEL_MAX_OUTPUT_TOKENS=768
WANDORA_MODEL_REQUEST_TIMEOUT_MS=45000
logical result model=wandora-supervised-v1
```

Other provider/model/base-URL values are rejected by V1 configuration rather than silently accepted.

This pin is an initial implementation allow-list, not a public customer contract. A future provider must preserve the Wandora logical boundary.

### 3. Credential custody

The real provider key must be read only from:

```text
WANDORA_MODEL_API_KEY_FILE=/run/secrets/wandora/model-provider.api-key
```

The reviewed host path for a later production execution is:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
```

Custody rules:

- key value never enters Git;
- key value never enters this ADR;
- key value never enters Compose environment values;
- key value is never logged;
- host file is operator-controlled and mode `0640` or stricter;
- group custody reuses the existing Core supplemental secret-group boundary;
- the previously Git-exposed Mistral credential is permanently forbidden from reuse.

This ADR does not create that file or place a credential into it.

### 4. Strict egress scope

The model-backed runtime deliberately uses two different paths.

For inbound messaging:

```text
proposeCommercialReply(...)
-> existing MastraDeterministicAgentRuntime
-> no external model-provider call
```

For reviewed Paperclip assigned work:

```text
executeAssignedTask(...)
-> Mastra Agent
-> approved model provider
```

Only bounded:

- task title;
- task description;

are serialized into the model user message.

The request must not include:

- Wandora organization ID;
- Wandora employee ID;
- phone/customer address;
- Paperclip agent/company/run IDs;
- Paperclip run token;
- provider binding IDs;
- raw MCP/provider runtime context.

### 5. Output boundary

The model must return schema-validated structured output:

```json
{
  "summary": "bounded internal supervised result"
}
```

The summary is bounded to 4,000 characters.

The customer result stores/exposes:

```text
model = wandora-supervised-v1
summary = <structured result>
```

The concrete provider/model identity remains operational telemetry only.

### 6. Retry/effect policy

Automatic model retries are disabled in V1.

A provider/runtime failure continues through the existing work execution uncertainty semantics. The bridge must not invent a second organizational task or bypass same-work reconciliation.

A successful model response still authorizes **no external send**.

Human Send and Gateway outbound remain separate switches and stay OFF unless separately activated.

### 7. Paperclip bridge timeout

`wandora_mastra` becomes package version `0.3.0` only because the request deadline is now an explicit reviewed runtime contract.

The package does not gain a new Paperclip capability and does not broaden the JSON body.

Required production value:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS=60000
```

Replacing the currently live 0.2.0 package remains a separately reviewed Paperclip production effect.

## SECOND ADVERSARIAL REVIEW

### Route inbound WhatsApp through Mistral immediately

Rejected.

That would silently expand customer-data egress beyond the first assigned-work purpose and would couple an already-proven inbound path to a new provider.

Inbound remains deterministic.

### Send full Core/Paperclip execution context to improve model quality

Rejected.

Provider IDs, run identity, tenant IDs and infrastructure context are not needed to answer the assigned work and would unnecessarily widen provider data exposure.

Only title/description cross the provider boundary.

### Return `mistral-small-2603` to the customer

Rejected.

Provider identity is replaceable infrastructure. The customer contract uses `wandora-supervised-v1`.

### Keep the old 10-second Paperclip bridge timeout

Rejected.

A real remote model call can legitimately outlive 10 seconds. Paperclip timing out first would produce an avoidable ambiguous execution boundary.

### Increase both timeouts without ordering

Rejected.

The provider deadline must remain shorter than the bridge deadline so Core terminates first.

### Let Mastra/provider retry automatically

Rejected for V1.

Retries inside the execution layer complicate usage/cost and ambiguous-failure reasoning. Any retry policy requires separate evidence.

### Add memory, observability package or eval system now

Rejected.

They are independent Mastra capabilities and are not required to close the model-inference gap.

### Install the real key or call Mistral before repository qualification

Rejected.

Credential custody and first provider call are separate operational effects. Repository qualification uses synthetic credentials and local contract servers first.

## EXECUTION PERFORMED BY THIS ADR

This implementation slice performed:

- canonical state reconciliation;
- clean worktree from `main@aa760814...`;
- Mastra 1.66 OpenAI-compatible synthetic contract spike;
- model-backed Agent Runtime implementation;
- fail-closed provider/model/key config;
- model Compose overlay;
- Paperclip adapter 0.3.0 timeout contract;
- unit/runtime tests;
- full disposable Core PostgreSQL verifier;
- adapter Node 24 contract test;
- CI gate hardening;
- documentation update.

It did **not**:

- write a real Mistral credential;
- call the Mistral API;
- recreate Core or Paperclip production containers;
- replace live `wandora_mastra@0.2.0`;
- change MEDICSPRO work state;
- create a Paperclip issue/wakeup/run;
- enable Human Send;
- enable Gateway outbound;
- send WhatsApp or e-mail.

## VALIDATION / PRODUCTION CHECKPOINT

Fresh production after implementation work remains:

```text
Core runtime       = mastra-deterministic
customer work gate = ON
model provider     = absent
model key file     = absent
Human Send         = OFF
Gateway outbound   = OFF

MEDICSPRO Ana       = exactly 1 / active + supervised
work journal        = 0
outbound attempts   = 0

live wandora_mastra = 0.2.0
```

Therefore this merge, when accepted, is a **dormant foundation only**.

## NEXT SLICE

After this implementation is merged and exact CI is GREEN:

**Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**

That slice must:

1. reconcile merged `main`, production runtime and live adapter version again;
2. provision the fresh credential only through the reviewed host secret-file path;
3. prove file ownership/mode without emitting its value;
4. make one deliberately synthetic, non-customer Mistral call outside the MEDICSPRO work path;
5. prove structured output, token usage, timeout behavior and zero Wandora/Paperclip/outbound state delta;
6. stop before switching live Core to `mastra-supervised-model`.

Production runtime activation and the first genuine MEDICSPRO model-backed work remain later separate effects.
