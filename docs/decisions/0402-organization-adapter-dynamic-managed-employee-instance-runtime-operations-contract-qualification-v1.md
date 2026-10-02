# ADR 0402 — Organization Adapter Dynamic Managed Employee Instance Runtime Operations Contract Qualification V1

Status: **QUALIFIED / EXISTING PAPERCLIP NO-CREATE LOOKUP REUSED / INSTANCE-AWARE RUNTIME CONTRACT FROZEN / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

Date: 2026-10-02

## Context

ADR 0394 established `wandora.digital_employees.id` as the canonical digital-employee **instance** identity and kept provider Agent IDs behind the private provider binding. ADRs 0396–0400 qualified a provider-owned exactly-one dynamic Agent primitive and a disposable Organization Adapter 0.7.0 overlay exposing only `employee-ensure-dynamic`. ADR 0401 then proved that Core cannot switch hire to the dynamic Agent coherently while activation, work, capability projection, Fast Read and Paperclip run identity still resolve the legacy singleton by `catalogKey`.

This slice qualifies the smallest safe runtime contract for the exact already-bound dynamic Agent. It does **not** migrate Core, alter the hire journal, promote Organization Adapter 0.7.0, deploy Paperclip, or perform any provider/runtime effect.

The permanent ADR 0168 guardrail applies:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply implementation internalization.

## REAL NOW

Fresh GitHub reconciliation before decision proved:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #400 remains open, draft, mergeable and unmerged;
- PR #400 exact head is `2a08d1a761cdccacec72af99194ff9d696979b35`;
- PR #400 base is PR #399 branch `feat/organization-adapter-dynamic-managed-employee-bridge-v1` at `1a10fe92338e9605b1c267a5e6c09110b606196a`;
- one exact-head workflow read showed **11/11 completed/success** for PR #400;
- no workflow was rerun and no polling was performed;
- PRs #397–#400 remain a stacked, unmerged dynamic-managed qualification chain;
- canonical Organization Adapter source remains 0.6.1; 0.7.0 remains an isolated disposable overlay candidate.

No production/runtime read was required to answer this contract question, and no production surface was mutated.

## PROVEN EVIDENCE

### Canonical Wandora identity and durable binding already exist

The repository already has the correct durable replacement boundary:

`wandora_private.digital_employee_provider_bindings`

Its semantic shape is:

`organization + digital_employees.id + provider -> provider_agent_ref`

Therefore:

- `wandora.digital_employees.id` is canonical employee-instance identity;
- `provider_agent_ref` is private and replaceable;
- `catalog_key` remains template/offering/spec-policy selector;
- no second employee-to-provider binding table is justified.

The current Core customer/supervision APIs already address activation, work and Fast Read by `employeeId`. The singleton regression occurs only after Core crosses the provider adapter boundary.

### Current Organization Adapter runtime operations are still singleton/static

Canonical Organization Adapter 0.6.1 still resolves:

- activation with `ctx.agents.managed.get(CATALOG_KEY, companyId)`;
- work with the same managed catalog Agent and issue assignment to that Agent;
- operational capability projection with the same managed Agent ID;
- Fast Read with the same managed Agent ID, then `ctx.agents.invoke(...)` and `ctx.agentRuns.get(...)`.

The disposable 0.7.0 overlay adds `employee-ensure-dynamic` only. It does not replace those inherited static paths.

### Paperclip already exposes a pure no-create Agent read

Pinned Paperclip `d554c4789ed3930f8a53ac9fdf6503b3187097da` exposes:

`ctx.agents.get(agentId, companyId) -> Agent | null`

under capability:

`agents.read`

This is a read, not an ensure/create primitive.

Paperclip enforces company scope twice:

1. the host-client invocation scope requires the requested `companyId` to equal the current plugin invocation company;
2. plugin-host service loads the Agent by ID and returns it only when `inCompany(agent, companyId)`.

A cross-company Agent ID therefore does not become a cross-tenant lookup oracle.

The same provider capability also authorizes `ctx.agents.list`. This is broader than the single lookup the future candidate needs, but it is Paperclip's existing read-capability granularity. This ADR does not redesign the provider capability model merely to split `get` from `list`.

The future Organization Adapter candidate must never call `ctx.agents.list` for this contract, and its qualification must include a static/behavioral guard proving that.

### `ensureDynamic` is not lookup

The qualified provider primitive:

`ctx.agents.managed.ensureDynamic(...)`

is deliberately **create-or-resolve**. It owns provider-side resource marker, fingerprint, advisory locking, uniqueness, `pluginManagedResources` correlation and native `hire_agent` approval lifecycle.

It must not be reused after hire merely because it can sometimes return an existing Agent. Doing so would reintroduce an accidental create path into activation/work/read operations.

### Provider marker already supplies immutable dynamic correlation

