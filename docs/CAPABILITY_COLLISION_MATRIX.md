# Capability Collision Matrix

- Date: 2026-09-19
- Status: **Canonical authority/reuse decision aid**
- Applies with: `docs/CAPABILITY_AUTHORITY.md`, ADR 0036 and newer accepted ADRs

This matrix prevents Wandora, Paperclip and Mastra from becoming three competing implementations of the same domain.

## Resolution rule

When more than one component can technically implement a capability:

1. identify the **product authority**;
2. identify the **specialist implementation authority**;
3. keep provider/runtime objects behind Wandora-owned adapters;
4. persist only the minimum Wandora state required for stable identity, authorization, policy, reconciliation, audit, recovery or provider replacement;
5. reject a new Wandora subsystem unless the specialist capability is insufficient for a proven Wandora-owned requirement.

## Collision matrix

| Concern | Paperclip | Mastra | Wandora | Canonical resolution |
|---|---|---|---|---|
| Digital employee identity shown to customer | provider/control-plane agent | runtime agent objects | stable customer product identity | **Wandora contract; Paperclip lifecycle; Mastra execution only** |
| Employee lifecycle | agent hire/pause/resume/terminate/control plane | can execute an agent | product policy/projection | **Paperclip implementation authority** behind Organization Adapter |
| Team hierarchy / responsibility | company/agent/task organization | none required as business source | customer semantics/projection | **Paperclip first**; no parallel Wandora hierarchy without gap proof |
| Durable business work | issues/tasks/runs | task lists/goals/workflows | customer work views/policy | **Paperclip task authority**; Mastra task lists/goals are execution-local |
| Recurring business work | Routines | schedules | customer semantics | **Paperclip Routines** |
| Runtime-internal timer/schedule | not needed | schedules | runtime policy | **Mastra only when not durable organizational work** |
| New unit of work | issue/task/wakeup | workflow start/signal | authorization/orchestration | **Paperclip task/wakeup** |
| Change to a currently running execution | run controls | signals/suspend-resume | policy | **Mastra signal only inside the existing run** |
| Task review / completion approval | Execution Policy / Decisions | workflow checkpoints | product policy | **Paperclip for control-plane task completion** |
| Customer commitment / external-effect approval | may record a control-plane decision | may suspend for input | approvals/effect policy | **Wandora authority**; provider/runtime approval is insufficient |
| Stopped-work verification | Task Watchdog/liveness recovery | retry/workflow logic | product alerting if needed | **Paperclip watchdog/liveness** for Paperclip work |
| Runtime retry | run retry/control | workflow retry | effect idempotency policy | Use native runtime/provider retry only where no external-effect ambiguity; Wandora reconciliation wins on effects |
| Organizational skill catalog | skills/policy/releases/assignment | agent/filesystem skills | product labels/projection | **Paperclip catalog authority; Mastra runtime materialization** |
| Runtime skill execution | can deliver/stage expected skills | loads/executes runtime skills | policy | **Mastra execution** after Paperclip/Wandora authorization |
| Connection identity / grants | Connections, grants, responsible-user routing | `@mastra/connect` can expose platform connections | product integration contract/effect policy | **Paperclip candidate authority**; do not adopt Mastra Connect as competing authority |
| Tool catalog / access policy | Tool Gateway/profiles/policy | tools/MCP execution | effect allow-list and business policy | Paperclip candidate for organizational access; Mastra executes; Wandora independently authorizes external effects |
| Credential custody for Paperclip agent tools | secrets/connections | tool/provider credential use | may own only adapter/effect secrets that belong to Wandora | **Paperclip where Paperclip owns the connection** |
| Messaging transport credential | not transport authority | not transport authority | Messaging Gateway custody/policy | **Wandora Messaging Gateway / provider adapter** |
| Bridge HMAC | consumes adapter config | not aware of Paperclip IDs | private trust/mapping boundary | **Wandora-owned custody** |
| Run identity | run-scoped agent JWT | receives sanitized task input only | independently reconciles provider identity | **Paperclip asserts; Wandora verifies; Mastra never gets provider IDs** |
| Memory of execution | may have task/run history | memory/thread/observational memory | retention/privacy policy + canonical business facts | **Mastra runtime memory; Paperclip history; Wandora canonical facts** |
| Customer/business history | task/activity history | traces/memory | conversations, effects, product audit | **Wandora canonical where it is product/effect history** |
| Observability | control-plane activity/run logs | traces/spans/token/tool/memory telemetry | operational/compliance correlation | **Layered, not duplicated:** Paperclip control-plane, Mastra runtime, Wandora product/effect audit |
| Evaluation/quality | Decision Training examples | Evals/scorers | acceptance policy/UX | **Paperclip decision examples; Mastra execution quality; Wandora decides product gates** |
| Learning from human decisions | Decision Training | memory/evals can consume signals | product consent/retention policy | **Paperclip training evidence**, optional Mastra evaluation; no generic Wandora learning DB |
| Workspace/files | execution workspaces/runtime services | Workspaces/Sandbox | artifact/product contract if customer-visible | Execution implementation may be Paperclip/Mastra; Wandora owns only customer artifact semantics |
| Sandbox | provider runtime/sandbox support | workspace sandbox/checkpoints | security policy | Use specialist sandbox; Wandora does not create a third sandbox layer |
| Billing/usage | provider cost/run data may exist | token/model usage | customer plans/billing/limits | **Wandora product authority** |
| Compliance audit | control-plane audit only | execution telemetry only | effect/customer audit | **Wandora authority** for compliance/effects |
| Provider replacement | Paperclip-specific IDs/state | Mastra-specific runtime objects | stable IDs/adapters/mappings | **Wandora boundary prevents leakage** |

