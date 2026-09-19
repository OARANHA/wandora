# ADR 0115 — Customer Owner First Real Tenant Digital-Employee Hire Execution V1

- Status: **Accepted execution — MEDICSPRO hired exactly one Ana through the normal owner browser flow; Ana remains paused + supervised and no outbound/activation effect occurred**
- Date: 2026-09-19
- Scope: execute and independently reconcile the first real customer-owned MEDICSPRO `ana-commercial-v1` hire under ADR 0114 without activating/resuming the employee or enabling Human Send/Gateway outbound.

## REAL NOW

Canonical Git immediately before the customer effect:

```text
main = 25dcfcd930f70452d008ffa3930f113370b34db2
open PRs = 0
ADR 0114 = accepted / GREEN
```

Pre-dispatch production reconciliation immediately before the customer click:

```text
MEDICSPRO active owner                 = 1
MEDICSPRO employees                    = 0
MEDICSPRO employee-provider bindings   = 0
MEDICSPRO hire operations              = 0
MEDICSPRO eligibility                  = 1 enabled
global unfinished hire operations      = 0
MEDICSPRO Paperclip agents             = 0

Organization Adapter                   = ON
Customer Digital-Employee Hire         = ON
Human Send                             = OFF / flag absent
Gateway outbound                       = OFF / flag absent
```

Core, Web, Paperclip, Messaging Gateway, Auth and PostgreSQL were healthy.

The live Core read projection immediately before dispatch returned:

```json
{"itemCount":0,"hire":{"catalogKey":"ana-commercial-v1","available":true,"state":"available"}}
```

## PROVEN EVIDENCE

### Normal owner browser effect

The real MEDICSPRO owner used the normal customer Web flow and clicked `Contratar Ana` once.

The Web returned to `Equipe` and displayed:

```text
Ana
Assistente Comercial Digital
Contratada · aguardando ativação
Autonomia: Supervisionada
```

No privileged token was extracted, no admin/service-role session was fabricated and no direct Organization Adapter/Paperclip mutation was used as a substitute for the customer path.

### Wandora durable result

Independent PostgreSQL reconciliation after the browser effect proved exactly one employee:

```text
employee id   = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
display name  = Ana
role          = commercial-assistant
status        = paused
autonomy      = supervised
```

Exactly one employee-provider binding exists for MEDICSPRO:

```text
provider            = paperclip
provider agent ref  = managed:v1:fc48d5f57c40be499f5fe1d3aaf2a651ee41cad5963b7582d6ae8dcffa89d1a8
```

Exactly one `ana-commercial-v1` hire operation exists and it is complete:

```text
idempotency key = 83cc5ea9-bd14-4fec-89d5-a10e451cd13d
request hash    = 48df83c12721bfb988212fc8618d639f947cb39797885e3f74c80a4425bbdcdd
status          = completed
created_at      = 2026-09-19 07:02:07.133533+00
completed_at    = 2026-09-19 07:02:07.282+00
```

The provider company ref remains the frozen MEDICSPRO Paperclip company:

```text
a63f27a8-dbac-4552-a456-b3a21302226b
```

Global unfinished hire operations remain zero.

The tenant eligibility policy remains enabled. A completed hire, not disabling the policy row, is what now closes availability through the canonical read contract.

### Paperclip result

The exact MEDICSPRO company contains exactly one managed Ana:

```text
agent id        = da6cfc6b-e16f-483a-95f1-bacee8e54365
name            = Ana
role            = commercial-assistant
title           = Assistente Comercial Digital
status          = paused
adapterType     = wandora_mastra
budget          = 0
lastHeartbeatAt = null
org chain       = healthy
```

Provider pause reason:

```text
Provisioned paused by plugin wandora.organization-adapter-v1; requires explicit activation.
```

No resume/activation occurred.

### Customer read projection after hire

A fresh no-effect call through the live Core read service after reconciliation returned:

```json
{
  "items": [{"id":"b7eb53d4-498a-4277-b11f-17ddc42b3fe3","name":"Ana","role":"commercial-assistant","status":"paused","autonomy":"supervised"}],
  "hire":{"catalogKey":"ana-commercial-v1","available":false,"state":"already-hired"}
}
```

### No external-send side effect

Post-hire MEDICSPRO counts:

```text
outbound_attempts = 0
outbound_messages = 0
total_messages    = 0
```

Runtime flags remained:

```text
Human Send       = OFF / flag absent
Gateway outbound = OFF / flag absent
```

## GAPS

There is no remaining gap in the first real customer **hire** effect.

There is deliberately still no approved customer activation/resume effect for this employee.

ADR 0063 requires activation to remain separate and to prove, before becoming available:

- a production Paperclip -> Wandora/Mastra execution bridge;
- exact mapped company/employee compatibility;
- least-privilege Organization Adapter `agents.resume` capability;
- provider-side resume confirmation before Wandora projects `active`;
- safe replay/failure semantics;
- required tool/integration readiness;
- no implicit Human Send or Gateway outbound enablement.

## CAPABILITY AUTHORITY / REUSE GATE

The execution reused the accepted boundary:

```text
Wandora customer hire contract/policy
  -> Wandora Core authorization + idempotency/reconciliation
  -> Organization Adapter
  -> Paperclip managed-agent capability
```

No new employee lifecycle, scheduler, state machine or provider-specific customer contract was created.

**Reuse Gate result: PASS.**

## DECISION

Accept the first real MEDICSPRO customer hire as successful.

Canonical postcondition:

```text
MEDICSPRO Ana             = exactly 1
Wandora status            = paused
Wandora autonomy          = supervised
employee-provider binding = exactly 1
hire operation            = exactly 1 / completed
Paperclip managed Ana     = exactly 1 / paused
Paperclip adapter         = wandora_mastra
hire availability         = already-hired

Human Send                = OFF
Gateway outbound          = OFF
activation/resume         = NOT performed
```

The original idempotency key is retained in the durable hire journal. Because this execution returned a normal successful customer result and reconciliation is exact, no retry is needed.

## SECOND ADVERSARIAL REVIEW

Rejected after the effect:

- treating the successful hire as implicit permission to activate/resume Ana;
- assuming the UI card alone proves provider state;
- accepting one Wandora employee without independently checking the Paperclip managed agent;
- creating a second hire because eligibility remains enabled;
- disabling eligibility merely to simulate deduplication;
- issuing a replay under a new idempotency key;
- enabling Human Send or Gateway outbound to make Ana appear operational;
- inferring runtime execution from `adapterType=wandora_mastra`;
- treating `paused` as failure instead of the intended safe first-hire state.

The provider and Wandora states agree exactly and no ambiguity remains.

## EXECUTION

The only customer/provider mutation in this slice was the single normal-owner `Contratar Ana` operation.

No operator-side activation, provider resume, outbound enablement, message send, model execution, HMAC rotation, eligibility mutation, deployment or migration was performed.

## VALIDATION

Final production state:

```text
MEDICSPRO employees                  = 1
MEDICSPRO employee-provider bindings = 1
MEDICSPRO hire operations            = 1 completed
global unfinished hires              = 0
MEDICSPRO eligibility                = 1 enabled
MEDICSPRO Paperclip agents           = 1 paused
outbound attempts                    = 0
outbound messages                    = 0

Organization Adapter                 = ON
Customer Digital-Employee Hire       = ON
Human Send                           = OFF
Gateway outbound                     = OFF
```

Core, Web, Paperclip, Messaging Gateway, Auth and PostgreSQL remain healthy.

## DECISION RESULT

**Customer Owner First Real Tenant Digital-Employee Hire Execution V1 is GREEN and COMPLETE.**

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Preflight V1.**

This next slice is no-effect. It must inspect and freeze the exact activation/resume boundary required by ADR 0063, including production execution-bridge readiness, least-privilege Paperclip resume capability, Wandora/provider state transition ordering, idempotency/ambiguity recovery and tool/integration prerequisites. It must not activate/resume Ana, enable Human Send or enable Gateway outbound.
