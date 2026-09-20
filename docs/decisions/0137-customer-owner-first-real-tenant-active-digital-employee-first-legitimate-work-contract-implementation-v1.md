# ADR 0137 — Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1

- Status: Implementation locally qualified — PR CI pending / no production effect
- Date: 2026-09-20
- Builds on: ADR 0036, ADR 0037, ADR 0126, ADR 0135, ADR 0136
- Scope: customer-safe admission of one-off supervised internal work for an already-active managed digital employee
- Production authorization: none

## Context

ADR 0136 proved that the first legitimate MEDICSPRO work must not be manufactured by an operator, timer, direct invoke or synthetic inbound event.

The accepted authority boundary is:

```text
authenticated customer owner/admin
-> Wandora work admission / policy / idempotency
-> Organization Adapter
-> Paperclip durable issue + assignment/run
-> wandora_mastra
-> Wandora Core execution bridge
-> Agent Runtime
-> Mastra
-> supervised internal result
-> Wandora customer projection
-> STOP before external effect
```

At implementation start production remained:

```text
Wandora Ana       = active + supervised
Paperclip Ana     = idle / wandora_mastra
assigned issues   = 0
wakeups/runs      = 0 / 0
routine runs      = 0
task sessions     = 0
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
```

This implementation slice is **NO REAL WORK**. It must not apply migration 016, promote artifacts, install a plugin/adapter, enable the new runtime gate, wake MEDICSPRO Ana or produce an external effect.

## Capability Authority / Reuse Gate

Paperclip v2026.916.0 source inspection proved:

- durable organizational work remains Paperclip Issue authority;
- plugin `issues.create` persists the issue but does not itself dispatch execution;
- `issues.wakeup` is a distinct Paperclip capability;
- `plugin.state` is plugin-isolated durable state with company/issue scope and atomic upsert;
- custom plugin issue origins are namespaced;
- generic issue creation does not provide a first-class create-idempotency key;
- a provider run receipt cannot be inferred solely from the issue's transient `executionRunId`.

Therefore the candidate reuses:

```text
Paperclip issues       = durable task/work authority
Paperclip wakeup/run   = dispatch/execution authority
Paperclip plugin.state = provider-side dispatch receipt
Mastra                 = execution engine
Wandora                = customer intent/auth/idempotency/policy/result projection
```

Rejected:

- new Wandora task/assignment engine;
- `agents.invoke`;
- broad Paperclip API credential in Core/Web;
- Paperclip UI as customer supervision surface;
- using legacy `wandora.work_items` as a generic task engine;
- adding broad run/activity/comment read capability merely to project the result.

## Decision

### 1. Minimum Wandora durable state

Migration 016 adds only:

`wandora_private.digital_employee_work_operations`

This is an integration-safety journal, not task lifecycle authority.

It stores:

- stable Wandora work request id;
- organization/employee/actor;
- idempotency key + request hash;
- immutable title/description;
- frozen provider/correlation mapping;
- admission/dispatch/execution receipt state;
- private exact Paperclip run correlation after execution begins;
- final supervised execution id/model/summary.

The journal deliberately does not model Paperclip status, project hierarchy, assignments, routines, dependencies or scheduler state.

### 2. Customer contract

Candidate Core route:

```text
GET|POST
/api/v1/organizations/:organizationId/digital-employees/:employeeId/work
```

POST requires:

- normal Wandora human session;
- active owner/admin membership;
- exact employee `active + supervised`;
- exact completed catalog hire;
- exact control + employee provider binding;
- required `Idempotency-Key`;
- only bounded `title` + `description`.

Browser/provider identifiers are rejected.

GET returns only customer-safe Wandora work states and the supervised result projection.

### 3. Organization Adapter v0.3

The candidate expands authority only to:

```text
agents.managed
agents.resume

issues.read
issues.create
issues.wakeup

plugin.state.read
plugin.state.write

webhooks.receive
secrets.read-ref
```

