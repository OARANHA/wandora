# ADR 0391 — Semantic Fast Read Messaging Account/Line Responsibility & Explicit Conversation Bootstrap Selection Policy Qualification V1

Date: 2026-10-02

Status: **BLOCKED / PRODUCT SEMANTICS NOT PROVEN / FAIL-CLOSED / DOCUMENTATION ONLY / NO SCHEMA OR RUNTIME IMPLEMENTATION / NO PRODUCTION EFFECT**

## Context

ADR 0389 proved that the missing pre-Conversation decision from business context to canonical `messaging_connection_id` is Wandora-owned semantic/product authorization rather than provider runtime state.

ADR 0390 then proved that the repository does not yet establish whether that assignment belongs to organization+channel, employee, customer/contact affinity, order/business context, explicit Conversation bootstrap or another policy.

This ADR investigates the next narrower question under an adversarial scenario:

> One organization owns at least two active valid WhatsApp Connections, for example one Commercial line and one Support line. A digital employee is processing an order/customer before any Conversation exists. Which authority, information or decision selects exactly one canonical Messaging Connection?

This ADR does not assume a new assignment model merely because one would simplify code. It also does not reopen ADR 0388; provider purity/freshness/external-effect guarantees remain independently blocked.

## Fresh repository and GitHub state

Fresh reconciliation before the decision proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #390 remains open / draft / mergeable / unmerged;
- PR #390 branch is `docs/canonical-messaging-connection-assignment-cardinality-v1`;
- PR #390 exact head is `7526dadef6c34ec60ceb376c0678a0ad73bd7a1f`;
- the branch ref itself resolves to that same exact SHA;
- PR #390 is stacked on PR #389 head `a3415b07ae20c15ebd0d26ddffd55ce0e9bb1370`;
- one current exact-head workflow read for `7526dade...` observed **10/10 completed/success**, with no polling and no rerun;
- PR #389 and PR #388 remain open/draft/unmerged in the same Semantic Fast Read chain.

No runtime/VPS read was required to answer this product-semantics qualification because no production mutation or freshness-sensitive operational fact is used as selection authority.

## Capability Authority / Reuse Gate

ADR 0036 and ADR 0168 are applied before any schema, migration, resolver, service, registry or state model is proposed.

Permanent rule:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

The relevant dimensions are separated as follows:

| Dimension | Qualified authority |
| --- | --- |
| semantic authority | Wandora owns the meaning of which canonical messaging identity represents a customer/business interaction |
| durable product state | only minimum Wandora-owned facts proven necessary; no new assignment/default state is proven in this slice |
| operational authority | Messaging Gateway/provider adapter owns transport execution; Paperclip owns its Connections/grants/tool access; Human Send owns its reviewed supervised send boundary |
| provider implementation | Evolution/WhatsApp behind Messaging Gateway today; Paperclip for workforce/tool control; Mastra for runtime execution |
| replacement boundary | canonical `messaging_connection_id` remains Wandora identity; `messaging_provider_bindings` maps to provider implementation after semantic selection |

Result: no accepted provider already owns the missing Wandora business decision, but absence of provider authority does **not** by itself prove what new Wandora rule should be.

## Existing structural authority

### Organization → MessagingConnection

`wandora.messaging_connections` has exactly one owning organization, one channel, label and status.

There is no uniqueness constraint on organization + channel. Multiple WhatsApp Connections for one organization are structurally valid.

Proven structural cardinality:

`Organization 1 → N MessagingConnection`

There is no canonical:

- default Connection;
- primary Connection;
- channel priority;
- typed business purpose;
- department assignment;
- line responsibility policy.

The free-text `label` is presentation metadata. A label such as “Comercial” is not a typed selection policy and cannot become one by convention.

### MessagingConnection → provider binding

`wandora_private.messaging_provider_bindings.connection_id` is the primary key.

Current representation therefore permits:

`MessagingConnection 1 → 0..1 private provider binding`

This is a provider implementation binding after a canonical Connection has already been selected. It is not semantic selection authority.

### Conversation → MessagingConnection

`wandora.conversations.messaging_connection_id` is mandatory and tenant-scoped.

Proven semantic/structural cardinality after bootstrap:

`Conversation N → 1 MessagingConnection`

Once a Conversation exists, this is the canonical communication identity for that Conversation.

This is the strongest existing reusable authority in the domain, but it begins **after** the pre-Conversation selection problem has already been solved.

### Contact / Party / customer → MessagingConnection

A canonical Contact belongs to organization + channel + channel address, not to one Connection.