The qualified dynamic Agent carries provider-owned metadata:

`metadata.paperclipDynamicManagedAgent`

with at least:

- `pluginKey`;
- `resourceKey`;
- `creationFingerprint`.

For a Wandora employee instance the qualified resource key is:

`wandora-digital-employee:<canonical employee UUID>`

The marker is provider implementation state. Wandora must not mirror the marker or fingerprint as product state.

### Provider lifecycle is already authoritative

Pinned Paperclip Agent statuses are:

- `active`;
- `paused`;
- `idle`;
- `running`;
- `error`;
- `pending_approval`;
- `terminated`.

Paperclip's work eligibility marks `active|paused|idle|running|error` assignable and `active|idle|running|error` invokable. `paused|pending_approval|terminated` are non-invokable.

Current Organization Adapter operations intentionally use narrower operation-specific gates:

- activation: `paused -> resume`, or already `idle` as idempotent success;
- supervised work admission: `idle|error`;
- Fast Read: delegate final invokability to native `agents.invoke`.

This contract preserves those semantics rather than creating a Wandora lifecycle machine.

There is no Paperclip Agent status named `rejected`; rejection is approval-domain state. Runtime operations observe the resulting actual Agent state and never reprovision on rejection/termination.

### Current execution identity is static-only

`PaperclipRunIdentity` currently verifies actual Paperclip Agent ID/company from `/api/agents/me`, but then requires legacy:

`metadata.pluginManagedAgent.agentKey = ana-commercial-v1`

The execution resolver discards the actual Agent ID for employee correlation and derives the synthetic:

`paperclipManagedAgentRef(company, catalogKey)`.

That is valid for the legacy static path only. It is not valid for dynamic instances.

## GAPS

Without an instance-aware provider-operation contract, a dynamic hire could bind one Paperclip Agent while downstream operations act on a different static singleton.

The gaps are:

1. no pure dynamic instance resolver exists in Organization Adapter;
2. downstream provider calls do not carry canonical employee correlation;
3. activation/work/capabilities/Fast Read still resolve by `catalogKey`;
4. Fast Read provider receipt does not currently bind its dispatch fingerprint to employee ID + provider Agent ref because the old path assumed one Agent per company/catalog;
5. Paperclip execution identity accepts only the static marker;
6. legacy static and future dynamic paths need explicit coexistence without silent fallback.

The hire-journal singleton constraint remains a separate gap and is not solved here.

## CAPABILITY AUTHORITY / REUSE GATE

### Wandora-owned

Wandora owns:

- canonical `digital_employees.id`;
- tenant/customer authorization;
- employee product state and policy;
- `catalogKey` as template/offering semantics;
- the minimum private `digital_employee_provider_bindings` mapping;
- provider-neutral Core contracts using `employeeId`;
- fail-closed admission and effect policy.

### Organization Adapter-owned

Organization Adapter owns the provider-specific translation and correlation boundary:

- translating canonical employee instance + private binding into Paperclip calls;
- validating the Paperclip dynamic marker before operational use;
- keeping Paperclip marker/status/API details out of Wandora public contracts;
- preserving strict legacy compatibility while a dynamic path is introduced.

### Paperclip-owned

Paperclip remains authority for:

- Agent creation/hire/approval/lifecycle;
- Agent metadata marker/fingerprint;
- pause/resume;
- issue assignment/wakeup;
- run lifecycle/result;
- Tool Gateway and operational capability/read-tool authority;
- native Agent invokability/work eligibility.

### Rejected alternatives

**Reuse `ensureDynamic` as runtime lookup** — rejected. It may create.

**Create a second Wandora registry/binding/cache** — rejected. Existing private binding is sufficient.

**Create a new Paperclip `getDynamic` primitive now** — rejected for this slice. Existing `agents.get` is sufficient to correlate one exact Agent. The only deficiency is provider-native capability granularity (`agents.read` also permits list), which does not by itself prove a need to fork the provider capability model.

**Keep resolving by `catalogKey` after dynamic hire** — rejected. It targets the wrong identity class.

## DECISION

### 1. No-create correlation primitive

The qualified runtime resolver is:

`ctx.agents.get(providerAgentRef, companyId)`

with capability:

`agents.read`.

It is used only after the provider Agent ref is already present in the Wandora private employee binding.

The future candidate must not call `agents.list` for this contract.

### 2. Addressing contract

Core/customer-facing contracts remain:

`organizationId + employeeId + operation payload`

The internal provider-operation tuple becomes:

`providerCompanyRef/companyId + employeeId + providerAgentRef`

and may additionally carry `catalogKey` only as a supported template/policy selector.

**Identity is the pair of canonical employee ID plus its private provider binding, scoped to the provider company. `catalogKey` is never an employee locator.**

