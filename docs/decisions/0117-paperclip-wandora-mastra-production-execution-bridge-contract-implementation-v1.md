# ADR 0117 — Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1

- Status: **Accepted / merged — code/CI-only foundation; production remains dormant**
- Date: 2026-09-19
- Scope: promote the ADR 0037 laboratory Paperclip external-adapter bridge into canonical production-installable source plus a disabled-by-default private Wandora Core execution contract, without installing the adapter live, activating/resuming Ana, granting `agents.resume`, enabling Human Send or enabling Gateway outbound.

## REAL NOW

Canonical Git entering this implementation:

```text
main = 289d4ee2b5f68c6d59267eef41256c9cd26fcf79
open PRs = 0
ADR 0116 = activation preflight COMPLETE / NO-GO
```

The production facts from ADR 0116 remain the execution constraint:

```text
MEDICSPRO Ana / Wandora                 = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip               = exactly 1 / paused / healthy org chain
Paperclip agent adapterType             = wandora_mastra
live Paperclip wandora_mastra adapter   = absent / exact read 404
live Organization Adapter agents.resume= absent
Human Send                              = OFF
Gateway outbound                        = OFF
```

This slice is repository/CI only. Those live facts are not mutated by this implementation.

## PROVEN EVIDENCE

### Existing specialist/runtime capability

ADR 0037 already proved, against the exact pinned Paperclip image, that its external-adapter loader accepts a Wandora adapter with `supportsLocalAgentJwt=true`, that a run-scoped Paperclip token can remain opaque, and that a dedicated Wandora HMAC can authenticate a minimized private request.

The current pinned provider remains:

```text
Paperclip image  = wandora/paperclip:v2026.831.1
Paperclip source = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

The pinned source also proves that `GET /api/agents/me` requires agent authentication and, for an ordinary local agent JWT, returns the provider's self-detail through `buildAgentDetail(agent)`. The reduced `task_bridge` view is a distinct scoped-key path.

Wandora already has a real Agent Runtime boundary with the deterministic Mastra implementation behind it. No second runtime is required.

### Existing binding state

Wandora already owns the minimum provider mapping required to resolve the execution boundary:

- organization -> Paperclip company;
- employee -> deterministic managed provider reference;
- canonical Wandora employee status/autonomy.

The existing `paperclipManagedAgentRef(company,catalogKey)` remains the selected stable provider-reference derivation. The Core does not need to persist the Paperclip agent UUID as a second identity.

### Important security finding

The HMAC-authenticated adapter request alone is not sufficient evidence that the supplied `paperclipAgentId` is the managed Ana.

A different agent in the same Paperclip company could otherwise supply another agent identifier through the adapter context.

Therefore the bridge independently sends the opaque run-scoped token back to the private Paperclip `/api/agents/me` endpoint and requires exact agreement on:

```text
agent id       = request paperclipAgentId
company id     = request paperclipCompanyId
plugin key     = wandora.organization-adapter-v1
managed key    = ana-commercial-v1
name           = Ana
role           = commercial-assistant
```

Only after that proof does Wandora resolve its own provider-company binding.

## GAPS ADDRESSED

Before this slice, production-shaped code was missing:

1. a canonical installable external adapter with type exactly `wandora_mastra`;
2. file-backed directional HMAC custody contract for adapter -> Core;
3. a private disabled-by-default Core route for Paperclip execution;
4. independent run-token identity reconciliation against Paperclip;
5. a least-privilege Paperclip-company -> Wandora-organization resolver;
6. exact active employee/provider-binding validation before runtime execution;
7. a provider-neutral assigned-task method on the existing Agent Runtime;
8. pinned-image artifact/loader CI.

This implementation closes those code/CI gaps only.

## CAPABILITY AUTHORITY / REUSE GATE

### Paperclip owns

- run lifecycle and run-scoped local agent JWT issuance;
- provider company/agent identity;
- external adapter invocation;
- agent pause/resume lifecycle;
- issue/task/run control-plane state.

### Wandora owns

- the private execution bridge contract;
- tenant/employee mapping and lifecycle compatibility policy;
- HMAC trust boundary;
- stable Wandora employee identity;
- allowed task projection crossing into its runtime;
- the rule that only a Wandora `active + supervised` employee may execute;
- the Agent Runtime input/output contract.

### Mastra owns

Execution implementation behind the existing Wandora `AgentRuntime` / new narrow `AgentTaskRuntime` method.

### Reuse result

**PASS.**

No new scheduler, task engine, employee lifecycle, provider run state machine or Paperclip clone is introduced.

The only new database capability is a SECURITY DEFINER resolver that maps one exact Paperclip company ref to one active Wandora organization and exposes no secret or employee state.

## DECISION

### Canonical external adapter

Promote the production package source at:

```text
integrations/paperclip/adapters/wandora-mastra-v1/
```

Contract:

```text
package            = @wandora/paperclip-adapter-mastra
version            = 0.1.0
adapter type       = wandora_mastra
supportsLocalAgentJwt = true
bridge route       = http://wandora-core:8788/internal/v1/paperclip/execution
```

The bridge endpoint and HMAC are operator-owned runtime configuration, not per-agent customer configuration.

The adapter requires:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE
```