Conversation uniqueness includes both Connection and Contact, so one Contact may structurally participate in different Conversations through different Connections.

VendaERP Party/customer data is external business-system data and has no Wandora MessagingConnection affinity.

Therefore no permanent or contextual customer/party/contact → Connection affinity is proven.

### Employee → MessagingConnection

`wandora.digital_employees` has no MessagingConnection field or relation.

Work Items bind an employee to a Conversation; they do not cause the employee to own the Conversation's Connection.

The schema does not prohibit different employees from working on Conversations using one shared line, nor the same employee from working across Conversations using different lines.

Therefore executor identity and communication identity remain separate.

### Order / business context → MessagingConnection

The qualified Fast Read order/customer path is deterministic business-system composition. It carries selectors and customer-safe facts, but no messaging Connection assignment.

No canonical Wandora Order entity or order → messaging policy exists.

Adding order → Connection state only because it makes routing easy would fail the Reuse Gate.

## Purpose / responsibility qualification

Two superficially relevant concepts exist, but neither is line-selection authority.

### MessagingConnection label

A Connection has a bounded free-text `label`.

The schema does not assign typed meaning such as:

- `commercial`;
- `support`;
- `billing`;
- `collections`;
- department;
- priority;
- exclusivity.

Therefore “label contains Comercial” is not a business policy.

### Digital employee development responsibility

`wandora.digital_employee_development_entries` is Wandora-owned employee guidance with `responsibility | behavior | practice`.

Owner/admin can author approved employee responsibility semantics, and the canonical comment defines responsibility as what the employee owns/prioritizes.

However:

- entries do not reference a MessagingConnection;
- entries do not define sender identity;
- they are employee guidance, not organization line/account policy;
- a shared line can serve multiple employees;
- one employee can operate work across multiple lines.

Using employee responsibility text to pick a Connection would overload a different canonical concept and create an implicit parser/policy not proven by product state.

Result: **purpose/responsibility is a plausible future product dimension, but current state does not prove a typed MessagingConnection purpose or its cardinality.**

## Organization + channel default hypothesis

No organization+channel default authority exists.

When an organization has two active WhatsApp Connections:

- both satisfy organization ownership;
- both satisfy channel equality;
- active status alone does not rank them;
- provider binding does not rank them;
- Gateway deployment config represents operational routing for one process;
- “first created”, “first row”, “only currently deployed”, “only active”, or “isDefault somewhere else” are forbidden shortcuts.

Result: **not proven**.

## Employee → Connection hypothesis

No employee-owned line rule is proven.

A digital employee is an executor. The same business employee may legitimately act through Commercial in one context and Support in another; a line may also be shared across employees.

Paperclip agent grants can constrain which operational Tool Connections an agent/run may use, but that is not canonical Wandora MessagingConnection identity.

Result: **not proven**.

## Customer / Party / Contact affinity hypothesis

The current schema explicitly allows the same canonical Contact to have Conversations through different Connections.

A known customer arriving later through Support must not silently inherit a previous Commercial line merely because history exists.

No durable or contextual affinity source, expiry rule, precedence rule, owner approval or replacement behavior exists.

Result: **not proven**.

## Order / business-context hypothesis

No current business fact such as order, seller, branch, department or customer status is accepted as a MessagingConnection selector.

The repository contains no policy saying that an order's salesperson, unit, ERP company or another field determines the sender account.

Result: **not proven**.

## Explicit Conversation bootstrap selection hypothesis

This is the strongest candidate for avoiding premature durable assignment state.

A future contract could accept one explicit canonical `messaging_connection_id` at the moment a new Conversation is bootstrapped, then let the existing mandatory `conversation.messaging_connection_id` become authority for the Conversation.

A safe future validation envelope would have to prove at least:

- caller is authenticated and explicitly authorized for this selection effect;
- selected Connection belongs to the same organization/tenant;
- selected Connection is active;
- selected Connection channel matches the intended channel;
- a usable provider binding/transport path exists without exposing provider identity as product semantics;
- cross-tenant and cross-connection mismatches fail closed;
- missing explicit selection fails closed when more than one semantic candidate exists;
- disabled/replaced Connections do not silently fall back to another line;
- no first/only/default/provider-discovery fallback is used.

That envelope proves how to validate an already-authorized choice. It does **not** prove who is allowed to make the choice or why Commercial rather than Support is the correct business identity.

### Owner/admin requalification

The current Human Fast Read path ultimately calls `OrganizationAdapterService.requireOwnerOrAdmin`. This proves owner/admin authority to admit Fast Read work for the organization/employee.

