# ADR 0394 — Multi-Digital-Employee Workforce / Catalog / Provider Binding Qualification V1

Date: 2026-10-02

Status: **CANONICAL EMPLOYEE INSTANCE MODEL QUALIFIED / CATALOG TEMPLATE SEMANTICS QUALIFIED / PAPERCLIP DYNAMIC AGENT CAPABILITY PROVEN / SAFE PROVISIONING BRIDGE NOT PROVEN / IMPLEMENTATION BLOCKED / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0393 proved that cross-employee handoff cannot become real while the managed workforce still exposes only one catalog employee.

This ADR therefore asks a narrower upstream question:

> What is a Wandora digital employee, what is a catalog entry, and how may multiple canonical employees — including two employees created from the same catalog offering — map to distinct Paperclip agents without making provider identity part of the product contract?

This is a qualification slice only. It does not authorize a migration, runtime change, provider mutation or customer effect.

The governing rules remain:

- canonical Wandora identity must survive provider replacement;
- Paperclip remains operational authority for agents/tasks/runs;
- missing local state never alone proves Wandora should duplicate provider functionality;
- portability means contract decoupling, not implementation duplication.

## REAL NOW

Fresh reconciliation after PR #393 GREEN proved:

- PR #393 is open, draft, mergeable and unmerged;
- exact PR #393 head = `92abadf15eb43553e8ead6aad536a3d877e3c074`;
- PR #393 is stacked directly on PR #392;
- PRs #391, #392 and #393 remain open/draft/mergeable/unmerged;
- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- the stack has not been merged into `main`;
- one exact-head CI read for PR #393 observed 10/10 workflows completed successfully;
- no workflow was rerun and no polling occurred.

## PROVEN EVIDENCE

### Canonical employee identity already exists

`wandora.digital_employees` has a canonical UUID primary key.

The table comment is explicit:

> Canonical Wandora digital employees; provider/runtime identities never replace this ID.

Therefore the digital employee row is already the strongest product identity candidate.

### Provider binding is already instance-shaped

`wandora_private.digital_employee_provider_bindings` is keyed by:

```text
organization_id
+ employee_id
+ provider
```

and separately enforces uniqueness of:

```text
provider
+ provider_agent_ref
```

That shape can represent many Wandora employees mapped to many provider agents.

It does not require the provider agent ID to become customer-facing identity.

### The current catalog/hire contract is singleton-shaped

Migration 011 added:

```text
UNIQUE (organization_id, provider, catalog_key)
```

to `digital_employee_hire_operations`.

The canonical comment states:

> One managed catalog resource is reserved per organization/provider/key.

The Core service also looks up/reserves existing operations by catalog key.

The human hire surface currently treats an existing `ana-commercial-v1` hire as:

```text
already-hired
```

Therefore the current `catalog_key` is operationally treated as a singleton employee identity per tenant/provider.

That is incompatible with two employees instantiated from one reusable offering.

### Activation is also hard-coded to the Ana vertical

Migration 015 requires:

- display name = `Ana`;
- role = `commercial-assistant`;
- provider = `paperclip`;
- catalog key = `ana-commercial-v1`.

The current activation contract is therefore a vertical-specific projection, not a generic workforce contract.

### Paperclip managed-agent semantics are singleton per key

Pinned Paperclip v2026.916.1 defines `PluginManagedAgentDeclaration.agentKey` as:

> Stable identifier for this managed agent, unique within the plugin.

The managed-agent server binding is derived from:

```text
companyId + agentKey
```

and managed resource reconciliation resolves one provider Agent for one:

```text
(plugin, company, agentKey)
```

The Wandora Organization Adapter plugin declares one static managed Agent:

```text
ana-commercial-v1
```

Therefore `ctx.agents.managed` is a correct idempotent primitive for a manifest-declared singleton resource, but it is not a reusable-template instantiation primitive.

## 1. Canonical model decision

A Wandora digital employee is an **instance**.

Its canonical identity is:

```text
organization_id + digital_employee.id
```

The employee UUID remains stable across:

- display-name changes;
- responsibility changes;
- behavior/practice changes;
- provider replacement;
- provider-agent rebinding;
- runtime replacement.

The provider Agent ID is an implementation binding, never the employee identity.

## 2. Catalog model decision

A future generalized `catalog_key` must mean a **Wandora-owned reusable template/offering**, not the hired employee itself.

A catalog template may provide defaults such as:

- default display name suggestion;
- default runtime profile;
- default title/presentation;
- default instruction package/profile;
- default recommended skills;
- commercial/package metadata.

