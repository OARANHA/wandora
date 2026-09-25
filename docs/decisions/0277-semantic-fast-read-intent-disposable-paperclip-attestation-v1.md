# ADR 0277 — Semantic Fast Read Intent + Disposable Paperclip Attestation V1

Status: **CODE COMPLETE / CI QUALIFICATION PENDING / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0275 established the pre-Issue split:

```text
request
  -> Wandora semantic decision
      -> deterministic_read
      -> agentic_work
      -> clarify
      -> human_review
```

ADR 0276 implemented the provider-neutral semantic contract, `BusinessCapability` vocabulary and deterministic renderer/executor, but deliberately refused to accept a provider/adapter-supplied execution mode as Wandora authority.

This slice adds the minimum attestation proving that an issue-less Paperclip run may enter the deterministic-read path only when Wandora issued a legitimate short-lived authorization for the exact organization, employee, request and business capability.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW / proven evidence

Entry reconciliation proved:

- Wandora `main@2e2d3e451a27ea3d98ea35c061c27f4ce4939f67`, PR #361 merged;
- semantic-decision plugin `main@f278ce976989d5ea968d50e0f6e3722a7d6fc5f1`, with V1 documented as post-Issue/advisory;
- Task Drain OFF/quiescent and temporary Tool Policies absent;
- Paperclip/Core healthy;
- `wandora-jev-mcp` healthy as a container and not used by this slice.

Pinned Paperclip source proves:

1. `ctx.agents.invoke(agentId, companyId, { prompt, reason })` creates an on-demand run;
2. Paperclip materializes that prompt into adapter context as `paperclipAgentMessage` with `source=plugin_invoke` and the invoking plugin key;
3. issue-less runs are legitimate and omit `paperclipIssue`;
4. Tool Gateway sessions are run-scoped and Issue identity is optional;
5. Tool Gateway remains authority for currently admitted tools and persists invocation/audit evidence.

## Capability Authority / Reuse Gate

### Semantic authority — Wandora-owned

Wandora owns:

- the meaning of `deterministic_read`;
- `BusinessCapability`;
- semantic gating;
- organization/employee/request admission;
- issuance and verification rules for `FastReadIntent`;
- deterministic customer-safe rendering.

### Durable product state

No new Wandora durable product state is introduced.

There is:

- no migration;
- no table;
- no fast-read lifecycle/state machine;
- no Wandora replay ledger;
- no new tool registry.

### Operational authority — Paperclip-owned

Paperclip remains authority for:

- managed-agent invocation and run lifecycle;
- provider Connections/grants/secrets/profiles/policies;
- run-scoped Tool Gateway admission;
- tool execution and audit;
- the small dispatch receipt stored in `plugin.state`.

That receipt is operational idempotency for the existing Paperclip adapter boundary. It is not Wandora product state and does not replace Paperclip run lifecycle.

## Decision

### 1. Wandora-issued stateless Fast Read Intent

`FastReadIntent` is an HMAC-SHA256 authenticated token containing only:

```text
contract version
organizationId
employeeId
BusinessCapability
correlationId
SHA-256(request)
issuedAt
expiresAt
integrity/authenticity
```

It contains no:

- ERP/provider tool name;
- Connection/grant/secret/credential;
- Paperclip catalog/profile id;
- JEV/TypeSafe identity.

Issuance re-runs the Wandora deterministic-read gate. A provider cannot mint authority by merely claiming `deterministic_read`.

TTL is bounded to 5..300 seconds; default issuance is 60 seconds.

### 2. Issuance boundary

The intended emitter is the Wandora request-admission boundary after:

- authenticated tenant/session authorization;
- employee selection/policy;
- provider-neutral semantic decision;
- deterministic-read gate.

This slice implements the contract only. No live customer admission route or JEV/TypeSafe provider is wired.

### 3. Dispatch boundary

The existing `wandora.organization-adapter-v1` plugin is reused.

A signed Wandora webhook `employee-fast-read` carries only:

```text
companyId
catalogKey
correlationId
intentToken
request
```

The plugin:

1. authenticates the request using the existing company-scoped Wandora HMAC boundary;
2. resolves the existing managed employee;
3. requires the managed employee to be idle;
4. writes a Paperclip-owned `plugin.state` dispatch receipt keyed by correlation;
5. calls native `ctx.agents.invoke`;
6. stores the resulting Paperclip run id.

The prompt is a provider-neutral bounded envelope. It contains no concrete tool name.

### 4. Replay / duplicate dispatch

The intent itself remains stateless.

Replay control is split correctly by authority:

- Wandora token: HMAC + request digest + org + employee + capability + correlation + TTL;
- Paperclip operational dispatch: `plugin.state` receipt keyed by correlation.

Same correlation + same exact dispatch input returns the original run id and does not invoke the agent again.

Same correlation with changed intent/request fails closed.

A receipt left in `dispatching` is treated as uncertain and never causes a second run.

No Wandora-owned lifecycle is introduced.

### 5. Adapter transport

The `wandora_mastra` adapter recognizes fast read only when:

- no `paperclipIssue` exists;
- `paperclipWake.agentMessage.source === "plugin_invoke"`;
- `paperclipWake.agentMessage.pluginKey === "wandora.organization-adapter-v1"`;
- the prompt has the exact `WANDORA_FAST_READ_V1` envelope.

