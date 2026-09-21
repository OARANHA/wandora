# ADR 0147 — Provider-Neutral Runtime Risk Guard + Cost Governance Correction V1

Date: 2026-09-21
Status: **Accepted — supersedes the activation-blocking cost requirement in ADR 0145/0146 / NO EFFECT**

Builds on: ADR 0142, ADR 0143, ADR 0144, ADR 0145, ADR 0146

## Decision summary

ADR 0144 established the correct long-term architecture:

- Wandora owns the stable logical AI/runtime contract and policy;
- Mastra is a replaceable Agent Runtime implementation;
- Mistral is a replaceable inference provider;
- concrete provider/model/base URL are implementation details;
- `wandora-supervised-v1` is the current stable logical execution identity;
- no Wandora model router, provider registry, pricing engine or second budget ledger is authorized.

ADR 0145 and ADR 0146 then over-constrained production activation by promoting one provider-specific financial mechanism — a Mistral Workspace monthly spending limit — into a universal activation prerequisite.

That activation blocker is **superseded**.

A provider-specific spending cap is useful defense in depth when the commercial/provider exposure makes it appropriate. It is not part of the portable Agent Runtime contract and is not a universal prerequisite to activate a model-backed runtime that creates no work by itself.

The activation-critical guard is provider-neutral and already proven for the current candidate.

## REAL NOW

Canonical starting point:

~~~text
main = 47e5d43ed4419e0608ec34b3d941611a8cbd708d
open PRs = 0

post-merge push workflows:
  Core CI              = GREEN
  Web CI               = GREEN
  Messaging Gateway CI = GREEN
  Platform Admin CI    = GREEN
~~~

Read-only production reconciliation immediately before this correction remained:

~~~text
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF / absent
Gateway outbound    = OFF / absent

MEDICSPRO Ana       = exactly 1 / active + supervised
MEDICSPRO work      = 0
MEDICSPRO outbound  = 0
~~~

No production runtime mutation is part of this ADR.

## PROVEN EVIDENCE

### 1. ADR 0144 is already provider-neutral

The canonical authority map and architecture already define:

~~~text
Wandora logical profile / policy
        |
        v
Agent Runtime Adapter
        |
        +--> Mastra today
        +--> Runtime X later
        |
        v
replaceable model provider
~~~

The provider/model pair is not durable product identity.

### 2. The current model-backed candidate has provider-neutral execution guards

The qualified current candidate already enforces:

~~~text
maxSteps          = 1
maxRetries        = 0
maxOutputTokens   = 768
provider deadline = 45 seconds
bridge deadline   = 60 seconds
structured output = required
provider fallback = none
external effects  = none
~~~

Configuration is fail-closed. The model credential is file-backed and remains unmounted from live Core until activation.

Synthetic failure probes already proved one request / zero retry for timeout, provider 503, invalid structured output and provider 429.

### 3. Work admission and ambiguity are independently bounded

Runtime activation does not create customer work.

Legitimate customer work is admitted separately through the existing Wandora/Paperclip contract:

~~~text
customer authorization
  -> stable Wandora work request
  -> Paperclip issue/run authority
  -> exact run identity
  -> Wandora execution bridge
  -> Agent Runtime
~~~

On runtime ambiguity/failure, the Wandora work journal moves the exact work to `execution_uncertain`.

That prevents the same work from silently causing a second model invocation through either:

- replay of the same provider run; or
- a different provider run bound to the same work.

This is a provider-neutral safety property.

### 4. Provider-specific financial controls are not the same thing as runtime safety

A provider may expose account/project/workspace spending controls.

Those controls are useful for provider-account financial exposure, but they vary by provider and commercial arrangement.

They do not define:

- Wandora employee identity;
- Wandora AI profile;
- Agent Runtime semantics;
- Paperclip work/run authority;
- customer plan/entitlement;
- external-effect authorization.

Therefore they cannot be promoted into the universal runtime contract.

### 5. Paperclip budgets, runtime guards and Wandora billing remain distinct

The accepted authority split is:

~~~text
Paperclip
  = organizational work/run authority
  = operational budgets

Agent Runtime
  = per-execution technical guardrails
  = provider invocation implementation

Provider account
  = provider-specific commercial/account controls when applicable

Wandora
  = logical AI/runtime profile
  = customer policy/entitlement
  = commercial plan/price/margin/billing
  = external-effect authorization
~~~

No layer must impersonate another merely to make one provider's current account model universal.

## CAPABILITY AUTHORITY / REUSE GATE

### Wandora provider-pricing table

Rejected.

It would duplicate provider pricing authority and create a synchronization burden.

### Wandora universal model router

Rejected.

Routing/provider invocation remains a runtime implementation capability behind the Agent Runtime Adapter.

### Wandora second budget/cost ledger

Rejected.

Paperclip remains operational budget authority. Wandora owns commercial product semantics, not a cloned provider ledger.

### Mandatory Mistral Workspace spending cap as a universal runtime prerequisite

Rejected and superseded.

It binds production readiness to one provider's account structure and breaks the replaceability boundary established by ADR 0144.

