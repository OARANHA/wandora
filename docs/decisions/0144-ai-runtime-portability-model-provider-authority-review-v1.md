# ADR 0144 — AI Runtime Portability + Model Provider Authority Review V1

Date: 2026-09-21
Status: **Accepted — Case A portability GREEN with repository-only contract hardening; no production effect**

## Context

ADR 0142 qualified `mastra-supervised-model` with a first concrete provider/model pair, and ADR 0143 proved the real Mistral credential and one disposable structured-output invocation while leaving live Core on `mastra-deterministic`.

Before a future production activation preflight, this ADR tests whether that foundation accidentally makes Mastra, Mistral or their usage objects part of Wandora's durable product contract.

The architectural target is:

```text
Wandora
  = product contract, stable identity, tenant policy, commercial semantics,
    effect authorization and provider-neutral runtime boundary

Paperclip
  = organizational employee/work/run state, operational budgets and control plane

Agent Runtime Adapter
  = Wandora-owned runtime contract

Mastra
  = current execution implementation

Mistral / OpenAI / Anthropic / ...
  = replaceable inference providers used by the runtime
```

Replacing Mastra must not require changing Ana's identity, customer contracts, Paperclip work state, Wandora effect policy or commercial billing semantics.

## REAL NOW

Canonical repository at review start:

```text
main = e7f1050a99dbab8da26e4aa06f36556e999ce243
open PRs = 0
```

Read-only production reconciliation:

```text
Core image   = wandora/core:organization-adapter-candidate-ad93c055d6f8
Core health  = healthy / restart 0
Core runtime = mastra-deterministic
Core model provider env = absent
Core model id env       = absent
Core model key file env = absent
Human Send              = OFF / absent

Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
Gateway outbound = OFF / absent

MEDICSPRO Ana / Wandora  = exactly 1 / active + supervised
MEDICSPRO work journal   = 0
MEDICSPRO outbound       = 0

MEDICSPRO Ana / Paperclip = idle / wandora_mastra
issues                    = 0
wakeups                   = 0
heartbeat runs            = 0
task sessions             = 0
routines / routine runs   = 0 / 0
runtime last run          = null
runtime tokens / cost     = 0 / 0
agent monthly spend       = 0
```