## Hard boundary: authorization is layered

The presence of an allow/approval primitive in one layer does not authorize the next layer.

Example:

```text
Paperclip connection/grant says:
  "this agent/run may access this tool identity"
        |
        v
Mastra runtime says:
  "this tool call is structurally valid and may execute"
        |
        v
Wandora effect policy says:
  "this exact customer-visible/external effect is authorized"
        |
        v
provider call
```

If the final Wandora effect gate is absent or false, the effect is forbidden even if Paperclip and Mastra both allow the call.

## Hard boundary: control-plane review is not effect approval

A Paperclip Decision or Execution Policy approval may establish that a work item passed its organizational review.

It does **not** authorize:

- sending WhatsApp/e-mail;
- creating/changing an order;
- charging money;
- changing customer/provider state;
- publishing content;
- changing an employee from paused to active;
- granting `agents.resume`;
- enabling Human Send;
- enabling Gateway outbound.

Those require the independently reviewed Wandora effect/lifecycle boundary.

## Collision found in current upstream versions

### Paperclip Connections vs Mastra `@mastra/connect`

Paperclip `v2026.916.0` makes Connections, grants, runtime credentials and responsible-user routing a headline control-plane capability.

Mastra `1.67.0` introduces `@mastra/connect`, which can turn Mastra Platform integration connections into tools.

Running both as authorities would create:

- duplicate credential identity;
- duplicate grant/permission semantics;
- ambiguous responsible-user selection;
- duplicate token refresh/custody;
- conflicting audit trails;
- difficult provider replacement.

Decision: **do not adopt `@mastra/connect` as Wandora's connection authority.** First qualify Paperclip Connections. Mastra receives already-authorized tool capability through the Agent Runtime boundary.

### Paperclip Skills vs Mastra Skills

Both support “skills”, but at different layers.

Decision:

- Paperclip = organization/catalog/policy/release/assignment;
- Mastra = runtime loading/materialization/execution;
- Wandora = product vocabulary/UX/projection only.

### Paperclip Routines vs Mastra Schedules

Decision:

- Paperclip Routine = durable business recurrence;
- Mastra Schedule = runtime-internal scheduling only;
- no duplicate customer schedule state in Wandora.

### Paperclip Decision Training vs Mastra Evals

Decision:

- Paperclip = structured examples/history of organizational decisions;
- Mastra = execution/output quality measurement;
- Wandora = policy for whether evidence may influence future behavior.

## Upgrade implication

The authority decisions above do not require a Paperclip upgrade.

The upgrade to `v2026.916.0` is desirable only if the disposable qualification proves that the more mature Connections/identity/runtime contracts are compatible with the existing Wandora bridge, plugin, secrets and paused-state invariants.

Until then:

```text
Paperclip production = v2026.831.1
Mastra Core          = 1.66.0
Ana                  = paused + supervised
agents.resume        = absent
Human Send           = OFF
Gateway outbound     = OFF
```


## ADR 0144 additions — AI runtime/provider collisions

| Concern | Paperclip | Mastra / Runtime | Wandora | Canonical resolution |
|---|---|---|---|---|
| Concrete model selection/routing | may record operational cost metadata | native router/fallback/provider invocation | logical product/runtime policy only | **Runtime implementation**; no Wandora Model Router |
| Logical AI/execution profile | not product authority | materializes selected implementation | stable `wandora-supervised-v1` | **Wandora-owned profile; provider/runtime mapping internal** |
| Model usage counts | can receive cost events | measures native usage | normalized adapter boundary | **Runtime maps -> Wandora normalized usage; no raw Mastra object** |
| Operational AI budget | company/agent/project budgets | per-run technical guard | commercial policy only | **Paperclip budget + runtime guard; not Wandora billing** |
| Customer subscription/billing | not invoice authority | not invoice authority | plan/price/margin/entitlement | **Wandora-owned** |
| Platform model-provider secret | not required to own a Wandora-paid platform key | consumes at execution | platform custody/policy | **Wandora platform secret; runtime receives only for execution** |
| Tenant/BYOK secret | secret scopes / responsible user / qualified grants candidate | consumes resolved credential | entitlement/policy | **Reuse Paperclip authority; no second secret manager** |
| Provider retry/fallback | work/run retry semantics remain organizational | native model retry/fallback | ambiguity/effect policy | **Use runtime native mechanisms only within Wandora safety policy** |

A runtime/provider allow-list in deployment configuration is not a provider registry. Do not grow it into one without a separate proven requirement.