### Provider-native spending controls as optional/conditional defense in depth

Accepted.

When a provider/account can create material metered monetary exposure, or when unattended/high-volume workloads are introduced, the relevant provider-native account/project/workspace control should be reviewed and qualified where available.

That review is provider-specific operational governance, not a universal Agent Runtime contract.

## DECISION

### Universal activation-critical guard

The portable production guard for `wandora-supervised-v1` is:

~~~text
bounded admitted work
+ exact tenant/employee/run identity
+ maxSteps = 1
+ maxRetries = 0
+ bounded output
+ bounded deadline
+ structured output
+ fail-closed configuration
+ no automatic provider fallback
+ ambiguity journal / no silent replay
+ no implicit external effect
~~~

A future Runtime X must satisfy equivalent Wandora semantics even if its native implementation differs.

### Provider-specific spend controls

Provider spending caps remain permitted and recommended when they materially reduce real financial exposure.

They are not required merely because the active implementation happens to be Mistral.

### ADR 0145

The technical activation mechanics, ordering, rollback and all non-cost gates from ADR 0145 remain valid.

Its statement that aggregate cost governance is the only activation blocker is superseded by this ADR.

### ADR 0146

The following ADR 0146 findings remain useful:

- Mistral exposes Workspace spending controls;
- Mastra TokenCostControl is not a hard financial ceiling;
- Paperclip billed-cents budgets require authoritative cost evidence;
- Wandora must not build a duplicate pricing/cost engine;
- provider 429 fails closed with zero automatic retry.

The following ADR 0146 decision is superseded:

> A dedicated capped Mistral Workspace is required before model-runtime activation.

It is not a universal production-runtime prerequisite.

### Activation verdict

~~~text
Model Provider / Mistral Production Runtime Activation Execution V1
= ARCHITECTURALLY GO
~~~

This GO authorizes only the separately reviewed activation mechanics already frozen by ADR 0145.

It does **not** itself authorize a production mutation.

The activation execution must still:

1. freshly reconcile main/runtime/zero-work/zero-outbound;
2. verify the exact adapter 0.3.0 artifact/provenance;
3. promote adapter 0.3.0 before Core;
4. prove Paperclip healthy and Ana still idle with zero runs;
5. verify exact Core candidate/provenance;
6. mount the existing host-custodied platform credential read-only;
7. switch Core to `mastra-supervised-model`;
8. require Core healthy + ready;
9. prove Human Send and Gateway outbound remain OFF;
10. stop before creating any customer work.

## SECOND ADVERSARIAL REVIEW

1. **Could activating Core immediately create provider spend?** No. Runtime activation does not create Paperclip work, wakeups, routines or runs. The model is reached lazily through the reviewed work path.
2. **Could an idle Ana spontaneously invoke the model because Core changes runtime mode?** No reviewed activation step invokes Ana or creates work. The existing Paperclip agent remains idle and the execution bridge requires a legitimate run.
3. **Could one failed work silently retry and multiply provider usage?** The current runtime has zero model retries and the Wandora work journal blocks uncertain replay before a second runtime invocation.
4. **Does removing the mandatory Mistral cap mean provider financial controls are forbidden?** No. They remain optional/conditional defense in depth.
5. **Does this make provider cost irrelevant?** No. It means provider cost is not the universal runtime identity/safety contract.
6. **Should Wandora now add a generic maxRunCost field/table?** No. That would be speculative policy/state without a qualified portable enforcement consumer.
7. **Should Mastra TokenCostControl become mandatory?** No. Its current cumulative path is approximate and fail-open in some error cases.
8. **Should Paperclip receive fake/zero cost events?** No.
9. **Should activation also create the first work item?** No. First legitimate customer work remains a separate owner-driven effect slice.
10. **Should broad unattended workloads be enabled immediately after activation?** No. Recurrence/high-volume work requires separate operational consumption governance and customer-policy review.
11. **Does this restore provider/runtime replaceability?** Yes. A future Runtime X/provider Y must satisfy the same Wandora execution semantics without inheriting a Mistral-specific account prerequisite.
12. **Does this weaken external-effect safety?** No. Human Send and Gateway outbound remain independent and OFF.

## EXECUTION / VALIDATION

This ADR changes documentation/decision state only.

It does not:

- change live Core;
- mount the model credential;
- call Mistral;
- install adapter 0.3.0;
- create work;
- create Paperclip issue/wakeup/run/session;
- apply migration;
- enable Human Send;
- enable Gateway outbound;
- send any message.

Production must remain deterministic and zero-work after this checkpoint.

## Next slice

After this correction is merged and its exact-head CI is GREEN:

**Model Provider / Mistral Production Runtime Activation Execution V1**

That is a separate production-effect slice.

It must reuse ADR 0145's frozen promotion/rollback order, with ADR 0147 controlling the provider-neutral risk/cost interpretation.

It must stop immediately after proving the model-backed runtime healthy and dormant.

The first genuine MEDICSPRO model-backed work remains a later separate effect slice.