The adapter cannot choose a concrete RuntimeReadTool.

It forwards only the bounded request, correlation and signed intent to Core with `workId=null`.

### 6. Verification boundary

Core verifies in this order:

1. existing private bridge HMAC;
2. Paperclip run token / run identity;
3. existing Paperclip-company -> Wandora-organization and managed-employee binding;
4. Wandora Fast Read Intent org/employee/correlation/request/TTL/integrity;
5. current run-scoped Paperclip Tool Gateway read-tool set.

Invalid or expired intent fails before opening Tool Gateway.

### 7. BusinessCapability -> RuntimeReadTool

Core builds ephemeral bindings only from `RuntimeReadTool[]` already admitted by the Paperclip Tool Gateway for that run.

The mapping:

- is per-run and in-memory;
- is provider-neutral;
- is not persisted;
- is not a registry;
- grants nothing by itself.

The requested `BusinessCapability` must resolve to **exactly one** binding.

Zero or multiple bindings fail closed before `RuntimeReadTool.execute()`.

### 8. Zero Mastra/model path

Fast read is structurally separate from `AgentTaskRuntime`.

```text
verify intent
-> fetch currently authorized Paperclip read tools
-> ephemeral BusinessCapability binding
-> DeterministicReadExecutor.executeAuthorizedIntent
-> deterministic renderer
```

The logical model is `wandora-deterministic-read-v1` and normalized token usage is exactly zero.

Core never silently falls back from an invalid Fast Read Intent into agentic work.

### 9. workId=null

`workId=null` is legitimate only for this authenticated issue-less fast-read branch.

Normal customer work remains Issue/work-backed and unchanged.

### 10. Observability / audit

No new audit store is introduced.

The proof uses:

- Paperclip run identity/status/result/usage;
- Paperclip-owned dispatch receipt;
- Tool Gateway invocation/audit;
- deterministic Core execution id.

## Second adversarial review

The second review explicitly rejected:

1. trusting `executionMode` supplied by a provider/adapter;
2. putting TypeSafe/JEV credentials in Core;
3. direct Core -> TypeSafe/JEV coupling;
4. transporting the token through abused fields such as `reason` or `taskKey`;
5. relying on arbitrary `/wakeup` payload fields that Paperclip does not promote to adapter context;
6. a Wandora table/replay ledger;
7. a parallel run/lifecycle;
8. a global BusinessCapability -> tool registry;
9. allowing the adapter to pick a concrete provider tool.

The accepted transport is the existing authenticated Organization Adapter plugin invoking Paperclip's native `agents.invoke`.

The accepted replay mitigation is short-lived signed intent plus the Paperclip-owned operational dispatch receipt.

## Disposable E2E qualification

The pinned disposable Paperclip attestation must prove the exact path:

```text
Wandora signed webhook + FastReadIntent
-> Organization Adapter
-> Paperclip agents.invoke
-> exactly one issue-less Paperclip run
-> wandora_mastra adapter
-> Core independent run identity + intent verification
-> Paperclip Tool Gateway
-> one synthetic read-only tool
-> deterministic response
```

Required invariants:

- Paperclip Issue delta = 0;
- successful fast-read run delta = exactly 1;
- duplicate correlation does not create a second run;
- successful read-tool call delta = exactly 1;
- normalized token usage = 0;
- AgentTaskRuntime/Mastra/model call = 0;
- retry = 0;
- expired intent = 0 tool calls;
- tampered/invalid intent = 0 tool calls;
- business capability absent from the current authorized set = 0 tool calls;
- duplicate/ambiguous capability binding = 0 tool calls;
- run terminates correctly;
- existing normal agentic/customer-work attestation remains unchanged and GREEN.

The duplicate-capability negative case is created only inside the disposable Paperclip database by duplicating the synthetic read-only KV catalog binding. It is not a product registry or production mutation.

## Local validation before PR

Currently GREEN locally:

- adapter contract tests: 11/11;
- Organization Adapter fast-read dispatch/idempotency tests: 5/5;
- `git diff --check`;
- disposable E2E shell syntax.

A previous focused Core test run was 6/6 GREEN before the local dependency directory was cleared. A subsequent reinstall attempt on the VPS broker failed with npm `ECONNRESET` and the broker host is Node 18, below Core's required Node >=22.13. Therefore final Core typecheck/build/tests and the full disposable E2E must be qualified by the canonical GitHub-hosted Ubuntu 24.04 CI per ADR 0158.

## Effect boundary

```text
migration/table = 0
new Wandora lifecycle = 0
new tool registry = 0
production mutation = 0
Paperclip production mutation = 0
JEV/TypeSafe production call = 0
VendaERP call = 0
Mastra/model production call = 0
customer work = 0
outbound = 0
deploy/promotion = 0
network/auth change to wandora-jev-mcp = 0
```

## Merge gate

**Do not merge until the exact PR head is CI GREEN, including Core CI, Organization Adapter plugin CI and the disposable Paperclip -> Core -> Tool Gateway fast-read attestation.**

Production enablement remains a separate preflight/execution slice even after merge.