It still has no `agents.invoke`.

New signed endpoint:

`employee-work`

The plugin:

1. resolves the fixed managed catalog employee;
2. requires it to be `idle`;
3. reconciles the exact Wandora work through:
   - originKind = `plugin:wandora.organization-adapter-v1:customer-work-v1`
   - originId = stable Wandora work UUID;
4. creates at most one Paperclip `todo` issue assigned to the fixed managed employee;
5. persists plugin-state receipt `dispatching`;
6. requests exactly one issue wakeup;
7. persists `dispatched + runId`.

If a replay sees `dispatched`, it performs no second wake.

If a replay sees unresolved `dispatching`, it fails closed rather than guessing whether the provider effect occurred.

### 4. Work correlation through the existing bridge

Paperclip issue description begins with an internal Wandora correlation marker:

```text
<!-- wandora-work-v1:<uuid> -->
```

`wandora_mastra@0.2.0`:

- extracts the UUID;
- removes the marker from the task description;
- sends the UUID as a separate reviewed `task.workId` field to Core;
- does not expose the marker or provider IDs to Mastra.

Core independently validates:

- signed Paperclip bridge request;
- run-scoped Paperclip identity;
- Paperclip company -> Wandora organization mapping;
- exact managed employee binding;
- employee `active + supervised`;
- exact Wandora work receipt;
- exact title/description;
- exact private run correlation.

Only title/description enter `AgentTaskRuntime`.

### 5. Supervised result projection

The result is not read back through broad Paperclip run/comment authority.

Instead the existing Core execution bridge already receives the completed Agent Runtime result. For a correlated Wandora work request, Core commits that result into the private work receipt before returning execution success.

This keeps:

- Paperclip authoritative for issue/run;
- Mastra authoritative for execution;
- Wandora authoritative for customer-safe supervision/result projection.

A replay of the exact already-recorded Paperclip run returns the cached projected result without executing Agent Runtime again.

A different or ambiguous run fails closed.

### 6. Runtime gating

New Core gate:

`WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED`

Default: absent / false.

When enabled it requires:

- Human API;
- Organization Adapter;
- Paperclip execution bridge;
- Agent Runtime;
- migration-016 journal readiness;
- exact private Organization Adapter work webhook URL.

Candidate compose overlay is separate from every existing live overlay.

Merging code alone cannot enable customer work.

### 7. Customer UX

The active employee card may expose a supervised work panel only when Core projects:

```text
work.available = true
```

The UI:

- obtains one browser-generated idempotency UUID per user request;
- preserves the exact same UUID/title/description if dispatch becomes uncertain;
- never invents a fresh retry for an ambiguous request;
- shows customer-safe recent states;
- shows the internal supervised result when ready;
- explicitly states that this flow does not send WhatsApp/e-mail or perform external effects.

## Second Adversarial Review

### Direct Paperclip issue creation from Core

Rejected.

It would require broader provider credential custody and bypass the already accepted company-scoped Organization Adapter boundary.

### Only a Wandora journal, without provider-side receipt

Rejected.

A timeout after Paperclip wakeup could cause the same work to be dispatched twice on replay.

### Only provider-side state, without pre-effect Wandora reservation

Rejected.

A client retry after Core failure could allocate a new Wandora work id and materialize a second provider issue.

### Treat issue `executionRunId` as durable idempotency receipt

Rejected.

Paperclip source shows run association may be cleared after execution; it is not sufficient as a permanent dispatch receipt.

### Add `issue.comments.read` or broad run read

Rejected.

The result already crosses the approved Core bridge; broad provider read authority is unnecessary.

### Automatically retry `dispatching`

Rejected.

`dispatching` is deliberately an uncertain side-effect state. Automatic wake retry could duplicate real work.

### Let work imply outbound authority

Rejected.