The URL must equal the exact private Core route. The HMAC secret must come from an absolute mounted file and must never enter the package, agent config, logs or request JSON.

### Minimized request

Only these provider fields cross the adapter boundary:

```text
paperclipAgentId
paperclipCompanyId
paperclipRunId
task:
  issueId
  identifier
  title
  description
  workMode
  wakeReason
  wakeCommentId
```

The run token is never placed in JSON. It is forwarded only in:

```text
x-wandora-paperclip-run-token
```

Unreviewed Paperclip context/provider/MCP state is dropped.

### Private Core trust order

The disabled-by-default Core route is:

```http
POST /internal/v1/paperclip/execution
```

Exact order:

```text
1. validate dedicated HMAC + bounded timestamp over exact body
2. require opaque Paperclip run token
3. validate request shape
4. call private Paperclip /api/agents/me using that run token + x-paperclip-run-id
5. require exact provider agent/company + managed plugin/catalog identity
6. resolve Paperclip company -> active Wandora organization
7. derive the stable managed provider ref
8. require exact Wandora employee binding
9. require Wandora employee status=active, role=commercial-assistant, autonomy=supervised
10. pass only Wandora employee + reviewed task to AgentTaskRuntime -> Mastra
11. return a customer-neutral/private execution result
```

A paused Wandora employee cannot execute even if the Paperclip adapter is installed later.

### Runtime reuse

`MastraDeterministicAgentRuntime` now implements the narrow assigned-task capability in addition to the existing supervised proposal capability.

Paperclip IDs/run IDs are not passed into Mastra.

### Stable result identity

For the deterministic V1 runtime, the private execution result ID is derived from:

```text
Wandora organization
Wandora employee
Paperclip run id
```

The runtime is currently deterministic and the bridge itself performs no external messaging/business side effect.

This is **not** approval for nondeterministic/model/tool execution with irreversible effects. Before that becomes possible, duplicate run delivery, callbacks and effect idempotency require a separately reviewed durable execution/reconciliation contract.

### Least-privilege resolver

Migration source:

```text
20260919_014_paperclip_execution_binding_resolver_v1.sql
```

The new function:

```sql
wandora_private.resolve_paperclip_execution_organization(text)
```

returns only an active Wandora organization UUID for an exact Paperclip company ref.

It is executable only by `wandora_core_runtime`; browser roles cannot call it.

Migration 014 is **code only in this slice** and is not applied to production.

### Disabled-by-default runtime overlay

The repository contains a separate dormant overlay:

```text
infra/stacks/core/compose.paperclip-execution-bridge.yaml
```

It is not part of the base Core stack and is not activated by merge.

## SECOND ADVERSARIAL REVIEW

Rejected:

- trusting HMAC-authenticated `paperclipAgentId` without independently checking the run token;
- accepting any agent in the mapped Paperclip company;
- accepting any plugin-managed agent rather than exact `ana-commercial-v1`;
- forwarding the full Paperclip runtime context;
- placing the run token in JSON, durable state or logs;
- using the existing Organization Adapter HMAC for the execution bridge;
- storing the Paperclip agent UUID as a new canonical identity merely for execution;
- giving Core a Board/instance-admin credential;
- exposing a public/customer execution route;
- permitting a paused Wandora employee to execute;
- implementing execution by reviving a Wandora-native task/control-plane subsystem;
- granting `agents.resume` in this slice;
- installing the adapter live merely because an installable artifact exists;
- treating deterministic replay as proof that future nondeterministic/model/tool effects are idempotent;
- enabling Human Send or Gateway outbound as part of the bridge.

The final contract therefore uses two independent trust proofs: directional HMAC for the adapter host and Paperclip's own run-scoped identity for the provider agent/run.

## EXECUTION

Repository-only implementation:

- canonical `@wandora/paperclip-adapter-mastra@0.1.0` source;
- pinned compatibility metadata;
- adapter unit tests and exact live-image loader verifier;
- dedicated deterministic-package CI/artifact workflow;
- private Core execution handler;
- Paperclip run-identity verifier;
- active employee/binding execution service;
- AgentTaskRuntime reuse of existing Mastra runtime;
- migration 014 + structural/privilege verifier;
- dormant Core Compose overlay;
- Core/unit/integration/overlay verifier expansion.

No production adapter install, database migration, secret creation, Core recreation, Paperclip resume, customer activation route or outbound effect belongs to this implementation.

## VALIDATION CONTRACT

The implementation must not be accepted/merged unless CI proves:

- Core typecheck/build/tests green;
- migration 014 applies twice in disposable PostgreSQL and verifier is green;
- paused employee cannot reach AgentTaskRuntime;
- exact active binding can reach AgentTaskRuntime;
- run token identity mismatch fails closed;
- invalid/stale HMAC fails before provider/runtime calls;
- run token remains absent from JSON/runtime input;
- provider IDs do not enter Mastra task input;
- `wandora_mastra` package loads through the exact pinned Paperclip external-adapter loader;
- package declares `supportsLocalAgentJwt=true`;
- unreviewed context is minimized;
- two `npm pack` runs produce identical SHA-256;
- artifact contents are exact and contain no spike/credential material;
- dormant Compose overlay renders only when explicitly selected.

## RESULT

**Implementation is bounded to code/CI. Production activation remains NOT authorized by this ADR.**

PR #166 merged by squash into canonical `main` as:

```text
7bc8c4790e37b0410703bf58979458200810d5a9
```

The reviewed PR head `0d6ee0ba593e69e74cae851e127bf146b36f38f1` completed all seven repository workflows successfully: Core CI, Core Candidate Artifact, Paperclip Mastra Adapter CI, Organization Adapter Plugin CI, Messaging Gateway CI, Web CI and Platform Admin CI.

Independent post-merge production validation proved:

```text
migration 014 live                  = false
live Paperclip wandora_mastra       = not registered
MEDICSPRO Ana / Wandora             = exactly 1 / paused + supervised
MEDICSPRO employee-provider binding = exactly 1
MEDICSPRO hire operation            = exactly 1 / completed / 0 unfinished
Core bridge enable flag             = absent / OFF
Human Send enable flag              = absent / OFF
Gateway outbound enable flag        = absent / OFF
```

The production truth therefore remains:

```text
live Paperclip wandora_mastra adapter = absent
live Core Paperclip execution bridge  = OFF
migration 014                         = not applied
Ana / Wandora                         = paused
Ana / Paperclip                       = paused
Organization Adapter agents.resume    = absent
Human Send                            = OFF
Gateway outbound                      = OFF
```

## NEXT EXECUTABLE SLICE

With PR #166 merged and post-merge production state revalidated:

**Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1.**

That next slice is no-effect. It must reverify live state and freeze the exact migration-014 application/verifier, dedicated bridge HMAC custody, Paperclip external-adapter install path/artifact provenance, Core overlay/candidate promotion, rollback, adapter health/readback and end-to-end synthetic proof order.

It must not install the adapter, apply migration 014, recreate Core, resume/activate Ana, grant `agents.resume`, enable Human Send or enable Gateway outbound during the preflight.