It does not prove messaging-line selection authority.

Similarly, owner/admin can manage employee development guidance and authorize reviewed Human Send actions, but Human Send receives a Conversation whose Connection is already bound.

Therefore:

> owner/admin is a plausible future actor for explicit selection, but existing owner/admin authority cannot be widened by analogy into a new sender/account identity decision.

No reviewed bootstrap API, product workflow or policy currently grants that exact effect.

Result: **explicit bootstrap is technically viable and reuse-friendly, but product authority remains unproven.**

## Paperclip qualification

Pinned Paperclip's Connections/grants/installs/defaults remain operational control-plane authority.

They answer questions such as:

- which operational Connection/tool identity may a company/agent/user use;
- which grants are effective;
- which install/profile applies;
- whether an operational default exists inside that provider domain.

They do not prove which canonical Wandora WhatsApp account represents this order/customer interaction.

There is no accepted mapping from Paperclip Connection identity/defaults to `wandora.messaging_connections.id` for this semantic.

Therefore:

- do not mirror Paperclip grant/default state;
- do not reinterpret `isDefault` as a Wandora messaging default;
- do not use agent grants as customer/business sender identity;
- continue to reuse Paperclip for the operational capabilities it actually owns.

## Mastra qualification

Mastra remains runtime/provider implementation behind a Wandora-owned execution contract.

The canonical Mastra capability map explicitly rejects adopting `@mastra/connect` as a competing organizational connection/grant authority.

Mastra supplies no messaging selection semantics for this scenario.

## Adversarial scenario results

### Two active WhatsApp lines: Commercial + Support

Current evidence cannot determine which one is correct before Conversation creation.

### Shared line across several employees

Structurally allowed by the absence of employee ownership. This invalidates a mandatory employee→one-line model.

### One employee using several lines

Structurally compatible with current WorkItem→Conversation flow. This invalidates treating executor identity as a unique sender identity.

### Known customer enters through another line

Current Conversation model supports the same Contact through multiple Connections. A durable global customer affinity would be too strong without new product evidence.

### Connection disabled/replaced

A future selection must fail closed when the chosen canonical Connection is inactive/unusable. Provider replacement should change private provider binding, not the customer-facing semantic ID or invent a new business default.

### Cross-tenant / cross-connection

Any future selection must validate tenant ownership before provider resolution and reject cross-organization IDs. Existing composite FKs/RLS patterns support that validation but do not themselves choose a line.

### Paperclip defaults/grants

They remain operational and cannot become Wandora messaging semantics.

### Premature table/default/assignment

No durable purpose/default/affinity table is justified by evidence in this slice.

### Explicit bootstrap without new assignment state

This remains the preferred **candidate to preserve** because it could reuse the existing Conversation authority with less durable state.

It is not yet an accepted B decision because the product has not defined the authorized chooser or selection semantics.

## Cardinality matrix

| Relation | Proven cardinality | Classification | What is / is not authoritative |
| --- | --- | --- | --- |
| Organization → MessagingConnection | **1:N** | structural ownership | organization scope is authoritative; no same-channel default |
| MessagingConnection → provider binding | **1:0..1** current representation | provider binding / replacement boundary | maps canonical ID to implementation; never selects business identity |
| Conversation → MessagingConnection | **N:1 mandatory** | structural + semantic after bootstrap | canonical authority once Conversation exists |
| Contact → MessagingConnection | **N:M possible through Conversations** | structural possibility | no direct affinity/default |
| Employee → MessagingConnection | **N:M possible through WorkItems/Conversations** | structural possibility | no direct assignment; executor ≠ sender identity |
| Party/customer → MessagingConnection | **none proven** | semantic gap | no durable or contextual affinity authority |
| Order/business context → MessagingConnection | **none proven** | semantic gap | no order/unit/seller/department selector proven |
| Purpose/responsibility → MessagingConnection | **concept not canonically modeled for lines** | semantic gap | label and employee responsibility are insufficient |
| Conversation bootstrap input → MessagingConnection | **candidate: one explicit ID per new Conversation** | potential semantic selection | technically valid shape, but chooser/policy not authorized yet |
| Human Send → MessagingConnection | **exactly one derived from existing Conversation** | authorization/effect admission | reuses/cross-checks; does not select |
| Messaging Gateway process → MessagingConnection | **one configured Connection per current process** | runtime routing/provider binding | operational invariant, not product default |
| Paperclip company/agent → ToolConnection | **N, narrowed by grants/installs/policy** | operational authorization/access | Paperclip-owned; not Wandora messaging assignment |
| Mastra runtime → Connection | **no canonical messaging authority** | runtime/provider implementation | must not become connection authority |