Platform credential custody remains:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
mode  = 0640
owner = wandora-admin
group = wandora-ops
```

Only metadata was inspected. The secret value was not read or emitted. The file is not mounted into live Core.

ADR 0143's real-provider attestation was not repeated.

## PROVEN EVIDENCE — current code boundary

The current `AgentTaskRuntime` boundary accepts Wandora organization/employee/task concepts only. No Mastra `Agent`, thread, memory, processor, span, tool object, provider SDK object, Paperclip run token or provider model ID is part of the interface.

Before this review, `AssignedTaskResult` exposed only:

```text
model
summary
```

For the model-backed runtime, `model` already carried the logical Wandora identifier `wandora-supervised-v1`, never `mistral-small-2603`.

Concrete provider/model/base URL/key handling exists only in runtime/deployment configuration and in `MastraSupervisedModelAgentRuntime`.

Mastra `result.totalUsage` was read only inside the Mastra implementation. No raw Mastra usage object crossed into Paperclip or the customer contract.

### Adversarial portability finding

The deterministic runtime still returned:

```text
model = mastra-deterministic
```

That string could become durable `result_model` in Wandora's private work journal. A framework name therefore could have leaked into future durable history.

Read-only production proof found:

```text
wandora_private.digital_employee_work_operations = 0 rows
```

No data migration is required. The repository-only hardening in this slice makes both current runtime implementations return the same Wandora-owned logical profile:

```text
wandora-supervised-v1
```

The internal runtime mode name may remain `mastra-deterministic`; it is deployment configuration, not durable product identity.

## ADR 0142 element classification

| Element | Classification | Decision |
|---|---|---|
| `WANDORA_MODEL_PROVIDER` | **C + E** — Agent Runtime config + provider detail | May exist only as internal deployment selection. Never a product/domain field. |
| `WANDORA_MODEL_ID` | **C + E** | Concrete technical model selection inside the runtime implementation. Never stable customer identity. |
| `WANDORA_MODEL_BASE_URL` | **C + E** | Provider transport detail, replaceable with the runtime/provider implementation. |
| `WANDORA_MODEL_API_KEY_FILE` | **C + F** — deployment config + platform-secret locator | The path is not the authority. The secret is Wandora platform-owned when Wandora pays the provider. |
| `WANDORA_MODEL_MAX_OUTPUT_TOKENS` | **B + C** — Wandora execution-safety policy implemented by runtime | Semantic limit survives runtime replacement; enforcement mechanism may change. |
| `WANDORA_MODEL_REQUEST_TIMEOUT_MS` | **B + C** | Wandora execution-safety deadline; runtime-specific implementation may change. |
| `wandora-supervised-v1` | **A** — stable Wandora logical execution/AI profile | Persists across Mastra/provider replacement. It does not promise a vendor/model. |
| `MastraSupervisedModelAgentRuntime` | **D** — Mastra implementation detail | Replaced when Mastra is replaced. Must never become an external contract. |

No reviewed item is category **G**. The current single-provider pin is an allow-listed implementation selection, not a Wandora provider registry/router.

## AI Profile decision

Wandora does need a stable logical concept above concrete providers. It already has the minimum required V1 identifier:

```text
wandora-supervised-v1
```

For this slice, that identifier is canonically interpreted as a **Wandora-owned logical execution/AI profile**, even though existing code/database fields retain the legacy name `model` / `result_model`.

Do **not** create a new `ai_profiles` table, provider mapping table or customer-selectable provider catalog now.

A future product-level profile such as `commercial-standard-v1` is justified only when Wandora has a proven need for multiple product tiers/policies. If introduced, it may express Wandora semantics such as autonomy/effect class, structured-output requirement and bounded execution policy, while concrete runtime/provider/model mapping remains internal.

## Normalized usage contract

A runtime-neutral usage shape is now explicit at the `AgentTaskRuntime` boundary:

```ts
type NormalizedExecutionUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  totalTokens: number | null;
};
```

Current mapping:

```text
Mastra result.totalUsage
  -> MastraSupervisedModelAgentRuntime
  -> NormalizedExecutionUsage
  -> Wandora runtime caller
```

A future Runtime X must map its own equivalent into the same Wandora shape.

The deterministic runtime reports zero usage.

`estimatedProviderCost` is intentionally **not** added. No trustworthy cross-provider price/accounting source has been qualified at this boundary, and persistence is not justified merely for convenience.

No new usage table or billing persistence is introduced in this slice. Customer work result persistence remains summary + logical Wandora profile. Provider/model identity may remain operational telemetry only.

## Failure classification decision

No new failure taxonomy is introduced now.

Current behavior already collapses runtime failure into the existing fail-closed execution uncertainty boundary and performs no automatic external-effect retry. No consumer currently needs to distinguish provider timeout, invalid structured output and provider unavailability to make a different safe product decision.

A provider-neutral failure classification may be added when a real caller needs differentiated retry/recovery policy. It must not leak Mastra/provider error classes.

## Mastra native capability review

Mastra already supplies the technical execution capabilities that Wandora must not duplicate:

- provider/model invocation and a native model router;
- fallback/retry configuration;
- structured output;
- model/tool execution;
- usage reporting;
- output token settings;
- processor-based token limiting;
- processor-based cost control when observability/storage prerequisites are present.

Wandora therefore does **not** create a Provider Registry, Model Catalog, Model Router, provider SDK layer, retry engine, token-accounting engine or cost-control engine.

Current V1 deliberately sets model retries to zero. That is a Wandora safety policy implemented through the native Mastra option, not a competing retry engine.

### Token limiting

Mastra's `TokenLimiterProcessor` requires `@mastra/core >= 1.56.0`; deployed Core is `1.66.0`, so the core version is capable. Production observability/storage for persisted tripwire evidence is not currently installed/configured.

### Token cost control

Mastra's `TokenCostControl` requires `@mastra/core >= 1.59.0` and reads cumulative cost from Mastra observability data. The upstream setup requires observability plus storage packages/configuration.

Current Wandora Core has:

```text
@mastra/core          = 1.66.0
@mastra/observability = absent
persistent Mastra observability storage = not configured
```

Therefore `TokenCostControl` is **supported by version but not production-qualified/operational in Wandora**.

Do not build a Wandora cost engine to fill that gap. A future activation/cost-governance slice must qualify a native runtime guard and/or native Paperclip accounting path.

## Paperclip reuse gate — cost, secrets and runtime state

Exact v2026.916.0 source and current official docs confirm native capability for:

- company monthly budgets;
- per-agent budgets;
- project lifetime budgets;
- cost events carrying provider/model/token/cost evidence;
- company/user-scoped secrets and responsible-user resolution;
- Connections/grants for organizational/user/agent identities;
- adapter/runtime configuration.

Canonical authority split:

```text
Paperclip
  = operational spend budgets for company / agent / project / work control plane

