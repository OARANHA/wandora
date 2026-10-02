# ADR 0393 — Digital Employee Effect Authority & Paperclip-backed Cross-Employee Handoff Minimal Contract Preflight V1

Date: 2026-10-02

Status: **EFFECT-AUTHORITY OWNERSHIP QUALIFIED / HANDOFF SHAPE QUALIFIED / IMPLEMENTATION BLOCKED ON MULTI-EMPLOYEE WORKFORCE / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0392 separated four concepts that must not collapse into one another:

1. employee responsibility;
2. business/effect authorization;
3. provider operational access;
4. work assignment/handoff.

This preflight asks whether a minimum portable contract can now be justified without creating a second task engine, and whether the current Wandora/Paperclip runtime is actually capable of implementing it.

The governing rule remains ADR 0168:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Fresh reconciliation proved:

- PR #392 is open, draft, mergeable and unmerged;
- PR #392 exact head = `1b81f1f38152cea835d54f5dabddeafab4522acf`;
- its base is PR #391 head `956f9d65ecb43843ccb635a107a61cbfbf7aae71`;
- one exact-head workflow read observed 10/10 workflows completed successfully;
- no workflow was rerun and no polling occurred.

No production/VPS/provider/customer mutation is needed for this authority qualification.

## 1. Effect Authority — ownership qualification

### Responsibility is insufficient

The existing employee-development contract stores free-text:

- responsibility;
- behavior;
- practice.

Responsibility means what the employee is expected to own, prioritize or escalate.

That is valuable product semantics, but it is not a security or effect authorization primitive.

A statement such as:

> Iris is responsible for vendas.

cannot safely imply:

- create order;
- alter price;
- reserve stock;
- issue invoice;
- send NF-e;
- charge payment;
- send WhatsApp;
- use a specific provider credential.

Those are separate effects.

### Provider grants are also insufficient

Paperclip Connections, grants, Tool Profiles and Tool Gateway answer whether provider/runtime access is operationally available and authorized.

They do not define the customer-facing business meaning:

> This employee is allowed by this company to perform this business effect.

If Paperclip is replaced, that business policy must not disappear.

Therefore a structured employee effect-authority semantic is a legitimate Wandora-owned gap under the Reuse Gate.

## 2. Minimum candidate semantics

No schema is authorized in this preflight, but the minimum portable product contract is qualified as:

```text
Organization
  + canonical DigitalEmployee
  + provider-neutral finite EffectKey
  + lifecycle: active | revoked
  + granted/revoked by authorized human policy actor
  + audit/provenance
```

An active grant means only:

> this canonical employee is eligible for this effect.

It does **not** mean:

> execute now.

Actual execution remains the conjunction of all required gates:

```text
employee effect authority
AND employee/organization active
AND current tenant scope
AND effect-specific policy
AND required human confirmation/approval, when applicable
AND current provider capability/access
AND current connection/grant/tool policy
AND runtime/effect-time revalidation
AND idempotency/audit/effect reconciliation
```

Any missing gate fails closed.

### Default deny

Absence of a grant is denial.

Revocation is denial for future effect execution.

No responsibility text, model inference, Paperclip assignment, provider grant or successful past run may synthesize an employee effect grant.

### No new concrete effect is activated

This ADR does not authorize a first production `EffectKey`.

Current boundaries remain unchanged:

- Human Send still requires its existing owner/admin + canonical confirmation path;
- commercial commitments remain under their existing approval boundary;
- current VendaERP integration remains read-oriented;
- no order create/update, billing, fiscal write or outbound automation is enabled.

## 3. Effect authority versus autonomy

The existing employee autonomy mode is `supervised`.

Effect authority must not silently redefine that field.

A future active grant answers **eligibility**. The effect-specific policy still decides whether execution is:

- human-confirmed;
- separately approved;
- or, in a later qualified path, allowed without per-operation human confirmation.

Therefore owner/admin may eventually grant bounded authority without becoming the actor for every operation, but that transition is effect-specific and not implemented here.

## 4. Existing work journal cannot become a handoff engine

`wandora_private.digital_employee_work_operations` stores:

- one stable Wandora work request id;
- one fixed `employee_id`;
- provider/company/agent correlation;
- dispatch/execution receipt state.

Its UPDATE privilege does not include `employee_id`.

Its canonical comment explicitly says:

> this table is not a Wandora task engine.

Changing `employee_id` during a handoff would violate both the data model and the documented authority boundary.

Therefore handoff must not mean "rewrite the assignee inside the existing Wandora receipt".

## 5. Paperclip handoff substrate

Pinned Paperclip v2026.916.1 exposes, through its plugin SDK:

- `ctx.issues.create(...)`;
- `parentId`;
- `assigneeAgentId`;
- `issues.update`;
- assignment authorization/policy preview and enforcement;
- issue/run lifecycle;
- wakeup;
- parent/child work.