It must not mean:

- unique employee identity;
- unique provider Agent identity;
- responsibility assignment;
- effect authority;
- MessagingConnection ownership.

Therefore this relation must become valid:

```text
CatalogTemplate 1
  -> 0..N DigitalEmployee instances per organization
```

Two employees created from the same template must receive different canonical employee UUIDs.

## 3. Example cardinalities

The qualified target cardinalities are:

| Relation | Target semantic cardinality |
| --- | --- |
| Organization → DigitalEmployee | 1 → 0..N |
| CatalogTemplate → DigitalEmployee | 1 → 0..N |
| DigitalEmployee → CatalogTemplate provenance | each catalog-created employee → exactly 1 originating template at hire time |
| DigitalEmployee → provider binding per provider | 1 → 0..1 active binding per provider |
| Provider Agent → canonical DigitalEmployee | one provider Agent binding → exactly 1 canonical employee |
| same CatalogTemplate → provider Agents | 1 → 0..N through distinct employee instances |

The originating template is provenance/default source, not ongoing identity authority.

## 4. Same-template employees

The architecture must support:

```text
Iris A
employee_id = UUID-A
catalog_template = commercial-v1
provider_agent = AGENT-A

Iris B
employee_id = UUID-B
catalog_template = commercial-v1
provider_agent = AGENT-B
```

No generated display name, array position, Paperclip ID or provider role may distinguish these employees semantically.

Their canonical UUIDs do.

## 5. Display name is presentation, not identity

Two employees may validly have the same display name.

A rename:

```text
Iris -> Iris Comercial
```

must not:

- create a new canonical employee;
- create a new effect grant automatically;
- change responsibility automatically;
- select a new MessagingConnection;
- silently replace the provider Agent.

Provider display name may later be reconciled as a projection, but identity remains unchanged.

## 6. Responsibility remains separate

The employee-development `responsibility` contract remains the authority for statements such as:

- pre-sales;
- vendas;
- fiscal;
- financeiro;
- suporte.

Catalog template is not a routing rule.

Two employees from the same template may have different responsibilities.

Two employees from different templates may carry equivalent responsibilities.

Therefore no handoff or work router may use `catalog_key` as a substitute for responsibility/effect authority.

## 7. The current role column is a legacy vertical constraint

`wandora.digital_employee_role` currently contains only:

```text
commercial-assistant
```

This is not sufficient for a mature workforce.

However this ADR does **not** authorize adding an enum value for every business department.

Doing so would risk duplicating the already-qualified responsibility semantic and turning a database enum into a routing taxonomy.

Decision:

- current `role` is legacy vertical state;
- it must not become automatic business-function authority;
- exact future generalization/deprecation of the role column requires its own implementation qualification;
- workforce identity must not depend on that redesign.

## 8. Paperclip native dynamic Agent capability exists

Pinned Paperclip exposes native company-scoped dynamic Agent creation through:

```text
POST /api/companies/:companyId/agent-hires
POST /api/companies/:companyId/agents
```

These routes:

- require same-company access;
- require `agents:create` authorization;
- create distinct Agent IDs;
- support name/title/role;
- support instructions bundle;
- support desired skills;
- support runtime config;
- support permissions;
- support metadata;
- create operational audit;
- integrate with Paperclip hire approval when configured.

This proves that Paperclip already owns the provider-domain primitive needed to materialize multiple Agents.

Wandora must not build a parallel provider agent lifecycle engine.

## 9. Why managed agents are not the general workforce primitive

A manifest-managed agent is tied to one static `agentKey`.

Using:

```text
commercial-v1
```

for two employees would reconcile both requests to the same Paperclip Agent.

Generating:

```text
commercial-v1:<employee-id>
```

does not solve this through the current managed API because every managed key must first exist as a static manifest declaration.

Predeclaring arbitrary numbered slots would create an artificial capacity model and leak provider implementation constraints into product semantics.

Therefore the general multi-instance workforce must not be implemented as a growing list of static managed-agent declarations.

## 10. Dynamic Agent creation is only a provider candidate today

The Paperclip dynamic route is strong operational reuse evidence, but it is **not yet an approved Wandora execution path**.

The current Organization Adapter trust path is:

```text
Wandora Core
  -> signed HMAC webhook
  -> Organization Adapter plugin
  -> ctx.agents.managed
```

The plugin SDK surface currently used by Wandora does not expose a dynamic `agents.create` host method.

Calling the Paperclip REST dynamic creation route directly would therefore introduce a new control-plane authentication/secret boundary.

