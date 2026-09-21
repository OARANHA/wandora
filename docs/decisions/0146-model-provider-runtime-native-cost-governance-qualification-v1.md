# ADR 0146 — Model Provider Runtime Native Cost Governance Qualification V1 — NO EFFECT

Date: 2026-09-21
Status: **Partially superseded by ADR 0147 — evidence retained; Mistral-specific activation blocker withdrawn / NO EFFECT**

Builds on: ADR 0142, ADR 0143, ADR 0144, ADR 0145

## Decision summary

ADR 0145 correctly blocked production model-runtime activation because Wandora could not yet prove an aggregate spend guard for Core/Mastra inference without inventing a second pricing/cost engine.

This qualification closes the architecture/capability-authority gap.

The minimum safe aggregate spend authority for the current platform-paid Mistral path is the provider's own **Workspace monthly spending limit**, not a new Wandora cost engine and not Mastra TokenCostControl as a hard financial ceiling.

Mistral's current official contract establishes that API keys are scoped to a Workspace, a Workspace can have its own monthly spending limit, and when the Workspace reaches that limit API requests return HTTP 429 Too Many Requests until the next billing cycle or limit change.

The existing Wandora runtime was synthetically proven to treat a provider-side 429 as a failed execution with exactly one provider request and zero automatic model retries.

The accepted authority split is:

~~~
Mistral Workspace spending limit
  = provider-account aggregate hard spend boundary

Mastra / selected Agent Runtime
  = per-execution technical guard
  = max output / deadline / zero model retry
  = optional approximate observability/cost defense-in-depth

Paperclip
  = organizational work/run authority
  = operational company/agent/project budgets
  = cost ledger when authoritative billed-cents evidence exists

Wandora
  = plan / entitlement / customer price / margin / billing semantics
  = admission / uncertainty / external-effect policy
~~~

No Wandora provider-pricing table, cost engine, usage ledger, second budget engine, provider router or second secret manager is authorized.

This ADR does not configure the real Mistral Workspace or Organization spending limit and does not call the real provider.

## REAL NOW

Repository baseline after ADR 0145:

~~~
main = 39abbeefa2531da3ed319afe6baff97f4f07e96a
PR #199 = merged
open PRs before this checkpoint branch = 0

post-merge push workflows:
  Core CI              = GREEN
  Web CI               = GREEN
  Messaging Gateway CI = GREEN
  Platform Admin CI    = GREEN
~~~

Read-only production reconciliation remains:

~~~
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF / absent
Gateway outbound    = OFF / absent
~~~

The platform Mistral credential remains host-custodied and unmounted in live Core. Its value was not read or emitted. ADR 0143's successful real-provider attestation was not repeated.

## PROVEN EVIDENCE

### 1. Paperclip is not the pricing authority for this path

Exact Paperclip v2026.916.0 source exposes:

~~~
BUDGET_METRICS = ["billed_cents"]
~~~

Its cost-event contract requires the caller to supply provider/model/token evidence plus costCents. Paperclip then aggregates costCents and evaluates its native budget policies.

Paperclip is therefore the valid operational budget and cost-ledger authority, but it does not natively turn the Core/Mastra normalized token tuple into authoritative Mistral billed cents.

Sending costCents=0 would give false confidence. Copying provider pricing into Wandora merely to compute costCents would create the duplicate pricing/cost engine rejected by ADR 0144 and ADR 0145.

### 2. Mastra TokenCostControl is useful but not a hard financial ceiling

Exact installed @mastra/core@1.66.0 contains native TokenCostControl.

Its shipped implementation/documentation proves:

- observability storage with getMetricAggregate is required;
- cumulative cost metrics are persisted asynchronously;
- fast executions may temporarily exceed the configured threshold;
- maxCost is best-effort rather than a hard ceiling;
- observability query failures allow the step to proceed;
- missing required scope identity can skip the check;
- invalid dynamic maxCost resolution can skip the check.

The exact implementation explicitly logs:

~~~
TokenCostControl: cost query failed; allowing step (fail-open)
~~~

Mastra TokenCostControl may later be adopted as defense-in-depth runtime observability/guardrail, but it is not accepted as the sole hard provider-spend gate for production activation.

### 3. Mistral provides the specialist aggregate spend capability natively

Current official Mistral administration documentation establishes:

~~~
Organization
  -> one or more Workspaces
  -> API keys scoped to a Workspace
  -> Workspace monthly spending limit
~~~

Mistral documents Workspace limits as a mechanism to separate environment/team/project budgets. When a Workspace reaches its monthly spending limit, API requests return HTTP 429 Too Many Requests.

Mistral also supports an Organization monthly spending limit as an additional account-wide ceiling.

The provider therefore already owns the most authoritative place to stop new billed inference when the configured monthly cap is exhausted.

### 4. Existing Core runtime fails closed on provider spending-limit rejection

A disposable local synthetic provider returned HTTP 429 with a synthetic monthly_spend_limit code through the exact MastraSupervisedModelAgentRuntime.

Observed result:

~~~
requests = 1
retries  = 0
result   = rejected / fail-closed
~~~

The underlying AI SDK classified the synthetic 429 as retryable, but the Wandora-qualified Mastra Agent has maxRetries=0, so no second provider request was sent.

No Mistral credential or network call was used by this proof.

### 5. Paperclip recovery cannot silently cause a second inference charge for the same Wandora work

Paperclip contains generic issue-recovery behavior after a failed adapter run. This was reviewed adversarially because a provider spending-limit rejection must not become an ambiguous second model call.

The Wandora work journal closes this boundary before model execution.

The first runtime failure causes:

~~~
digital_employee_work_operations.status
  executing -> execution_uncertain
~~~

For the same workId:

- the same Paperclip run is rejected because it already has an unresolved execution receipt;
- a different Paperclip run is rejected because another provider_run_ref is already bound.

Both checks execute in prepareCatalogEmployeeWorkExecution before runtime.executeAssignedTask.

Canonical tests already prove one runtime call on runtime failure, exact work marked uncertain, no retry inside the bridge, and rejection of a different provider run for already-bound work.

Therefore Paperclip may create/reconcile control-plane recovery state, but it cannot transparently create a second Mistral inference for the same uncertain Wandora work.

### 6. Existing per-execution bounds remain defense in depth

~~~
maxSteps          = 1
maxRetries        = 0
maxOutputTokens   = 768
provider deadline = 45 seconds
bridge deadline   = 60 seconds
structured output = required
external effects  = none
~~~

These controls bound one execution. They do not replace the Mistral Workspace monthly spending limit.

## CAPABILITY AUTHORITY / REUSE GATE

The gap was re-run through the authority gate before introducing persistence or services.

**Wandora provider pricing table — rejected.** It would make Wandora synchronize provider prices and interpret provider billing.

**Wandora aggregate token/cost ledger — rejected.** Normalized usage is a useful adapter contract but does not become authoritative Mistral billing.

**Paperclip budget directly from normalized tokens — rejected for current version.** Paperclip's native budget metric is billed_cents and the caller must supply cost cents.

**Mastra TokenCostControl as sole hard cap — rejected.** It is intentionally approximate and contains fail-open paths.

**Mistral Workspace monthly spending limit — accepted.** The provider already owns billed usage, the Workspace containing the production API key, aggregate monthly spend calculation and enforcement.

## GAPS

One operational proof remains before production runtime activation:

> Prove that the production platform credential custodied by Wandora belongs to a dedicated production Mistral Workspace with an explicit finite monthly spending limit appropriate to the activation boundary.

The current no-effect slice cannot infer that fact from secret-file metadata. It must not read/emit the key, call the real provider merely to discover account configuration, assume the key belongs to the default Workspace, assume an Organization cap exists, or mutate the provider account without a separately reviewed effect.

Preferred production shape:

~~~
Mistral Organization
  -> dedicated Wandora Production Workspace
      -> explicit monthly spending limit
      -> dedicated production API key
          -> Wandora platform-secret custody
          -> Core read-only mount only during activation
~~~

An Organization-level spending limit may remain as an additional ceiling but does not replace the dedicated production Workspace boundary.

## DECISION

Native cost-governance architecture/capability qualification is **GREEN**.

The hard aggregate provider-spend boundary is a provider-native Mistral Workspace spending limit.

Production runtime activation remains **NO-GO** until provider-account evidence proves the real production key is scoped to a dedicated capped Workspace.

Once that operational proof is GREEN, no additional Wandora cost engine is required before model-runtime activation.

## SECOND ADVERSARIAL REVIEW

1. A Mistral Workspace cap does not replace Paperclip budgets; it protects provider-account spend.
2. It does not replace Wandora commercial billing, customer price, margin, entitlement or invoice semantics.
3. It does not replace max-output/deadline/one-step/zero-retry runtime controls.
4. TokenCostControl is optional defense in depth, not a hard financial gate.
5. A provider 429 is not retried by the current runtime: synthetic proof observed one request.
6. Generic Paperclip recovery cannot produce a second inference for the same uncertain Wandora work because the work journal rejects it before runtime invocation.
7. An Organization cap is useful defense in depth, but the dedicated production Workspace cap is the preferred key-scoped boundary.
8. Host secret metadata cannot prove Workspace ownership.
9. Wandora must not copy Mistral pricing merely to populate Paperclip cost events as an activation-critical authority.
10. Durable/customer execution identity remains wandora-supervised-v1; provider/model stay operational details.
11. Reaching the cap does not authorize provider fallback. V1 fails closed.
12. Spending-limit failure authorizes no external effect; Human Send and Gateway outbound remain separate and OFF.

## EXECUTION PERFORMED

This slice performed only canonical reconciliation, source/capability review, current official Mistral documentation review, a disposable synthetic HTTP 429 proof and retry-boundary analysis.

It did not configure/change a Mistral Workspace or Organization limit, read/emit an API key, call Mistral, change Core, install adapter 0.3.0, create work, create issue/wakeup/run/session, apply migration, enable Human Send/Gateway outbound or send a message.

## VALIDATION

Production remains deliberately dormant:

~~~
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF
Gateway outbound    = OFF
~~~

The zero-work/zero-outbound MEDICSPRO checkpoint must be freshly reconciled in the next operational slice.

## Next slice

**Mistral Production Workspace Spending-Limit + Credential Scope Preflight V1 — NO EFFECT**

That slice must:

1. reconcile canonical main, production and zero-work/outbound state;
2. identify the Workspace owning the intended production API key without exposing the key;
3. prove that Workspace is dedicated to Wandora production, or define a separately reviewed replacement-key plan;
4. prove an explicit finite monthly Workspace spending limit is configured;
5. record only non-secret Workspace identity/limit evidence required for activation;
6. make no model inference call;
7. make no spending-limit change during the preflight;
8. stop before mounting the key or switching live Core.

If that provider-account preflight is GREEN, the separately reviewed Model Provider / Mistral Production Runtime Activation Execution V1 may be re-opened.

## Official upstream references reviewed

- https://docs.mistral.ai/admin/billing-usage/usage-limits
- https://docs.mistral.ai/getting-started/quickstarts/admin/manage-workspaces
- https://docs.mistral.ai/admin/identity-access/api-keys
- https://docs.mistral.ai/admin/admin-api/usage-metrics
- https://docs.mistral.ai/admin/billing-usage/billing
- https://mastra.ai/reference/processors/token-cost-control
- https://docs.paperclip.ing/reference/api/costs/