For Paperclip dynamic bindings, `providerAgentRef` is the actual Paperclip Agent ID returned by `ensureDynamic`.

### 3. Dynamic correlation helper

Before any dynamic runtime operation the Organization Adapter candidate must:

1. canonicalize/validate `employeeId`;
2. validate `providerAgentRef` as the expected Paperclip Agent ID form;
3. call exactly `agents.get(providerAgentRef, companyId)`;
4. fail closed on null/error/timeout;
5. require returned Agent ID to equal `providerAgentRef`;
6. require exactly the dynamic marker shape, not the legacy static marker;
7. require marker `pluginKey = wandora.organization-adapter-v1`;
8. require marker `resourceKey = wandora-digital-employee:<employeeId>`;
9. require a syntactically valid provider fingerprint;
10. reject both-marker, malformed-marker, wrong-resource, wrong-company and wrong-ref cases.

No call in this helper may create, reconcile or ensure an Agent.

### 4. Activation

Dynamic activation must operate only on the exact correlated Agent.

Qualified state behavior:

- `paused`: call `agents.resume(providerAgentRef, companyId)`;
- `idle`: idempotent success, no resume call;
- `active|running|error|pending_approval|terminated` or unknown: fail closed for activation in V1.

After a resume, perform a fresh exact `agents.get` and require the same dynamic correlation plus status `idle`.

Activation never invokes work and never calls `ensureDynamic`.

### 5. Supervised work

Dynamic work must:

- correlate the exact Agent first;
- preserve current V1 pre-admission states `idle|error`;
- create/reuse the Paperclip Issue with `assigneeAgentId = providerAgentRef`;
- require any reused Issue to retain that exact assignee;
- use existing Paperclip issue/wakeup lifecycle and plugin-state dispatch receipt;
- fail closed if employee ID/ref/assignee/request receipt changes.

No alternate Agent selection is permitted.

### 6. Operational capability projection

Dynamic capability projection must:

- correlate the exact Agent first;
- call the existing Paperclip operational-read surface with `agentId = providerAgentRef`;
- preserve bounded provider-neutral BusinessCapability projection;
- create no registry/cache/mirror.

Agent lifecycle remains Paperclip-owned; this read path does not resume/invoke/create.

### 7. Fast Read

Dynamic Fast Read must:

- correlate the exact Agent;
- include `employeeId + providerAgentRef` in the provider-side dispatch receipt/fingerprint in addition to correlation/intent/request;
- call `agents.invoke(providerAgentRef, companyId, ...)`;
- use the same `providerAgentRef` for `agentRuns.get`;
- return only the existing bounded result.

Fast Read does not duplicate Paperclip's invokability state machine. Native `agents.invoke` remains final provider authority for `active|idle|running|error` versus `paused|pending_approval|terminated`.

Ambiguous dispatch remains fail-closed; no blind second invoke is authorized.

### 8. Paperclip execution identity

`PaperclipRunIdentity` must become an internal discriminated compatibility contract:

- **legacy static**: keep existing `pluginManagedAgent` validation and synthetic `managed:v1` binding;
- **dynamic managed**: accept the provider-owned `paperclipDynamicManagedAgent` marker only after exact Paperclip Agent ID/company validation.

For the dynamic branch:

1. parse canonical employee UUID from `wandora-digital-employee:<uuid>`;
2. map Paperclip company -> active Wandora organization through the existing control-plane binding;
3. query the existing private employee provider binding for:
   - same organization,
   - parsed employee ID,
   - provider `paperclip`,
   - `provider_agent_ref = actual Paperclip Agent ID`;
4. require exactly one active/supervised canonical employee;
5. reject mismatch/absence/ambiguity.

The provider marker proposes correlation; the Wandora private binding proves it. The marker alone never becomes Wandora authority.

### 9. Legacy static + dynamic coexistence

Legacy static runtime routes remain unchanged during migration.

The dynamic candidate must use sibling instance-aware provider endpoints/contracts rather than silently widening the strict legacy request bodies. Qualified private endpoint keys for the implementation candidate are:

- `employee-activate-dynamic`;
- `employee-work-dynamic`;
- `employee-capabilities-dynamic`;
- `employee-fast-read-dynamic`.

Their common correlation fields are:

- `companyId`;
- `employeeId`;
- `providerAgentRef`;
- `catalogKey` as template/policy selector only.

Dynamic endpoints never fall back to `managed.get(CATALOG_KEY)`, static Agent resolution or `ensureDynamic`.

Legacy endpoints never reinterpret `catalogKey` as employee-instance identity.

## Mandatory candidate tests

The implementation slice must prove at least:

### Correlation

