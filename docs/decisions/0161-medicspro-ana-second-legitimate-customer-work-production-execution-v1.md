# ADR 0161 — MEDICSPRO Ana Second Legitimate Customer Work Production Execution V1

Status: **ACCEPTED / EXECUTED / GREEN**
Date: 2026-09-22

## Context

ADR 0160 promoted Organization Adapter 0.3.1 so the normal customer-work path can admit a Paperclip managed agent in `idle | error` while leaving final invokability to Paperclip.

This slice proves the correction through a **real owner-originated second MEDICSPRO work**, without lifecycle normalization, synthetic work, privileged owner impersonation, direct SQL work creation, Human Send, Gateway outbound or any external message.

## REAL NOW before effect

Repository and production were reconciled before the owner submitted work:

- `main = 615621db7ce7d14a85db50e9f0a5bbf38d832afb`;
- open PRs = 0;
- push workflows on that main: Core, Web, Platform Admin and Messaging Gateway = GREEN;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy, restart count 0;
- Core = `wandora/core:organization-adapter-candidate-61cbb34d4bfd`, healthy, restart count 0;
- Organization Adapter = exactly one `0.3.1 / ready / healthy`;
- Wandora Ana = exactly one `active + supervised`;
- Paperclip Ana = historical `error / wandora_execution_failed_409`;
- MED-1 = `done`, live runs 0, historical runs 2, active recovery none;
- Wandora customer work count = exactly 1;
- outbound attempts = 0;
- Human Send = OFF;
- Gateway outbound = OFF;
- Core model-usage events since companion promotion = 0.

No lifecycle normalization was performed.

## Owner-originated work

The authenticated MEDICSPRO owner submitted through the normal Wandora Web customer-work surface:

Title: **Preparar abordagem comercial para apresentar o MedicsPro a uma clínica**

Description: **Crie uma abordagem comercial inicial para apresentar o MedicsPro a uma clínica médica que ainda não conhece a solução. Explique de forma clara os principais benefícios para a rotina da clínica, destaque como a solução pode ajudar na organização e no atendimento, e proponha uma mensagem inicial de contato profissional e objetiva. Não envie nenhuma mensagem e não realize nenhuma ação externa; entregue apenas o material preparado para minha revisão.**

The customer UI showed the completed work under `Trabalhos recentes` as `Pronto para sua revisão`.

## Proven execution

Exactly one new Wandora work was created:

```text
work id      = 6099d8a0-7b0b-4903-8d9e-738bf80e9a14
status       = result_recorded
provider run = 435e5c32-f373-4d2a-ba2a-270992539b14
execution id = exec_4ef662157ae9678582560edd27a9f547560d7b95b756c749a196c93cbcd41023
model        = wandora-supervised-v1
created      = 2026-09-22T04:36:26.49691Z
updated      = 2026-09-22T04:36:33.317317Z
```

Exactly one corresponding Paperclip issue was created:

```text
issue id = a34062fc-c1eb-4c1f-9bc2-7cf6d0f708cf
status   = done
created  = 2026-09-22T04:36:26.604Z
updated  = 2026-09-22T04:36:33.760Z
```

Exactly one run exists for that issue:

```text
invocation source = assignment
status            = succeeded
created           = 2026-09-22T04:36:26.686Z
finished          = 2026-09-22T04:36:33.618Z
```

No continuation run appeared. No live run remains. Recovery is empty.

## Usage / runtime

The normal path reached `wandora_mastra -> Core -> Agent Runtime/Mastra -> Mistral` exactly once.

Paperclip issue cost summary:

```text
runCount          = 1
inputTokens       = 273
outputTokens      = 740
cachedInputTokens = 0
costCents         = 0
runtimeMs         = 6832
```

Core emitted exactly one model-usage event for the work:

```text
providerId        = mistral
modelId           = mistral-small-2603
logicalModel      = wandora-supervised-v1
inputTokens       = 273
outputTokens      = 740
cachedInputTokens = 0
totalTokens       = 1013
```

This is prospective usage behavior introduced by the ADR 0154 companion Core + `wandora_mastra@0.4.0` pair. No historical usage was backfilled.

## Natural Paperclip lifecycle transition

Before the work, Paperclip Ana was the truthful historical projection `error / wandora_execution_failed_409`.

Organization Adapter 0.3.1 admitted that state without clearing it. Paperclip then performed the normal issue wake/run path.

After the successful legitimate run, Paperclip naturally finalized Ana as `idle` with `errorReason = null`.

This transition was caused by the successful run itself. No `clear-error`, resume, pause, generic status patch, managed-agent lifecycle normalization or direct SQL was used.

This validates ADR 0155/0156/0157's authority split: historical `error` was invokable, 0.3.1 removed only the Wandora false-negative, and Paperclip remained final lifecycle authority.

## Safety validation

Final production state:

```text
Wandora works            = exactly 2 total
Paperclip issues         = exactly 2 total
new issue runs           = exactly 1
new continuation runs    = 0
new active recovery      = none
new task sessions        = 0
new model calls          = exactly 1
outbound attempts        = 0
Human Send               = OFF
Gateway outbound         = OFF
Core                     = healthy / restart 0
Paperclip                = healthy / restart 0
Messaging Gateway        = healthy / restart 0
```

No customer-visible message, e-mail, WhatsApp or other external effect was sent.

## Second adversarial review

The final review tried to falsify the success criteria by checking for duplicate Wandora work, duplicate Paperclip issue, automation continuation, active recovery, task session residue, extra model call, lifecycle normalization and outbound drift.

None was found.

The only Paperclip lifecycle change was the provider-native successful-run finalization from historical `error` to `idle`.

## Decision

**MEDICSPRO Ana Second Legitimate Customer Work Production Execution V1 is GREEN.**

The corrected production path now proves:

```text
authenticated owner
-> Wandora customer-work contract
-> Organization Adapter 0.3.1 admits historical error
-> exactly one Paperclip issue
-> exactly one native assignment run
-> wandora_mastra 0.4.0
-> Core
-> Agent Runtime / Mastra
-> exactly one Mistral model call
-> supervised Wandora result
-> issue done
-> Ana naturally idle
-> no continuation / recovery / outbound
```

## Next axis

Do not start another production effect automatically.

The next recommended axis is **Customer Product Surface / Demo Readiness**, prioritizing replacement of visible product placeholders and rough presentation with real canonical state before expanding infrastructure.
