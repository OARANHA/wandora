# ADR 0284 — Paperclip Fast Read Terminal Result Read Boundary Preflight V1

Status: **PREFLIGHT COMPLETE / GO FOR NARROW PAPERCLIP HOST RUN-RESULT READ QUALIFICATION / NO PRODUCTION EFFECT**  
Date: 2026-09-26

## Objective

Close the remaining transport gap in Semantic Fast Read Runtime Wiring V1 without moving Paperclip-owned run/result authority into Wandora.

The required customer path is:

```text
authenticated customer Fast Read request
  -> Wandora semantic decision + deterministic gate
  -> short-lived signed FastReadIntent
  -> Organization Adapter employee-fast-read
  -> Paperclip managed employee run
  -> existing run-scoped Tool Gateway
  -> exactly one bounded read tool
  -> Paperclip terminal run result
  -> Organization Adapter bounded synchronous webhook response
  -> customer-safe Wandora result
```

This ADR is a preflight only. It does not authorize deployment, migration, provider/model calls, VendaERP calls, customer work, outbound effects or production Paperclip changes.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação.  
> Provider replacement não implica internalização.

## REAL NOW

Repository state at preflight:

```text
repo = OARANHA/wandora
PR   = #369
head = 55851366e0e9b31c51ae8bdd1c2519795cd8466d
state = open / draft / mergeable
```

All ten PR workflows on that exact head are GREEN:

- Paperclip OpenAPI Compatibility;
- Messaging Gateway CI;
- Platform Admin CI;
- Web CI;
- Organization Adapter Plugin CI;
- Semantic Fast Read CI;
- Core Candidate Artifact;
- Paperclip Mastra Adapter CI;
- Core CI;
- Paperclip Synchronous Webhook Response CI.

No production effect occurred.

## Proven evidence

### 1. Customer admission is now code-proven but intentionally unwired

PR #369 now contains:

- an authenticated customer Fast Read route;
- `HumanDigitalEmployeeFastReadService`;
- provider-neutral `SemanticDecisionProvider` injection;
- deterministic route gating;
- short-lived signed `FastReadIntent`;
- fail-closed capability/ambiguity/threshold behavior;
- zero-token deterministic result enforcement.

The service remains intentionally unwired from `runtime/main.ts` until both the Organization Adapter bridge and concrete semantic-decision provider boundary are qualified.

### 2. Fast Read execution in Core is already bounded

The current PR wires the existing `PaperclipFastReadExecutionService` behind explicit runtime configuration.

It independently verifies:

- Paperclip execution bridge HMAC;
- Paperclip run identity;
- organization/employee binding;
- Wandora-issued FastReadIntent;
- current run-authorized Tool Gateway read tools.

The concrete current runtime adapter exposes only the already-qualified bounded `business.products.search` path and executes one first-page read with zero generative model calls.

### 3. Organization Adapter can create the run but cannot currently obtain its terminal result through a supported plugin read surface

The current Organization Adapter Fast Read implementation calls:

`ctx.agents.invoke(...)`

and receives a `runId`.

That preserves Paperclip as run-lifecycle authority and is already proven by the disposable ADR 0277 attestation.

However, the currently documented plugin worker API exposes one-shot invocation and conversational sessions but no supported worker-side API to read one heartbeat run's terminal status/result/usage by run id.

Paperclip itself owns and stores those facts in the heartbeat run record, including terminal status, `resultJson` and `usageJson`.

Therefore the missing capability is operational read access to one exact run result inside the Paperclip host boundary, not new Wandora state.

### 4. Synchronous webhook response transport is no longer the blocker

PR #369 qualifies an optional bounded synchronous JSON response from a plugin webhook while preserving legacy void webhook acknowledgements.

Exact-head `Paperclip Synchronous Webhook Response CI` is GREEN.

That allows the Organization Adapter to return a bounded terminal Fast Read result once the plugin can obtain it through a legitimate Paperclip-owned read path.

### 5. Run lifecycle events are not accepted as the current solution

Current Paperclip documentation lists plugin events such as:

- `agent.run.started`;
- `agent.run.finished`;
- `agent.run.failed`;
- `agent.run.cancelled`.

But upstream issue #3789 documented versions where terminal run events were declared yet not emitted through the plugin event bus.

This preflight has not proven the exact v2026.916.1 event-emission path strongly enough to make synchronous customer result return depend on it.

Therefore the implementation must not assume terminal events are reliable merely because they appear in current documentation.

### 6. Core-side HTTP polling is rejected

Paperclip exposes heartbeat-run HTTP read surfaces for its own Board/operator product.

Giving Core a Board credential, minting an agent credential for Core, or polling those routes from Wandora would cross the accepted authority boundary and expand credential custody for a provider implementation detail.

Rejected:

- Core -> Paperclip Board API polling;
- direct Paperclip database reads;
- Organization Adapter direct database reads;
- copying `heartbeat_runs` into Wandora;
- a Wandora Fast Read lifecycle/result table;
- a new Wandora polling/retry engine;
- using Paperclip UI/session authority as a machine-to-machine product contract.

## Capability Authority / Reuse Gate

### Semantic authority — Wandora

Wandora continues to own:

- customer request meaning;
- `BusinessCapability`;
- semantic decision policy;
- deterministic-read admission;
- signed `FastReadIntent`;
- customer-safe response semantics.

### Durable product state

No new durable Wandora state is justified.

The Fast Read correlation remains short-lived request authority. Paperclip already owns the run record and result.

### Operational authority — Paperclip

Paperclip continues to own:

- managed employee invocation;
- run lifecycle and terminal status;
- run result/usage;
- Connections, grants, secrets, Tool Profiles and Tool Gateway;
- run/tool audit.

### Provider implementation

The missing read is a Paperclip provider capability. It belongs in the Paperclip host/plugin SDK boundary, not in Wandora Core.

### Replacement boundary

A future organization/control-plane provider may expose a different run-result read mechanism.

Wandora's customer Fast Read contract, business capability vocabulary and signed semantic intent must remain unchanged.

## Decision

**GO for a narrow Paperclip-owned run-result read qualification.**

The next implementation must add the smallest possible host/plugin SDK surface that lets an already-authorized Organization Adapter invocation read one exact run it created or owns operationally.

Candidate semantic shape:

```text
ctx.agents.runs.read({
  companyId,
  agentId,
  runId
})
  ->
{
  runId,
  status,
  result,
  usage
}
```

The exact API name is not authoritative and may change during source-level qualification.

Mandatory properties:

1. explicit read-only plugin capability;
2. host-issued invocation company scope enforcement;
3. exact requested agent must belong to that company;
4. exact run must belong to that company and agent;
5. no Board token or agent credential exposed to the plugin;
6. no provider credential, secret, log path or unrelated run metadata returned;
7. terminal result/usage is bounded and normalized;
8. queued/running state returns status only, not invented success;
9. no mutation, cancel, retry, wakeup or lifecycle operation is added;
10. no persistence/mirror is added to Wandora or plugin state for result authority.

A future bounded wait may be built by the Organization Adapter over this host-owned read only after exact source qualification proves acceptable timeout/failure semantics. It must not become an independent lifecycle engine.

## Why not add `invokeAndWait` immediately

A combined invoke-and-wait primitive would widen the host API before proving that a simple read boundary is insufficient.

The current `agents.invoke` boundary is already qualified and should be reused.

The missing primitive is observation of Paperclip-owned terminal state, so read is the narrower capability.

## Why not rely on plugin events now

Event-driven completion may later reduce polling latency, but it is not required to establish authority and it has not been proven reliable on the exact accepted Paperclip version in this slice.

The read contract must be correct independently of event delivery.

## Second adversarial review

First route review selected `deep_review`.

A second comparative review selected:

```text
preflight_then_host_run_read = 0.82
plugin_event_plus_run_read   = 0.06
plugin_poll_run_read         = 0.06
host_invoke_and_wait         = 0.05
core_poll_http               = 0.01
```

It also selected:

```text
rely on run-finished events now = no  (0.82)
add Wandora durable run state   = no  (0.83)
```

The advisory result matches the deterministic authority evidence.

## Next executable slice

**Paperclip Host Fast Read Run Result Read Qualification V1 — CODE ONLY / NO PRODUCTION EFFECT**

Required proof:

1. inspect exact `v2026.916.1@d554c4789ed3930f8a53ac9fdf6503b3187097da` source;
2. locate existing heartbeat-run service/read implementation and reuse it;
3. add one narrow capability-gated plugin SDK method;
4. prove company + agent + run isolation;
5. prove queued/running/terminal semantics;
6. prove only bounded result/usage fields cross the worker boundary;
7. prove no credential/secret/log-path/object-id leakage beyond the requested run id;
8. typecheck SDK/server;
9. run focused host-service tests against exact Paperclip source;
10. retain the provider delta as a digest-pinned patch, following ADR 0281 precedent.

Only after that host read is qualified may the Organization Adapter production-capability projection + Fast Read synchronous result bridge be wired.

Concrete JEV/Core->TypeSafe wiring remains a separate qualification under ADR 0276.

## Effect boundary

```text
production deploy = 0
Paperclip restart/upgrade = 0
Core/Web/Gateway promotion = 0
migration/table = 0
Board/agent credential in Core = 0
direct provider DB read = 0
Wandora run/result mirror = 0
provider/VendaERP call = 0
model/JEV production call = 0
customer work = 0
outbound = 0
```

ADR 0284 is **PREFLIGHT COMPLETE / GO FOR NARROW PAPERCLIP HOST RUN-RESULT READ QUALIFICATION / NO PRODUCTION EFFECT**.