That boundary has not yet been qualified.

## 11. Idempotency blocker

The dynamic Paperclip hire route computes a request fingerprint, but its native duplicate suppression is scoped to an authenticated Paperclip Agent run:

```text
runId + request fingerprint
```

For a generic board/user call with no run ID, there is no caller-supplied idempotency key in the reviewed create contract.

This matters because:

1. Wandora sends create request;
2. Paperclip commits Agent creation;
3. response is lost or times out;
4. Wandora cannot know whether creation happened;
5. blind retry may create a second Agent.

That violates the fail-closed external-effect discipline already used by Wandora.

Therefore dynamic Paperclip creation cannot yet replace `ctx.agents.managed.reconcile` in production.

## 12. Provider metadata is useful but not sufficient

Paperclip create contracts accept arbitrary metadata.

A future provider projection can carry a non-secret origin marker such as:

```text
schema = wandora.digital_employee_origin.v1
canonicalEmployeeId = <uuid>
catalogTemplateKey = <wandora key>
```

Because company scope is already enforced, the marker can support provider reconciliation.

However Paperclip does not prove provider-enforced uniqueness of that marker.

Therefore recovery semantics must be:

- 1 exact matching Agent → recovery candidate;
- 0 matches → unresolved/possibly safe only after a separately proven retry protocol;
- >1 matches → conflict / manual reconciliation.

Metadata alone is not an idempotency guarantee.

## 13. Minimum future provider contract

A future provider-neutral Organization Adapter contract may expose semantics equivalent to:

```text
ensureEmployeeInstance({
  providerCompanyRef,
  canonicalEmployeeId,
  catalogTemplateKey,
  displayName,
  runtimeProfile
})
  -> exactly one providerAgentRef
```

The word `ensure` is intentional.

The provider implementation must prove:

- deterministic same-tenant scope;
- exactly-one employee-to-agent result;
- replay safety;
- uncertain-result reconciliation;
- no human browser/cookie dependency;
- no raw provider ID in customer contracts;
- stable Wandora origin correlation;
- conflict detection for duplicate provider resources.

No such runtime interface is authorized in this ADR.

## 14. Current singleton database assumptions

The following current assumptions are incompatible with reusable templates:

### Hire operation singleton index

```text
UNIQUE (organization_id, provider, catalog_key)
```

would reject Iris A + Iris B from one template.

### Reservation lookup

The service currently searches existing operation by provider + catalog key.

A multi-instance contract must instead anchor operation identity to the canonical employee/hire operation.

### Customer availability

`already-hired` for a template cannot remain the general meaning if templates are reusable.

Eligibility should answer whether a template may be used for a **new hire**, independent from how many existing instances already came from it.

These are proven future migration/runtime changes, but this ADR authorizes none of them.

## 15. Existing database state that is reusable

The following current structures remain conceptually useful:

- canonical `digital_employees.id`;
- organization scoping;
- `digital_employee_provider_bindings`;
- hire-operation idempotency journal concept;
- provider company binding;
- operator-controlled catalog hire eligibility.

The Reuse Gate therefore does not justify replacing the whole model.

It identifies specific singleton assumptions that must later be generalized.

## 16. Template retirement / eligibility

Disabling a catalog template for an organization means:

> do not start a new hire from this template.

It must not automatically:

- terminate existing employees;
- remove provider bindings;
- revoke responsibilities;
- revoke effect authority;
- cancel active work.

Existing employee lifecycle remains separate.

## 17. Provider replacement

Provider replacement preserves:

- organization;
- canonical employee UUID;
- customer-visible employee identity;
- responsibility/behavior/practice;
- future effect-authority state;
- template provenance where retained.

Provider replacement may change:

- provider company ref;
- provider Agent ref;
- provider operational grants;
- runtime adapter state.

A new provider binding must never require changing the canonical employee ID.

## 18. Missing / terminated provider Agent

A missing or terminated Paperclip Agent does not authorize silent creation of a replacement.

Why:

- active work may still reference the old provider Agent;
- effect grants and assignments may require revalidation;
- an apparent missing Agent may reflect provider drift;
- blind recreation after ambiguous prior creation can duplicate identities.

A later lifecycle/reprovision contract must explicitly define replacement behavior.

## 19. Cross-tenant safety

A provider Agent is eligible for binding only when it belongs to the exact provider company mapped from the same canonical Wandora organization.

A provider Agent from another Paperclip company must be rejected even if:

- its metadata contains the same employee UUID;
- its display name matches;
- its role matches;
- an operator can see it.

Canonical tenant scope wins.

## 20. Adversarial scenarios

### Ana + Iris from different templates

Valid target architecture:

- two canonical employee IDs;
- two independent hire operations;
- two independent provider bindings;
- two distinct Paperclip Agents.

### Iris A + Iris B from the same template

Must also be valid.

The template key is shared.

The employee UUID and provider Agent binding are distinct.

### Same display name

Allowed.

Display name never resolves identity.

### Rename

Employee UUID stays fixed.

No new hire occurs solely because of rename.

### Template disabled after hire

Existing employee remains.

Only new hires are blocked.

### Provider create timeout

Blind retry is forbidden until idempotent dynamic provisioning/reconciliation is proven.

### Duplicate provider origin markers

Two matching Paperclip Agents for one canonical employee is conflict state.

Do not choose first, newest, oldest or alphabetically.

### Cross-tenant provider Agent

Reject.

### Provider Agent terminated

Do not silently replace.

Require explicit reconciliation/reprovision policy.

## 21. Capability Authority / Reuse Gate

### Wandora owns

- canonical employee identity;
- reusable employee catalog/template product semantics;
- customer hire eligibility;
- employee lifecycle product semantics;
- provider-neutral provisioning intent;
- provider binding correlation;
- responsibility;
- future effect authority.

### Paperclip owns operationally

- Agent creation;
- Agent operational lifecycle;
- Agent runtime configuration;
- Agent skills/install mechanics;
- Agent operational permissions;
- provider Agent IDs;
- provider-side hire approvals;
- task/run lifecycle.

### Mastra owns

Runtime execution behind the selected employee/agent binding.

Mastra does not own workforce identity or hire policy.

## 22. GAPS

The remaining blockers are now narrower:

- secure non-human Paperclip dynamic Agent provisioning transport;
- principal/secret authority for `agents:create`;
- provider-level or adapter-level idempotent exactly-one creation;
- uncertain-result reconciliation;
- origin-marker contract;
- duplicate recovery policy;
- missing/terminated Agent reprovision policy;
- generic activation contract replacing Ana hard-coding;
- future migration removing singleton catalog uniqueness;
- customer hire UI semantics for reusable templates;
- future role-column generalization/deprecation.

## 23. Decision

Decision:

**QUALIFY MULTI-EMPLOYEE PRODUCT SEMANTICS; BLOCK RUNTIME/SCHEMA IMPLEMENTATION UNTIL DYNAMIC PAPERCLIP PROVISIONING IS IDEMPOTENT AND NON-HUMAN.**

Specifically:

1. `DigitalEmployee` is the canonical workforce instance.
2. Catalog keys become reusable template/offering semantics, not employee identities.
3. Multiple employees from the same template are required architecture.
4. Provider Agent IDs remain private replaceable bindings.
5. Paperclip managed-agent singleton reconciliation is retained only where a true singleton managed resource is intended.
6. General customer workforce instances should reuse Paperclip native dynamic Agent capability.
7. The current dynamic REST path is not yet safe enough for Wandora because the approved adapter trust boundary and generic idempotency contract are missing.
8. No schema/runtime workaround is authorized.

## 24. Second adversarial review

Mandatory JEV review result:

- block = 0.79;
- deep_review = 0.17;
- split_task = 0.02;
- proceed_fast = 0.02;
- confidence = 0.71.

The advisory result agrees with the deterministic safety gate.

## 25. Effect boundary

This slice performs:

```text
schema/migration = 0
Core runtime change = 0
Paperclip plugin change = 0
Paperclip Agent create = 0
provider/model call = 0
customer work = 0
outbound = 0
production/VPS mutation = 0
rollout = 0
merge = 0
```

## 26. Next slice

Next executable architecture slice:

**Paperclip Dynamic Digital-Employee Provisioning Bridge & Idempotent Reconciliation Qualification V1 — NO EFFECT**

It must prove:

- which machine principal may create an Agent;
- where its credential lives;
- whether an existing Paperclip capability can expose dynamic create through the Organization Adapter without a board credential in Core;
- how caller idempotency is enforced;
- how canonical employee origin is projected into provider metadata;
- how 0 / 1 / >1 reconciliation behaves after timeout;
- whether Paperclip itself should provide the uniqueness/idempotency primitive or the adapter can safely enforce it without duplicating the Agent lifecycle;
- how provider replacement remains possible.

Only after that bridge is proven should schema/runtime implementation of reusable catalog hires begin.
