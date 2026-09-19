# Mastra Capability Map

- Date: 2026-09-19
- Production Core package: `@mastra/core@1.66.0`
- Production packages absent: `@mastra/memory`, `@mastra/observability`, `@mastra/evals`
- Current upstream stable reviewed: `@mastra/core@1.67.0`
- Status: **Canonical runtime capability map — no Mastra upgrade is authorized by this document**

Mastra is the accepted implementation behind the Wandora Agent Runtime Adapter. Mastra objects are runtime implementation details; they do not become public Wandora product contracts.

## Current live usage

The live Core imports only:

- `Mastra`;
- `createTool`;
- `createStep`;
- `createWorkflow`.

The current Ana runtime is deterministic and supervised. It creates a proposal without an external model call and forces `MASTRA_TELEMETRY_DISABLED=true` before loading Mastra.

No persistent Mastra memory, external observability exporter, Mastra eval loop, workspace sandbox or runtime skill system is currently active in the live Core.

## Canonical ownership map

| Capability | Mastra capability | Wandora disposition |
|---|---|---|
| Agent/workflow execution | Agents, tools, steps and workflows | **MASTRA-OWNED implementation** behind Agent Runtime Adapter |
| Tool execution lifecycle | Tool schemas/execution plus agent/tool hooks | **MASTRA runtime implementation**; Wandora owns effect authorization and provider-neutral contracts |
| `beforeToolCall` / `afterToolCall` | Runtime interception/audit/blocking hooks | Use for runtime guardrails/telemetry; **never treat a hook as durable authorization for an external effect** |
| Token limiting | `TokenLimiterProcessor` and related processor controls | **MASTRA runtime guardrail**; candidate for cost/context safety |
| Token/cost evidence | Model/run usage and observability spans | Mastra may measure; Wandora owns product limits/billing semantics |
| Memory | `@mastra/memory` supports persistent/thread/working/observational memory | **MASTRA runtime memory implementation**; Wandora owns tenant/employee scope, retention/privacy and product semantics |
| Observational memory | Observer/Reflector style context compression | Candidate only after privacy/retention/cost qualification; not a Wandora canonical business record |
| Observability | `@mastra/observability`, traces/spans/feedback/scores | **MASTRA execution telemetry**; Wandora retains compliance/effect audit authority |
| Evals / scorers | `@mastra/evals` and scoring/evaluation capabilities | **MASTRA execution-quality evidence**; does not decide product authority or customer permissions |
| Workspaces | Runtime workspace/filesystem abstraction | **MASTRA execution environment** when required by a runtime |
| Sandbox | Runtime isolation/checkpoint capability | **MASTRA execution containment**; does not grant network/provider effects |
| Skills | agent/filesystem skills, workspace-backed skill loading | **MASTRA runtime materialization** only; Paperclip remains organizational skill catalog/policy authority |
| Schedules | Runtime scheduling primitives | Use only for runtime-internal mechanics; durable organizational recurrence belongs to Paperclip Routines |
| Signals | In-flight workflow/run signaling | Use for **same execution** coordination; new organizational work belongs to Paperclip tasks/wakeups |
| Goals | Runtime agent goal context | Execution-local cognition; not canonical company goals/work |
| Task lists | Runtime-local decomposition/progress | Execution-local; not durable organizational tasks |
| Workflow suspend/resume | Runtime continuation | Runtime mechanism; Paperclip remains authority for organizational run/task lifecycle |
| MCP/tool consumption | Mastra can consume MCP/tool integrations | Execution plumbing only; organizational grants/connection identity are not automatically Mastra-owned |
| `@mastra/connect` (1.67) | Mastra Platform connections become agent tools through a connection proxy | **DO NOT ADOPT as authority now**; it collides with Paperclip Connections/grants and requires a separate authority decision |
| Studio workflow builder (1.67) | persisted editor-authored workflow definitions | Engineering capability only unless separately adopted; not a reason to expose Mastra Studio to customers |

## Install state vs capability support

A feature being supported by `@mastra/core@1.66.0` does **not** mean it is installed or operational in Wandora.

Current production proof:

```text
@mastra/core          = 1.66.0
@mastra/memory        = NOT_FOUND
@mastra/observability = NOT_FOUND
@mastra/evals         = NOT_FOUND
```

Therefore Memory, Observability and Evals are **adoption slices**, not current capabilities of the deployed Wandora runtime.

## 1.66 -> 1.67 assessment

The current upstream stable is `@mastra/core@1.67.0`.

The reviewed breaking changes include:

- `subscribeQueuedMessages(...)` -> `subscribeThreadEvents(...)`;
- `ArchilFilesystem.grep()` -> `diskGrep()`.

The current Wandora runtime does not use those APIs.

Version 1.67 also adds `@mastra/connect` and a Studio Workflow Builder backend. Neither is required for the current Wandora bridge/runtime contract.

Decision:

- **do not couple the Paperclip upgrade slice to a Mastra upgrade**;
- keep `@mastra/core@1.66.0` pinned through the Paperclip disposable proof;
- qualify `1.67.0` separately with normal dependency CI/runtime tests;
- do not adopt `@mastra/connect` while Paperclip Connections is the leading candidate for organizational connection/grant authority.

## Recommended Mastra adoption order

### 1. Token/context guardrails

Qualify token limiting and cost evidence first because they can constrain execution without changing organizational authority.

Required proof:

- deterministic runtime unchanged;
- bounded input/output behavior;
- no customer data egress;
- clear failure/tripwire semantics;
- no bypass of Wandora external-effect policy.

### 2. Local/private observability

Qualify execution traces with explicit redaction and a storage/export destination that does not violate Wandora privacy requirements.

`MASTRA_TELEMETRY_DISABLED=true` remains the default until the exact exporter/storage contract is reviewed.

### 3. Evals

Use Evals/scorers for execution-quality evidence and regression tests. Scores must not autonomously alter employee lifecycle, customer permissions or external-effect policy.

### 4. Memory

Only after a separate data-governance decision defines:

- tenant boundary;
- employee/thread/resource boundary;
- retention/deletion;
- personal/customer-data handling;
- replay/audit expectations;
- model cost and background processing;
- what is canonical vs derived memory.

### 5. Workspaces/sandbox and runtime skills

Adopt only for employees whose work actually requires files/code/artifacts or shared runtime skills. Paperclip remains the organizational source for assignments/skills.

## Explicit prohibitions

Do not use Mastra to create a second:

- employee lifecycle;
- company/task control plane;
- business scheduler;
- organizational skill catalog;
- connection/grant authority;
- durable customer approval system;
- compliance/effect ledger.

Do not allow a Mastra hook, signal, goal, task list, schedule, skill, memory or evaluation result to bypass a Wandora-owned effect boundary.

## Provider references

- Mastra releases: https://github.com/mastra-ai/mastra/releases
- Tool hooks: https://mastra.ai/blog/introducing-tool-hooks
- Token limiting: https://mastra.ai/blog/introducing-token-limiting
- Filesystem skills: https://mastra.ai/blog/introducing-filesystem-skills
- Memory: https://mastra.ai/docs/memory/overview
- Observability: https://mastra.ai/docs/observability/overview