The current Wandora Organization Adapter plugin already declares:

- `issues.read`;
- `issues.create`;
- `issues.wakeup`.

It does not currently declare `issues.update`.

This means a successor-child-work design can reuse an already-authorized provider primitive without requiring generic reassignment mutation.

## 6. Preferred handoff shape

The minimum safe architecture is:

```text
source Wandora work segment
  -> handoff decision/correlation
  -> new target Wandora work segment
  -> Paperclip child Issue
       parentId = source Paperclip Issue
       assigneeAgentId = exact target provider agent
  -> normal Paperclip wake/run lifecycle
```

The source work is preserved.

The target receives new work.

Paperclip owns operational task lifecycle.

Wandora owns only the minimum product semantic facts required to answer:

- why the handoff happened;
- from which canonical employee;
- to which canonical employee;
- for which required effect/business purpose;
- which successor work request resulted;
- who/policy authorized it.

This is not a copied Paperclip task state machine.

## 7. Why direct reassignment is not the V1 choice

Paperclip can update `assigneeAgentId`, but direct reassignment creates a mismatch with the current Wandora work receipt that permanently identifies the original employee.

Using child/successor work instead:

- preserves historical ownership;
- preserves the original execution receipt;
- gives the target a distinct idempotent work request;
- keeps Paperclip's parent/child topology authoritative;
- avoids mutating existing Wandora integration-safety state into task-lifecycle state;
- provides a clean provider-replacement correlation boundary.

A future explicit "transfer same task" semantic could be qualified separately if needed.

## 8. Automatic target selection

Free-text `responsibility` is not a machine routing key.

No automatic resolver may select another employee by searching responsibility strings such as:

- vendas;
- fiscal;
- suporte;
- financeiro.

Future target eligibility must be based on structured facts.

Minimum fail-closed eligibility candidate:

```text
same canonical organization
AND target employee active
AND explicit EffectKey authority when an effect is required
AND required operational capability/access currently available
AND target provider binding uniquely resolved
```

Responsibility may still inform customer-facing explanation or human decision, but it cannot itself authorize or route.

### Zero candidates

Fail closed and surface/escalate to human governance.

### One candidate

Potentially eligible for a future automatic or policy-driven handoff, subject to the remaining authorization contract.

### Multiple candidates

Ambiguous.

No load-balancing, first-row, alphabetical, newest/oldest, random selection or provider default is authorized.

A later routing policy must explicitly define tie-breaking if automatic routing is desired.

## 9. Handoff initiation/acceptance remains unimplemented

This preflight does not decide that every source employee may freely assign work to another employee.

A future contract must explicitly distinguish:

- request handoff;
- authorize handoff;
- accept/receive work;
- execute resulting effect.

These may be governed by different policies.

Paperclip's own assignment permission remains an operational guard and can only narrow what Wandora authorizes.

## 10. Revocation during in-flight work

Revoking an employee effect grant must prevent future effect execution after the revocation becomes authoritative.

It does not automatically imply:

- cancel the Paperclip Issue;
- cancel a model run;
- reassign work;
- revoke provider credentials globally.

Those are separate operational actions.

Every external effect must re-check the Wandora effect authority at the effect boundary. A stale work assignment or earlier provider/tool admission cannot override a newer revocation.

Exact cancellation/recovery behavior for already-running work remains a later lifecycle qualification.

## 11. Critical runtime blocker — the managed workforce is still singular

The current Wandora product/runtime cannot yet implement the handoff described above.

### Core catalog

`WANDORA_CATALOG_V1` contains exactly one entry:

```text
ana-commercial-v1
```

`CatalogEmployeeDefinition.role` currently permits only:

```text
commercial-assistant
```

### Paperclip Organization Adapter plugin

The plugin exports exactly one:

```text
CATALOG_KEY = ana-commercial-v1
```

and one managed agent manifest entry.

### Customer hire surface

The customer-facing hire/read service hard-codes:

```text
CUSTOMER_HIRE_CATALOG_KEY = ana-commercial-v1
```

and reports that catalog employee as already hired after the first successful hire.

### Database/provider binding

The private relation:

```text
digital_employee_provider_bindings
```

is structurally capable of mapping many canonical employees to many provider agents.

Paperclip itself is also capable of hosting many agents.

But structural provider capacity is not equivalent to a qualified Wandora multi-employee product contract.

Today there is no safe customer/runtime path to create:

- Ana Atendimento;
- Iris Comercial;
- funcionário Fiscal;
- funcionário Financeiro;
- two simultaneous commercial employees from the same reusable catalog definition.

Therefore an exact target employee/agent for handoff cannot yet be materialized through the existing approved Organization Adapter path.

