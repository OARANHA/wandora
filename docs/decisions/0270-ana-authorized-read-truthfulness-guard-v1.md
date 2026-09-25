# ADR 0270 — Ana Authorized Read Truthfulness Guard V1

Status: **IMPLEMENTED IN CODE / CORE ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

A normal owner work request asked:

```text
Qual o valor do Desenvolvimento Web?
```

Paperclip run `11302cc2-6d8b-4484-8271-6cbdcd3e61c4` succeeded and the issue reached `done`.

Tool Gateway evidence proves that Ana:
- opened a governed Tool Gateway session;
- discovered eight read-only VendaERP tools;
- executed five read-tool calls;
- received `allow` decisions for every call;
- received empty results for the attempted searches.

The final model response nevertheless said:

```text
Aguardar autorização para executar a busca no ERP
```

This statement contradicted the operational truth: authorization had already been granted and the reads had already executed.

## Authority

Paperclip remains the operational authority for tool authorization and execution.

Mastra remains the runtime/model provider.

Wandora Core owns the provider-neutral supervised employee contract and therefore must not expose a final customer result that contradicts proven authorization state supplied by the control plane.

No authorization logic is moved into Core.

## Decision

Strengthen the supervised runtime contract with two layers.

### Model instruction

The runtime now states explicitly:

- supplied read tools are already authorized;
- Ana must never say that she needs to wait for, request, or obtain authorization to use a read tool already supplied in the run;
- when an authorized read returns no matching record, Ana must say that the query executed and no matching record was found with the criteria used;
- an empty result must not cause a switch to an unrelated entity/domain tool unless the owner's request requires that entity.

### Deterministic fail-closed postcondition

The runtime counts actual read-tool executions.

If at least one authorized read tool executed and the final summary still claims that read authorization is pending/required, Core rejects that final model output instead of publishing a false successful result.

This is a truthfulness guard, not an authorization engine.

## Reuse Gate

No new:
- table;
- migration;
- state machine;
- service;
- provider;
- tool policy;
- retry loop;
- authorization mechanism.

The existing Paperclip Tool Gateway authorization signal and existing Mastra runtime are reused.

ADR 0168 remains preserved.

## Validation

Unit coverage adds:

1. a read tool executes and returns an empty result, then the model falsely says to await authorization -> runtime rejects the contradictory final output;
2. a read tool executes and returns an empty result, then the model truthfully states that no match was found -> runtime accepts the result;
3. the provider request contains the strengthened supervised instructions.

## Observed production evidence

The failing run attempted:
- product name `Desenvolvimento Web`;
- category `Serviço`;
- product name `web`;
- product name `desenvolvimento`;
- party display name `Desenvolvimento Web`.

All calls were authorized and completed, and the observed result summaries were empty arrays.

This ADR does **not** conclude that the requested product does not exist in VendaERP. It proves only that those specific searches returned no matching record.

## Effect boundary

```text
production Core promotion = 0
production Web change = 0
Paperclip mutation = 0
tool policy mutation = 0
provider/model call from this code slice = 0
customer work = 0
outbound = 0
migration = 0
```
