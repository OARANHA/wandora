# ADR 0156 — MEDICSPRO Ana Second Legitimate Customer Work Production Preflight V1

Status: **ACCEPTED / NO EFFECT / IMPLEMENTATION GAP FOUND BEFORE SECOND WORK**
Date: 2026-09-21

## Context

ADR 0155 correctly proved from pinned Paperclip v2026.916.0 source that agent status `error` is assignable and invokable. It also correctly rejected lifecycle mutation merely to normalize the historical `wandora_execution_failed_409` projection.

The second legitimate customer-work preflight found an additional Wandora-owned gate that ADR 0155 had not yet reconciled: Organization Adapter 0.3.0 rejects every managed agent whose status is not literally `idle` before it calls Paperclip `issues.requestWakeup`.

Therefore the provider is execution-ready, but the current Wandora bridge is not yet compatible with that provider lifecycle state.

This slice is strictly **NO EFFECT**. No second customer work is created, no issue/wakeup/run is created, no model is called, and Ana's lifecycle remains unchanged.

## REAL NOW

Repository:

- canonical main: `2c394c9d8e710a18674d47fdf8e739bcf260f9d8`;
- PR #211 merged by squash;
- open PRs at checkpoint: 0;
- ADR 0156 is the next canonical decision number.

Production remains:

- Paperclip `wandora/paperclip:v2026.916.0`, healthy;
- pinned source `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- exactly one `wandora_mastra@0.4.0`, loaded and enabled;
- Organization Adapter `0.3.0`, ready;
- Core `wandora/core:organization-adapter-candidate-61cbb34d4bfd`, healthy;
- exactly one MEDICSPRO Ana `active + supervised` in Wandora;
- Paperclip Ana = `error / wandora_execution_failed_409`;
- Ana org chain = healthy;
- heartbeat scheduler disabled / interval 0 / inactive;
- MED-1 = `done`;
- live runs = 0;
- historical runs = 2;
- active recovery = null;
- Wandora work operations = exactly 1 / `result_recorded`;
- outbound attempts = 0;
- Human Send = OFF;
- Gateway outbound = OFF.
## Proven implementation gap

Current canonical Organization Adapter source contains:

```ts
const managed = await ctx.agents.managed.get(CATALOG_KEY, input.companyId);
if (managed.status !== 'resolved' || !managed.agentId || !managed.agent) {
  throw new Error('managed_employee_missing');
}
if (managed.agent.status !== 'idle') {
  throw new Error(`managed_employee_not_idle:${managed.agent.status}`);
}
```

The exact installed production artifact contains the same `managed_employee_not_idle` check.

As a result:

```text
Paperclip Ana = error
Paperclip invokability = YES
Organization Adapter work admission = NO
```

So ADR 0155's provider-readiness conclusion remains valid, but a second legitimate customer work must not be admitted until this Wandora-owned compatibility gate is corrected.

## Paperclip authority proof

Pinned Paperclip `issues.requestWakeup` already enforces the authoritative execution gates before creating a run:

1. issue exists in the same company;
2. issue has an assignee;
3. issue status is wakeable;
4. unresolved blockers are rejected;
5. budget invocation block is checked;
6. `heartbeat.wakeup` loads the actual agent;
7. `getAgentInvokability(agent)` is authoritative;
8. non-invokable agents fail with conflict;
9. wake-on-demand policy is enforced;
10. only then can a run be queued.

Pinned agent invokability explicitly accepts `error`.

Ana's current runtime policy has `wakeOnDemand=true` by default because no disabling field is configured.

Therefore the Organization Adapter must not reinterpret `error` as non-executable.

## Why not remove the local gate entirely

The current Organization Adapter also uses the `idle` requirement as a conservative serialization boundary. Removing it wholesale would newly admit `running` and other Paperclip-invokable states and would broaden customer-work concurrency semantics.

That is not necessary to close the present gap.

The least-change compatibility correction is:

```text
allowed by Wandora pre-admission = idle | error
still rejected locally           = running and all other statuses
Paperclip authoritative recheck  = issues.requestWakeup -> heartbeat.wakeup
```

This changes only the false negative introduced by the historical error projection while preserving the existing no-concurrent-work posture.
## SECOND ADVERSARIAL REVIEW

### A. Clear Ana's error first

Would make the current plugin accept the agent, but mutates truthful Paperclip lifecycle history solely to satisfy a Wandora implementation bug.

**REJECT.**

### B. Resume Ana

Also converges to `idle`, but is broader than `clear-error` and still mutates provider lifecycle unnecessarily.

**REJECT.**

### C. Pause -> resume

Two mutations, no added safety, and pause can cancel active execution.

**REJECT.**

### D. Remove all status checks and defer fully to Paperclip

Architecturally clean for pure provider authority, but broadens current Wandora customer-work concurrency by newly admitting `running` and potentially other states.

**REJECT for this compatibility slice.**

### E. Accept exactly `idle | error`, then still call native requestWakeup

Preserves existing serialization behavior, removes only the false-negative historical-error incompatibility, and still relies on Paperclip for final invokability.

**ACCEPT.**

### F. Create a second Wandora lifecycle state or map Paperclip error into Wandora

Duplicates provider state and violates capability authority.

**REJECT.**

## Disposable proof

A disposable copy of the Organization Adapter was changed only in the laboratory to:

```ts
if (!['idle', 'error'].includes(managed.agent.status)) {
  throw new Error(`managed_employee_not_ready:${managed.agent.status}`);
}
```

A dedicated test was added proving historical `error` can proceed to issue creation + wake request, while the existing `running` rejection remains.

The test was compiled and executed inside the exact production Paperclip image with no network and no production data:

```text
tests = 5
pass  = 5
fail  = 0
```

No install or production mutation occurred.
## Decision

The second legitimate MEDICSPRO customer work is **NOT YET AUTHORIZED**.

Before admitting it, implement and qualify an Organization Adapter compatibility correction that:

- changes only customer-work managed-agent readiness from `idle` to `idle | error`;
- keeps `running` rejected;
- keeps all existing idempotency and dispatch-receipt behavior;
- keeps `issues.requestWakeup` as the final Paperclip-native admission;
- adds regression coverage for `error`;
- does not call `resume`, `clear-error`, pause, direct SQL or generic status PATCH;
- does not add a new plugin capability;
- does not enable outbound.

ADR 0155 is superseded only in one operational implication: provider `error` is execution-ready, but the current Organization Adapter 0.3.0 still blocks the normal customer-work path. Its lifecycle conclusions remain valid.

## Future implementation slice

Next safe slice:

**Organization Adapter Historical-Error Customer-Work Admission Compatibility Implementation V1 — NO PRODUCTION EFFECT**

Expected implementation delta:

```text
integrations/paperclip/plugins/organization-adapter-v1/src/work.ts
integrations/paperclip/plugins/organization-adapter-v1/test/work.test.mjs
version/package metadata only if canonical packaging requires it
documentation/checkpoint
```

It must produce a qualified candidate artifact but must not install it in production.

A later separately reviewed production-promotion slice may replace Organization Adapter 0.3.0 only after candidate CI/disposable validation is GREEN.

Only after that promotion and fresh readback may the second legitimate customer work execution preflight be considered closed.
## Ambiguity and retry rules

This slice creates no operation and therefore has nothing to retry.

Future implementation and promotion must preserve the existing work idempotency contract:

- a customer request reserves one Wandora work by idempotency key;
- provider admission uses the stable Wandora work UUID as Paperclip origin id;
- Paperclip wakeup uses `wandora-work:<workId>`;
- a stored `dispatched` receipt is read-only on replay;
- `dispatching` is fail-closed and must never blind-wake twice;
- Core `uncertain` requires retry with the original idempotency key.

No second legitimate work may be used as a compatibility experiment.

## Hard stops before second work

STOP if:

- Organization Adapter live is still 0.3.0 with the idle-only check;
- candidate does not prove `error` admitted and `running` rejected;
- Paperclip/adapter/Core identity drifts;
- Ana's org chain is unhealthy;
- a live run or active recovery appears;
- MED-1 is no longer done;
- work count is not exactly 1 before the second request;
- outbound attempts are nonzero unexpectedly;
- Human Send or Gateway outbound becomes enabled;
- any proposed workaround mutates Ana only to satisfy the plugin gate.

## VALIDATION / NO EFFECT

This preflight changed neither repository main nor production runtime.

No work, issue, wakeup, heartbeat, run, task session, Core execution, Mastra call, Mistral call, lifecycle mutation, migration or outbound effect occurred.

The only executable proof was disposable and networkless.

The next action is repository implementation of the narrow Organization Adapter compatibility fix, not customer-work execution.