The first work contract ends at a customer-reviewable internal result. Human Send and Gateway outbound remain independent Wandora-owned gates.

## Implementation artifacts under qualification

- migration 016 + least-privilege verifier;
- Organization Adapter v0.3 signed work admission + fail-closed dispatch receipt;
- `wandora_mastra@0.2.0` v916-aligned correlation transport;
- Core owner/admin work admission/read contract;
- Core execution receipt + result projection;
- disabled-by-default runtime/readiness boundary;
- separate work compose overlay;
- Team active-employee supervised work panel;
- replay/uncertainty/provider-leakage/runtime tests.

## Validation required before acceptance

This ADR remains **Under qualification** until PR CI proves:

1. Core typecheck/build/tests;
2. migration 016 + verifier + idempotent replay on disposable PostgreSQL;
3. Organization Adapter v0.3 package/artifact tests;
4. dispatch replay and ambiguous `dispatching` fail closed;
5. Paperclip v2026.916.0 `wandora_mastra@0.2.0` contract/disposable proof;
6. Web build/typecheck;
7. no `agents.invoke`;
8. work gate OFF by default;
9. no Human Send/Gateway outbound activation;
10. production MEDICSPRO state remains unchanged.

## Qualification evidence — 2026-09-20

The candidate was validated only in disposable/local environments. No MEDICSPRO work, live migration, live plugin promotion or outbound effect was performed.

Evidence on the final implementation line before PR CI refresh:

- `apps/core/scripts/verify-ana-v1.sh`: **GREEN / exit 0**
  - Core typecheck + build GREEN;
  - **123/123 tests GREEN**;
  - runtime smoke + compose validation GREEN;
  - `ANA_VERTICAL_SLICE_V1_VERIFY_OK`.
- `apps/core/scripts/verify-organization-adapter-service-v1.sh`: **GREEN / exit 0**
  - migration 010/011/013/014/015 boundaries GREEN;
  - migration **016** applied twice on disposable PostgreSQL and verified idempotent;
  - column-level least privilege verifier GREEN;
  - **29/29 integration tests GREEN**;
  - `DIGITAL_EMPLOYEE_WORK_ADMISSION_V1_VERIFY_OK`.
- Organization Adapter v0.3 package verification against exact Paperclip
  `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`: **GREEN / exit 0**
  - TypeScript checked against the real v916 SDK;
  - **15/15 plugin tests GREEN**;
  - pinned manifest validator GREEN;
  - two npm packs reproducible;
  - package SHA256:
    `b05f2295dab4034ddd5b39db8398077e5171b0ad1751afe1be413e45aa2ec4b0`.
- `wandora_mastra@0.2.0`:
  - unit contract GREEN after correcting work-marker newline parsing;
  - real Paperclip v916 external adapter loader GREEN;
  - work marker stripped before Core/Mastra task content;
  - run token remains header-only.
- Disposable Paperclip -> Core -> Mastra attestation: **GREEN / exit 0**
  - exact Paperclip commit: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
  - Paperclip run status: `succeeded`;
  - canonical execution id shape: `exec_sha256`;
  - synthetic issue present;
  - migration 014 deliberately remained unapplied in that historical bridge rehearsal.
- Disposable E2E staging was hardened:
  - if hard-link staging partially fails, the partial target is deleted before full-copy fallback;
  - this prevents a nested/incomplete pnpm tree and preserves `server/node_modules/tsx`.

These proofs qualify the implementation candidate locally. **Acceptance/merge still requires a fresh all-GREEN GitHub PR workflow set for the final head.**

## Production boundary

Even after this implementation is accepted and merged:

```text
migration 016 live              = NO
Organization Adapter v0.3 live  = NO
wandora_mastra 0.2 live         = NO
customer work runtime flag      = OFF
first MEDICSPRO work             = NOT CREATED
Human Send                       = OFF
Gateway outbound                 = OFF
```

A separately reviewed production preflight is required before promotion.