Mastra / selected Agent Runtime
  = per-execution technical limits and native runtime cost/token guardrails

Wandora
  = plan, entitlement, customer price, margin, product policy and billing semantics
```

A Paperclip budget is not a Wandora subscription plan. A Mastra cost tripwire is not a customer invoice.

### Current integration gap

Model inference performed inside Wandora Core/Mastra is not yet proven to feed Paperclip's cost-event ledger. Therefore Paperclip's native budget system must not be described as already enforcing Mistral spend for this execution path.

This is an **activation/cost-governance qualification gap**, not a reason to build a second budget engine.

## Secret authority

### Platform-owned provider secret

When Wandora pays the Mistral account, the credential is semantically a **Wandora platform credential**:

```text
Wandora platform custody
  -> Agent Runtime Adapter deployment
  -> selected runtime
  -> selected provider
```

The current path under `/opt/wandora/stacks/core/secrets/` is acceptable as a **transitional deployment location**. It does not make Core or Mastra the semantic owner of the credential.

A future Runtime X may receive the same Wandora-owned credential through a different mount/injection mechanism without changing product/domain state.

### Tenant/BYOK provider secret

Do not implement BYOK in this slice.

For future tenant-provided credentials, Paperclip company/user secret scopes and responsible-user resolution are the leading authority where the credential belongs to Paperclip-governed work. Paperclip Connections/grants may own identity/delegation when the provider is modeled as a qualified connection.

Wandora retains entitlement/policy and must not create a second tenant secret manager. The exact injection contract into a model runtime requires a separate BYOK qualification because a model-provider credential is not automatically a Tool Gateway connection.

## Runtime portability contract

The minimum durable Wandora runtime boundary is:

```text
executeAssignedTask(Wandora task/employee context)
  -> logical Wandora profile
  -> normalized result summary
  -> normalized usage