## 12. Capability Authority / Reuse Gate

### Semantic authority — Wandora

Wandora owns:

- canonical employee identity;
- employee responsibility semantics;
- provider-neutral effect authorization semantics;
- customer policy and human governance;
- same-tenant handoff meaning;
- minimum portable handoff correlation/audit;
- external-effect authorization.

### Durable product state — minimum candidate only

Potential future Wandora state may include:

- structured per-employee effect grant;
- grant provenance/revocation;
- minimum handoff decision/correlation record.

Not authorized here.

Wandora must not persist:

- copied Paperclip Issue lifecycle;
- copied provider assignee state;
- copied Tool Grants;
- copied Tool Catalog;
- copied run lifecycle.

### Operational authority — Paperclip

Paperclip remains authoritative for:

- issue/task topology;
- parent/child work;
- assignee;
- assignment permission;
- wake/run lifecycle;
- operational grants;
- Tool Gateway;
- provider execution audit.

### Runtime — Mastra

Mastra executes bounded runtime work only.

It does not decide durable effect authority or organizational assignment.

## 13. Mandatory adversarial cases

### Atendimento attempts a sale

Responsibility text alone does not grant a sales effect.

If the current employee lacks the required structured effect authority, the effect fails closed.

A future handoff may create successor work for an authorized commercial employee only after that target exists in the qualified workforce.

### Iris creates an order

Not authorized by this ADR.

A future `orders.create`-like provider-neutral EffectKey may be qualified separately, mapped to a provider write adapter and independently guarded by Paperclip/provider access.

### Fiscal / NF-e

Same rule.

Sales completion does not imply fiscal authority.

A successor fiscal work segment requires a real canonical Fiscal employee and provider binding first.

### Two commercial employees

Current workforce catalog cannot safely create both from the existing single catalog contract.

No automatic resolver is authorized.

### Provider replacement

Effect grants and handoff meaning remain Wandora semantics.

Paperclip Issue/agent IDs and task lifecycle remain replaceable provider operational state.

### Cross-tenant

A target employee from another organization is never eligible, regardless of Paperclip visibility or provider permissions.

## 14. GAPS

Implementation remains blocked by:

- no multi-employee/multi-role catalog contract;
- no multiple-instance employee catalog semantics;
- no qualified customer hire path for target workforce;
- no typed production EffectKey vocabulary;
- no persisted effect-grant contract;
- no persisted minimal handoff correlation contract;
- no handoff initiation/acceptance policy;
- no tie-break routing policy;
- no effect-time runtime gate implementation;
- no target employee/provider-agent resolution contract for handoff.

These gaps must not be collapsed into one migration.

## 15. Decision

Decision:

**QUALIFY THE PRODUCT SHAPE, BLOCK IMPLEMENTATION.**

Specifically:

1. structured employee effect authority is a legitimate Wandora-owned semantic;
2. it remains separate from responsibility and provider grants;
3. absence/revocation is fail-closed;
4. effect execution remains conjunctive with existing effect-specific and provider/runtime gates;
5. cross-employee handoff should be modeled as successor work, not mutation of the source Wandora work receipt;
6. Paperclip parent/child Issue assignment is the preferred operational substrate;
7. free-text responsibility cannot auto-route;
8. zero/multiple eligible targets fail closed;
9. runtime/schema implementation is blocked because the current Wandora managed workforce exposes only one catalog employee.

## 16. Second adversarial review

Mandatory JEV review result:

- block = 0.95;
- proceed_fast = 0.03;
- deep_review = 0.01;
- split_task = 0.01;
- confidence = 0.93.

The advisory result matches the deterministic gate: document the boundary, do not implement around the workforce gap.

## 17. Effect boundary

This slice performs:

```text
schema/migration = 0
Core runtime change = 0
Paperclip plugin change = 0
Paperclip Issue mutation = 0
provider/model call = 0
customer work = 0
outbound = 0
production/VPS mutation = 0
rollout = 0
merge = 0
```

## 18. Next slice

Next executable slice:

**Multi-Digital-Employee Workforce / Catalog / Provider Binding Qualification V1 — NO EFFECT**

It must determine, before code:

- whether catalog entries represent reusable employee templates or singleton employees;
- how two employees of the same template coexist;
- whether `role` must broaden beyond `commercial-assistant`;
- how canonical employee identity maps to distinct Paperclip agent identity;
- whether Paperclip managed-agent facilities can safely materialize multiple instances;
- how hire/activate/work contracts stop assuming one catalog key;
- how provider replacement preserves canonical employee identity;
- how customer UX lists/hires multiple employees without exposing provider IDs.

Only after that qualification may the project return to:

1. Effect Authority durable-contract implementation;
2. Paperclip-backed successor-work handoff implementation;
3. pre-Conversation MessagingConnection selection.