## Options analysis

### A — REUSE EXISTING AUTHORITY

Rejected.

Conversation is sufficient only after it exists. No earlier canonical authority resolves Commercial vs Support.

Paperclip/Gateway/runtime state is wrong-layer operational authority.

### B — MINIMAL WANDORA SEMANTIC CONTRACT PROVEN

Rejected for this slice.

The explicit bootstrap design is minimal and attractive, but the evidence proves only its **technical validation shape**, not the product rule authorizing who chooses the line and under which business semantics.

Choosing B now would silently turn owner/admin Fast Read admission into messaging identity authority without a reviewed contract.

### C — BLOCKED / PRODUCT SEMANTICS NOT PROVEN

Accepted.

Wandora owns the missing semantic decision, but current product evidence does not prove:

1. whether a typed line purpose such as Commercial/Support should exist;
2. whether that purpose belongs to Connection, organization policy, employee responsibility or another entity;
3. whether selection is durable or per-Conversation;
4. whether owner/admin, an explicit customer workflow, a deterministic policy or another actor is authorized to choose;
5. what precedence applies if future signals disagree;
6. how an existing customer relationship interacts with a new inbound/outbound line.

Until these are answered, ambiguity remains fail-closed.

## Deterministic decision

**C — BLOCKED / PRODUCT SEMANTICS NOT PROVEN.**

Do not create:

- organization/channel default;
- primary Connection;
- typed purpose column/table merely by convenience;
- employee→Connection ownership;
- customer/party/contact affinity;
- order/business-context assignment;
- default-resolution service;
- assignment registry;
- migration;
- artificial Conversation;
- Paperclip Connection mirror;
- Mastra connection authority.

Preserve explicit Conversation bootstrap as the lowest-state candidate for a future qualification, without adopting it prematurely.

## Second adversarial review

After the deterministic decision and before documentation execution, JEV `jev-1.13.0` was asked to invalidate C across the two-line scenario and all main candidate authorities.

First adversarial pass:

- `block = 0.65`;
- `deep_review = 0.32`;
- `proceed_fast = 0.03`;
- `split_task = 0.00`;
- confidence `0.53`.

Because `deep_review` remained material, a focused pass attacked the strongest counterargument: that existing owner/admin Fast Read authority might already prove an explicit bootstrap-selection contract.

Focused result:

- `block = 0.68`;
- `deep_review = 0.23`;
- `proceed_fast = 0.09`;
- `split_task = 0.00`;
- confidence `0.57`.

The focused review still found no evidence that owner/admin Fast Read admission is equivalent to messaging sender/account selection authority.

JEV remains advisory. Repository evidence is authoritative.

## Exact missing product decision

The blocking question is:

> When an organization has two or more valid Connections for the same messaging channel and no Conversation exists yet, what customer-visible business rule authorizes exactly one communication identity: an explicit human choice, a typed line purpose/responsibility, another durable Wandora policy, or some other canonical signal?

If the intended product behavior is explicit selection, the next product evidence must also state:

- which actor roles may select;
- whether the selection is one-off per Conversation or reusable;
- whether the user must see purpose/label/account identity before choosing;
- whether a policy may preselect and require confirmation;
- how ambiguity/conflict is surfaced;
- what happens on Connection disable/replacement.

Only then can a future B slice decide the minimum contract and whether any new durable state is actually necessary.

## Execution

Execution is documentation only.

No schema/runtime implementation is authorized.

## Independent ADR 0388 blocker preserved

Even a future successful Connection-selection contract would not resolve ADR 0388.

No `onWhatsApp`, provider lookup, Human Send or Gateway outbound is authorized by this ADR.

## No-effect record

This slice performs no:

- Evolution/WhatsApp call;
- `onWhatsApp`;
- Human Send;
- Messaging Gateway outbound;
- VendaERP/customer call;
- Connection or provider instance creation;
- provider discovery;
- secret read/write;
- VPS/production mutation;
- migration;
- rollout;
- merge.

## Next safe boundary

The next boundary is **product semantics**, not implementation.

Obtain an explicit product decision/evidence for the two-line scenario, preferably answering whether the user should make an explicit per-Conversation selection or whether Wandora has a typed business-purpose policy that legitimately determines the line.

After that evidence exists, re-run the Reuse Gate. Prefer explicit Conversation bootstrap if it satisfies the product rule without new durable assignment state. Create durable purpose/default/affinity state only if the product rule actually requires it.