```

Additional stable semantics already live outside Mastra:

- Wandora work admission/authorization;
- structured result expectations;
- max-output/deadline policy;
- fail-closed uncertain execution handling;
- external-effect authorization.

The contract deliberately excludes:

- Mastra `Agent`;
- Mastra thread/memory/span/processor objects;
- provider SDK objects;
- concrete provider/model IDs;
- Paperclip run/provider identifiers inside the runtime task input.

## Runtime-X substitution test

If Mastra is removed tomorrow and replaced by Runtime X, these remain unchanged:

- Wandora organization and stable IDs;
- Ana's Wandora identity/product contract;
- customer contract/UX semantics;
- Paperclip company/agent/work/run state;
- work admission and tenant authorization;
- logical profile `wandora-supervised-v1`;
- Wandora external-effect policy;
- Wandora commercial billing semantics;
- normalized usage shape;
- ownership of the platform provider credential.

These may change:

- runtime class/implementation;
- runtime-native model router/fallback;
- runtime-native token/cost guard;
- runtime telemetry internals;
- runtime tool implementation;
- concrete provider/model mapping and provider transport.

No domain/customer migration is required solely because Mastra changes.

## SECOND ADVERSARIAL REVIEW

1. **Second Model Router?** No. Concrete V1 pin is config; future routing must reuse the runtime's native capability.
2. **Second budget engine?** No. Paperclip owns operational budgets; runtime owns per-execution guard; Wandora owns commercial semantics.
3. **Second secret manager?** No. Platform secret remains host-custodied; future BYOK must reuse qualified Paperclip secret/connection authority.
4. **Duplicate Connections/grants?** No new connection state is introduced.
5. **Provider/model env becoming product contract?** Rejected: they remain internal runtime/deployment config.
6. **Platform credential coupled to Core/Mastra?** Physical path is transitional only; semantic ownership is Wandora platform.
7. **Mastra usage leaking durably?** Hardened: raw Mastra usage maps to `NormalizedExecutionUsage` at the adapter boundary.
8. **Would changing Mastra alter Ana/Paperclip?** No. The execution bridge and logical profile remain stable.
9. **Persisting convenience state?** No new table/column/profile catalog/usage history is added.
10. **Multiple homologated runtimes blocked?** No. Adding Runtime X changes internal runtime selection/implementation, not domain identity.
11. **Runtime gaining external-effect authority?** No. Human Send/Gateway outbound and other customer effects remain Wandora-owned.
12. **Budget vs billing confused?** Explicitly separated above.

The adversarial review also found and fixed the framework-specific `mastra-deterministic` durable result label before any live work row existed.

## DECISION

**Case A — ADR 0142 is sufficiently isolated.**

Clarified interpretation:

```text
concrete provider/model/base URL = internal runtime implementation config
wandora-supervised-v1            = stable Wandora logical execution/AI profile
platform provider credential     = Wandora-owned secret
Mastra                            = replaceable Agent Runtime implementation
Paperclip                         = organizational work/budget control plane
Wandora                           = product/commercial/effect authority
```

Repository-only hardening adds normalized usage to the Agent Runtime result and removes the Mastra framework name from the deterministic durable result identity.

No production mutation, migration, secret change, provider call, Paperclip work, wakeup/run or outbound effect is authorized by this ADR.

## EXECUTION / VALIDATION

This slice changed repository contracts and documentation only. It did not mutate production, mount the Mistral secret, call the provider again, create customer work or enable outbound.

Canonical Core verification on Node `22.23.2` completed GREEN after the portability hardening:

```text
base Core tests       = 126 / 126 GREEN
post-migration tests  = 30 / 30 GREEN
Core typecheck/build  = GREEN
Organization Adapter runtime E2E = GREEN
activation/work admission verifiers = GREEN
ANA_VERTICAL_SLICE_V1_VERIFY_OK
exit code             = 0
```

Focused model-runtime tests also prove that both deterministic and provider-backed assigned work return the same logical Wandora profile and normalized usage, while the concrete Mistral model remains request-local/runtime-only.

Read-only production state was rechecked before validation and remained zero-work / zero-outbound; ADR 0143's successful real-provider attestation was not repeated.

## Activation-preflight gates carried forward

Portability itself is GREEN, so a future **Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT** is architecturally permitted.

That future preflight must still resolve/qualify independently:

1. exact live adapter/Core candidate promotion and rollback;
2. provider credential mount/injection without changing semantic ownership;
3. readiness/fail-closed behavior;
4. cost-governance path — especially the current absence of proven Paperclip cost-event accounting for Core/Mastra inference and the unconfigured Mastra observability/storage prerequisites for `TokenCostControl`;
5. preservation of Human Send/Gateway outbound OFF;
6. no automatic provider retry that can create ambiguous business/effect behavior.

## Official upstream references reviewed

- Mastra model router/fallback: https://mastra.ai/blog/model-router and https://mastra.ai/blog/model-fallback
- Mastra token limiting: https://mastra.ai/blog/introducing-token-limiting
- Mastra token cost control: https://mastra.ai/blog/introducing-token-cost-control
- Paperclip costs/budgets: https://docs.paperclip.ing/reference/api/costs/ and https://docs.paperclip.ing/guides/day-to-day/costs/
- Paperclip secret scopes: https://docs.paperclip.ing/administration/secret-scopes/
- Paperclip Connections access model: https://docs.paperclip.ing/connectors/access-model/
- Paperclip Tool Gateway: https://docs.paperclip.ing/reference/api/tool-gateway/