- correct employee/ref/company;
- missing Agent;
- wrong employee UUID for resource key;
- wrong provider Agent ref;
- wrong company/cross-company ref;
- legacy static marker on dynamic endpoint;
- malformed dynamic marker;
- wrong plugin key;
- wrong resource key;
- both static + dynamic marker ambiguity;
- unknown/extra marker state fails closed where relevant;
- zero calls to `ensureDynamic` and zero calls to `agents.list`.

### Lifecycle/status

- paused activation resumes exact Agent;
- idle activation is idempotent;
- active/running/error activation fails closed;
- pending_approval activation fails closed;
- terminated activation fails closed;
- approval rejection is represented by actual provider outcome, never a fabricated Agent `rejected` status;
- work accepts only the current qualified `idle|error` pre-admission states;
- Fast Read leaves final invokability to native `agents.invoke`.

### Work / Fast Read / replay

- wrong assignee is rejected;
- same work replay converges to same Paperclip Issue/receipt;
- changed employee/ref under same work identity conflicts;
- same Fast Read correlation + same employee/ref/request may reuse exact receipt;
- same correlation rebound to a different employee/ref conflicts;
- Fast Read invokes exactly the bound ref and reads terminal result from exactly that ref;
- timeout/uncertain dispatch does not trigger blind second invoke.

### Execution identity

- legacy static run still resolves exactly as before;
- valid dynamic run resolves through actual Agent ID + marker + private binding;
- dynamic marker employee mismatch rejects;
- provider binding mismatch rejects;
- cross-company run rejects;
- both-marker ambiguity rejects;
- missing binding rejects;
- inactive/unavailable canonical employee rejects.

## SECOND ADVERSARIAL REVIEW

The first mandatory JEV review returned:

- `deep_review = 0.94`;
- confidence `0.93`.

It specifically forced deeper treatment of provider-read privilege and lifecycle semantics.

After proving Paperclip's two-layer company scoping, the provider-native `agents.read` grouping, exact status eligibility rules, and preserving operation-specific current behavior, a focused second pass returned:

- `proceed_fast = 0.49`;
- `deep_review = 0.47`;
- `block = 0.02`;
- `split_task = 0.02`;
- confidence `0.32`.

Because this slice performs documentation only, the remaining concern is recorded as an implementation guard rather than hidden:

- adding `agents.read` grants same-company Agent list capability at the provider level;
- the candidate may use only exact `agents.get`;
- candidate tests/static verification must reject `agents.list`;
- if future security policy requires host-enforced get-only capability granularity, that is a separate Paperclip provider-capability slice, not a reason to duplicate Agent state in Wandora.

JEV remains advisory. Deterministic repository/provider evidence and ADR 0168 remain authoritative.

## EXECUTION

Execution for this slice is documentation only.

No runtime/provider code is changed here because freezing the contract before writing a dynamic multi-path candidate is safer and keeps the next code diff reviewable.

## VALIDATION

The qualified contract satisfies the required questions:

- **A — no-create correlation:** `agents.get(providerAgentRef, companyId)` + marker/resource-key validation;
- **B — addressing:** both canonical `employeeId` and private `providerAgentRef`, company-scoped; `catalogKey` only as template selector;
- **C — activation:** exact Agent, paused->resume / idle idempotent, no create;
- **D — work:** exact bound Agent as Paperclip Issue assignee;
- **E — capability projection:** exact bound Agent operational snapshot;
- **F — Fast Read:** exact bound Agent invoke and terminal result, employee/ref-bound receipt;
- **G — execution identity:** actual Paperclip Agent ID/company + dynamic marker + canonical private binding cross-check;
- **H — compatibility:** explicit legacy static branch plus explicit dynamic sibling path; no fallback between them.

No Wandora lifecycle, Agent registry, Tool Gateway mirror, result store or provider marker store is introduced.

## Effects and non-effects

This ADR authorizes **no production effect**.

It does not:

- merge any PR;
- deploy or restart Paperclip/Core/Organization Adapter;
- promote Organization Adapter 0.7.0;
- change Paperclip plugin registry;
- push an image;
- create/resume/invoke a real Agent;
- call VendaERP;
- send outbound;
- mutate a database;
- add a migration;
- alter the hire journal;
- enable workforce runtime.

## Remaining blockers and next slices

Still separately required before multiple same-template hires:

**Digital Employee Hire Journal Multi-Instance Schema Qualification V1 — NO PRODUCTION MIGRATION**

Next executable code slice for this contract:

**Organization Adapter Dynamic Managed Employee Instance Runtime Operations Candidate V1 — CODE ONLY / NO PRODUCTION EFFECT**

That candidate must implement the exact qualified instance-aware provider operations and tests above without changing Core's public employee identity or production.

Only after both the runtime-operations candidate and the separate hire-journal qualification are closed should:

**Core Dynamic Employee Instance Binding Migration V1 — CODE ONLY / NO PRODUCTION EFFECT**

resume coherently across hire, activation, work, capability projection, Fast Read and execution binding.
